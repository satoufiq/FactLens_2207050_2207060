"""
Result aggregation and explanation for Image Check.

Proposal, Module 3 steps 6 and 7:

    Result aggregation -- metadata signals, technical signals, and model output
    are combined. If any component is unavailable, the result is marked PARTIAL.
    Explanation generation -- a user-facing explanation of what was detected and
    at what confidence.

Weighting
---------
The proposal does not fix the weights, so they are declared here and written
into the result so a past assessment stays reproducible:

    model 50% | technical 30% | metadata 20%    (ImageAuth registered)
    technical 60% | metadata 40%                (ImageAuth unavailable -> PARTIAL)

One exception overrides the arithmetic: a Software tag naming a generator is a
checkable fact, not an inference, so it alone is enough for Likely AI-Generated.

Confidence
----------
When the model is present, user-facing confidence is derived from its
*out-of-distribution* figure, not its in-distribution one. A detector scoring
0.97 on generators it trained on and 0.62 on one it has never seen is a 0.62
detector in front of a real user.

Every result carries the standing caveat the proposal requires: AI-image
detection is an unsolved problem, a negative result is not proof of
authenticity, and the assessment is not evidence of fraud on its own.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from factlens_common.lifecycle import ImageAssessment

logger = logging.getLogger("factlens.image.aggregate")

WEIGHTS_WITH_MODEL = {"model": 0.50, "technical": 0.30, "metadata": 0.20}
WEIGHTS_NO_MODEL = {"technical": 0.60, "metadata": 0.40}

#: Score bands on 0-100, where higher means more likely synthetic/manipulated
#: and 50 means "no information either way". Both bands sit ABOVE neutral: an
#: image with no evidence against it must not land in a suspicious category.
BAND_AI_GENERATED = 70.0
BAND_POSSIBLE_MANIPULATION = 58.0

#: Without ImageAuth, heuristics may flag an image for a closer look but may
#: never call it AI-generated on their own. Screenshots, re-saved social-media
#: images and graphics all trip the no-EXIF and atypical-spectrum checks, and
#: labelling those "AI-generated" would be a false accusation. Only a checkable
#: fact -- a generator's own Software tag -- can reach that band without a model.
NO_MODEL_SCORE_CEILING = BAND_AI_GENERATED - 0.1

STANDING_CAVEAT = (
    "Detecting AI-generated imagery is an unsolved problem. A negative result is "
    "not proof that an image is authentic, and this assessment should not be used "
    "as evidence of fraud on its own."
)
STANDING_CAVEAT_BN = (
    "এআই-নির্মিত ছবি শনাক্ত করা এখনও একটি অমীমাংসিত সমস্যা। নেতিবাচক ফলাফল ছবিটি আসল "
    "হওয়ার প্রমাণ নয়, এবং এই মূল্যায়ন একা প্রতারণার প্রমাণ হিসেবে ব্যবহার করা উচিত নয়।"
)


@dataclass
class ImageVerdict:
    assessment: str
    score: float
    confidence: float
    ai_probability: Optional[float] = None
    manipulation_probability: Optional[float] = None
    model_available: bool = False
    weights_used: Dict[str, float] = field(default_factory=dict)
    components: Dict[str, Any] = field(default_factory=dict)
    override_applied: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "assessment": self.assessment,
            "score": round(self.score, 2),
            "confidence": round(self.confidence, 4),
            "ai_probability": self.ai_probability,
            "manipulation_probability": self.manipulation_probability,
            "model_available": self.model_available,
            "weights_used": self.weights_used,
            "components": self.components,
            "override_applied": self.override_applied,
        }


def _signal_score(signals: List[Any]) -> Optional[float]:
    """
    Collapse a signal list to 0-100, with 50 meaning "no information".

    Evidence accumulates as the sum of direction * strength and is squashed
    with tanh, so:
      * a single weak signal moves the score only slightly (no_exif alone:
        0.2 * 0.25 = 0.05 -> ~52.5), and
      * several agreeing strong signals approach, but never exceed, the ends.

    A weighted *mean* of directions -- the obvious alternative -- would let one
    weak signal count at full force, because its strength cancels out of the
    ratio. That made a lone "no EXIF" reading look like strong evidence.
    """
    if not signals:
        return None
    evidence = sum(s.direction * s.strength for s in signals)
    return 50.0 + 50.0 * math.tanh(evidence)


class ImageResultAggregator:
    """Combines metadata, technical signals and the ImageAuth prior."""

    def aggregate(self, metadata, technical, model_prediction=None) -> ImageVerdict:
        model_available = bool(model_prediction and model_prediction.available)

        metadata_score = _signal_score(metadata.signals) if metadata.available else None
        technical_score = _signal_score(technical.signals) if technical.available else None

        ai_probability = None
        manipulation_probability = None
        model_score = None
        if model_available:
            raw = model_prediction.raw or {}
            ai_probability = raw.get("ai_probability")
            manipulation_probability = raw.get("manipulation_probability")
            if ai_probability is not None:
                model_score = float(ai_probability) * 100.0

        contributions: Dict[str, float] = {}
        weights: Dict[str, float] = {}

        if model_score is not None:
            contributions["model"] = model_score
            weights["model"] = WEIGHTS_WITH_MODEL["model"]
        if technical_score is not None:
            contributions["technical"] = technical_score
            weights["technical"] = (
                WEIGHTS_WITH_MODEL if model_score is not None else WEIGHTS_NO_MODEL
            )["technical"]
        if metadata_score is not None:
            contributions["metadata"] = metadata_score
            weights["metadata"] = (
                WEIGHTS_WITH_MODEL if model_score is not None else WEIGHTS_NO_MODEL
            )["metadata"]

        if not contributions:
            return ImageVerdict(
                assessment=ImageAssessment.UNABLE_TO_ANALYZE.value,
                score=0.0,
                confidence=0.0,
                model_available=model_available,
                components={"reason": "No analysis component produced a usable signal."},
            )

        weight_sum = sum(weights.values()) or 1.0
        normalized = {k: v / weight_sum for k, v in weights.items()}
        score = sum(contributions[k] * normalized[k] for k in contributions)

        override = None

        # A generator software tag is a fact, not an inference.
        for signal in metadata.signals:
            if signal.code == "generator_software_tag":
                score = max(score, 88.0)
                override = "generator_software_tag"
                break

        if model_score is None and override is None and score > NO_MODEL_SCORE_CEILING:
            score = NO_MODEL_SCORE_CEILING
            override = "no_model_ceiling"

        assessment = self._band(score, manipulation_probability, metadata, technical)

        return ImageVerdict(
            assessment=assessment,
            score=score,
            confidence=self._confidence(score, model_prediction, model_available, override),
            ai_probability=ai_probability,
            manipulation_probability=manipulation_probability,
            model_available=model_available,
            weights_used=normalized,
            components={
                "metadata_score": round(metadata_score, 2) if metadata_score is not None else None,
                "technical_score": round(technical_score, 2) if technical_score is not None else None,
                "model_score": round(model_score, 2) if model_score is not None else None,
                "metadata_signal_count": len(metadata.signals),
                "technical_signal_count": len(technical.signals),
                "model_version": (
                    model_prediction.model_version if model_prediction else None
                ),
            },
            override_applied=override,
        )

    @staticmethod
    def _band(
        score: float,
        manipulation_probability: Optional[float],
        metadata,
        technical,
    ) -> str:
        if score >= BAND_AI_GENERATED:
            return ImageAssessment.LIKELY_AI_GENERATED.value
        if manipulation_probability is not None and manipulation_probability >= 0.5:
            return ImageAssessment.POSSIBLE_MANIPULATION.value
        if score >= BAND_POSSIBLE_MANIPULATION:
            return ImageAssessment.POSSIBLE_MANIPULATION.value
        return ImageAssessment.LIKELY_AUTHENTIC.value

    @staticmethod
    def _confidence(
        score: float,
        model_prediction,
        model_available: bool,
        override: Optional[str],
    ) -> float:
        if override == "generator_software_tag":
            return 0.9

        # Distance from the "no information" midpoint.
        base = 0.35 + 0.45 * (abs(score - 50.0) / 50.0)

        if model_available and model_prediction is not None:
            # Derive from the out-of-distribution number, not the optimistic one.
            ood = (model_prediction.raw or {}).get("ood_accuracy")
            if isinstance(ood, (int, float)) and 0 < float(ood) <= 1:
                base *= float(ood)
            else:
                # No held-out figure recorded: do not grant the model full trust.
                base *= 0.8
        else:
            # Metadata and technical signals alone cannot carry high confidence.
            base = min(base, 0.6)

        return round(max(0.15, min(0.92, base)), 4)


class ImageExplanationBuilder:
    """Turns the verdict and its signals into what the user reads."""

    HEADLINES = {
        ImageAssessment.LIKELY_AI_GENERATED.value: (
            "Likely AI-generated — strong indicators consistent with synthetic imagery",
            "সম্ভবত এআই-নির্মিত — কৃত্রিম ছবির সঙ্গে সঙ্গতিপূর্ণ শক্তিশালী লক্ষণ",
        ),
        ImageAssessment.POSSIBLE_MANIPULATION.value: (
            "Possible manipulation — some indicators suggest the image may have been edited",
            "সম্ভাব্য কারসাজি — কিছু লক্ষণ ইঙ্গিত দেয় ছবিটি সম্পাদনা করা হতে পারে",
        ),
        ImageAssessment.LIKELY_AUTHENTIC.value: (
            "Likely authentic — no significant indicators of manipulation or AI generation",
            "সম্ভবত আসল — কারসাজি বা এআই-নির্মাণের উল্লেখযোগ্য লক্ষণ নেই",
        ),
        ImageAssessment.UNABLE_TO_ANALYZE.value: (
            "Unable to analyze — insufficient data to assess this image",
            "বিশ্লেষণ করা যায়নি — এই ছবি মূল্যায়নের মতো যথেষ্ট তথ্য নেই",
        ),
    }

    def build(
        self,
        verdict: ImageVerdict,
        metadata,
        technical,
        degraded_messages: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        headline, headline_bn = self.HEADLINES.get(
            verdict.assessment, self.HEADLINES[ImageAssessment.UNABLE_TO_ANALYZE.value]
        )

        findings: List[Dict[str, Any]] = []
        for signal in list(metadata.signals) + list(technical.signals):
            findings.append(
                {
                    "source": signal.category,
                    "code": signal.code,
                    "points_to": (
                        "synthetic"
                        if signal.direction > 0.1
                        else "authentic"
                        if signal.direction < -0.1
                        else "neutral"
                    ),
                    "weight": round(signal.strength, 2),
                    "text": signal.finding,
                    "text_bn": signal.finding_bn,
                    "caveat": signal.caveat,
                }
            )

        if verdict.model_available:
            model_note = (
                f"The ImageAuth detector put the probability of AI generation at "
                f"{verdict.ai_probability:.0%}."
                if verdict.ai_probability is not None
                else "The ImageAuth detector returned a result."
            )
        else:
            model_note = (
                "The ImageAuth detector was not available for this scan. This "
                "assessment rests on the file's metadata and the technical signals "
                "alone, which are weaker evidence than a trained detector."
            )

        return {
            "headline": headline,
            "headline_bn": headline_bn,
            "summary": self._summary(verdict, metadata, technical),
            "findings": findings,
            "model_note": model_note,
            "standing_caveat": STANDING_CAVEAT,
            "standing_caveat_bn": STANDING_CAVEAT_BN,
            "degraded": degraded_messages or [],
            "scoring": {
                "score": round(verdict.score, 2),
                "weights": verdict.weights_used,
                "components": verdict.components,
                "override_applied": verdict.override_applied,
            },
        }

    @staticmethod
    def _summary(verdict: ImageVerdict, metadata, technical) -> str:
        parts: List[str] = []

        if verdict.override_applied == "generator_software_tag":
            parts.append(
                "This file's own metadata names an AI image generator as the software "
                "that produced it."
            )
        else:
            pointing_synthetic = [
                s
                for s in list(metadata.signals) + list(technical.signals)
                if s.direction > 0.1
            ]
            if not pointing_synthetic:
                parts.append(
                    "No signal in the metadata or the technical analysis points toward "
                    "synthetic generation or editing."
                )
            else:
                parts.append(
                    f"{len(pointing_synthetic)} signal"
                    + ("s" if len(pointing_synthetic) > 1 else "")
                    + " point toward synthetic generation or editing: "
                    + ", ".join(s.code.replace("_", " ") for s in pointing_synthetic[:3])
                    + "."
                )

        if not verdict.model_available:
            parts.append(
                "This is a partial result: the ImageAuth detector was unavailable."
            )

        parts.append(STANDING_CAVEAT)
        return " ".join(parts)
