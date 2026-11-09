"""
FactLens Scam Alert Service.

Identifies potentially fraudulent or malicious communications: SMS, email
content, Messenger and WhatsApp messages, job offers, prize notifications,
financial requests, investment offers, phishing messages, screenshots of any of
these, and suspicious URLs.

ScamNet-BN alone decides the risk. URL analysis is shown as information about
each link and does not change it. When the model cannot answer (not loaded,
busy, timed out, failed) the scan ends FAILED or TIMEOUT with "Unable to
analyze" -- there is no rule-based backup verdict (rule engine removed
2026-11-13).
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from factlens_common import __version__ as common_version  # noqa: E402
from factlens_common.api import ocr_router  # noqa: E402
from factlens_common.cache import get_cache  # noqa: E402
from factlens_common.providers.registry import get_registry  # noqa: E402
from factlens_common.queue import queue_health  # noqa: E402
from factlens_common.ratelimit import get_rate_limiter  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from src.api.routes import api_router  # noqa: E402
from src.core.config import settings  # noqa: E402
from src.core.database import database  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
)
logger = logging.getLogger("factlens.scam")


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.create_all()

    # The manifest is loaded at application start, per the proposal.
    registry = get_registry()
    summary = registry.summary()
    logger.info(
        "Model registry: %d of %d models registered",
        summary["registered_count"],
        summary["total_count"],
    )

    # ScamNet-BN loads in the process that runs scans. With a Celery worker
    # that is the worker (see workers/tasks.py), so the API stays light. When
    # Redis is down Celery runs eagerly and scans execute here, in the API
    # process -- then, and only then, the API loads the model, at start-up.
    from src.providers.scamnet import weights_present
    from src.workers.tasks import celery_app, load_scamnet

    if celery_app.conf.get("task_always_eager"):
        logger.info("Celery is in eager mode: loading ScamNet-BN in the API process.")
        load_scamnet()
    else:
        files = weights_present(settings.SCAMNET_MODEL_DIR)
        if not files["complete"]:
            logger.warning(
                "ScamNet-BN files incomplete at %s (%s). Scam scans will end "
                "'Unable to analyze' until the model is available.",
                settings.SCAMNET_MODEL_DIR,
                files,
            )
        else:
            logger.info("ScamNet-BN files present; the Celery worker loads the model.")

    yield
    logger.info("Scam Alert service shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Scam and phishing detection by the ScamNet-BN classifier, with URL "
        "structure analysis shown as information."
    ),
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(ocr_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
@app.get("/api/v1/health")
def health():
    """Service health. Without the model, scam scans cannot be answered."""
    from factlens_common.urlanalysis import get_url_analyzer

    from src.providers.scamnet import get_scamnet_runtime
    from src.workers.tasks import celery_app

    model_health = get_scamnet_runtime().health()
    degraded = []
    # The model counts as up when the process that runs scans has it loaded:
    # this process in eager mode, otherwise the worker's published report.
    if celery_app.conf.get("task_always_eager"):
        model_up = model_health["loaded_in_this_process"]
    else:
        model_up = bool((model_health.get("worker_status") or {}).get("available"))
    if not model_up:
        degraded.append("scamnet-bn")

    return {
        "service": settings.PROJECT_NAME,
        # The model is the whole verdict: without it scans cannot be answered.
        "status": "healthy" if model_up else "unavailable",
        "version": settings.VERSION,
        "common_version": common_version,
        "degraded_components": degraded,
        "database": database.health(),
        "queue": queue_health(celery_app),
        "cache": get_cache().health(),
        "rate_limiter": get_rate_limiter().health(),
        "model": {**model_health, "available": model_up},
        "url_analyzer": get_url_analyzer().health(),
    }


@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "online",
        "endpoints": {
            "create_scan": "POST /api/v1/scams/scans",
            "poll_scan": "GET /api/v1/scams/scans/{scan_id}",
            "list_scans": "GET /api/v1/scams/scans",
            "delete_scan": "DELETE /api/v1/scams/scans/{scan_id}",
            "ocr": "POST /api/v1/ocr",
            "health": "GET /health",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
