"""
Final verdict: BanglaVerify is the primary tool, web evidence the backup.

Rule
----
1. **Confident model -> the model decides.** When BanglaVerify's confidence in
   its own label (probability of the predicted class) is at least
   ``MODEL_DECISIVE_CONFIDENCE`` (0.80), the verdict follows the model alone:
   REAL -> Supported, FAKE -> Contradicted. Evidence is still reported, and a
   disagreement is stated, but it does not change the verdict.

   Claims tied to a time window (আজকে / গতকাল / আগামীকাল / পরশু / এই মাসে /
   আগামী বছর ...) need evidence more -- a text model cannot know whether a
   particular day's event happened -- so for them the bar is raised by
   ``TEMPORAL_BAR_RAISE`` (to 0.90): only a very confident model decides alone.

2. **Otherwise the evidence decides.** Supporting vs contradicting strength
   (match quality x source reliability, combined by noisy-or) gives the verdict
   when one side clearly outweighs the other. Agreement with the model raises
   the confidence a little; disagreement lowers it.

3. **No usable evidence and a non-decisive model -> Unverified**, marked
   "suspicious" when the model leans fake.

Both cut-offs can be changed with the environment variables
``BANGLAVERIFY_DECISIVE_CONFIDENCE`` and ``BANGLAVERIFY_TEMPORAL_BAR_RAISE``.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence

from factlens_common.lifecycle import RumorVerdict

logger = logging.getLogger("factlens.rumor.verdict")

MODEL_DECISIVE_CONFIDENCE = float(os.environ.get("BANGLAVERIFY_DECISIVE_CONFIDENCE", "0.80"))
TEMPORAL_BAR_RAISE = float(os.environ.get("BANGLAVERIFY_TEMPORAL_BAR_RAISE", "0.10"))
TEMPORAL_SCOPES = ("DAY", "MONTH", "YEAR")
EVIDENCE_PRESENT = 0.25         # evidence strength needed to count as evidence
EVIDENCE_MARGIN = 0.15          # one side must outweigh the other by this much


@dataclass
class PrecedenceDecision:
    verdict: str
    confidence: float
    #: model | model+evidence | evidence | no_signal
    decided_by: str
    overrode_fuzzy: bool = False
    fuzzy_verdict: Optional[str] = None
    model_label: Optional[str] = None
    model_confidence: Optional[float] = None
    disagreement: Optional[str] = None
    rationale: List[str] = field(default_factory=list)
    rationale_bn: List[str] = field(default_factory=list)
    evidence_strength: Dict[str, Any] = field(default_factory=dict)
    weights: Dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> Dict[str, Any]:
        return {
            "verdict": self.verdict,
            "confidence": round(self.confidence, 4),
            "decided_by": self.decided_by,
            "overrode_fuzzy": self.overrode_fuzzy,
            "fuzzy_verdict": self.fuzzy_verdict,
            "model_label": self.model_label,
            "model_confidence": self.model_confidence,
            "disagreement": self.disagreement,
            "rationale": self.rationale,
            "rationale_bn": self.rationale_bn,
            "evidence_strength": self.evidence_strength,
            "weights": self.weights,
        }


def _noisy_or(values: Sequence[float]) -> float:
    p = 1.0
    for v in values:
        p *= 1.0 - max(0.0, min(1.0, v))
    return 1.0 - p


def measure_evidence(evidence_items: Sequence[Dict[str, Any]], independent_sources: int = 0) -> Dict[str, Any]:
    """Support and contradiction strength in [0, 1] from the stance-labelled items."""
    sup, con = [], []
    for item in evidence_items:
        stance = (item.get("stance") or "").upper()
        if stance not in ("SUPPORTING", "CONTRADICTING"):
            continue
        score = float(item.get("support_score" if stance == "SUPPORTING" else "contradiction_score") or 0.0) / 100.0
        reliability = float(item.get("source_reliability") or 50.0) / 100.0
        # An unreliable source still counts, but for much less
        strength = score * (0.35 + 0.65 * reliability)
        (sup if stance == "SUPPORTING" else con).append(strength)
    support = _noisy_or(sup)
    contradiction = _noisy_or(con)
    return {
        "supporting": len(sup),
        "contradicting": len(con),
        "support_strength": round(support, 3),
        "contradiction_strength": round(contradiction, 3),
        "independent_sources": independent_sources,
    }


def _model_reading(model_prediction) -> Optional[Dict[str, Any]]:
    """Label, confidence in that label, and p_fake / threshold for the report."""
    if not (model_prediction and model_prediction.available and model_prediction.label in ("FAKE", "REAL")):
        return None
    raw = model_prediction.raw or {}
    p_fake = raw.get("p_fake")
    if p_fake is None:
        p_fake = (model_prediction.probabilities or {}).get("FAKE", 0.5)
    p_fake = float(p_fake)
    label = model_prediction.label
    confidence = model_prediction.confidence
    if confidence is None:
        confidence = p_fake if label == "FAKE" else 1.0 - p_fake
    return {
        "label": label,
        "confidence": float(confidence),
        "p_fake": p_fake,
        "threshold": float(raw.get("threshold") or 0.5),
    }


class ResultPrecedenceGate:
    """Combines the BanglaVerify reading with the web evidence."""

    def decide(
        self,
        fuzzy_result: Dict[str, Any],
        evidence_items: Sequence[Dict[str, Any]],
        model_prediction=None,
        independent_sources: int = 0,
        temporal_profile: Optional[Dict[str, Any]] = None,
    ) -> PrecedenceDecision:
        temporal_profile = temporal_profile or {}
        scope = temporal_profile.get("timeline_scope", "GENERAL")
        time_anchored = scope in TEMPORAL_SCOPES
        fuzzy_verdict = (fuzzy_result or {}).get("verdict")

        ev = measure_evidence(evidence_items, independent_sources)
        support, contra = ev["support_strength"], ev["contradiction_strength"]
        t_evidence = support - contra
        has_evidence = max(support, contra) >= EVIDENCE_PRESENT
        if has_evidence and abs(t_evidence) >= EVIDENCE_MARGIN:
            evidence_side = "REAL" if t_evidence > 0 else "FAKE"
        else:
            evidence_side = None          # no evidence, or it is split

        model = _model_reading(model_prediction)
        bar = min(0.99, MODEL_DECISIVE_CONFIDENCE + (TEMPORAL_BAR_RAISE if time_anchored else 0.0))
        model_decisive = bool(model) and model["confidence"] >= bar

        weights = {
            "model_decisive_bar": round(bar, 3),
            "model_confidence": round(model["confidence"], 4) if model else None,
            "model_decisive": model_decisive,
            "time_window": scope,
            "support_strength": support,
            "contradiction_strength": contra,
            "evidence_side": evidence_side,
        }

        rationale: List[str] = []
        rationale_bn: List[str] = []
        disagreement: Optional[str] = None

        if model:
            reads = "fake news" if model["label"] == "FAKE" else "genuine reporting"
            reads_bn = "ভুয়া খবরের মতো" if model["label"] == "FAKE" else "সাধারণ সংবাদের মতো"
            rationale.append(
                f"BanglaVerify reads the text as {reads} with {model['confidence']:.0%} confidence "
                f"(fake probability {model['p_fake']:.0%}, threshold {model['threshold']:.0%})."
            )
            rationale_bn.append(
                f"BanglaVerify মডেল লেখাটিকে {reads_bn} মনে করে ({model['confidence']:.0%} আস্থা)।"
            )
        if has_evidence:
            rationale.append(
                f"Web evidence: {ev['supporting']} source(s) state the same as the claim and "
                f"{ev['contradicting']} state the opposite."
            )
            rationale_bn.append(
                f"ওয়েবে প্রাপ্ত প্রমাণ: {ev['supporting']}টি উৎস দাবির সঙ্গে একই কথা বলে এবং "
                f"{ev['contradicting']}টি বিপরীত কথা বলে।"
            )
        else:
            rationale.append("No article was found that clearly states or denies the claim.")
            rationale_bn.append("দাবিটি স্পষ্টভাবে সমর্থন বা অস্বীকার করে এমন কোনো সংবাদ পাওয়া যায়নি।")
        if time_anchored:
            rationale.append(
                f"The claim refers to a specific time ({scope.lower()}), so only articles published "
                f"in that period were used, and the model decides alone only at {bar:.0%} confidence or more."
            )
            rationale_bn.append("দাবিতে নির্দিষ্ট সময়ের উল্লেখ আছে, তাই শুধু ওই সময়ে প্রকাশিত সংবাদ বিবেচনা করা হয়েছে।")

        # -- 1. confident model decides ------------------------------------------
        if model_decisive:
            verdict = RumorVerdict.SUPPORTED.value if model["label"] == "REAL" else RumorVerdict.CONTRADICTED.value
            confidence = model["confidence"]
            decided_by = "model"
            rationale.append(
                f"The model's confidence is at or above {bar:.0%}, so the verdict follows the model; "
                f"web evidence is the backup."
            )
            rationale_bn.append(f"মডেলের আস্থা {bar:.0%} বা তার বেশি, তাই রায় মডেলের ভিত্তিতে দেওয়া হয়েছে।")
            if evidence_side and evidence_side != model["label"]:
                disagreement = (
                    "The retrieved articles point the other way; read them before relying on this result."
                )
                rationale_bn.append("তবে প্রাপ্ত সংবাদ বিপরীত দিক নির্দেশ করে; ফলাফলের ওপর নির্ভর করার আগে সংবাদগুলো দেখুন।")
            elif evidence_side == model["label"]:
                decided_by = "model+evidence"
                confidence = min(0.99, confidence + 0.03)

        # -- 2. otherwise evidence decides -----------------------------------------
        elif evidence_side:
            verdict = RumorVerdict.SUPPORTED.value if evidence_side == "REAL" else RumorVerdict.CONTRADICTED.value
            confidence = 0.5 + 0.45 * min(1.0, abs(t_evidence))
            if model and model["label"] == evidence_side:
                decided_by = "model+evidence"
                confidence += 0.05
            else:
                decided_by = "evidence"
                if model:
                    confidence -= 0.05
                    disagreement = "BanglaVerify leaned the other way, but with low confidence; the evidence decided."
            confidence = max(0.5, min(0.97, confidence))
            rationale.append(
                "The model was not confident enough to decide alone, so the verdict follows the web evidence."
                if model else "BanglaVerify was unavailable; the verdict follows the web evidence."
            )
            rationale_bn.append("মডেল যথেষ্ট নিশ্চিত না হওয়ায় রায় ওয়েবের প্রমাণের ভিত্তিতে দেওয়া হয়েছে।")

        # -- 3. nothing decisive -----------------------------------------------------
        elif model:
            verdict = (
                RumorVerdict.UNVERIFIED_SUSPICIOUS.value if model["label"] == "FAKE"
                else RumorVerdict.UNVERIFIED.value
            )
            confidence = 0.3 + 0.3 * (model["confidence"] - 0.5) / 0.5
            decided_by = "model"
            if has_evidence:
                disagreement = "The retrieved articles are split between supporting and denying the claim."
        else:
            verdict = RumorVerdict.UNVERIFIED.value
            confidence = 0.3
            decided_by = "no_signal"

        if verdict.startswith("UNVERIFIED"):
            rationale.append("Unverified means the claim could not be established either way; it is not a finding that the claim is false.")
            rationale_bn.append("অযাচাইকৃত মানে দাবিটি কোনো দিকেই প্রতিষ্ঠিত করা যায়নি; এর অর্থ দাবিটি মিথ্যা নয়।")

        decision = PrecedenceDecision(
            verdict=verdict,
            confidence=round(float(confidence), 4),
            decided_by=decided_by,
            overrode_fuzzy=bool(fuzzy_verdict) and verdict != fuzzy_verdict,
            fuzzy_verdict=fuzzy_verdict,
            model_label=model["label"] if model else None,
            model_confidence=model["confidence"] if model else None,
            disagreement=disagreement,
            rationale=rationale,
            rationale_bn=rationale_bn,
            evidence_strength=ev,
            weights=weights,
        )
        logger.info("Verdict %s (model=%s, bar=%.2f, evidence=%s, decided_by=%s)",
                    verdict, model and f"{model['label']}@{model['confidence']:.2f}", bar, evidence_side, decided_by)
        return decision
