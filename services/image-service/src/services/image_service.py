"""
Image Check pipeline.

Proposal, Module 3 "Processing Pipeline":

    1. Upload and validation
    2. Secure storage
    3. Metadata extraction
    4. ImageAuth inference
    5. Technical signal analysis
    6. Result aggregation
    7. Explanation generation

    Steps 3, 4 and 5 run in parallel; step 6 joins them.

Steps 1 and 2 happen in the request handler, because the bytes must be
validated and stored before the scan can be queued. Steps 3-7 run here, in the
worker.
"""

from __future__ import annotations

import io
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional, Tuple

from factlens_common.lifecycle import ImageAssessment
from factlens_common.modelruns import record_model_run
from factlens_common.providers.image_model import ImageAuthProvider
from factlens_common.scanflow import DegradationLog, ScanOutcome
from factlens_common.schema import ImageAnalysis
from sqlalchemy.orm import Session

from .forensics import MetadataExtractor, TechnicalAnalyzer
from .image_aggregator import ImageExplanationBuilder, ImageResultAggregator

logger = logging.getLogger("factlens.image.pipeline")


class ImageCheckService:
    """Runs the Image Check pipeline for one scan."""

    def __init__(
        self, db: Session, model_provider: Optional[ImageAuthProvider] = None
    ) -> None:
        self.db = db
        self.model = model_provider or ImageAuthProvider()
        self.metadata_extractor = MetadataExtractor()
        self.technical_analyzer = TechnicalAnalyzer()
        self.aggregator = ImageResultAggregator()
        self.explainer = ImageExplanationBuilder()

    def analyze(
        self,
        scan_id: str,
        raw_bytes: bytes,
        file_name: str,
        stored_name: str,
        mime_type: Optional[str] = None,
    ) -> Tuple[ScanOutcome, DegradationLog]:
        degradation = DegradationLog()
        started = time.perf_counter()

        from PIL import Image

        try:
            image = Image.open(io.BytesIO(raw_bytes))
            image.load()
        except Exception as exc:  # noqa: BLE001
            degradation.add(
                component="image_decode",
                reason=f"The image could not be decoded: {exc}",
                user_message=(
                    "This file could not be opened as an image, so no analysis was "
                    "possible."
                ),
                user_message_bn=(
                    "এই ফাইলটি ছবি হিসেবে খোলা যায়নি, তাই কোনো বিশ্লেষণ সম্ভব হয়নি।"
                ),
                severity="FAILED",
            )
            return self._unable_outcome(), degradation

        # Steps 3, 4 and 5 in parallel; step 6 joins them.
        with ThreadPoolExecutor(max_workers=3, thread_name_prefix="image") as pool:
            metadata_future = pool.submit(
                self.metadata_extractor.extract, image, raw_bytes
            )
            model_future = pool.submit(self.model.predict, {"image": image})
            technical_future = pool.submit(self.technical_analyzer.analyze, image)

            metadata = metadata_future.result()
            model_prediction = model_future.result()
            technical = technical_future.result()

        record_model_run(self.db, scan_id, model_prediction)

        if not model_prediction.available:
            degradation.add_model_unavailable(
                "ImageAuth", model_prediction.reason or "Model unavailable."
            )
        if not metadata.available:
            degradation.add(
                component="metadata_extraction",
                reason=metadata.error or "Metadata extraction failed.",
                user_message=(
                    "The file's metadata could not be read, so that evidence is "
                    "missing from this assessment."
                ),
                user_message_bn=(
                    "ফাইলের মেটাডেটা পড়া যায়নি, তাই সেই তথ্য এই মূল্যায়নে অনুপস্থিত।"
                ),
            )
        if not technical.available:
            degradation.add(
                component="technical_analysis",
                reason=technical.error or "Technical analysis failed.",
                user_message=(
                    "The noise, compression and frequency checks could not be run on "
                    "this image."
                ),
                user_message_bn=(
                    "এই ছবিতে নয়েজ, কম্প্রেশন ও ফ্রিকোয়েন্সি যাচাই চালানো যায়নি।"
                ),
            )

        # Step 6 -- result aggregation.
        verdict = self.aggregator.aggregate(metadata, technical, model_prediction)

        # Step 7 -- explanation generation.
        explanation = self.explainer.build(
            verdict=verdict,
            metadata=metadata,
            technical=technical,
            degraded_messages=degradation.user_messages(),
        )

        self._persist_analysis(
            scan_id=scan_id,
            file_name=file_name,
            stored_name=stored_name,
            mime_type=mime_type,
            size_bytes=len(raw_bytes),
            metadata=metadata,
            technical=technical,
            verdict=verdict,
        )

        elapsed_ms = (time.perf_counter() - started) * 1000.0

        outcome = ScanOutcome(
            result=verdict.assessment,
            confidence=verdict.confidence,
            summary=explanation["summary"],
            summary_bn=explanation["headline_bn"],
            explanation=explanation,
            limitations=self._limitations(verdict, degradation),
            detail={
                **verdict.as_dict(),
                "metadata": metadata.as_dict(),
                "technical": technical.as_dict(),
                "elapsed_ms": round(elapsed_ms, 2),
                "pipeline": "decode -> [metadata | ImageAuth | technical] -> aggregate -> explain",
            },
            signal_summary={
                "model_available": model_prediction.available,
                "model_version": model_prediction.model_version,
                "metadata_available": metadata.available,
                "technical_available": technical.available,
                "degraded_components": degradation.components,
            },
        )
        return outcome, degradation

    def _persist_analysis(
        self,
        scan_id: str,
        file_name: str,
        stored_name: str,
        mime_type: Optional[str],
        size_bytes: int,
        metadata,
        technical,
        verdict,
    ) -> None:
        self.db.add(
            ImageAnalysis(
                scan_id=scan_id,
                file_name=file_name[:512],
                stored_name=stored_name[:512],
                file_type=mime_type or metadata.format,
                file_size=size_bytes,
                width=metadata.width,
                height=metadata.height,
                image_metadata=metadata.as_dict(),
                technical_signals=technical.as_dict(),
                ai_probability=verdict.ai_probability,
                manipulation_probability=verdict.manipulation_probability,
            )
        )

    @staticmethod
    def _limitations(verdict, degradation: DegradationLog) -> List[str]:
        from .image_aggregator import STANDING_CAVEAT

        limitations = [
            STANDING_CAVEAT,
            "Metadata can be edited or stripped, so its absence proves nothing.",
            "Screenshots, heavily compressed images and images re-saved by social "
            "platforms lose most of the signals this analysis depends on.",
        ]
        if not verdict.model_available:
            limitations.append(
                "The ImageAuth detector was unavailable, so this assessment rests on "
                "metadata and technical signals alone."
            )
        limitations.extend(
            e["user_message"] for e in degradation.entries if e["component"] != "ImageAuth"
        )
        return limitations

    @staticmethod
    def _unable_outcome() -> ScanOutcome:
        from .image_aggregator import STANDING_CAVEAT, STANDING_CAVEAT_BN

        return ScanOutcome(
            result=ImageAssessment.UNABLE_TO_ANALYZE.value,
            confidence=0.0,
            summary="This file could not be opened as an image, so it was not analyzed.",
            summary_bn="এই ফাইলটি ছবি হিসেবে খোলা যায়নি, তাই এটি বিশ্লেষণ করা হয়নি।",
            explanation={
                "headline": "Unable to analyze",
                "headline_bn": "বিশ্লেষণ করা যায়নি",
                "summary": "The uploaded file could not be decoded as an image.",
                "findings": [],
                "standing_caveat": STANDING_CAVEAT,
                "standing_caveat_bn": STANDING_CAVEAT_BN,
            },
            limitations=["The uploaded file could not be decoded as an image."],
        )

    def health(self) -> Dict[str, Any]:
        return {"model": self.model.health()}
