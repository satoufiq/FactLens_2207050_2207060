"""Pydantic contracts for Image Check."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ScanAcceptedResponse(BaseModel):
    """Returned immediately by POST; the pipeline has not run yet."""

    scan_id: str
    status: str
    type: str = "IMAGE"
    poll_url: str
    created_at: datetime
    estimated_seconds: int = 12
    cached: bool = False
    message: str = "Image accepted and queued for analysis."


class ImageAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_name: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    ai_probability: Optional[float] = None
    manipulation_probability: Optional[float] = None
    image_metadata: Optional[Dict[str, Any]] = Field(None, alias="image_metadata")
    technical_signals: Optional[Dict[str, Any]] = None
    file_retained: bool = True


class ModelRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    model_name: str
    model_version: str
    status: str
    latency_ms: Optional[float] = None
    error_message: Optional[str] = None


class ImageScanResponse(BaseModel):
    scan_id: str
    user_id: Optional[str] = None
    type: str = "IMAGE"
    status: str
    is_terminal: bool
    is_degraded: bool

    assessment: Optional[str] = None
    score: Optional[float] = None
    confidence: Optional[float] = None
    confidence_display: Optional[str] = None

    summary: Optional[str] = None
    summary_bn: Optional[str] = None
    explanation: Optional[Dict[str, Any]] = None
    limitations: Optional[List[str]] = None
    detail: Optional[Dict[str, Any]] = None
    signal_summary: Optional[Dict[str, Any]] = None
    degraded_reason: Optional[List[Dict[str, Any]]] = None

    analysis: Optional[ImageAnalysisResponse] = None
    model_runs: List[ModelRunResponse] = Field(default_factory=list)

    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[float] = None


class ImageScanListItem(BaseModel):
    scan_id: str
    status: str
    assessment: Optional[str] = None
    confidence: Optional[float] = None
    file_name: Optional[str] = None
    created_at: datetime
