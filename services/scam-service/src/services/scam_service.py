"""
Scam Alert pipeline -- ScamNet-BN decides.

    1. Input reception
    2. OCR (if image) -- text and any embedded URLs are extracted; the user
       reviews the text before the scan is queued
    3. Normalization (for URL extraction; the model normalizes for itself)
    4. ScamNet-BN inference              }  in parallel
    5. URL analysis (information only)   }
    6. Assessment and explanation

ScamNet-BN's risk is the result. The YAML rule engine that used to sit beside
it was removed (2026-11-13): on BanglaPhish-2026 its override caught no extra
scam and raised 34 genuine bKash/Nagad notices to Medium.

When the model cannot answer
----------------------------
There is no backup verdict. If ScamNet-BN is not loaded, still busy with an
earlier message, times out or raises, the scan ends without a risk level:

    model timed out       -> TIMEOUT  (retryable)
    unavailable / busy /  -> FAILED   with "Unable to analyze" and a reason
    error

It is never shown as Low risk, and never becomes a server error.

How the timeout is made real
----------------------------
URL analysis runs on a small thread pool; the model runs through the ScamNet
runtime, which executes inference on its own daemon thread and waits at most
SCAMNET_TIMEOUT_SECONDS. The pool is only waited on for the URL checks, never
for the model, so a slow inference cannot hold the scan past its budget.
"""

from __future__ import annotations

import logging
import re
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from factlens_common.lifecycle import RiskLevel
from factlens_common.modelruns import record_raw_run
from factlens_common.scanflow import ScanOutcome
from factlens_common.schema import ScamIndicator, UrlAnalysis
from factlens_common.urlanalysis import get_url_analyzer
from sqlalchemy.orm import Session

from ..providers.scamnet import (
    MODEL_NAME,
    REASON_BUSY,
    REASON_ERROR,
    REASON_TIMEOUT,
    REASON_UNAVAILABLE,
    ModelCall,
    get_scamnet_runtime,
    public_view,
)
from . import model_indicators
from .risk_aggregator import ModelRiskAggregator, ScamExplanationBuilder

logger = logging.getLogger("factlens.scam.pipeline")

BENGALI_RANGE = re.compile(r"[ঀ-৿]")
LATIN_RANGE = re.compile(r"[A-Za-z]")

URL_IN_TEXT = re.compile(
    r"\b(?:https?://|www\.)[^\s<>\"'\\^`{|}]+|"
    r"\b[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}(?:\.[a-zA-Z0-9\-]{1,63})+"
    r"(?:/[^\s<>\"']*)?",
    re.IGNORECASE,
)

#: Bare words that look like domains but are ordinary text.
_URL_FALSE_POSITIVES = {"e.g", "i.e", "vs.", "etc."}

#: What the user is told when the model gave no verdict, by reason.
NO_VERDICT_MESSAGES = {
    REASON_UNAVAILABLE: (
        "The ScamNet-BN scam model is not running on the server right now, so this "
        "message could not be checked. Please try again later.",
        "ScamNet-BN প্রতারণা শনাক্তকরণ মডেলটি এই মুহূর্তে সার্ভারে চালু নেই, তাই বার্তাটি "
        "যাচাই করা যায়নি। পরে আবার চেষ্টা করুন।",
    ),
    REASON_BUSY: (
        "The ScamNet-BN scam model was still busy with an earlier message, so this "
        "message could not be checked. Please run the scan again in a moment.",
        "ScamNet-BN মডেলটি আগের একটি বার্তা নিয়ে ব্যস্ত ছিল, তাই বার্তাটি যাচাই করা যায়নি। "
        "কিছুক্ষণ পর আবার স্ক্যান করুন।",
    ),
    REASON_TIMEOUT: (
        "The ScamNet-BN scam model did not answer in time, so this message could not "
        "be checked. Please run the scan again.",
        "ScamNet-BN মডেলটি নির্ধারিত সময়ের মধ্যে উত্তর দেয়নি, তাই বার্তাটি যাচাই করা "
        "যায়নি। আবার স্ক্যান করুন।",
    ),
    REASON_ERROR: (
        "The ScamNet-BN scam model failed on this message, so it could not be "
        "checked. Please try again.",
        "এই বার্তায় ScamNet-BN মডেলটি ব্যর্থ হয়েছে, তাই এটি যাচাই করা যায়নি। আবার "
        "চেষ্টা করুন।",
    ),
}


