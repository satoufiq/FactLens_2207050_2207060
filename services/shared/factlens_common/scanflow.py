"""
Scan lifecycle service.

Proposal, "Scan Lifecycle":

    The lifecycle is enforced in the worker, not the request handler. PENDING
    is written when the request is accepted, the task is queued, and the API
    returns a scan id immediately; the frontend polls for completion.

This module owns that enforcement so all three analysis modules behave
identically. An API route calls `accept()`; a worker calls `begin()`, then
exactly one of `complete()`, `degrade()`, `fail()`, `timeout()` or
`awaiting_input()`.

The degradation accounting lives here too. A module reports which signals were
unavailable via `DegradationLog`; the lifecycle turns that into the PARTIAL
status and into the `degraded_reason` the UI shows beside the verdict, so the
user always learns that a result was produced without part of the system.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from .cache import get_cache
from .lifecycle import ScanStatus, ScanType, can_transition
from .schema import Scan, ScanResult, compute_input_hash, generate_scan_id

logger = logging.getLogger("factlens.scanflow")


class LifecycleError(RuntimeError):
    """An illegal lifecycle transition was attempted."""


@dataclass
class DegradationLog:
    """
    Records which components were unavailable during one scan.

    Every entry is a reason the scan is PARTIAL rather than COMPLETED, and each
    carries user-facing copy, because the proposal requires that a model's
    absence changes the confidence *and the explanation*.
    """

    entries: List[Dict[str, Any]] = field(default_factory=list)

    def add(
        self,
        component: str,
        reason: str,
        user_message: str,
        user_message_bn: Optional[str] = None,
        severity: str = "PARTIAL",
    ) -> None:
        self.entries.append(
            {
                "component": component,
                "reason": reason,
                "user_message": user_message,
                "user_message_bn": user_message_bn,
                "severity": severity,
            }
        )

    def add_model_unavailable(self, model_name: str, reason: str) -> None:
        self.add(
            component=model_name,
            reason=reason,
            user_message=(
                f"The {model_name} model was not available for this scan, so the "
                f"result comes from the other signals only. Treat the confidence "
                f"as lower than usual."
            ),
            user_message_bn=(
                f"এই স্ক্যানে {model_name} মডেলটি পাওয়া যায়নি, তাই ফলাফলটি কেবল অন্যান্য "
                f"সংকেতের ভিত্তিতে তৈরি। নির্ভরযোগ্যতা স্বাভাবিকের চেয়ে কম ধরুন।"
            ),
        )

    @property
    def is_degraded(self) -> bool:
        return bool(self.entries)

    @property
    def components(self) -> List[str]:
        return [e["component"] for e in self.entries]

    def as_payload(self) -> Optional[List[Dict[str, Any]]]:
        return self.entries or None

    def user_messages(self) -> List[str]:
        return [e["user_message"] for e in self.entries]


@dataclass
class ScanOutcome:
    """What an analysis module hands back to the lifecycle."""

    result: str
    confidence: float
    summary: str = ""
    summary_bn: str = ""
    explanation: Optional[Dict[str, Any]] = None
    limitations: Optional[List[str]] = None
    detail: Optional[Dict[str, Any]] = None
    signal_summary: Optional[Dict[str, Any]] = None


class ScanLifecycle:
    """Enforces the forward-only lifecycle against the `scans` table."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.cache = get_cache()

    # -- request side ------------------------------------------------------

    def accept(
        self,
        scan_type: ScanType,
        user_id: Optional[str] = None,
        input_text: Optional[str] = None,
        input_url: Optional[str] = None,
        source_format: str = "TEXT",
        language: Optional[str] = None,
        scan_id: Optional[str] = None,
    ) -> Scan:
        """
        Write a PENDING scan and return it immediately.

        Called from the request handler. Nothing slow happens here: no OCR, no
        search, no inference. The caller queues the task and returns the id.
        """
        scan = Scan(
            id=scan_id or generate_scan_id(),
            user_id=user_id,
            type=scan_type.value if isinstance(scan_type, ScanType) else str(scan_type),
            status=ScanStatus.PENDING.value,
            input_text=input_text,
            input_url=input_url,
            input_hash=compute_input_hash(input_text, input_url),
            source_format=source_format,
            language=language,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(scan)
        self.db.commit()
        self.db.refresh(scan)
        logger.info("[%s] accepted (%s), status PENDING", scan.id, scan.type)
        return scan

    def lookup_cached(
        self, scan_type: ScanType, input_text: Optional[str], input_url: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Check the input-hash cache before queueing work.

        Only non-degraded verdicts are ever cached, so a hit is always a full
        result. Returns the cached payload or None.
        """
        type_value = scan_type.value if isinstance(scan_type, ScanType) else str(scan_type)
        digest = compute_input_hash(input_text, input_url)
        if not digest:
            return None
        hit = self.cache.get(type_value, digest)
        if hit:
            logger.info("[cache] hit for %s %s", type_value, digest[:12])
        return hit

    # -- worker side -------------------------------------------------------

    def _get(self, scan_id: str) -> Scan:
        scan = self.db.query(Scan).filter(Scan.id == scan_id).one_or_none()
        if scan is None:
            raise LifecycleError(f"Scan '{scan_id}' does not exist.")
        return scan

    def _transition(self, scan: Scan, target: ScanStatus) -> None:
        current = ScanStatus(scan.status)
        if current == target:
            return
        if not can_transition(current, target):
            raise LifecycleError(
                f"Illegal lifecycle transition for {scan.id}: {current.value} -> {target.value}"
            )
        scan.status = target.value

    def begin(self, scan_id: str) -> Scan:
        """PENDING -> PROCESSING. Called at the top of the worker task."""
        scan = self._get(scan_id)
        self._transition(scan, ScanStatus.PROCESSING)
        scan.started_at = datetime.now(timezone.utc)
        self.db.commit()
        logger.info("[%s] PROCESSING", scan_id)
        return scan

    def _finalize(
        self,
        scan: Scan,
        status: ScanStatus,
        outcome: Optional[ScanOutcome],
        degradation: Optional[DegradationLog],
        error_message: Optional[str] = None,
    ) -> Scan:
        self._transition(scan, status)
        scan.completed_at = datetime.now(timezone.utc)
        if degradation is not None:
            scan.degraded_reason = degradation.as_payload()
        if error_message:
            scan.error_message = error_message

        if outcome is not None:
            existing = (
                self.db.query(ScanResult).filter(ScanResult.scan_id == scan.id).one_or_none()
            )
            target = existing or ScanResult(scan_id=scan.id)
            target.result = outcome.result
            target.confidence = float(outcome.confidence)
            target.summary = outcome.summary
            target.summary_bn = outcome.summary_bn
            target.explanation = outcome.explanation
            target.limitations = outcome.limitations
            target.detail = outcome.detail
            target.signal_summary = outcome.signal_summary
            if existing is None:
                self.db.add(target)

        self.db.commit()
        self.db.refresh(scan)
        return scan

    def complete(
        self, scan_id: str, outcome: ScanOutcome, cache_payload: Optional[Dict[str, Any]] = None
    ) -> Scan:
        """PROCESSING -> COMPLETED. Every signal was available."""
        scan = self._finalize(self._get(scan_id), ScanStatus.COMPLETED, outcome, None)
        if cache_payload is not None and scan.input_hash:
            self.cache.set(
                scan.type, scan.input_hash, cache_payload, scan.status, outcome.result
            )
        logger.info("[%s] COMPLETED (%s)", scan_id, outcome.result)
        return scan

    def degrade(
        self, scan_id: str, outcome: ScanOutcome, degradation: DegradationLog
    ) -> Scan:
        """
        PROCESSING -> PARTIAL. A usable verdict produced without part of the
        system. Never cached: replaying it would hide a transient outage.
        """
        scan = self._finalize(
            self._get(scan_id), ScanStatus.PARTIAL, outcome, degradation
        )
        logger.info(
            "[%s] PARTIAL (%s) -- degraded: %s",
            scan_id,
            outcome.result,
            ", ".join(degradation.components),
        )
        return scan

    def settle(
        self,
        scan_id: str,
        outcome: ScanOutcome,
        degradation: DegradationLog,
        cache_payload: Optional[Dict[str, Any]] = None,
    ) -> Scan:
        """complete() or degrade(), decided by whether anything was missing."""
        if degradation.is_degraded:
            return self.degrade(scan_id, outcome, degradation)
        return self.complete(scan_id, outcome, cache_payload)

    def fail(
        self, scan_id: str, error_message: str, outcome: Optional[ScanOutcome] = None
    ) -> Scan:
        """
        PROCESSING -> FAILED. A critical failure; no usable verdict.

        `outcome` lets a module supply its own user-facing explanation (for
        example "the scam model was busy, try again"); otherwise a generic one
        is written.
        """
        scan = self._get(scan_id)
        outcome = outcome or ScanOutcome(
            result="UNABLE_TO_ANALYZE",
            confidence=0.0,
            summary=(
                "This scan could not be completed. Processing stopped before enough "
                "stages had run to produce a meaningful assessment."
            ),
            summary_bn=(
                "এই স্ক্যানটি সম্পন্ন করা যায়নি। অর্থবহ মূল্যায়ন তৈরির মতো যথেষ্ট ধাপ "
                "চালানোর আগেই প্রক্রিয়াকরণ থেমে গেছে।"
            ),
            limitations=[error_message],
        )
        scan = self._finalize(scan, ScanStatus.FAILED, outcome, None, error_message)
        logger.error("[%s] FAILED: %s", scan_id, error_message)
        return scan

    def timeout(
        self, scan_id: str, budget_s: float, outcome: Optional[ScanOutcome] = None
    ) -> Scan:
        """
        PROCESSING -> TIMEOUT. Distinct from FAILED because it is retryable:
        the input was fine, the system simply ran out of its time budget.
        """
        scan = self._get(scan_id)
        message = (
            f"The analysis exceeded its {budget_s:.0f}-second budget and was stopped. "
            f"You can run this scan again."
        )
        outcome = outcome or ScanOutcome(
            result="UNABLE_TO_ANALYZE",
            confidence=0.0,
            summary=message,
            summary_bn=(
                f"বিশ্লেষণটি নির্ধারিত {budget_s:.0f} সেকেন্ড সময়সীমা অতিক্রম করায় বন্ধ করা "
                f"হয়েছে। আপনি আবার চেষ্টা করতে পারেন।"
            ),
            limitations=[message],
        )
        scan = self._finalize(scan, ScanStatus.TIMEOUT, outcome, None, message)
        logger.warning("[%s] TIMEOUT after %.0fs", scan_id, budget_s)
        return scan

    def awaiting_input(self, scan_id: str, reason: str) -> Scan:
        """
        PROCESSING -> AWAITING_INPUT. OCR could not read the image; the user is
        asked to type the text. Deliberately not PENDING: PENDING means
        "accepted and queued", and the lifecycle is forward-only.
        """
        scan = self._get(scan_id)
        message = (
            "The text in this image could not be read automatically. "
            "Please type or paste the text and submit it again."
        )
        outcome = ScanOutcome(
            result="UNABLE_TO_ANALYZE",
            confidence=0.0,
            summary=message,
            summary_bn=(
                "এই ছবির লেখা স্বয়ংক্রিয়ভাবে পড়া যায়নি। অনুগ্রহ করে লেখাটি টাইপ করে "
                "আবার জমা দিন।"
            ),
            limitations=[reason],
        )
        scan = self._finalize(scan, ScanStatus.AWAITING_INPUT, outcome, None, reason)
        logger.info("[%s] AWAITING_INPUT: %s", scan_id, reason)
        return scan

    # -- helpers -----------------------------------------------------------

    def duration_ms(self, scan: Scan) -> Optional[float]:
        if not scan.started_at or not scan.completed_at:
            return None
        return (scan.completed_at - scan.started_at).total_seconds() * 1000.0
