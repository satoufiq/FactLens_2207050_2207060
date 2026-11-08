"""
Image Check HTTP endpoints.

The POST handler performs steps 1 and 2 of the pipeline -- validation and
secure storage -- because the bytes must be on disk before a scan can be
queued. Everything slow happens in the worker.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from factlens_common.lifecycle import ScanStatus, ScanType
from factlens_common.scanflow import ScanLifecycle
from factlens_common.schema import ImageAnalysis, ModelRun, Scan, compute_input_hash
from factlens_common.security import sanitize_filename, validate_image_upload
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.database import get_db
from ...core.storage import image_store
from ...schemas.image import (
    ImageAnalysisResponse,
    ImageScanListItem,
    ImageScanResponse,
    ScanAcceptedResponse,
)
from ..deps import enforce_rate_limit, get_optional_current_user

logger = logging.getLogger("factlens.image.api")

router = APIRouter(prefix="/images/scans", tags=["Image Check"])

PRIVILEGED_ROLES = ("ROLE_ADMIN", "ROLE_VERIFIER")


def _poll_url(scan_id: str) -> str:
    return f"{settings.API_V1_PREFIX}/images/scans/{scan_id}"


@router.post(
    "",
    response_model=ScanAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(enforce_rate_limit)],
)
async def create_image_scan(
    request: Request,
    file: UploadFile = File(...),
    note: Optional[str] = Form(None),
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> ScanAcceptedResponse:
    """
    Accept an image for forensic analysis.

    Step 1 -- validation by magic bytes, with a full decode to catch truncated
    or corrupted data and renamed executables.
    Step 2 -- storage under a system-generated name, outside anything served.
    """
    try:
        data = await file.read()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The upload could not be read: {exc}",
        ) from exc

    verdict = validate_image_upload(
        data, file.filename or "", max_bytes=settings.MAX_UPLOAD_BYTES
    )
    if not verdict.valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=verdict.reason
        )

    display_name = sanitize_filename(file.filename or "upload")

    try:
        stored = image_store.save(data, display_name, verdict.extension)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Could not store upload")
        raise HTTPException(
            status_code=status.HTTP_507_INSUFFICIENT_STORAGE,
            detail="The image could not be stored for analysis. Please try again.",
        ) from exc

    user_id = user.get("sub") if user else None
    lifecycle = ScanLifecycle(db)

    scan = lifecycle.accept(
        scan_type=ScanType.IMAGE,
        user_id=user_id,
        input_text=note,
        input_url=None,
        source_format="IMAGE",
    )
    # Identical bytes hash to the same scan, so a repeat upload is cacheable.
    scan.input_hash = compute_input_hash(stored.stored_name)
    db.commit()

    from ...workers.tasks import analyze_image_scan

    try:
        analyze_image_scan.delay(
            scan.id, stored.stored_name, display_name, verdict.mime_type
        )
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


def _build_response(db: Session, scan: Scan) -> ImageScanResponse:
    result = scan.result
    detail = (result.detail or {}) if result else {}

    analysis_row = (
        db.query(ImageAnalysis).filter(ImageAnalysis.scan_id == scan.id).one_or_none()
    )
    analysis = None
    if analysis_row is not None:
        analysis = ImageAnalysisResponse(
            id=analysis_row.id,
            file_name=analysis_row.file_name,
            file_type=analysis_row.file_type,
            file_size=analysis_row.file_size,
            width=analysis_row.width,
            height=analysis_row.height,
            ai_probability=analysis_row.ai_probability,
            manipulation_probability=analysis_row.manipulation_probability,
            image_metadata=analysis_row.image_metadata,
            technical_signals=analysis_row.technical_signals,
            # The bytes are deleted after the retention window; the analysis stays.
            file_retained=bool(analysis_row.stored_name),
        )

    runs = db.query(ModelRun).filter(ModelRun.scan_id == scan.id).all()
    status_enum = ScanStatus(scan.status)
    duration = None
    if scan.started_at and scan.completed_at:
        duration = (scan.completed_at - scan.started_at).total_seconds() * 1000.0

    return ImageScanResponse(
        scan_id=scan.id,
        user_id=scan.user_id,
        status=scan.status,
        is_terminal=status_enum.is_terminal,
        is_degraded=status_enum == ScanStatus.PARTIAL,
        assessment=result.result if result else None,
        score=detail.get("score"),
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
        analysis=analysis,
        model_runs=runs,
        created_at=scan.created_at,
        started_at=scan.started_at,
        completed_at=scan.completed_at,
        duration_ms=duration,
    )


@router.get("/{scan_id}", response_model=ImageScanResponse)
def get_image_scan(
    scan_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> ImageScanResponse:
    """Poll an image scan. Safe while PENDING or PROCESSING."""
    scan = db.query(Scan).filter(Scan.id == scan_id, Scan.type == "IMAGE").one_or_none()
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Scan '{scan_id}' not found."
        )
    _authorize(scan, user)
    return _build_response(db, scan)


@router.get("", response_model=List[ImageScanListItem])
def list_image_scans(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> List[ImageScanListItem]:
    query = db.query(Scan).filter(Scan.type == "IMAGE")

    user_id = user.get("sub") if user else None
    role = user.get("role", "") if user else ""
    if user_id and role not in PRIVILEGED_ROLES:
        query = query.filter(Scan.user_id == user_id)
    elif not user_id:
        query = query.filter(Scan.user_id.is_(None))

    scans = query.order_by(desc(Scan.created_at)).limit(limit).offset(offset).all()

    items: List[ImageScanListItem] = []
    for scan in scans:
        analysis = scan.image_analysis
        items.append(
            ImageScanListItem(
                scan_id=scan.id,
                status=scan.status,
                assessment=scan.result.result if scan.result else None,
                confidence=scan.result.confidence if scan.result else None,
                file_name=analysis.file_name if analysis else None,
                created_at=scan.created_at,
            )
        )
    return items


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image_scan(
    scan_id: str,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Delete a scan, its analysis and the stored image file.

    Proposal, "Privacy": deleting a scan removes the row and its associated files.
    """
    scan = db.query(Scan).filter(Scan.id == scan_id, Scan.type == "IMAGE").one_or_none()
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Scan '{scan_id}' not found."
        )
    _authorize(scan, user)

    analysis = (
        db.query(ImageAnalysis).filter(ImageAnalysis.scan_id == scan.id).one_or_none()
    )
    if analysis is not None and analysis.stored_name:
        image_store.delete(analysis.stored_name)

    db.delete(scan)
    db.commit()
