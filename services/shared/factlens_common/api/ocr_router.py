"""
Shared OCR endpoint.

Proposal, "Unified Input and OCR Integration":

    FactLens has one shared input-processing layer with integrated OCR. A typed
    rumor, a Facebook screenshot, a WhatsApp message screenshot, a news
    thumbnail, and a copied headline are all treated as different input formats
    for the same analysis process.

Mounting this one router in every analysis service is what makes the input
layer shared in practice: the Rumor Scanner, Scam Alert and Image Check all
accept an image at the same path, with the same validation, the same engine and
the same mandatory review step.

The review step is not optional. This endpoint extracts text and returns it for
the user to confirm or correct; it never starts an analysis. The confirmed text
is submitted separately to the module's own POST endpoint.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from ..providers.ocr_provider import get_ocr_provider
from ..security import MAX_UPLOAD_BYTES, validate_image_upload

logger = logging.getLogger("factlens.ocr.api")

router = APIRouter(prefix="/ocr", tags=["OCR Input Layer"])


@router.post("")
@router.post("/extract")
async def extract_text(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Extract text from an uploaded screenshot for user review.

    Returns the extracted text, a confidence figure, the detected language, any
    URLs found in the image, and the name of the engine that actually read it.
    Nothing is analyzed here -- the user reviews and corrects this text first.
    """
    try:
        data = await file.read()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The upload could not be read: {exc}",
        ) from exc

    # Magic bytes, not the extension.
    verdict = validate_image_upload(data, file.filename or "", max_bytes=MAX_UPLOAD_BYTES)
    if not verdict.valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=verdict.reason
        )

    provider = get_ocr_provider()
    result = provider.extract(data)
    payload = result.to_dict()
    payload["file_name"] = file.filename
    payload["mime_type"] = verdict.mime_type
    payload["size_bytes"] = verdict.size_bytes

    if not result.success:
        # OCR failure is not a server error. The caller shows the message and
        # asks the user to type the text; a scan started from this image would
        # be AWAITING_INPUT.
        payload["next_action"] = "MANUAL_ENTRY"
        payload["next_action_message"] = (
            "The text in this image could not be read. Please type or paste the "
            "text instead."
        )
        payload["next_action_message_bn"] = (
            "এই ছবির লেখা পড়া যায়নি। অনুগ্রহ করে লেখাটি টাইপ করে বা পেস্ট করে দিন।"
        )
        return payload

    payload["next_action"] = "REVIEW_AND_CONFIRM"
    payload["next_action_message"] = (
        "Check the extracted text against the image and correct anything wrong "
        "before running the analysis."
    )
    payload["next_action_message_bn"] = (
        "বিশ্লেষণ চালানোর আগে ছবির সঙ্গে মিলিয়ে লেখাটি দেখে নিন এবং ভুল থাকলে সংশোধন করুন।"
    )
    return payload


@router.get("/health")
def ocr_health() -> Dict[str, Any]:
    """Which OCR engine is live, and whether the declared primary is in use."""
    provider = get_ocr_provider()
    health = provider.health()
    health["declared_primary"] = "EasyOCR (bn + en)"
    health["running_declared_primary"] = health.get("engine", "").startswith("EasyOCR")
    return health
