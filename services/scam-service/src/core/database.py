"""Database wiring for the Scam Alert service."""

from factlens_common.db import Database

from .config import settings

database = Database(
    url=settings.DATABASE_URL,
    fallback_sqlite=settings.FALLBACK_SQLITE_URL,
    service_name=settings.SERVICE_NAME,
)


def get_db():
    """FastAPI dependency yielding a session."""
    yield from database.get_db()
