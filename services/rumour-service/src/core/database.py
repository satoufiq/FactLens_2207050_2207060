"""Database wiring for the Rumor Scanner service."""

from factlens_common.db import Database

from .config import settings

database = Database(
    url=settings.DATABASE_URL,
    fallback_sqlite=settings.FALLBACK_SQLITE_URL,
    service_name=settings.SERVICE_NAME,
)

# Retained so existing imports keep resolving.
engine = database.engine
SessionLocal = database.SessionLocal


def get_db():
    """FastAPI dependency yielding a session."""
    yield from database.get_db()
