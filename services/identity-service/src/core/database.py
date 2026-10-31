"""Database wiring for the Identity service."""

from factlens_common.db import Database

from .config import settings

database = Database(
    url=settings.DATABASE_URL,
    fallback_sqlite=settings.FALLBACK_SQLITE_URL,
    service_name="identity-service",
)

# Retained so existing imports keep resolving.
engine = database.engine
SessionLocal = database.SessionLocal
Base = __import__(
    "factlens_common.schema", fromlist=["Base"]
).Base


def get_db():
    """FastAPI dependency yielding a session."""
    yield from database.get_db()
