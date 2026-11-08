from fastapi import APIRouter

from ..core.config import settings
from .v1.scams import router as scams_router

api_router = APIRouter()
api_router.include_router(scams_router, prefix=settings.API_V1_PREFIX)
