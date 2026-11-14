"""Pydantic contracts for the Rumor Scanner."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..core.config import settings


class RumourScanCreateRequest(BaseModel):
    """A claim submitted for verification."""

    claim: str = Field(
        ...,
        min_length=3,
        max_length=settings.MAX_CLAIM_CHARS,
        description="The claim text, or the OCR text the user reviewed and confirmed.",
    )
    input_url: Optional[str] = Field(
        None, max_length=2048, description="An article or social-media URL to ingest."
    )
    source_format: str = Field(
        "TEXT", description="TEXT when typed or pasted, IMAGE when it came from OCR."
    )
    ocr_confirmed: bool = Field(
        False,
        description=(
            "True when OCR text was shown to the user and confirmed. The review step "
            "is not optional for image input."
        ),
    )

    @field_validator("claim")
    @classmethod
    def claim_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("The claim cannot be empty or only whitespace.")
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

    The API writes a PENDING scan, queues it and returns the id; the client
    polls `poll_url` until `status` is terminal.
    """

    scan_id: str
    status: str
    type: str = "RUMOR"
    poll_url: str
    created_at: datetime
    estimated_seconds: int = 20
    cached: bool = False
    message: str = "Scan accepted and queued for analysis."


class EvidenceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: Optional[int] = None
    title: str
    source_name: Optional[str] = ""
    publisher: Optional[str] = ""
    source_type: str = "NEWS_MEDIA"
    url: str
    snippet: Optional[str] = ""
    published_at: Optional[str] = ""
    relevance_score: float = 0.0
    source_reliability: float = 0.5
    directness_score: float = 0.0
    temporal_match_score: float = 1.0
    stance: str = "NEUTRAL"
    relationship: Optional[str] = Field("NEUTRAL", alias="relationship_label")
    stance_source: Optional[str] = "MATCHER"
    reason: Optional[str] = ""


class UrlAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    domain: Optional[str] = None
    has_https: bool = False
    reputation_score: Optional[float] = None
    flags: Optional[List[Dict[str, Any]]] = None


class ModelRunResponse(BaseModel):
    """Audit trail: which model version produced which number."""

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    model_name: str
    model_version: str
    status: str
    latency_ms: Optional[float] = None
    error_message: Optional[str] = None


class RumourScanResponse(BaseModel):
    scan_id: str
    user_id: Optional[str] = None
    type: str = "RUMOR"
    status: str
    is_terminal: bool
    is_degraded: bool

    claim_text: Optional[str] = None
    normalized_text: Optional[str] = None
    input_url: Optional[str] = None
    language: Optional[str] = None

    verdict: Optional[str] = None
    confidence: Optional[float] = None
    confidence_display: Optional[str] = None
    title: Optional[str] = None
    title_bn: Optional[str] = None

    summary: Optional[str] = None
    summary_bn: Optional[str] = None
    explanation: Optional[Dict[str, Any]] = None
    limitations: Optional[List[str]] = None
    detail: Optional[Dict[str, Any]] = None
    signal_summary: Optional[Dict[str, Any]] = None
    degraded_reason: Optional[List[Dict[str, Any]]] = None

    # Convenience views the frontend already renders.
    banglaverify: Optional[Dict[str, Any]] = None
    fuzzy_scores: Optional[Dict[str, Any]] = None
    web_search: Optional[Dict[str, Any]] = None
    evidence_summary: Optional[Dict[str, Any]] = None

    evidence: List[EvidenceItemResponse] = Field(default_factory=list)
    url_analyses: List[UrlAnalysisResponse] = Field(default_factory=list)
    model_runs: List[ModelRunResponse] = Field(default_factory=list)

    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[float] = None


class RumourScanListItemResponse(BaseModel):
    id: str
    scan_id: str
    claim_text: Optional[str] = None
    status: str
    verdict: Optional[str] = None
    confidence: Optional[float] = None
    confidence_display: Optional[str] = None
    evidence_count: int = 0
    created_at: datetime
