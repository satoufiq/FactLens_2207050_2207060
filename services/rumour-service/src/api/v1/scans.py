"""
Rumor Scanner HTTP endpoints.

The POST handler validates, writes a PENDING scan and queues the task. It
returns a scan id immediately. OCR, search and model inference all run in the
worker -- nothing that takes seconds happens inside a request thread.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from factlens_common.lifecycle import ScanStatus, ScanType
from factlens_common.scanflow import ScanLifecycle, ScanOutcome
from factlens_common.schema import ModelRun, Scan, UrlAnalysis
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.database import get_db
from ...factories.report_factory import ReportGeneratorFactory
from ...repositories.evidence_repository import EvidenceRepository
from ...repositories.scan_repository import ScanRepository
from ...services.report_view import ScanReportView
from ...schemas.scan import (
    EvidenceItemResponse,
    ModelRunResponse,
    RumourScanCreateRequest,
    RumourScanListItemResponse,
    RumourScanResponse,
    ScanAcceptedResponse,
    UrlAnalysisResponse,
)
from ..deps import enforce_rate_limit, get_optional_current_user

logger = logging.getLogger("factlens.rumor.api")

router = APIRouter(prefix="/rumours/scans", tags=["Rumor Scanner"])

PRIVILEGED_ROLES = ("ROLE_ADMIN", "ROLE_VERIFIER")


def _poll_url(scan_id: str) -> str:
    return f"{settings.API_V1_PREFIX}/rumours/scans/{scan_id}"


@router.post(
    "",
    response_model=ScanAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(enforce_rate_limit)],
)
def create_rumour_scan(
    req: RumourScanCreateRequest,
    request: Request,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> ScanAcceptedResponse:
    """
    Accept a claim for verification.

    Returns 202 with a scan id. Poll `poll_url` until `status` is terminal
    (COMPLETED, PARTIAL, FAILED, TIMEOUT or AWAITING_INPUT).
    """
    user_id = user.get("sub") if user else None
    lifecycle = ScanLifecycle(db)

    # The same viral rumor arrives from hundreds of users; reuse a recent
    # verdict rather than re-running search and inference.
    cached = lifecycle.lookup_cached(ScanType.RUMOR, req.claim, req.input_url)

    scan = lifecycle.accept(
        scan_type=ScanType.RUMOR,
        user_id=user_id,
        input_text=req.claim,
        input_url=req.input_url,
        source_format=req.source_format,
    )

    if cached:
        lifecycle.begin(scan.id)
        lifecycle.complete(
            scan.id,
            ScanOutcome(
                result=cached.get("result", "UNVERIFIED"),
                confidence=float(cached.get("confidence", 0.5)),
                summary=cached.get("summary", ""),
                summary_bn=cached.get("summary_bn", ""),
                explanation=cached.get("explanation"),
                detail={"served_from_cache": True},
            ),
        )
        return ScanAcceptedResponse(
            scan_id=scan.id,
            status=ScanStatus.COMPLETED.value,
            poll_url=_poll_url(scan.id),
            created_at=scan.created_at,
            estimated_seconds=0,
            cached=True,
            message="An identical claim was checked recently; that verdict was reused.",
        )

    from ...workers.tasks import verify_rumor_scan

    try:
        verify_rumor_scan.delay(scan.id)
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
    )


def _authorize(scan: Scan, user: Optional[Dict[str, Any]]) -> None:
    if not scan.user_id:
        return
    user_id = user.get("sub") if user else None
    role = user.get("role", "") if user else ""
    if scan.user_id != user_id and role not in PRIVILEGED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this scan.",
        )


def build_response(db: Session, scan: Scan) -> RumourScanResponse:
    """Assemble the full dossier from the shared schema."""
    result = scan.result
    detail = (result.detail or {}) if result else {}
    status_enum = ScanStatus(scan.status)

    evidence_rows = EvidenceRepository(db).get_by_scan_id(scan.id)
    url_rows = db.query(UrlAnalysis).filter(UrlAnalysis.scan_id == scan.id).all()
    run_rows = db.query(ModelRun).filter(ModelRun.scan_id == scan.id).all()

    supporting = sum(1 for e in evidence_rows if e.stance == "SUPPORTING")
    contradicting = sum(1 for e in evidence_rows if e.stance == "CONTRADICTING")
    neutral = len(evidence_rows) - supporting - contradicting

    title, title_bn = None, None
    if result and result.explanation:
        title = result.explanation.get("headline")
        title_bn = result.explanation.get("headline_bn")

    duration = None
    if scan.started_at and scan.completed_at:
        duration = (scan.completed_at - scan.started_at).total_seconds() * 1000.0

    return RumourScanResponse(
        scan_id=scan.id,
        user_id=scan.user_id,
        status=scan.status,
        is_terminal=status_enum.is_terminal,
        is_degraded=status_enum == ScanStatus.PARTIAL,
        claim_text=scan.input_text,
        normalized_text=scan.normalized_text,
        input_url=scan.input_url,
        language=detail.get("language") or scan.language,
        verdict=result.result if result else None,
        confidence=result.confidence if result else None,
        confidence_display=(
            f"{round((result.confidence or 0) * 100, 1)}%" if result else None
        ),
        title=title,
        title_bn=title_bn,
        summary=result.summary if result else None,
        summary_bn=result.summary_bn if result else None,
        explanation=result.explanation if result else None,
        limitations=result.limitations if result else None,
        detail=detail or None,
        signal_summary=result.signal_summary if result else None,
        degraded_reason=scan.degraded_reason,
        banglaverify=detail.get("banglaverify"),
        fuzzy_scores=detail.get("fuzzy_scores"),
        web_search=detail.get("web_search"),
        evidence_summary={
            "supporting_sources": supporting,
            "contradicting_sources": contradicting,
            "neutral_sources": neutral,
            "total_sources": len(evidence_rows),
            "decided_by": (detail.get("precedence") or {}).get("decided_by"),
        },
        evidence=[EvidenceItemResponse.model_validate(e) for e in evidence_rows],
        url_analyses=[UrlAnalysisResponse.model_validate(u) for u in url_rows],
        model_runs=[ModelRunResponse.model_validate(r) for r in run_rows],
        created_at=scan.created_at,
        started_at=scan.started_at,
        completed_at=scan.completed_at,
        duration_ms=duration,
    )


@router.get("/{scan_id}", response_model=RumourScanResponse)
def get_rumour_scan(
    scan_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> RumourScanResponse:
    """Poll a rumor scan. Safe to call while PENDING or PROCESSING."""
    scan = ScanRepository(db).get_by_id(scan_id)
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Scan '{scan_id}' not found."
        )
    _authorize(scan, user)
    return build_response(db, scan)


@router.get("", response_model=List[RumourScanListItemResponse])
def list_rumour_scans(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[RumourScanListItemResponse]:
    """Verification history for the caller."""
    repo = ScanRepository(db)
    user_id = user.get("sub") if user else None
    role = user.get("role", "") if user else ""

    if user_id:
        query_user_id = None if role in PRIVILEGED_ROLES else user_id
        scans = repo.list_scans(user_id=query_user_id, limit=limit, offset=offset)
    else:
        scans = repo.list_unassigned_scans(limit=limit, offset=offset)

    return [
        RumourScanListItemResponse(
            id=s.id,
            scan_id=s.id,
            claim_text=s.input_text,
            status=s.status,
            verdict=s.result.result if s.result else None,
            confidence=s.result.confidence if s.result else None,
            confidence_display=(
                f"{round((s.result.confidence or 0) * 100, 1)}%" if s.result else None
            ),
            evidence_count=len(s.evidence),
            created_at=s.created_at,
        )
        for s in scans
    ]


@router.get("/{scan_id}/evidence", response_model=List[EvidenceItemResponse])
def get_scan_evidence(
    scan_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[EvidenceItemResponse]:
    """Every retrieved evidence item and its stance."""
    scan = ScanRepository(db).get_by_id(scan_id)
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Scan '{scan_id}' not found."
        )
    _authorize(scan, user)
    rows = EvidenceRepository(db).get_by_scan_id(scan_id)
    return [EvidenceItemResponse.model_validate(r) for r in rows]


@router.get("/{scan_id}/report.pdf")
def download_scan_pdf_report(
    scan_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Stream the PDF verification dossier for a completed scan."""
    scan = ScanRepository(db).get_by_id(scan_id)
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Scan '{scan_id}' not found."
        )

    if scan.user_id:
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to access this PDF dossier.",
            )
        _authorize(scan, user)

    if not ScanStatus(scan.status).is_success:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"This scan is {scan.status}; a dossier can only be generated for a "
                f"completed scan."
            ),
        )

    generator = ReportGeneratorFactory.create_generator("pdf")
    # The dossier template was written against the old flat row; the view
    # presents the new schema under those names.
    pdf_bytes = generator.generate(ScanReportView(scan))
    filename = f"FactLens_Report_{scan.id}.{generator.file_extension}"

    return Response(
        content=pdf_bytes,
        media_type=generator.content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rumour_scan(
    scan_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Delete a scan and everything derived from it.

    Proposal, "Privacy": the user can delete any scan, which removes the row
    and its associated files.
    """
    scan = ScanRepository(db).get_by_id(scan_id)
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Scan '{scan_id}' not found."
        )
    _authorize(scan, user)
    db.delete(scan)
    db.commit()
