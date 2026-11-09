"""
Celery tasks for Scam Alert.

The worker owns the lifecycle. It moves the scan PENDING -> PROCESSING, runs
the pipeline, and writes exactly one terminal state. Nothing here runs in a
request thread.

A soft time limit raises SoftTimeLimitExceeded inside the task; it is caught so
the scan lands on TIMEOUT -- retryable, and distinct from FAILED -- rather than
dying with the worker process.
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
from ..providers.scamnet import get_scamnet_runtime
from ..services.scam_service import ScamAlertService

logger = logging.getLogger("factlens.scam.worker")

celery_app = make_celery(
    service_name=settings.SERVICE_NAME,
    queue_name=settings.QUEUE_NAME,
    include=["src.workers.tasks"],
    soft_time_limit_s=settings.TIME_LIMIT_S,
)


# -- model loading: once per process that executes tasks ---------------------

def load_scamnet() -> None:
    """Load ScamNet-BN and run the warm-up. Never raises; failures are logged."""
    runtime = get_scamnet_runtime()
    if runtime.load(warm_up=True):
        logger.info(
            "ScamNet-BN %s ready in this worker (load %.1fs, warm-up %.0f ms)",
            runtime.version(),
            (runtime.report.load_ms or 0) / 1000.0,
            runtime.report.warmup_ms or 0,
        )


@worker_process_init.connect
def _load_in_pool_child(**_kwargs) -> None:
    """Prefork pool (Linux, Docker): each child process loads its own copy."""
    load_scamnet()


def _runs_tasks_in_main_process(sender) -> bool:
    """
    True for pools that execute tasks in the main process (solo, threads).

    `worker_process_init` only fires for prefork children, and Windows needs
    `--pool=solo`, so without this the solo worker would never load the model.
    """
    pool_cls = getattr(getattr(sender, "controller", None), "pool_cls", None)
    name = getattr(pool_cls, "__module__", "") + "." + getattr(pool_cls, "__name__", str(pool_cls or ""))
    if any(word in name.lower() for word in ("solo", "thread")):
        return True
    argv = " ".join(sys.argv).lower()
    return any(flag in argv for flag in ("--pool=solo", "-p solo", "--pool solo", "--pool=threads", "-p threads"))


@worker_ready.connect
def _load_in_main_process(sender=None, **_kwargs) -> None:
    if _runs_tasks_in_main_process(sender):
        load_scamnet()


@celery_app.task(name="scam.analyze", bind=True, max_retries=2)
def analyze_scam_scan(self, scan_id: str) -> dict:
    """Run one Scam Alert scan end to end."""
    db = database.session()
    lifecycle = ScanLifecycle(db)

    try:
        scan = lifecycle.begin(scan_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("[%s] could not start: %s", scan_id, exc)
        db.close()
        return {"scan_id": scan_id, "status": "FAILED", "error": str(exc)}

    try:
        service = ScamAlertService(db)
        analysis = service.analyze(
            scan_id=scan.id,
            message_text=scan.input_text or "",
            input_url=scan.input_url,
        )
        outcome = analysis.outcome

        if analysis.status == "COMPLETED":
            cache_payload = {
                "result": outcome.result,
                "confidence": outcome.confidence,
                "summary": outcome.summary,
                "summary_bn": outcome.summary_bn,
                "explanation": outcome.explanation,
                # Public fields only (risk, class, probabilities, indicators,
                # model_version); never normalized_text or branch_weights.
                "detail": outcome.detail,
            }
            scan = lifecycle.complete(scan_id, outcome, cache_payload)
        elif analysis.status == "TIMEOUT":
            # The model timed out: retryable, and distinct from FAILED.
            scan = lifecycle.timeout(scan_id, settings.SCAMNET_TIMEOUT_SECONDS, outcome=outcome)
        else:
            # ScamNet-BN unavailable, busy or errored: no verdict to give.
            scan = lifecycle.fail(scan_id, analysis.error or "no verdict", outcome=outcome)
        return {"scan_id": scan_id, "status": scan.status, "result": outcome.result}

    except SoftTimeLimitExceeded:
        lifecycle.timeout(scan_id, settings.TIME_LIMIT_S)
        return {"scan_id": scan_id, "status": "TIMEOUT"}

    except Exception as exc:  # noqa: BLE001
        logger.exception("[%s] scam analysis failed", scan_id)
        try:
            lifecycle.fail(scan_id, f"Scam analysis failed: {exc}")
        except Exception:  # noqa: BLE001
            logger.exception("[%s] could not record failure", scan_id)
        return {"scan_id": scan_id, "status": "FAILED", "error": str(exc)}

    finally:
        db.close()
