"""
FactLens Rumor / Claim Scanner Service.

Evaluates factual claims against retrieved evidence. Accepts typed claims,
social-media text in Bengali, English, Banglish or mixed script, screenshots,
news thumbnails and URLs.

Combines the BanglaVerify classifier with an evidence pipeline, a Mamdani fuzzy
inference system, and a precedence gate enforcing that evidence always outranks
the model. While BanglaVerify's artifact is unregistered the module runs on the
evidence pipeline alone and marks scans PARTIAL.
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
from factlens_common.cache import get_cache  # noqa: E402
from factlens_common.providers.ocr_provider import get_ocr_provider  # noqa: E402
from factlens_common.providers.registry import get_registry  # noqa: E402
from factlens_common.queue import queue_health  # noqa: E402
from factlens_common.ratelimit import get_rate_limiter  # noqa: E402
from factlens_common.urlanalysis import get_url_analyzer  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from src.api.routes import api_router  # noqa: E402
from src.core.config import settings  # noqa: E402
from src.core.database import database  # noqa: E402
from src.core.singletons import get_banglaverify  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
)
logger = logging.getLogger("factlens.rumor")


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.create_all()

    # The manifest is loaded at application start (proposal, model registry).
    summary = get_registry().summary()
    logger.info(
        "Model registry: %d of %d models registered (%s)",
        summary["registered_count"],
        summary["total_count"],
        summary["manifest_path"],
    )

    # BanglaVerify loads in the process that runs scans: the Celery worker
    # (see workers/tasks.py). When Redis is down Celery runs eagerly and scans
    # execute here, in the API process -- then the API loads it at start-up.
    from src.workers.tasks import celery_app, load_banglaverify

    if celery_app.conf.get("task_always_eager"):
        logger.info("Celery is in eager mode: loading BanglaVerify in the API process.")
        load_banglaverify()
    else:
        logger.info("BanglaVerify is loaded by the rumour worker; the API stays light.")

    ocr = get_ocr_provider()
    logger.info("OCR input layer: %s", ocr.engine_label())

    yield
    logger.info("Rumor Scanner service shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Claim verification: BanglaVerify classification, evidence retrieval and "
        "stance analysis, Mamdani fuzzy inference, and an evidence-over-model "
        "precedence gate."
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


@app.get("/health")
@app.get("/api/v1/health")
def health():
    """Component-level health, including which signals are currently degraded."""
    from src.workers.tasks import celery_app

    provider = get_banglaverify()
    model_health = provider.health()
    # Up when the process that runs scans has it: this one in eager mode,
    # otherwise the worker's published load report.
    if celery_app.conf.get("task_always_eager"):
        model_health["loaded_in_this_process"] = model_up = provider.is_available()
    else:
        model_health["loaded_in_this_process"] = provider.is_available()
        model_health["worker_status"] = provider.worker_status()
        model_up = bool((model_health["worker_status"] or {}).get("available"))
    # The frontend reads `model.available`: report the scan-running process.
    model_health["available"] = model_up
    if model_up:
        model_health["reason"] = None
        model_health["version"] = (model_health.get("worker_status") or {}).get(
            "version", model_health.get("version"))
    degraded = [] if model_up else ["BanglaVerify"]

    return {
        "service": settings.PROJECT_NAME,
        "status": "healthy",
        "version": settings.VERSION,
        "common_version": common_version,
        "degraded_components": degraded,
        "database": database.health(),
        "queue": queue_health(celery_app),
        "cache": get_cache().health(),
        "rate_limiter": get_rate_limiter().health(),
        "model": model_health,
        "ocr": get_ocr_provider().health(),
        "url_analyzer": get_url_analyzer().health(),
        "registry": get_registry().summary(),
    }


@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "online",
        "endpoints": {
            "create_scan": "POST /api/v1/rumours/scans",
            "poll_scan": "GET /api/v1/rumours/scans/{scan_id}",
            "list_scans": "GET /api/v1/rumours/scans",
            "evidence": "GET /api/v1/rumours/scans/{scan_id}/evidence",
            "pdf_report": "GET /api/v1/rumours/scans/{scan_id}/report.pdf",
            "delete_scan": "DELETE /api/v1/rumours/scans/{scan_id}",
            "ocr": "POST /api/v1/ocr",
            "health": "GET /health",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
