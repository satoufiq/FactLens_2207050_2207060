from fastapi import APIRouter

from ..core.config import settings
from .v1.images import router as images_router

api_router = APIRouter()
api_router.include_router(images_router, prefix=settings.API_V1_PREFIX)
