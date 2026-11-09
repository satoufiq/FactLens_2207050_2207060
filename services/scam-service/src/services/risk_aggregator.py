"""
Risk assessment and explanation for Scam Alert.

ScamNet-BN alone decides
------------------------
The risk the user sees is exactly ScamNet-BN's risk (High / Medium / Low, from
the thresholds in scamnet_config.json). Nothing raises or lowers it.

An earlier version let a YAML rule engine and URL analysis raise a Low model
result to Medium. Measured on BanglaPhish-2026 (815 unseen messages) that
override caught no additional scam and raised 34 genuine bKash/Nagad security
notices to Medium, so the rule engine was removed and the model's verdict made
final (decision recorded 2026-11-13).

URL analysis is still run and shown, as information about each link; it does
not change the risk.

A message the model classes as `promo` with Low risk is labelled "Promotional
message", not "Safe" or "Low risk".
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .model_indicators import as_reasons

logger = logging.getLogger("factlens.scam.risk")

#: The model's and the API's risk names (the proposal's categories) <-> the
#: RiskLevel values stored in scan_results.result.
RISK_TO_LEVEL = {"High": "HIGH_RISK", "Medium": "MEDIUM_RISK", "Low": "LOW_RISK"}
LEVEL_TO_RISK = {
    "HIGH_RISK": "High",
    "MEDIUM_RISK": "Medium",
    "LOW_RISK": "Low",
    "UNABLE_TO_ANALYZE": "Unable to Analyze",
}

PROMOTIONAL_LABEL = "Promotional message"
RISK_LABELS = {
    "HIGH_RISK": "High Risk",
    "MEDIUM_RISK": "Medium Risk",
    "LOW_RISK": "Low Risk",
    "UNABLE_TO_ANALYZE": "Unable to Analyze",
}

CLASS_DESCRIPTIONS = {
    "smish": ("a scam (smishing) message", "একটি প্রতারণামূলক (স্মিশিং) বার্তা"),
    "promo": ("a promotional message", "একটি প্রচারমূলক বার্তা"),
    "normal": ("an ordinary message", "একটি সাধারণ বার্তা"),
}


@dataclass
class RiskAssessment:
    risk_level: str                     # HIGH_RISK | MEDIUM_RISK | LOW_RISK | UNABLE_TO_ANALYZE
    risk_score: float                   # ScamNet-BN's scam probability x 100
    confidence: float
    message_class: Optional[str] = None  # normal | promo | smish
    display_label: Optional[str] = None  # "High Risk", "Promotional message", ...
    components: Dict[str, Any] = field(default_factory=dict)

    @property
    def risk(self) -> str:
        """The proposal's category name: High, Medium, Low."""
        return LEVEL_TO_RISK.get(self.risk_level, "Unable to Analyze")

    @property
    def is_promotional(self) -> bool:
        return self.display_label == PROMOTIONAL_LABEL

    def as_dict(self) -> Dict[str, Any]:
        return {
            "risk": self.risk,
            "risk_level": self.risk_level,
            "risk_label": self.display_label or RISK_LABELS.get(self.risk_level),
            "risk_score": round(self.risk_score, 2),
            "confidence": round(self.confidence, 4),
            "message_class": self.message_class,
            "components": self.components,
        }


class ModelRiskAggregator:
    """Turns a ScamNet-BN prediction into the assessment shown to the user."""

    def aggregate(self, prediction: Dict[str, Any]) -> RiskAssessment:
        level = RISK_TO_LEVEL.get(prediction.get("risk"), "LOW_RISK")
        probabilities = prediction.get("probabilities") or {}
        p_smish = float(probabilities.get("smish", 0.0))
        message_class = prediction.get("class")

        return RiskAssessment(
            risk_level=level,
            risk_score=p_smish * 100.0,
            confidence=round(max(p_smish, 1.0 - p_smish), 4),
            message_class=message_class,
            display_label=(
                PROMOTIONAL_LABEL
                if message_class == "promo" and level == "LOW_RISK"
                else RISK_LABELS[level]
            ),
            components={
                "model_risk": prediction.get("risk"),
                "model_class": message_class,
                "model_probabilities": probabilities,
                "model_version": prediction.get("model_version"),
            },
        )


