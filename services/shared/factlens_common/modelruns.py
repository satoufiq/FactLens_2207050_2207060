"""
model_runs recording.

Proposal, "Versioning and the model registry":

    This is what makes a verdict auditable. When a user disputes a result three
    months later, the system can state which model version produced it and what
    that version scored on evaluation.

and, from the edge-case table:

    a version mismatch produces wrong answers rather than errors, which is why
    model_runs records the version on every inference.

Every inference writes a row -- including the ones where the model was
unavailable. An absent model is a recorded fact about the scan, not a gap.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from .providers.base import Prediction
from .schema import ModelRun

logger = logging.getLogger("factlens.modelruns")


def record_model_run(
    db: Session,
    scan_id: str,
    prediction: Prediction,
    *,
    flush: bool = False,
) -> ModelRun:
    """Write one model_runs row from a Prediction. Does not commit."""
    payload = prediction.to_model_run()
    row = ModelRun(
        scan_id=scan_id,
        model_name=payload["model_name"],
        model_version=payload["model_version"],
        status=payload["status"],
        raw_output=payload["raw_output"],
        latency_ms=payload["latency_ms"],
        error_message=payload["error_message"],
    )
    db.add(row)
    if flush:
        db.flush()
    return row


def record_raw_run(
    db: Session,
    scan_id: str,
    model_name: str,
    model_version: str,
    status: str,
    raw_output: Optional[Dict[str, Any]] = None,
    latency_ms: Optional[float] = None,
    error_message: Optional[str] = None,
    *,
    flush: bool = False,
) -> ModelRun:
    """
    Write a model_runs row for a component that is not a BaseModelProvider --
    the OCR engine, the embedding model, the NLI model. Their versions belong
    in the audit trail for the same reason the classifiers' do.
    """
    row = ModelRun(
        scan_id=scan_id,
        model_name=model_name,
        model_version=model_version,
        status=status,
        raw_output=raw_output,
        latency_ms=latency_ms,
        error_message=error_message,
    )
    db.add(row)
    if flush:
        db.flush()
    return row
