"""
FactLens Image Check Service.

Examines uploaded images for indicators of AI generation or digital
manipulation, combining the ImageAuth detector with EXIF metadata, noise and
compression analysis, and frequency-domain checks.

While the ImageAuth artifact is unregistered the module runs on metadata and
the technical signals alone and marks every scan PARTIAL -- the degraded mode
the proposal specifies, not a failure.
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
from factlens_common.providers.image_model import ImageAuthProvider  # noqa: E402
from factlens_common.providers.registry import get_registry  # noqa: E402
from factlens_common.queue import queue_health  # noqa: E402
from factlens_common.ratelimit import get_rate_limiter  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from src.api.routes import api_router  # noqa: E402
from src.core.config import settings  # noqa: E402
from src.core.database import database  # noqa: E402
from src.core.storage import image_store  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
)
logger = logging.getLogger("factlens.image")


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.create_all()

    registry = get_registry()
    summary = registry.summary()
    logger.info(
        "Model registry: %d of %d models registered",
        summary["registered_count"],
        summary["total_count"],
    )

    provider = ImageAuthProvider()
    if provider.is_available():
        logger.info("ImageAuth %s available (loads on demand).", provider.version())
    else:
        logger.warning(
            "ImageAuth unavailable: %s Image scans will run on metadata and "
            "technical signals, and will be marked PARTIAL.",
            provider.unavailable_reason(),
        )

    logger.info(
        "Upload store at %s, retention %d h, not served statically.",
        settings.UPLOAD_DIR,
        settings.RETENTION_HOURS,
    )

    yield
    logger.info("Image Check service shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "AI-generated and manipulated image detection: ImageAuth detector, EXIF "
        "metadata extraction, noise and compression analysis, frequency-domain checks."
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

# Note: the upload directory is deliberately NOT mounted. Users upload
# screenshots of private conversations; those bytes are never served.


@app.get("/health")
@app.get("/api/v1/health")
def health():
    from src.workers.tasks import celery_app

    provider = ImageAuthProvider()
    degraded = [] if provider.is_available() else ["ImageAuth"]

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
        "model": provider.health(),
        "storage": image_store.health(),
    }


@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "online",
        "endpoints": {
            "create_scan": "POST /api/v1/images/scans",
            "poll_scan": "GET /api/v1/images/scans/{scan_id}",
            "list_scans": "GET /api/v1/images/scans",
            "delete_scan": "DELETE /api/v1/images/scans/{scan_id}",
            "health": "GET /health",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
