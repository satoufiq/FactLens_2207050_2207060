"""
Scan lifecycle vocabulary.

Implements the proposal's "Scan Lifecycle" section:

    PENDING -> PROCESSING -> COMPLETED

  * a partial external or model failure yields PARTIAL with an explanation
  * a critical failure yields FAILED
  * a scan exceeding its time budget is moved to TIMEOUT, which is distinct
    from FAILED because it is retryable
  * OCR failure yields AWAITING_INPUT -- the user is asked to type the text.
    This is a terminal-until-resubmitted state and deliberately NOT PENDING:
    PENDING means "accepted and queued", and the lifecycle is forward-only.

The enum is the single source of truth for both the API and the workers.
"""

from __future__ import annotations

from enum import Enum
from typing import FrozenSet


class ScanStatus(str, Enum):
    """Lifecycle state of a single analysis request."""

    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"
    TIMEOUT = "TIMEOUT"
    AWAITING_INPUT = "AWAITING_INPUT"

    @classmethod
    def terminal(cls) -> FrozenSet["ScanStatus"]:
        """States the worker will not move out of on its own."""
        return frozenset(
            {cls.COMPLETED, cls.PARTIAL, cls.FAILED, cls.TIMEOUT, cls.AWAITING_INPUT}
        )

    @classmethod
    def retryable(cls) -> FrozenSet["ScanStatus"]:
        """States a client may resubmit from."""
        return frozenset({cls.TIMEOUT, cls.AWAITING_INPUT})

    @property
    def is_terminal(self) -> bool:
        return self in ScanStatus.terminal()

    @property
    def is_retryable(self) -> bool:
        return self in ScanStatus.retryable()

    @property
    def is_success(self) -> bool:
        """COMPLETED and PARTIAL both carry a usable verdict."""
        return self in (ScanStatus.COMPLETED, ScanStatus.PARTIAL)


#: Legal forward transitions. Enforced in the worker, not the request handler.
ALLOWED_TRANSITIONS = {
    ScanStatus.PENDING: {
        ScanStatus.PROCESSING,
        ScanStatus.FAILED,
        ScanStatus.TIMEOUT,
    },
    ScanStatus.PROCESSING: {
        ScanStatus.COMPLETED,
        ScanStatus.PARTIAL,
        ScanStatus.FAILED,
        ScanStatus.TIMEOUT,
        ScanStatus.AWAITING_INPUT,
    },
    ScanStatus.COMPLETED: set(),
    ScanStatus.PARTIAL: set(),
    ScanStatus.FAILED: set(),
    ScanStatus.TIMEOUT: set(),
    ScanStatus.AWAITING_INPUT: set(),
}


def can_transition(current: ScanStatus, target: ScanStatus) -> bool:
    """True when moving `current` -> `target` is a legal lifecycle step."""
    return target in ALLOWED_TRANSITIONS.get(current, set())


class ScanType(str, Enum):
    """Which analysis module owns the scan."""

    RUMOR = "RUMOR"
    SCAM = "SCAM"
    IMAGE = "IMAGE"


class RumorVerdict(str, Enum):
    """Proposal, Module 1 "Result Categories"."""

    SUPPORTED = "SUPPORTED"
    CONTRADICTED = "CONTRADICTED"
    UNVERIFIED = "UNVERIFIED"
    UNVERIFIED_SUSPICIOUS = "UNVERIFIED_SUSPICIOUS"
    UNABLE_TO_ANALYZE = "UNABLE_TO_ANALYZE"


class RiskLevel(str, Enum):
    """Proposal, Module 2 "Risk Categories"."""

    LOW = "LOW_RISK"
    MEDIUM = "MEDIUM_RISK"
    HIGH = "HIGH_RISK"
    UNABLE_TO_ANALYZE = "UNABLE_TO_ANALYZE"


class ImageAssessment(str, Enum):
    """Proposal, Module 3 "Result Categories"."""

    LIKELY_AUTHENTIC = "LIKELY_AUTHENTIC"
    POSSIBLE_MANIPULATION = "POSSIBLE_MANIPULATION"
    LIKELY_AI_GENERATED = "LIKELY_AI_GENERATED"
    UNABLE_TO_ANALYZE = "UNABLE_TO_ANALYZE"


class IndicatorSeverity(str, Enum):
    """Severity recorded against each scam rule hit."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
