"""
Celery tasks for Image Check.

Includes the retention sweep as a periodic task: uploaded images are deleted
after a configurable window while the derived analysis fields are kept
(proposal, "Privacy").
"""

from __future__ import annotations

import logging

from celery.exceptions import SoftTimeLimitExceeded
from celery.schedules import crontab
from factlens_common.queue import make_celery
from factlens_common.scanflow import ScanLifecycle
from factlens_common.schema import ImageAnalysis

from ..core.config import settings
from ..core.database import database
from ..core.storage import image_store
from ..services.image_service import ImageCheckService

logger = logging.getLogger("factlens.image.worker")

celery_app = make_celery(
    service_name=settings.SERVICE_NAME,
    queue_name=settings.QUEUE_NAME,
    include=["src.workers.tasks"],
    soft_time_limit_s=settings.TIME_LIMIT_S,
)

celery_app.conf.beat_schedule = {
    "image-retention-sweep": {
        "task": "image.retention_sweep",
        "schedule": crontab(minute=0),  # hourly
    }
}


@celery_app.task(name="image.analyze", bind=True, max_retries=2)
def analyze_image_scan(self, scan_id: str, stored_name: str, file_name: str,
                       mime_type: str = None) -> dict:
    """Run one Image Check scan end to end."""
    db = database.session()
    lifecycle = ScanLifecycle(db)

    try:
        lifecycle.begin(scan_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("[%s] could not start: %s", scan_id, exc)
        db.close()
        return {"scan_id": scan_id, "status": "FAILED", "error": str(exc)}

    try:
        raw_bytes = image_store.read(stored_name)
        if raw_bytes is None:
            lifecycle.fail(
                scan_id,
                "The uploaded image is no longer available on disk. It may have passed "
                "the retention window before analysis ran.",
            )
            return {"scan_id": scan_id, "status": "FAILED"}

        service = ImageCheckService(db)
        outcome, degradation = service.analyze(
            scan_id=scan_id,
            raw_bytes=raw_bytes,
            file_name=file_name,
            stored_name=stored_name,
            mime_type=mime_type,
        )

        cache_payload = {
            "result": outcome.result,
            "confidence": outcome.confidence,
            "summary": outcome.summary,
            "summary_bn": outcome.summary_bn,
            "explanation": outcome.explanation,
        }
        scan = lifecycle.settle(scan_id, outcome, degradation, cache_payload)
        return {"scan_id": scan_id, "status": scan.status, "result": outcome.result}

    except SoftTimeLimitExceeded:
        lifecycle.timeout(scan_id, settings.TIME_LIMIT_S)
        return {"scan_id": scan_id, "status": "TIMEOUT"}

    except Exception as exc:  # noqa: BLE001
        logger.exception("[%s] image analysis failed", scan_id)
        try:
            lifecycle.fail(scan_id, f"Image analysis failed: {exc}")
        except Exception:  # noqa: BLE001
            logger.exception("[%s] could not record failure", scan_id)
        return {"scan_id": scan_id, "status": "FAILED", "error": str(exc)}

    finally:
        db.close()


@celery_app.task(name="image.retention_sweep")
def retention_sweep() -> dict:
    """
    Delete uploaded images past the retention window.

    The ImageAnalysis rows survive -- only the original bytes go, and the row
    records that the file is gone so the UI can say so rather than 404.
    """
    deleted, freed = image_store.sweep()

    db = database.session()
    try:
        from datetime import datetime, timedelta, timezone

        cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.RETENTION_HOURS)
        stale = (
            db.query(ImageAnalysis)
            .filter(ImageAnalysis.created_at < cutoff)
            .filter(ImageAnalysis.stored_name.isnot(None))
            .all()
        )
        for row in stale:
            row.stored_name = None
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Retention bookkeeping failed: %s", exc)
        db.rollback()
    finally:
        db.close()

    return {"files_deleted": deleted, "bytes_freed": freed}