@dataclass
class ScamAnalysis:
    """What the pipeline hands back to the worker."""

    outcome: ScanOutcome
    #: COMPLETED when ScamNet-BN gave a verdict; otherwise FAILED or TIMEOUT.
    status: str
    model_call: ModelCall
    error: Optional[str] = None


def detect_language(text: str) -> str:
    """Bengali, English or mixed -- enough for display."""
    has_bengali = bool(BENGALI_RANGE.search(text))
    has_latin = bool(LATIN_RANGE.search(text))
    if has_bengali and has_latin:
        return "mixed"
    if has_bengali:
        return "bn"
    if has_latin:
        return "en"
    return "unknown"


def normalize_text(text: str) -> str:
    """NFC normalise and tidy whitespace, for URL extraction.

    ScamNet-BN does NOT receive this: it gets the message as submitted and
    applies its own training-time normalization.
    """
    if not text:
        return ""
    normalized = unicodedata.normalize("NFC", text)
    normalized = re.sub(r"\r\n?", "\n", normalized)
    normalized = re.sub(r"[ \t]+", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def extract_urls(text: str) -> List[str]:
    """Pull candidate URLs out of a message body."""
    if not text:
        return []
    found: List[str] = []
    for match in URL_IN_TEXT.finditer(text):
        candidate = match.group(0).rstrip(".,;:)]}>।")
        if candidate.lower() in _URL_FALSE_POSITIVES:
            continue
        if "." not in candidate:
            continue
        if candidate.lower() not in (u.lower() for u in found):
            found.append(candidate)
    return found[:5]


class ScamAlertService:
    """Runs the Scam Alert pipeline for one scan."""

    def __init__(self, db: Session, model_runtime=None, url_analyzer=None) -> None:
        self.db = db
        self.url_analyzer = url_analyzer or get_url_analyzer()
        self.model = model_runtime or get_scamnet_runtime()
        self.aggregator = ModelRiskAggregator()
        self.explainer = ScamExplanationBuilder()

    def analyze(
        self,
        scan_id: str,
        message_text: str,
        input_url: Optional[str] = None,
    ) -> ScamAnalysis:
        started = time.perf_counter()
        normalized = normalize_text(message_text)
        language = detect_language(normalized)

        urls = extract_urls(normalized)
        if input_url and input_url not in urls:
            urls.insert(0, input_url)

        # URL analysis on the pool; ScamNet-BN bounded by its own timeout.
        pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="scam-url")
        try:
            url_future = pool.submit(self._analyze_urls, urls)
            # The full submitted text, URLs included: the model replaces them
            # with its own [URL] tag.
            model_call: ModelCall = self.model.predict(message_text)
            url_results = url_future.result()
        finally:
            pool.shutdown(wait=False)

        self._record_model_run(scan_id, model_call)
        self._persist_url_analyses(scan_id, url_results)
        elapsed_ms = (time.perf_counter() - started) * 1000.0

        if not model_call.ok:
            return self._no_verdict(model_call, url_results, language, elapsed_ms)

        prediction = model_call.prediction or {}
        assessment = self.aggregator.aggregate(prediction)
        indicator_codes = list(prediction.get("indicators") or [])
        self._persist_model_indicators(scan_id, indicator_codes)
        explanation = self.explainer.build(assessment, indicator_codes, url_results)

        outcome = ScanOutcome(
            result=assessment.risk_level,
            confidence=assessment.confidence,
            summary=explanation["summary"],
            summary_bn=explanation["summary_bn"],
            explanation=explanation,
            limitations=[
                "FactLens assesses the wording and structure of a message. It cannot "
                "confirm who actually sent it.",
                "A Low Risk or Promotional result is not a guarantee that a message is safe.",
            ],
            detail={
                **assessment.as_dict(),
                # Only the public fields of the prediction; normalized_text and
                # branch_weights stay in model_runs.raw_output.
                "scamnet": public_view(prediction),
                "scamnet_status": model_call.status,
                "scamnet_reason": None,
                "language": language,
                "urls": [u.as_dict() for u in url_results],
                "elapsed_ms": round(elapsed_ms, 2),
                "pipeline": "ScamNet-BN (decides) | URL analysis (information only)",
            },
            signal_summary={
                "model_available": True,
                "model_name": MODEL_NAME,
                "model_version": model_call.version,
                "model_status": model_call.status,
                "model_latency_ms": round(model_call.latency_ms, 1),
                "indicator_count": len(indicator_codes),
                "urls_analyzed": len(url_results),
                "decided_by": MODEL_NAME,
            },
        )
        return ScamAnalysis(outcome=outcome, status="COMPLETED", model_call=model_call)

    # -- no verdict ----------------------------------------------------------

    def _no_verdict(
        self, call: ModelCall, url_results: List[Any], language: str, elapsed_ms: float
    ) -> ScamAnalysis:
        reason = call.reason or REASON_UNAVAILABLE
        message, message_bn = NO_VERDICT_MESSAGES.get(reason, NO_VERDICT_MESSAGES[REASON_UNAVAILABLE])
        outcome = ScanOutcome(
            result=RiskLevel.UNABLE_TO_ANALYZE.value,
            confidence=0.0,
            summary=message,
            summary_bn=message_bn,
            explanation={
                "headline": "Unable to analyze — the scam model gave no answer",
                "headline_bn": "বিশ্লেষণ করা যায়নি — প্রতারণা শনাক্তকরণ মডেল উত্তর দেয়নি",
                "risk": "Unable to Analyze",
                "risk_label": "Unable to Analyze",
                "summary": message,
                "summary_bn": message_bn,
                "reasons": [],
                "model_note": message,
                "recommendation": (
                    "Do not act on this message until it has been checked. If it asks "
                    "for money, an OTP or a PIN, treat it as suspicious and verify it "
                    "through an official channel."
                ),
                "recommendation_bn": (
                    "যাচাই না হওয়া পর্যন্ত এই বার্তার ভিত্তিতে কিছু করবেন না। এটি টাকা, ওটিপি "
                    "বা পিন চাইলে সন্দেহজনক ধরুন এবং অফিশিয়াল মাধ্যমে যাচাই করুন।"
                ),
            },
            limitations=[message],
            detail={
                "risk": "Unable to Analyze",
                "risk_label": "Unable to Analyze",
                "scamnet": None,
                "scamnet_status": call.status,
                "scamnet_reason": reason,
                "language": language,
                "urls": [u.as_dict() for u in url_results],
                "elapsed_ms": round(elapsed_ms, 2),
            },
            signal_summary={
                "model_available": False,
                "model_name": MODEL_NAME,
                "model_version": call.version,
                "model_status": call.status,
                "model_reason": reason,
            },
        )
        status = "TIMEOUT" if reason == REASON_TIMEOUT else "FAILED"
        return ScamAnalysis(
            outcome=outcome,
            status=status,
            model_call=call,
            error=f"ScamNet-BN gave no verdict ({reason}): {call.error}",
        )

    # -- persistence ---------------------------------------------------------

    def _analyze_urls(self, urls: List[str]) -> List[Any]:
        results = []
        for url in urls[:5]:
            try:
                results.append(self.url_analyzer.analyze(url))
            except Exception as exc:  # noqa: BLE001
                logger.warning("URL analysis failed for %s: %s", url, exc)
        return results

    def _record_model_run(self, scan_id: str, call: ModelCall) -> None:
        """
        One model_runs row per scan, whatever happened. The full prediction --
        including normalized_text and branch_weights -- lives only here.
        """
        record_raw_run(
            self.db,
            scan_id,
            model_name=MODEL_NAME,
            model_version=call.version,
            status=call.status,
            raw_output=call.prediction,
            latency_ms=round(call.latency_ms, 2),
            error_message=call.error,
        )

    def _persist_model_indicators(self, scan_id: str, codes: List[str]) -> None:
        for code in codes:
            info = model_indicators.describe(code)
            self.db.add(
                ScamIndicator(
                    scan_id=scan_id,
                    rule_id=f"model:{code}",
                    category=code,
                    severity=info["severity"],
                    description=info["description"],
                    description_bn=info["description_bn"],
                    matched_text=None,
                    weight=model_indicators.SEVERITY_WEIGHT.get(info["severity"], 0.0),
                )
            )

    def _persist_url_analyses(self, scan_id: str, url_results: List[Any]) -> None:
        for result in url_results:
            self.db.add(
                UrlAnalysis(
                    scan_id=scan_id,
                    url=result.url[:2048],
                    domain=result.domain,
                    registered_domain=result.registered_domain,
                    tld=result.tld,
                    has_https=result.has_https,
                    redirect_chain=result.redirect_chain or None,
                    reputation_score=result.reputation_score,
                    reputation_source=result.reputation_source,
                    flags=[f.as_dict() for f in result.flags] or None,
                )
            )

    def health(self) -> Dict[str, Any]:
        return {"model": self.model.health(), "url_analyzer": self.url_analyzer.health()}