class ScamExplanationBuilder:
    """
    Turns the assessment into what the user reads.

    Proposal, "Ethical constraints": High Risk is phrased as a warning about a
    message, never as an accusation against a named person or organization.
    """

    HEADLINES = {
        "HIGH_RISK": (
            "High risk — strong signs of a fraudulent message",
            "উচ্চ ঝুঁকি — প্রতারণামূলক বার্তার শক্তিশালী লক্ষণ পাওয়া গেছে",
        ),
        "MEDIUM_RISK": (
            "Medium risk — some signs of a scam, proceed with caution",
            "মাঝারি ঝুঁকি — প্রতারণার কিছু লক্ষণ রয়েছে, সতর্ক থাকুন",
        ),
        "LOW_RISK": (
            "Low risk — no significant signs of a scam",
            "কম ঝুঁকি — প্রতারণার উল্লেখযোগ্য লক্ষণ পাওয়া যায়নি",
        ),
        "PROMOTIONAL": (
            "Promotional message — marketing, not identified as a scam",
            "প্রচারমূলক বার্তা — বিজ্ঞাপন, প্রতারণা হিসেবে চিহ্নিত হয়নি",
        ),
    }

    RECOMMENDATIONS = {
        "HIGH_RISK": (
            "Do not send money, OTPs, PINs or personal information in reply to this "
            "message, and do not open its links. If it claims to come from a bank or "
            "wallet, contact them yourself through their official app or printed "
            "helpline number — not through anything in this message.",
            "এই বার্তার জবাবে টাকা, ওটিপি, পিন বা ব্যক্তিগত তথ্য পাঠাবেন না এবং এর লিংকে "
            "ক্লিক করবেন না। এটি যদি কোনো ব্যাংক বা ওয়ালেটের নামে আসে, তবে বার্তায় দেওয়া "
            "কিছু নয় — তাদের অফিশিয়াল অ্যাপ বা ছাপা হেল্পলাইন নম্বরে নিজে যোগাযোগ করুন।",
        ),
        "MEDIUM_RISK": (
            "Treat this message with caution. Verify it independently through an "
            "official channel before acting on it, and do not share codes or payment "
            "details in reply.",
            "এই বার্তাটি সতর্কতার সঙ্গে বিবেচনা করুন। পদক্ষেপ নেওয়ার আগে অফিশিয়াল মাধ্যমে "
            "স্বাধীনভাবে যাচাই করুন এবং জবাবে কোড বা পেমেন্ট তথ্য দেবেন না।",
        ),
        "LOW_RISK": (
            "This message was not identified as a scam. That is not a guarantee of "
            "safety — if it asks for money or credentials, still verify through an "
            "official channel first.",
            "এই বার্তাটি প্রতারণা হিসেবে চিহ্নিত হয়নি। তবে এটি নিরাপত্তার নিশ্চয়তা নয় — টাকা "
            "বা গোপন তথ্য চাইলে আগে অফিশিয়াল মাধ্যমে যাচাই করুন।",
        ),
        "PROMOTIONAL": (
            "This looks like an ordinary marketing message and was not identified as a "
            "scam. Take up offers only through the company's official app, website or "
            "short code, and never share an OTP or PIN to claim one.",
            "এটি একটি সাধারণ বিজ্ঞাপনী বার্তা বলে মনে হচ্ছে এবং প্রতারণা হিসেবে চিহ্নিত হয়নি। "
            "অফার নিতে কেবল প্রতিষ্ঠানের অফিশিয়াল অ্যাপ, ওয়েবসাইট বা শর্ট কোড ব্যবহার করুন, "
            "এবং অফারের জন্য কখনো ওটিপি বা পিন দেবেন না।",
        ),
    }

    def build(
        self,
        assessment: RiskAssessment,
        model_indicators: Optional[List[str]] = None,
        url_results: Optional[List[Any]] = None,
    ) -> Dict[str, Any]:
        key = "PROMOTIONAL" if assessment.is_promotional else assessment.risk_level
        headline, headline_bn = self.HEADLINES.get(key, self.HEADLINES["LOW_RISK"])
        recommendation, recommendation_bn = self.RECOMMENDATIONS.get(
            key, self.RECOMMENDATIONS["LOW_RISK"]
        )
        description, description_bn = CLASS_DESCRIPTIONS.get(
            assessment.message_class or "", ("this message", "এই বার্তা")
        )

        reasons = as_reasons(model_indicators)
        # Link flags are information about the link; they do not change the risk.
        for url_result in url_results or []:
            for flag in getattr(url_result, "flags", []):
                reasons.append(
                    {
                        "source": "url_info",
                        "category": f"url_{flag.category}",
                        "severity": flag.severity,
                        "text": flag.message,
                        "text_bn": flag.message_bn,
                        "url": url_result.url,
                        "affects_risk": False,
                    }
                )

        p_smish = assessment.risk_score / 100.0
        model_note = (
            f"The ScamNet-BN model classified this as {description}, with a "
            f"{p_smish:.0%} probability that it is a scam."
        )
        summary = (
            f"ScamNet-BN rated this message {assessment.risk.lower()} risk and "
            f"classified it as {description}."
        )
        flagged = [u for u in url_results or [] if getattr(u, "flags", [])]
        if flagged:
            summary += (
                f" {len(flagged)} link"
                + ("s have" if len(flagged) > 1 else " has")
                + " structural warnings, listed below for information."
            )

        return {
            "headline": headline,
            "headline_bn": headline_bn,
            "risk": assessment.risk,
            "risk_label": assessment.display_label or RISK_LABELS.get(assessment.risk_level),
            "summary": summary,
            "summary_bn": (
                f"ScamNet-BN এই বার্তাটিকে {description_bn} হিসেবে শ্রেণিবদ্ধ করেছে।"
            ),
            "reasons": reasons,
            "model_note": model_note,
            "recommendation": recommendation,
            "recommendation_bn": recommendation_bn,
            "scoring": {
                "decided_by": "scamnet-bn",
                "risk_score": round(assessment.risk_score, 2),
                "components": assessment.components,
            },
        }
