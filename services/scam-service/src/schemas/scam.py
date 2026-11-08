"""
Pydantic request and response contracts for Scam Alert.

Proposal, "Application security": Pydantic schemas validate every request body;
no raw input reaches a service layer.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..core.config import settings


class ScamScanCreateRequest(BaseModel):
    """A message submitted for scam analysis."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=settings.MAX_MESSAGE_CHARS,
        description="The message text, or the OCR text the user reviewed and confirmed.",
    )
    input_url: Optional[str] = Field(
        None, max_length=2048, description="A URL submitted on its own, if any."
    )
    source_format: str = Field(
        "TEXT", description="TEXT when typed or pasted, IMAGE when it came from OCR."
    )
    ocr_confirmed: bool = Field(
        False,
        description=(
            "True when OCR text was shown to the user and confirmed. The review "
            "step is not optional for image input."
        ),
    )

    @field_validator("message")
    @classmethod
    def message_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("The message cannot be empty or only whitespace.")
        return value

    @field_validator("source_format")
    @classmethod
    def known_format(cls, value: str) -> str:
        allowed = {"TEXT", "IMAGE", "URL"}
        upper = (value or "TEXT").upper()
        if upper not in allowed:
            raise ValueError(f"source_format must be one of {sorted(allowed)}")
        return upper


class ScanAcceptedResponse(BaseModel):
    """
    Returned immediately by POST. The pipeline has not run yet.

    The API writes a PENDING scan, queues it, and returns the id; the client
    polls `poll_url` until `status` is terminal.
    """

    scan_id: str
    status: str
    type: str = "SCAM"
    poll_url: str
    created_at: datetime
    estimated_seconds: int = 10
    cached: bool = False
    message: str = "Scan accepted and queued for analysis."


class ScamIndicatorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rule_id: Optional[str] = None
    category: str
    severity: str
    description: str
    description_bn: Optional[str] = None
    matched_text: Optional[str] = None
    weight: Optional[float] = None


class UrlAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    domain: Optional[str] = None
    registered_domain: Optional[str] = None
    tld: Optional[str] = None
    has_https: bool = False
    redirect_chain: Optional[List[str]] = None
    reputation_score: Optional[float] = None
    reputation_source: Optional[str] = None
    flags: Optional[List[Dict[str, Any]]] = None


class ModelRunResponse(BaseModel):
    """Audit trail: which model version produced which number."""

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    model_name: str
    model_version: str
    status: str
    latency_ms: Optional[float] = None
    error_message: Optional[str] = None


class ScamScanResponse(BaseModel):
    """
    Full scam scan dossier.

    `risk`, `class`, `probabilities`, `indicators` and `model_version` are the
    ScamNet-BN fields; ScamNet-BN alone decides the risk. When the model gave
    no answer (a FAILED or TIMEOUT scan), `risk` is "Unable to Analyze" and the
    model fields are null/empty.
    The model's `normalized_text` and `branch_weights` are never exposed here;
    they live in model_runs.raw_output.
    """

    model_config = ConfigDict(populate_by_name=True, protected_namespaces=())

    scan_id: str
    user_id: Optional[str] = None
    type: str = "SCAM"
    status: str
    is_terminal: bool
    is_degraded: bool

    message_text: Optional[str] = None
    input_url: Optional[str] = None
    language: Optional[str] = None

    # The proposal's categories: High | Medium | Low (| Unable to Analyze).
    risk: Optional[str] = None
    # What the UI shows: "High Risk", "Medium Risk", "Low Risk", or
    # "Promotional message" for class promo at Low risk.
    risk_label: Optional[str] = None
    risk_level: Optional[str] = None  # stored enum: HIGH_RISK | MEDIUM_RISK | LOW_RISK
    risk_score: Optional[float] = None
    confidence: Optional[float] = None
    confidence_display: Optional[str] = None

    # -- ScamNet-BN ---------------------------------------------------------
    message_class: Optional[str] = Field(None, alias="class")  # normal | promo | smish
    probabilities: Optional[Dict[str, float]] = None
    indicators: List[str] = Field(default_factory=list)
    model_version: Optional[str] = None

    summary: Optional[str] = None
    summary_bn: Optional[str] = None
    explanation: Optional[Dict[str, Any]] = None
    limitations: Optional[List[str]] = None
    detail: Optional[Dict[str, Any]] = None
    signal_summary: Optional[Dict[str, Any]] = None
    degraded_reason: Optional[List[Dict[str, Any]]] = None

    # Every scam_indicators row: ScamNet-BN's indicators, with their meaning.
    indicator_details: List[ScamIndicatorResponse] = Field(default_factory=list)
    url_analyses: List[UrlAnalysisResponse] = Field(default_factory=list)
    model_runs: List[ModelRunResponse] = Field(default_factory=list)

    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[float] = None


class ScamScanListItem(BaseModel):
    scan_id: str
    status: str
    risk: Optional[str] = None
    risk_label: Optional[str] = None
    risk_level: Optional[str] = None
    confidence: Optional[float] = None
    message_preview: Optional[str] = None
    indicator_count: int = 0
    created_at: datetime
