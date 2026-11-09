"""
ScamNet-BN indicators: what each one means to the user, and how severe it is.

The model reports which structural tags and keyword families it found in the
normalized message (`prediction["indicators"]`). These are not verdicts -- an
ordinary bank notice contains a phone number too -- so they are stored as
scam_indicators rows and shown as reasons, but they never raise the risk level
on their own. Only rule hits and URL analysis can raise the model's level.

Severity: url, phone, code, finance and threat are HIGH; the rest MEDIUM.
"""

from __future__ import annotations

from typing import Dict, List, Optional, TypedDict


class IndicatorInfo(TypedDict):
    severity: str
    description: str
    description_bn: str


INDICATORS: Dict[str, IndicatorInfo] = {
    "url": {
        "severity": "HIGH",
        "description": "Contains a link",
        "description_bn": "একটি লিংক রয়েছে",
    },
    "phone": {
        "severity": "HIGH",
        "description": "Contains a phone number",
        "description_bn": "একটি ফোন নম্বর রয়েছে",
    },
    "money": {
        "severity": "MEDIUM",
        "description": "Mentions an amount of money",
        "description_bn": "টাকার পরিমাণ উল্লেখ করা হয়েছে",
    },
    "code": {
        "severity": "HIGH",
        "description": "Contains a code or OTP-like number",
        "description_bn": "কোড বা ওটিপির মতো একটি নম্বর রয়েছে",
    },
    "account": {
        "severity": "MEDIUM",
        "description": "Contains an account-like number",
        "description_bn": "অ্যাকাউন্টের মতো একটি নম্বর রয়েছে",
    },
    "email": {
        "severity": "MEDIUM",
        "description": "Contains an email address",
        "description_bn": "একটি ইমেইল ঠিকানা রয়েছে",
    },
    "urgent": {
        "severity": "MEDIUM",
        "description": "Uses urgency language",
        "description_bn": "তাড়াহুড়ো করার ভাষা ব্যবহার করা হয়েছে",
    },
    "finance": {
        "severity": "HIGH",
        "description": "Mentions bKash, Nagad, Rocket, bank, OTP, PIN or account",
        "description_bn": "বিকাশ, নগদ, রকেট, ব্যাংক, ওটিপি, পিন বা অ্যাকাউন্টের উল্লেখ রয়েছে",
    },
    "reward": {
        "severity": "MEDIUM",
        "description": "Promises a prize, bonus or lottery win",
        "description_bn": "পুরস্কার, বোনাস বা লটারি জেতার প্রতিশ্রুতি দেওয়া হয়েছে",
    },
    "action": {
        "severity": "MEDIUM",
        "description": "Asks you to click, call, send, verify or log in",
        "description_bn": "ক্লিক, কল, টাকা পাঠানো, যাচাই বা লগইন করতে বলা হয়েছে",
    },
    "threat": {
        "severity": "HIGH",
        "description": "Threatens blocking or suspension",
        "description_bn": "অ্যাকাউন্ট ব্লক বা স্থগিত করার হুমকি দেওয়া হয়েছে",
    },
    "job": {
        "severity": "MEDIUM",
        "description": "Offers a job or income",
        "description_bn": "চাকরি বা আয়ের প্রস্তাব দেওয়া হয়েছে",
    },
}

#: Weights on the same scale as the YAML rule engine, used only for ordering.
SEVERITY_WEIGHT = {"HIGH": 30.0, "MEDIUM": 18.0}


def describe(indicator: str) -> IndicatorInfo:
    """Meaning of one indicator; an unknown code is shown as-is, at MEDIUM."""
    return INDICATORS.get(
        indicator,
        {
            "severity": "MEDIUM",
            "description": f"Model indicator: {indicator}",
            "description_bn": f"মডেল সংকেত: {indicator}",
        },
    )


def as_reasons(indicators: Optional[List[str]]) -> List[dict]:
    """Model indicators in the explanation layer's reason format."""
    reasons = []
    for code in indicators or []:
        info = describe(code)
        reasons.append(
            {
                "source": "model",
                "category": f"model_{code}",
                "severity": info["severity"],
                "text": info["description"],
                "text_bn": info["description_bn"],
            }
        )
    return reasons
