"""
Deduplication, leakage audit and stratified splitting.

Proposal, "Data preparation", steps 5-7:

    5. Exact and near-duplicate removal, checked across the
       train/validation/test boundary.
    6. Leakage audit -- no article, and no near-identical variant, appears in
       more than one split.
    7. Stratified 80/10/10 split preserving class distribution.

Why this is the most important file in `training/`
--------------------------------------------------
Near-duplicate articles across the train and test split are the single easiest
way to report a number that means nothing. Bangla news corpora are full of
syndicated copies: the same wire story republished by six outlets with a
changed headline. If one copy trains the model and another tests it, the test
set is measuring memorisation.

`audit_leakage` therefore *fails* rather than warns. A silent warning in a
notebook is a warning nobody reads.

Near-duplicate detection uses MinHash over character 5-grams: language-agnostic,
so it works on Bangla without a tokenizer, and O(n) rather than O(n^2).
"""

from __future__ import annotations

import hashlib
import logging
import re
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

logger = logging.getLogger("factlens.training.splitting")

SHINGLE_SIZE = 5
NUM_HASHES = 64
BANDS = 16  # NUM_HASHES must be divisible by BANDS
NEAR_DUPLICATE_THRESHOLD = 0.8

_PUNCT = re.compile(r"[^\wঀ-৿]+")


def _canonical(text: str) -> str:
    """Casefold and strip punctuation -- for *matching* only, never for training."""
    return _PUNCT.sub("", (text or "").casefold())


def exact_hash(text: str) -> str:
    return hashlib.sha256(_canonical(text).encode("utf-8")).hexdigest()


def _shingles(text: str, size: int = SHINGLE_SIZE) -> Set[str]:
    canon = _canonical(text)
    if len(canon) < size:
        return {canon} if canon else set()
    return {canon[i : i + size] for i in range(len(canon) - size + 1)}


def _minhash(text: str, num_hashes: int = NUM_HASHES) -> Tuple[int, ...]:
    """MinHash signature. Deterministic across runs, unlike Python's hash()."""
    shingles = _shingles(text)
    if not shingles:
        return tuple([0] * num_hashes)

    signature = []
    for seed in range(num_hashes):
        smallest = None
        prefix = str(seed).encode("ascii")
        for shingle in shingles:
            digest = hashlib.blake2b(
                prefix + shingle.encode("utf-8"), digest_size=8
            ).digest()
            value = int.from_bytes(digest, "big")
            if smallest is None or value < smallest:
                smallest = value
        signature.append(smallest or 0)
    return tuple(signature)


def jaccard(a: Sequence[int], b: Sequence[int]) -> float:
    if not a or not b:
        return 0.0
    return sum(1 for x, y in zip(a, b) if x == y) / len(a)


@dataclass
class DedupReport:
    total_in: int = 0
    exact_removed: int = 0
    near_removed: int = 0
    kept: int = 0
    examples: List[Tuple[str, str]] = field(default_factory=list)

    def summary(self) -> str:
        return (
            f"{self.total_in} rows in, {self.exact_removed} exact duplicates and "
            f"{self.near_removed} near-duplicates removed, {self.kept} kept "
            f"({self.kept / self.total_in:.1%} retained)"
            if self.total_in
            else "no rows"
        )


def deduplicate(
    texts: Sequence[str], threshold: float = NEAR_DUPLICATE_THRESHOLD
) -> Tuple[List[int], DedupReport]:
    """
    Return the indices to keep, plus a report.

    Exact duplicates go first (cheap), then LSH banding finds near-duplicates
    without comparing every pair.
    """
    report = DedupReport(total_in=len(texts))
    keep: List[int] = []

    seen_exact: Dict[str, int] = {}
    survivors: List[int] = []
    for idx, text in enumerate(texts):
        digest = exact_hash(text)
        if digest in seen_exact:
            report.exact_removed += 1
            if len(report.examples) < 5:
                report.examples.append((texts[seen_exact[digest]][:80], text[:80]))
            continue
        seen_exact[digest] = idx
        survivors.append(idx)

    signatures = {idx: _minhash(texts[idx]) for idx in survivors}

    rows_per_band = NUM_HASHES // BANDS
    buckets: Dict[Tuple[int, Tuple[int, ...]], List[int]] = defaultdict(list)
    for idx in survivors:
        signature = signatures[idx]
        for band in range(BANDS):
            chunk = signature[band * rows_per_band : (band + 1) * rows_per_band]
            buckets[(band, chunk)].append(idx)

    removed: Set[int] = set()
    for members in buckets.values():
        if len(members) < 2:
            continue
        for i, idx_a in enumerate(members):
            if idx_a in removed:
                continue
            for idx_b in members[i + 1 :]:
                if idx_b in removed:
                    continue
                if jaccard(signatures[idx_a], signatures[idx_b]) >= threshold:
                    removed.add(idx_b)
                    report.near_removed += 1
                    if len(report.examples) < 5:
                        report.examples.append((texts[idx_a][:80], texts[idx_b][:80]))

    keep = [idx for idx in survivors if idx not in removed]
    report.kept = len(keep)
    logger.info("Deduplication: %s", report.summary())
    return keep, report


