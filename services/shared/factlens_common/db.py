"""
Database engine and session factory.

All services connect to one PostgreSQL database (`factlens_db`), matching the
proposal's "PostgreSQL holds all persistent data". Each service owns its own
tables but shares the `scans` lifecycle, so a scan written by the API is the
same row the worker updates and the history page reads.

A SQLite fallback keeps local development working when PostgreSQL is not
running. It is development-only: the health endpoint reports which backend is
live so nobody demonstrates against SQLite by accident.
"""

from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterator, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from .schema import Base

logger = logging.getLogger("factlens.db")

DEFAULT_URL = (
    "postgresql+psycopg2://factlens_admin:factlens_secure_password_2026"
    "@localhost:5432/factlens_db"
)


def _normalize(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


class Database:
    """Owns one engine + sessionmaker for a service process."""

    def __init__(
        self,
        url: Optional[str] = None,
        fallback_sqlite: Optional[str] = None,
        service_name: str = "factlens",
    ) -> None:
        self.service_name = service_name
        self.url = _normalize(
            url or os.environ.get("DATABASE_URL") or DEFAULT_URL
        )
        self.fallback_sqlite = fallback_sqlite or (
            f"sqlite:///{Path.cwd() / f'{service_name}.db'}"
        )
        self.backend = "postgresql"
        self.degraded = False
        self.engine: Engine = self._init_engine()
        self.SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=self.engine, expire_on_commit=False
        )

    def _init_engine(self) -> Engine:
        try:
            connect_args = (
                {"check_same_thread": False} if self.url.startswith("sqlite") else {}
            )
            engine = create_engine(
                self.url,
                connect_args=connect_args,
                pool_pre_ping=True,
                pool_recycle=1800,
                future=True,
            )
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            self.backend = "sqlite" if self.url.startswith("sqlite") else "postgresql"
            logger.info(
                "[%s] connected to %s",
                self.service_name,
                self.url.split("@")[-1] if "@" in self.url else self.url,
            )
            return engine
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "[%s] primary database unreachable (%s). Falling back to SQLite at %s. "
                "This is a development fallback -- do not demonstrate against it.",
                self.service_name,
                exc,
                self.fallback_sqlite,
            )
            self.backend = "sqlite"
            self.degraded = True
            return create_engine(
                self.fallback_sqlite,
                connect_args={"check_same_thread": False},
                future=True,
            )

    # Arbitrary, fixed key for the schema-creation advisory lock
    _SCHEMA_LOCK_KEY = 0x46_4C_53_43  # "FLSC"

    def create_all(self) -> None:
        """Create any missing tables from the shared schema.

        Every service shares one schema and calls this at start-up. Under
        docker compose they start together, and concurrent CREATE TABLEs on
        PostgreSQL collide; a transaction-scoped advisory lock lets them run
        one after another (the later ones then find the tables in place).
        """
        if self.backend == "postgresql":
            with self.engine.begin() as conn:
                conn.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": self._SCHEMA_LOCK_KEY})
                Base.metadata.create_all(bind=conn)
        else:
            Base.metadata.create_all(bind=self.engine)
        logger.info("[%s] schema verified (%s)", self.service_name, self.backend)

    def session(self) -> Session:
        return self.SessionLocal()

    @contextmanager
    def session_scope(self) -> Iterator[Session]:
        """Transactional scope: commits on success, rolls back on error."""
        db = self.SessionLocal()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def get_db(self) -> Iterator[Session]:
        """FastAPI dependency."""
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def is_reachable(self) -> bool:
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:  # noqa: BLE001
            return False

    def health(self) -> Dict[str, Any]:
        return {
            "backend": self.backend,
            "reachable": self.is_reachable(),
            "degraded_to_sqlite": self.degraded,
            "target": self.url.split("@")[-1] if "@" in self.url else self.url,
        }
