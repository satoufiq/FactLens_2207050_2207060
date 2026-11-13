"""
Claim-evidence matching.

For each retrieved article, decide whether it is about the same proposition as
the claim and, if so, whether it says the same thing or the opposite.

1. Both texts are normalised and lightly stemmed (নুসরাতের -> নুসরাত), so
   inflection and quoting do not hide a match.
2. Every sentence of the article (headline first) is scored by how much of the
   claim's content it covers. A quoted speaker ("…: তোজাম্মেল হক") is not
   required -- outlets name the same person differently.
3. Polarity is compared, not counted. The claim may itself be a negation
   ("আগুনের কারণ শর্ট সার্কিট নয়"); an article saying the same negative thing
   supports it, and an article affirming it contradicts it. Negators and
   refuting words ("গুজব", "মিথ্যা") only count when they sit next to the
   matched words, and two of them cancel.
4. For time-anchored claims (আজ / কাল / এই মাসে / ajke / kalke / ei mash e),
   only articles whose publication date falls inside that window can take a
   position; articles outside it are excluded, undated ones are down-weighted.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from rapidfuzz import fuzz

from ..utils.bn_text import (
    ClaimFrame,
    build_claim_frame,
    has_antonym_of,
    is_content,
    is_hedged,
    is_refuter,
    norm,
    polarity,
    split_clauses,
    split_sentences,
    stem,
    stems_match,
)
from ..utils.date_parser import resolve_article_publication_date

FACTCHECK_URL_PATTERNS = [
    "factcheck", "fact-check", "rumorscanner", "factwatch", "boombd", "jachai",
    "snopes", "politifact", "afp.com", "reuters.com/fact-check", "altnews",
]

# A sentence must cover this much of the claim to take a position on it.
STANCE_MATCH_THRESHOLD = 0.60
# Below this the article is not about the claim at all.
RELEVANCE_FLOOR = 30.0

# Publication windows (days) for time-anchored claims
WINDOW_DAYS = {"DAY": 3.0, "MONTH": 35.0, "YEAR": 366.0}


class _SegmentMatch:
    __slots__ = ("score", "coverage", "negated", "is_question", "is_hedged", "in_title", "text")

    def __init__(self, score, coverage, negated, is_question, is_hedged, in_title, text):
        self.score = score
        self.coverage = coverage
        self.negated = negated
        self.is_question = is_question
        self.is_hedged = is_hedged
        self.in_title = in_title
        self.text = text


class EvidenceMatchingService:
    """Relevance, directness, temporal fit and stance for one evidence item."""

    def __init__(self) -> None:
        self._frames: Dict[str, ClaimFrame] = {}

    # -- claim ---------------------------------------------------------------

    def _frame(self, claim_data: Dict[str, Any]) -> ClaimFrame:
        text = claim_data.get("normalized_text") or claim_data.get("raw_text") or ""
        if text not in self._frames:
            self._frames[text] = build_claim_frame(text)
        return self._frames[text]

    # -- matching ------------------------------------------------------------

    @staticmethod
    def _coverage(frame: ClaimFrame, seg_stems: List[str], core: bool = False) -> Tuple[float, List[int]]:
        """Weighted share of claim content (or of its core statement) found in the segment, and where."""
        content, weights = (frame.core, frame.core_weights) if core else (frame.content, frame.weights)
        if not content:
            return 0.0, []
        got = 0.0
        positions: List[int] = []
        for c, w in zip(content, weights):
            for i, s in enumerate(seg_stems):
                if s and stems_match(c, s):
                    got += w
                    positions.append(i)
                    break
        return got / sum(weights), positions

    def _match_segment(self, frame: ClaimFrame, sentence: str, in_title: bool) -> Optional[_SegmentMatch]:
        clauses = split_clauses(sentence)
        if not clauses:
            return None
        flat: List[str] = [t for c in clauses for t in c]
        flat_stems = [stem(t) if is_content(t) else "" for t in flat]
        coverage, _ = self._coverage(frame, flat_stems)
        if coverage <= 0:
            return None

        # Polarity from the clause that carries the claim's focus (what it asserts),
        # then the most claim content.
        def focus_hits(stems_: List[str]) -> int:
            return sum(1 for f in frame.focus if any(s and stems_match(f, s) for s in stems_))

        best_clause, best_key, best_pos = clauses[0], (-1, -1.0), []
        for clause in clauses:
            stems_ = [stem(t) if is_content(t) else "" for t in clause]
            cov, pos = self._coverage(frame, stems_)
            key = (focus_hits(stems_), cov)
            if key > best_key:
                best_clause, best_key, best_pos = clause, key, pos
        negated = polarity(best_clause, best_pos)
        clause_stems = [stem(t) if is_content(t) else "" for t in best_clause]
        antonym = has_antonym_of(frame.focus, clause_stems)
        if antonym:
            negated = not negated            # "খোলা থাকবে" answers "বন্ধ থাকবে" with its opposite
        focus_found = focus_hits(flat_stems) > 0 or antonym or not frame.focus
        hedged = is_hedged(best_clause, best_pos)

        # A refuting word elsewhere in the same sentence ("… — এই খবর ভুয়া")
        # frames the whole sentence as a denial.
        if not negated and len(clauses) > 1:
            others = [t for c in clauses if c is not best_clause for t in c]
            if any(is_refuter(t) for t in others):
                negated = True

        phrase = fuzz.partial_ratio(frame.text, sentence) / 100.0
        score = 0.8 * coverage + 0.2 * phrase
        if frame.core:
            # The sentence may report only the claim's main statement and not
            # its extra details: that is support for the part it states, so it
            # scores on the core, discounted by how much of the rest is missing.
            core_cov, _ = self._coverage(frame, flat_stems, core=True)
            core_phrase = fuzz.partial_ratio(frame.core_text, sentence) / 100.0
            core_score = (0.8 * core_cov + 0.2 * core_phrase) * (0.8 + 0.2 * coverage)
            score = max(score, core_score)
        if not focus_found:
            # Same subject, but nothing about what the claim asserts
            score = min(score, STANCE_MATCH_THRESHOLD - 0.05)
        return _SegmentMatch(
            score=score,
            coverage=coverage,
            negated=negated,
            is_question="?" in sentence,
            is_hedged=hedged,
            in_title=in_title,
            text=sentence[:300],
        )

    def _best_match(self, frame: ClaimFrame, title: str, snippet: str, content: str) -> Optional[_SegmentMatch]:
        candidates: List[_SegmentMatch] = []
        for sent in split_sentences(title):
            m = self._match_segment(frame, sent, in_title=True)
            if m:
                candidates.append(m)
        for sent in split_sentences(snippet) + split_sentences(content[:5000]):
            m = self._match_segment(frame, sent, in_title=False)
            if m:
                candidates.append(m)
        if not candidates:
            return None
        top = max(c.score for c in candidates)
        # Prefer the headline when it is about as good as the best body sentence:
        # headlines state an article's position; body text also quotes what it rebuts.
        near = [c for c in candidates if c.score >= top - 0.05]
        titled = [c for c in near if c.in_title]
        return max(titled or near, key=lambda c: c.score)

    # -- temporal --------------------------------------------------------------

    @staticmethod
    def _temporal(evidence_item: Dict[str, Any], scope: str, snippet: str, content: str):
        age_days = evidence_item.get("article_age_days")
        if age_days is None:
            _, age_days = resolve_article_publication_date(
                raw_date=evidence_item.get("published_date"),
                url=evidence_item.get("url"),
                snippet=snippet,
                content=content,
            )
        window = WINDOW_DAYS.get(scope)
        if window is None:
            # General claim: recency matters little
            if age_days is not None and age_days > 1800:
                return age_days, 50.0, True, False
            return age_days, 80.0, True, False
        if age_days is None:
            return age_days, 40.0, True, True       # date unknown: usable, down-weighted
        if age_days <= window:
            return age_days, 95.0, True, False
        return age_days, 0.0, False, False           # outside the claim's period

    # -- entry point ----------------------------------------------------------

    def analyze_evidence_item(self, claim_data: Dict[str, Any], evidence_item: Dict[str, Any]) -> Dict[str, Any]:
        frame = self._frame(claim_data)
        temporal_profile = claim_data.get("temporal_profile") or {}
        scope = temporal_profile.get("timeline_scope", "GENERAL")

        title = norm(evidence_item.get("title") or "")
        snippet = norm(evidence_item.get("snippet") or "")
        content = norm(evidence_item.get("content") or "")
        url_lower = (evidence_item.get("url") or "").lower()
        is_factcheck = any(p in url_lower for p in FACTCHECK_URL_PATTERNS)

        best = self._best_match(frame, title, snippet, content)

        # Document-level relevance: coverage across headline + snippet + body
        doc_tokens = [t for c in split_clauses(f"{title} {snippet} {content[:5000]}") for t in c]
        doc_cov, _ = self._coverage(frame, [stem(t) if is_content(t) else "" for t in doc_tokens])
        best_score = best.score if best else 0.0
        relevance = round(max(5.0, min(100.0, 100.0 * (0.6 * best_score + 0.4 * doc_cov))), 1)

        if best and best.in_title:
            directness = 60.0 + 38.0 * best.coverage
        elif best:
            directness = 40.0 + 45.0 * best.coverage
        else:
            directness = 15.0
        directness = round(directness, 1)

        age_days, temporal_match, in_window, date_unknown = self._temporal(evidence_item, scope, snippet, content)

        # -- stance ----------------------------------------------------------
        agrees: Optional[bool] = None
        if relevance < RELEVANCE_FLOOR or best is None:
            stance = "INSUFFICIENT"
            reason = "The article is not about this claim."
        elif not in_window:
            stance = "INSUFFICIENT"
            age_txt = f"{int(age_days)} days old" if age_days is not None else "undated"
            reason = (
                f"Published outside the claim's time period ({age_txt}); "
                f"it cannot speak to a '{scope.lower()}' claim."
            )
        elif best.score < STANCE_MATCH_THRESHOLD:
            stance = "NEUTRAL"
            reason = "Related coverage, but no sentence states the claim itself."
        elif best.is_question and not frame.is_question:
            stance = "NEUTRAL"
            reason = "The article raises the claim as a question without answering it."
        elif best.is_hedged:
            stance = "NEUTRAL"
            reason = "The article only says this may be the case; it does not state it."
        else:
            evidence_negated = best.negated
            if is_factcheck and best.in_title and not evidence_negated:
                # Fact-check headlines that restate a claim usually rate it false
                evidence_negated = any(is_refuter(t) for c in split_clauses(title) for t in c)
            agrees = evidence_negated == frame.negated
            stance = "SUPPORTING" if agrees else "CONTRADICTING"
            where = "headline" if best.in_title else "text"
            if agrees:
                reason = f"The article's {where} states the same thing as the claim."
            elif frame.negated:
                reason = f"The claim denies something the article's {where} affirms."
            else:
                reason = f"The article's {where} denies or refutes the claim."

        # -- scores (0-100), consumed by the fuzzy engine --------------------
        temporal_factor = 0.6 if date_unknown else 1.0
        strength = 100.0 * (best.score if best else 0.0) * temporal_factor
        if stance == "SUPPORTING":
            support_score, contradiction_score = round(min(100.0, strength), 1), 5.0
        elif stance == "CONTRADICTING":
            support_score, contradiction_score = 5.0, round(min(100.0, strength), 1)
        else:
            support_score = round(min(25.0, strength * 0.25), 1)
            contradiction_score = round(min(20.0, strength * 0.2), 1)

        return {
            "relevance_score": relevance,
            "directness_score": directness,
            "temporal_match_score": round(temporal_match, 1),
            "temporal_is_stale": not in_window,
            "date_unknown": date_unknown,
            "article_age_days": round(age_days, 1) if age_days is not None else None,
            "support_score": support_score,
            "contradiction_score": contradiction_score,
            "match_score": round(best_score * 100.0, 1),
            "matched_text": best.text if best else None,
            "polarity_agrees": agrees,
            "stance": stance,
            "reason": reason,
        }