class LeakageError(RuntimeError):
    """Raised when the same content appears in more than one split."""


def audit_leakage(
    splits: Dict[str, Sequence[str]],
    threshold: float = NEAR_DUPLICATE_THRESHOLD,
    fail_on_leak: bool = True,
) -> Dict[str, int]:
    """
    Step 6 -- no article, and no near-identical variant, in more than one split.

    Raises LeakageError by default. A test score computed over a leaked split
    is not a measurement, and shipping one into the report is worse than having
    no number at all.
    """
    names = list(splits.keys())
    signatures = {
        name: [(_minhash(t), t) for t in texts] for name, texts in splits.items()
    }
    exact = {
        name: {exact_hash(t): t for t in texts} for name, texts in splits.items()
    }

    findings: Dict[str, int] = {}
    details: List[str] = []

    for i, name_a in enumerate(names):
        for name_b in names[i + 1 :]:
            pair = f"{name_a}~{name_b}"
            count = 0

            overlap = set(exact[name_a]) & set(exact[name_b])
            for digest in overlap:
                count += 1
                if len(details) < 10:
                    details.append(
                        f"  exact  [{pair}] {exact[name_a][digest][:90]!r}"
                    )

            for sig_a, text_a in signatures[name_a]:
                for sig_b, text_b in signatures[name_b]:
                    if exact_hash(text_a) == exact_hash(text_b):
                        continue  # already counted
                    if jaccard(sig_a, sig_b) >= threshold:
                        count += 1
                        if len(details) < 10:
                            details.append(
                                f"  near   [{pair}] {text_a[:70]!r} ~ {text_b[:70]!r}"
                            )

            findings[pair] = count

    total = sum(findings.values())
    if total:
        message = (
            f"Leakage audit FAILED: {total} overlapping item(s) across splits.\n"
            + "\n".join(details)
            + "\n\nEvery metric computed on these splits is inflated. Re-run "
            "deduplication over the combined corpus before splitting, rather "
            "than per-split."
        )
        if fail_on_leak:
            raise LeakageError(message)
        logger.warning(message)
    else:
        logger.info("Leakage audit passed: no overlap across %s", ", ".join(names))

    return findings


def stratified_split(
    labels: Sequence[int],
    ratios: Tuple[float, float, float] = (0.8, 0.1, 0.1),
    seed: int = 42,
) -> Tuple[List[int], List[int], List[int]]:
    """
    Step 7 -- stratified 80/10/10 preserving class distribution.

    Stratification matters here because the corpus is heavily imbalanced: a
    random split can leave the test set with too few fake articles for its
    recall figure to mean anything.
    """
    import random

    if abs(sum(ratios) - 1.0) > 1e-6:
        raise ValueError(f"Split ratios must sum to 1.0, got {ratios}")

    rng = random.Random(seed)
    by_label: Dict[int, List[int]] = defaultdict(list)
    for idx, label in enumerate(labels):
        by_label[int(label)].append(idx)

    train: List[int] = []
    val: List[int] = []
    test: List[int] = []

    for label, indices in sorted(by_label.items()):
        shuffled = indices[:]
        rng.shuffle(shuffled)
        n = len(shuffled)
        n_train = int(n * ratios[0])
        n_val = int(n * ratios[1])
        train.extend(shuffled[:n_train])
        val.extend(shuffled[n_train : n_train + n_val])
        test.extend(shuffled[n_train + n_val :])
        logger.info(
            "class %s: %d rows -> train %d / val %d / test %d",
            label,
            n,
            n_train,
            n_val,
            n - n_train - n_val,
        )

    rng.shuffle(train)
    rng.shuffle(val)
    rng.shuffle(test)
    return train, val, test


def class_weights(labels: Sequence[int]) -> Dict[int, float]:
    """
    Inverse-frequency weights for class-weighted cross-entropy.

    Required rather than optional: with a heavily imbalanced corpus, an
    unweighted model reaches high accuracy by predicting the majority class and
    never learns the minority one -- which is the class that matters.
    """
    counts: Dict[int, int] = defaultdict(int)
    for label in labels:
        counts[int(label)] += 1
    total = sum(counts.values())
    n_classes = len(counts)
    weights = {
        label: total / (n_classes * count) for label, count in sorted(counts.items())
    }
    logger.info(
        "Class distribution %s -> weights %s",
        {k: f"{v / total:.1%}" for k, v in sorted(counts.items())},
        {k: round(v, 3) for k, v in weights.items()},
    )
    return weights
