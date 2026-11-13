from fastapi import APIRouter

# OCR now comes from the shared input layer, so all three analysis services
# expose the same endpoint with the same engine and the same review step.
from factlens_common.api import ocr_router

from ..core.config import settings
from .v1.admin import router as admin_router
from .v1.legacy import router as legacy_router
from .v1.scans import router as scans_router

api_router = APIRouter()
api_router.include_router(scans_router, prefix=settings.API_V1_PREFIX)
api_router.include_router(ocr_router, prefix=settings.API_V1_PREFIX)
api_router.include_router(admin_router, prefix=settings.API_V1_PREFIX)
api_router.include_router(legacy_router)
