"""
Celery application factory.

Proposal, "System Architecture":

    The API accepts a request, writes a PENDING scan, queues it, and returns a
    scan id immediately. The worker runs the pipeline and writes the result;
    the client polls for completion. Nothing that takes seconds -- OCR, search,
    model inference -- happens inside a request thread.

Each service builds its own Celery app over the shared Redis broker, with its
own queue name so the three modules can be scaled independently.

Development fallback: when Redis is unreachable, `task_always_eager` is turned
on so a scan runs inline instead of vanishing into a queue nobody serves. The
lifecycle is identical either way -- PENDING is still written first and the
client still polls -- so the eager path is a degradation, not a second code
path. `/health` reports which mode is active.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger("factlens.queue")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
BROKER_URL = os.environ.get("CELERY_BROKER_URL", REDIS_URL)
RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", REDIS_URL)

#: Per-module wall-clock budget. A scan over budget becomes TIMEOUT, not FAILED.
TIME_LIMITS_S: Dict[str, int] = {
    "rumor": int(os.environ.get("RUMOR_TIME_LIMIT_S", "120")),
    "scam": int(os.environ.get("SCAM_TIME_LIMIT_S", "60")),
    "image": int(os.environ.get("IMAGE_TIME_LIMIT_S", "90")),
}


def broker_reachable(url: Optional[str] = None, timeout_s: float = 1.5) -> bool:
    """True when the Redis broker answers PING."""
    try:
        import redis  # noqa: PLC0415

        client = redis.Redis.from_url(
            url or BROKER_URL, socket_connect_timeout=timeout_s, socket_timeout=timeout_s
        )
        client.ping()
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Celery broker unreachable at %s (%s)", url or BROKER_URL, exc)
        return False


def make_celery(
    service_name: str,
    queue_name: str,
    include: Optional[list] = None,
    soft_time_limit_s: Optional[int] = None,
):
    """
    Build the Celery app for one service.

    `soft_time_limit_s` raises SoftTimeLimitExceeded inside the task, which the
    task catches to write TIMEOUT. The hard limit sits above it as a backstop.
    """
    from celery import Celery  # noqa: PLC0415

    soft_limit = soft_time_limit_s or TIME_LIMITS_S.get(queue_name, 120)
    hard_limit = soft_limit + 30

    app = Celery(service_name, broker=BROKER_URL, backend=RESULT_BACKEND, include=include or [])

    eager = not broker_reachable()
    if eager:
        logger.warning(
            "[%s] Redis is unreachable -- Celery runs in EAGER mode and scans "
            "execute inline. Start Redis to restore asynchronous processing.",
            service_name,
        )

    app.conf.update(
        task_default_queue=queue_name,
        task_routes={f"{queue_name}.*": {"queue": queue_name}},
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
        # One scan at a time per worker process; models are resident and the
        # deployment target is CPU-bound on 2 vCPU.
        worker_prefetch_multiplier=1,
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        task_soft_time_limit=soft_limit,
        task_time_limit=hard_limit,
        task_track_started=True,
        result_expires=24 * 3600,
        broker_connection_retry_on_startup=True,
        # Degradation path, not a second code path.
        task_always_eager=eager,
        task_eager_propagates=False,
    )
    return app


def queue_health(app: Any) -> Dict[str, Any]:
    """Queue state for a service's /health endpoint."""
    eager = bool(app.conf.get("task_always_eager"))
    return {
        "broker": BROKER_URL,
        "mode": "eager (inline, Redis unreachable)" if eager else "async (celery worker)",
        "async": not eager,
        "queue": app.conf.get("task_default_queue"),
        "soft_time_limit_s": app.conf.get("task_soft_time_limit"),
    }
