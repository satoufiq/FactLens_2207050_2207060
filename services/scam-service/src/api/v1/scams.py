"""
Scam Alert HTTP endpoints.

The POST handler does three things and nothing else: validate, write a PENDING
scan, queue the task. It returns a scan id immediately. Model inference, rule
evaluation and URL lookups all happen in the worker.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from factlens_common.lifecycle import ScanStatus, ScanType
from factlens_common.schema import ModelRun, Scan, ScamIndicator, UrlAnalysis
from factlens_common.scanflow import ScanLifecycle
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.database import get_db
from ...schemas.scam import (
    ScamScanCreateRequest,
    ScamScanListItem,
    ScamScanResponse,
    ScanAcceptedResponse,
)
from ...services.risk_aggregator import LEVEL_TO_RISK, RISK_LABELS
from ..deps import enforce_rate_limit, get_optional_current_user

logger = logging.getLogger("factlens.scam.api")

router = APIRouter(prefix="/scams/scans", tags=["Scam Alert"])

PRIVILEGED_ROLES = ("ROLE_ADMIN", "ROLE_VERIFIER")


def _poll_url(scan_id: str) -> str:
    return f"{settings.API_V1_PREFIX}/scams/scans/{scan_id}"


@router.post(
    "",
    response_model=ScanAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(enforce_rate_limit)],
)
def create_scam_scan(
    req: ScamScanCreateRequest,
    request: Request,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> ScanAcceptedResponse:
    """
    Accept a message for scam analysis.

    Returns 202 with a scan id. Poll `poll_url` until `status` is terminal.
    """
    user_id = user.get("sub") if user else None
    lifecycle = ScanLifecycle(db)

    # Reuse a recent verdict for identical input instead of re-running the
    # the model and the URL lookups.
    cached = lifecycle.lookup_cached(ScanType.SCAM, req.message, req.input_url)

    scan = lifecycle.accept(
        scan_type=ScanType.SCAM,
        user_id=user_id,
        input_text=req.message,
        input_url=req.input_url,
        source_format=req.source_format,
    )

    if cached:
        # Still a real scan row, settled instantly from the cache.
        from factlens_common.scanflow import ScanOutcome

        lifecycle.begin(scan.id)
        outcome = ScanOutcome(
            result=cached.get("result", "LOW_RISK"),
            confidence=float(cached.get("confidence", 0.5)),
            summary=cached.get("summary", ""),
            summary_bn=cached.get("summary_bn", ""),
            explanation=cached.get("explanation"),
            # The cached detail carries the public ScamNet fields, so a cache
            # hit answers with the same risk/class/probabilities as the original.
            detail={**(cached.get("detail") or {}), "served_from_cache": True},
        )
        lifecycle.complete(scan.id, outcome)
        return ScanAcceptedResponse(
            scan_id=scan.id,
            status=ScanStatus.COMPLETED.value,
            poll_url=_poll_url(scan.id),
            created_at=scan.created_at,
            estimated_seconds=0,
            cached=True,
            message="An identical message was analyzed recently; that verdict was reused.",
        )

    from ...workers.tasks import analyze_scam_scan

    try:
        analyze_scam_scan.delay(scan.id)
    except Exception as exc:  # noqa: BLE001
        logger.error("[%s] could not be queued: %s", scan.id, exc)
        lifecycle.fail(scan.id, f"The analysis queue is unavailable: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The analysis queue is currently unavailable. Please try again shortly.",
        ) from exc

    return ScanAcceptedResponse(
        scan_id=scan.id,
        status=scan.status,
        poll_url=_poll_url(scan.id),
        created_at=scan.created_at,
        estimated_seconds=10,
    )


def _authorize(scan: Scan, user: Optional[Dict[str, Any]]) -> None:
    if not scan.user_id:
        return  # anonymous scan, readable by its holder of the id
    user_id = user.get("sub") if user else None
    role = user.get("role", "") if user else ""
    if scan.user_id != user_id and role not in PRIVILEGED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this scan.",
        )


def _build_response(db: Session, scan: Scan) -> ScamScanResponse:
    result = scan.result
    detail = (result.detail or {}) if result else {}

    indicators = (
        db.query(ScamIndicator)
        .filter(ScamIndicator.scan_id == scan.id)
        .order_by(ScamIndicator.weight.desc())
        .all()
    )
    urls = db.query(UrlAnalysis).filter(UrlAnalysis.scan_id == scan.id).all()
    runs = db.query(ModelRun).filter(ModelRun.scan_id == scan.id).all()

    status_enum = ScanStatus(scan.status)
    duration = None
    if scan.started_at and scan.completed_at:
        duration = (scan.completed_at - scan.started_at).total_seconds() * 1000.0

    scamnet = detail.get("scamnet") or {}

    return ScamScanResponse(
        scan_id=scan.id,
        user_id=scan.user_id,
        status=scan.status,
        is_terminal=status_enum.is_terminal,
        is_degraded=status_enum == ScanStatus.PARTIAL,
        message_text=scan.input_text,
        input_url=scan.input_url,
        language=detail.get("language") or scan.language,
        risk=detail.get("risk") or (LEVEL_TO_RISK.get(result.result) if result else None),
        risk_label=detail.get("risk_label")
        or (RISK_LABELS.get(result.result) if result else None),
        risk_level=result.result if result else None,
        risk_score=detail.get("risk_score"),
        message_class=scamnet.get("class"),
        probabilities=scamnet.get("probabilities"),
        indicators=scamnet.get("indicators") or [],
        model_version=scamnet.get("model_version"),
        confidence=result.confidence if result else None,
        confidence_display=(
            f"{round((result.confidence or 0) * 100, 1)}%" if result else None
        ),
        summary=result.summary if result else None,
        summary_bn=result.summary_bn if result else None,
        explanation=result.explanation if result else None,
        limitations=result.limitations if result else None,
        detail=detail or None,
        signal_summary=result.signal_summary if result else None,
        degraded_reason=scan.degraded_reason,
        indicator_details=indicators,
        url_analyses=urls,
        model_runs=runs,
        created_at=scan.created_at,
        started_at=scan.started_at,
        completed_at=scan.completed_at,
        duration_ms=duration,
    )


@router.get("/{scan_id}", response_model=ScamScanResponse)
def get_scam_scan(
    scan_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> ScamScanResponse:
    """Poll a scam scan. Safe to call while the status is PENDING or PROCESSING."""
    scan = db.query(Scan).filter(Scan.id == scan_id, Scan.type == "SCAM").one_or_none()
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Scan '{scan_id}' not found."
        )
    _authorize(scan, user)
    return _build_response(db, scan)


@router.get("", response_model=List[ScamScanListItem])
def list_scam_scans(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[ScamScanListItem]:
    """Scam scan history for the caller."""
    query = db.query(Scan).filter(Scan.type == "SCAM")

    user_id = user.get("sub") if user else None
    role = user.get("role", "") if user else ""
    if user_id and role not in PRIVILEGED_ROLES:
        query = query.filter(Scan.user_id == user_id)
    elif not user_id:
        query = query.filter(Scan.user_id.is_(None))

    scans = query.order_by(desc(Scan.created_at)).limit(limit).offset(offset).all()

    items: List[ScamScanListItem] = []
    for scan in scans:
        preview = (scan.input_text or "")[:140]
        detail = (scan.result.detail or {}) if scan.result else {}
        items.append(
            ScamScanListItem(
                scan_id=scan.id,
                status=scan.status,
                risk=detail.get("risk") or (LEVEL_TO_RISK.get(scan.result.result) if scan.result else None),
                risk_label=detail.get("risk_label"),
                risk_level=scan.result.result if scan.result else None,
                confidence=scan.result.confidence if scan.result else None,
                message_preview=preview,
                indicator_count=len(scan.indicators),
                created_at=scan.created_at,
            )
        )
    return items


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scam_scan(
    scan_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Delete a scan and everything derived from it.

    Proposal, "Privacy": the user can delete any scan, which removes the row
    and its associated files. Cascades handle indicators, URL analyses and
    model runs.
    """
    scan = db.query(Scan).filter(Scan.id == scan_id, Scan.type == "SCAM").one_or_none()
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Scan '{scan_id}' not found."
        )
    _authorize(scan, user)
    db.delete(scan)
    db.commit()
