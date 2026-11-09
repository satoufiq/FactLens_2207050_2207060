"""
Celery tasks for the Rumor Scanner.

The worker owns the lifecycle, enforces the time budget, and pre-warms the
model once per process rather than once per scan.
"""

from __future__ import annotations

import logging
import sys

from celery.exceptions import SoftTimeLimitExceeded
from celery.signals import worker_process_init, worker_ready
from factlens_common.queue import make_celery
from factlens_common.scanflow import ScanLifecycle

from ..core.config import settings
from ..core.database import database
from ..services.verification_facade import RumourVerificationFacade

logger = logging.getLogger("factlens.rumor.worker")

celery_app = make_celery(
    service_name=settings.SERVICE_NAME,
    queue_name=settings.QUEUE_NAME,
    include=["src.workers.tasks"],
    soft_time_limit_s=settings.TIME_LIMIT_S,
)


def load_banglaverify() -> None:
    """
    Load BanglaVerify once for this process and run the warm-up. Never raises:
    a missing or broken model must never stop the worker -- scans then run on
    the evidence pipeline alone and are marked PARTIAL.
    """
    try:
        from ..core.singletons import get_banglaverify

        runtime = get_banglaverify()
        if runtime.load(warm_up=True):
            logger.info(
                "BanglaVerify %s ready (load %.1fs, warm-up %.0f ms)",
                runtime.version(), (runtime.load_ms or 0) / 1000, runtime.warmup_ms or 0,
            )
        else:
            logger.warning(
                "BanglaVerify unavailable: %s Rumor scans will run on the evidence "
                "pipeline alone and be marked PARTIAL.", runtime.unavailable_reason(),
            )
    except Exception as exc:  # noqa: BLE001
        logger.error("BanglaVerify load failed: %s", exc)


@worker_process_init.connect
def warm_models(**_kwargs) -> None:
    """Prefork pool (Linux, Docker): each child process loads its own copy."""
    load_banglaverify()


def _runs_tasks_in_main_process(sender) -> bool:
    """Solo/threads pools (Windows needs --pool=solo) never fire worker_process_init."""
    pool_cls = getattr(getattr(sender, "controller", None), "pool_cls", None)
    name = getattr(pool_cls, "__module__", "") + "." + getattr(pool_cls, "__name__", str(pool_cls or ""))
    if any(word in name.lower() for word in ("solo", "thread")):
        return True
    argv = " ".join(sys.argv).lower()
    return any(flag in argv for flag in ("--pool=solo", "-p solo", "--pool solo", "--pool=threads", "-p threads"))


@worker_ready.connect
def _load_in_main_process(sender=None, **_kwargs) -> None:
    if _runs_tasks_in_main_process(sender):
        load_banglaverify()


@celery_app.task(name="rumor.verify", bind=True, max_retries=2)
def verify_rumor_scan(self, scan_id: str) -> dict:
    """Run one rumor scan end to end."""
    db = database.session()
    lifecycle = ScanLifecycle(db)

    try:
        scan = lifecycle.begin(scan_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("[%s] could not start: %s", scan_id, exc)
        db.close()
        return {"scan_id": scan_id, "status": "FAILED", "error": str(exc)}

    try:
        facade = RumourVerificationFacade(db)
        outcome, degradation = facade.verify(
            scan_id=scan.id,
            claim_text=scan.input_text or "",
            input_url=scan.input_url,
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
        logger.exception("[%s] rumor verification failed", scan_id)
        try:
            lifecycle.fail(scan_id, f"Rumor verification failed: {exc}")
        except Exception:  # noqa: BLE001
            logger.exception("[%s] could not record failure", scan_id)
        return {"scan_id": scan_id, "status": "FAILED", "error": str(exc)}

    finally:
        db.close()
