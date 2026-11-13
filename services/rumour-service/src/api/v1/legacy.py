"""
Backward-compatible verification endpoints.

These paths predate the asynchronous lifecycle. They now do exactly what the
current endpoint does -- accept, queue, return a scan id -- so there is one
code path and one lifecycle, and an old client that still calls them gets a
202 with a `poll_url` rather than a response that blocks for 20 seconds.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from factlens_common.lifecycle import ScanType
from factlens_common.scanflow import ScanLifecycle
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.database import get_db
from ...schemas.scan import ScanAcceptedResponse
from ..deps import enforce_rate_limit, get_optional_current_user

logger = logging.getLogger("factlens.rumor.legacy")

router = APIRouter(tags=["Legacy Verification Endpoints"], deprecated=True)


class LegacyVerifyRequest(BaseModel):
    claim_text: Optional[str] = None
    claim: Optional[str] = None
    input_url: Optional[str] = None


@router.post(
    "/v1/verify",
    response_model=ScanAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(enforce_rate_limit)],
)
@router.post(
    "/api/v1/rumor/scan",
    response_model=ScanAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(enforce_rate_limit)],
)
def legacy_verify(
    req: LegacyVerifyRequest,
    request: Request,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> ScanAcceptedResponse:
    """Deprecated. Use POST /api/v1/rumours/scans."""
    text = (req.claim_text or req.claim or "").strip()
    if len(text) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A claim of at least 3 characters is required.",
        )

    lifecycle = ScanLifecycle(db)
    scan = lifecycle.accept(
        scan_type=ScanType.RUMOR,
        user_id=user.get("sub") if user else None,
        input_text=text,
        input_url=req.input_url,
        source_format="TEXT",
    )

    from ...workers.tasks import verify_rumor_scan

    try:
        verify_rumor_scan.delay(scan.id)
    except Exception as exc:  # noqa: BLE001
        lifecycle.fail(scan.id, f"The analysis queue is unavailable: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The analysis queue is currently unavailable. Please try again shortly.",
        ) from exc

    return ScanAcceptedResponse(
        scan_id=scan.id,
        status=scan.status,
        poll_url=f"{settings.API_V1_PREFIX}/rumours/scans/{scan.id}",
        created_at=scan.created_at,
        message=(
            "Scan accepted and queued. This endpoint is deprecated — use "
            "POST /api/v1/rumours/scans."
        ),
    )
