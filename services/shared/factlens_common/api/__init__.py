"""Routers shared by every FactLens analysis service."""

from .ocr_router import router as ocr_router

__all__ = ["ocr_router"]
