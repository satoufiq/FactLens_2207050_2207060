#!/usr/bin/env python
"""
Prepare a text dataset for BanglaVerify or ScamNet-BN.

Implements the proposal's seven data-preparation steps, in order:

    1. HTML tag and URL removal
    2. Unicode NFC normalization
    3. Whitespace normalization
    4. Length filtering (20-2,000 words for articles)
    5. Exact and near-duplicate removal -- over the WHOLE corpus, before splitting
    6. Leakage audit -- fails the run if any item crosses a split boundary
    7. Stratified 80/10/10 split

Output: train.csv, val.csv, test.csv (columns: text, label) plus
prep_report.json, which records every count the final report needs to quote.

An optional --external file is cleaned the same way and audited against all
three splits, so the external set cannot share articles with training either.

Usage
-----
    python prepare_data.py --dataset banfakenews \
        --input data/raw/banfakenews.csv \
        --text-col content --headline-col headline --label-col label \
        --external data/raw/banglafakenews2025.csv \
        --output data/processed/banglaverify
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from common.splitting import (
    audit_leakage,
    class_weights,
    deduplicate,
    stratified_split,
)
from common.text_cleaning import MAX_WORDS, MIN_WORDS, build_input, clean, length_ok

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("prepare_data")

#: Per-dataset defaults. Short social posts and SMS cannot use the article
#: length floor, or the filter would delete the whole corpus.
PRESETS = {
    "banfakenews": {"min_words": MIN_WORDS, "max_words": MAX_WORDS},
    "bd_fakedetect": {"min_words": 3, "max_words": 400},
    "scam": {"min_words": 3, "max_words": 300},
}


def load_rows(path: Path, text_col: str, headline_col: str | None, label_col: str):
    import pandas as pd

    frame = pd.read_csv(path) if path.suffix != ".jsonl" else pd.read_json(path, lines=True)
    missing = [c for c in (text_col, label_col) if c not in frame.columns]
    if missing:
        raise SystemExit(
            f"{path.name} has no column(s) {missing}. Available: {list(frame.columns)}"
        )
    texts, labels = [], []
    for _, row in frame.iterrows():
        body = row.get(text_col)
        headline = row.get(headline_col) if headline_col else None
        text = build_input(
            str(headline) if headline is not None and str(headline) != "nan" else None,
            str(body) if body is not None and str(body) != "nan" else None,
        ) if headline_col else clean(str(body or ""))
        texts.append(text)
        labels.append(row[label_col])
    return texts, labels


def encode_labels(labels, label_map: dict | None):
    """Map raw labels to integers, recording the mapping in the report."""
    if label_map:
        try:
            return [int(label_map[str(l)]) for l in labels], label_map
        except KeyError as exc:
            raise SystemExit(f"Label {exc} is not in --label-map {label_map}") from exc
    distinct = sorted({str(l) for l in labels})
    mapping = {value: index for index, value in enumerate(distinct)}
    logger.warning(
        "No --label-map given; inferred %s. Check it matches the registry's label "
        "order (BanglaVerify: FAKE=0, REAL=1).",
        mapping,
    )
    return [mapping[str(l)] for l in labels], mapping


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dataset", choices=sorted(PRESETS), required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--text-col", default="content")
    parser.add_argument("--headline-col", default=None)
    parser.add_argument("--label-col", default="label")
    parser.add_argument(
        "--label-map",
        default=None,
        help='JSON mapping raw labels to ids, e.g. \'{"0": 0, "1": 1}\' or \'{"fake": 0, "real": 1}\'',
    )
    parser.add_argument("--external", default=None, help="External validation file")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    preset = PRESETS[args.dataset]
    label_map = json.loads(args.label_map) if args.label_map else None
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    # Steps 1-3 happen inside load_rows (clean / build_input).
    texts, raw_labels = load_rows(Path(args.input), args.text_col, args.headline_col, args.label_col)
    labels, label_map = encode_labels(raw_labels, label_map)
    report = {"dataset": args.dataset, "rows_loaded": len(texts), "label_map": label_map}

    # Step 4 -- length filtering.
    kept = [
        i for i, t in enumerate(texts)
        if length_ok(t, preset["min_words"], preset["max_words"])
    ]
    report["dropped_by_length"] = len(texts) - len(kept)
    texts = [texts[i] for i in kept]
    labels = [labels[i] for i in kept]

    # Step 5 -- dedup over the whole corpus BEFORE splitting. Deduplicating each
    # split separately is the most common way leakage gets in.
    keep, dedup = deduplicate(texts)
    texts = [texts[i] for i in keep]
    labels = [labels[i] for i in keep]
    report["exact_duplicates_removed"] = dedup.exact_removed
    report["near_duplicates_removed"] = dedup.near_removed

    # Step 7 -- stratified split.
    train_idx, val_idx, test_idx = stratified_split(labels, seed=args.seed)
    splits = {
        "train": [texts[i] for i in train_idx],
        "val": [texts[i] for i in val_idx],
        "test": [texts[i] for i in test_idx],
    }
    split_labels = {
        "train": [labels[i] for i in train_idx],
        "val": [labels[i] for i in val_idx],
        "test": [labels[i] for i in test_idx],
    }

    external_texts = external_labels = None
    if args.external:
        external_texts, raw_ext = load_rows(
            Path(args.external), args.text_col, args.headline_col, args.label_col
        )
        external_labels, _ = encode_labels(raw_ext, label_map)
        ext_keep, _ = deduplicate(external_texts)
        external_texts = [external_texts[i] for i in ext_keep]
        external_labels = [external_labels[i] for i in ext_keep]
        splits["external"] = external_texts

    # Step 6 -- leakage audit. Raises on any overlap.
    report["leakage"] = audit_leakage(splits)
    report["class_weights"] = class_weights(split_labels["train"])

    import pandas as pd

    for name in ("train", "val", "test"):
        pd.DataFrame({"text": splits[name], "label": split_labels[name]}).to_csv(
            output / f"{name}.csv", index=False
        )
        report[f"{name}_rows"] = len(splits[name])
    if external_texts is not None:
        pd.DataFrame({"text": external_texts, "label": external_labels}).to_csv(
            output / "external.csv", index=False
        )
        report["external_rows"] = len(external_texts)

    total = sum(1 for _ in split_labels["train"])
    majority = max(report["class_weights"], key=lambda k: 1 / report["class_weights"][k])
    report["train_majority_share"] = round(
        split_labels["train"].count(majority) / total, 4
    ) if total else None

    (output / "prep_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
    logger.info("Wrote %s", output)
    logger.info(
        "Quote these numbers in the report, not the dataset card's: %s",
        {k: report[k] for k in ("train_rows", "val_rows", "test_rows", "train_majority_share")},
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
