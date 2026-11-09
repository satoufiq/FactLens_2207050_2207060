"""
Unified FactLens database schema.

Implements the proposal's "Database Design" section verbatim: a single `scans`
entity unifies all three modules under one lifecycle, and module-specific
results live in related tables.

    users            accounts and roles
    scans            one row per analysis request, any module
    scan_results     the verdict shown to the user
    evidence         retrieved evidence for rumor scans
    scam_indicators  rule hits for scam scans
    image_analysis   image forensics output
    url_analysis     URL inspection, shared by rumor and scam scans
    model_runs       which model version produced which number

Every service imports these definitions rather than redeclaring them, so the
three analysis services and the identity service agree on one schema.
"""

from __future__ import annotations

import hashlib
import unicodedata
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    return str(uuid.uuid4())


def generate_scan_id() -> str:
    return f"FL-{uuid.uuid4().hex[:12].upper()}"


def compute_input_hash(text: str | None, url: str | None = None) -> str:
    """
    SHA-256 of the normalized input (proposal: `scans.input_hash`).

    The same viral rumor arrives from hundreds of users; hashing the normalized
    form lets a recent verdict be reused instead of re-running search and
    inference. Normalization here must be stable, so it is deliberately simple:
    NFC, casefold, collapsed whitespace.
    """
    parts = []
    for raw in (text, url):
        if not raw:
            continue
        norm = unicodedata.normalize("NFC", raw).strip().casefold()
        norm = " ".join(norm.split())
        parts.append(norm)
    joined = "␟".join(parts)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# users -- accounts and roles
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    # Retained for rows written by the pre-bcrypt SHA-256 scheme. Empty for
    # bcrypt rows; see utils/security.py for the transparent upgrade path.
    salt = Column(String(64), nullable=True, default="")
    role = Column(String(50), default="ROLE_ANALYST", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    profile = relationship(
        "UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True, default="")
    location = Column(String(100), nullable=True, default="Bangladesh")
    bio = Column(Text, nullable=True, default="")
    avatar_url = Column(String(500), nullable=True, default="")
    organization = Column(String(255), nullable=True, default="FactLens Verification Network")
    preferences = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="profile")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")


# ---------------------------------------------------------------------------
# scans -- one row per analysis request, any module
# ---------------------------------------------------------------------------
class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(64), primary_key=True, default=generate_scan_id, index=True)
    # No cross-service FK: the identity service owns `users`, and a scan may be
    # anonymous. Referential integrity is enforced in the service layer.
    user_id = Column(String(64), nullable=True, index=True)
    type = Column(String(16), nullable=False, index=True)            # RUMOR | SCAM | IMAGE
    status = Column(String(24), nullable=False, index=True, default="PENDING")

    input_text = Column(Text, nullable=True)
    input_url = Column(String(1024), nullable=True)
    input_hash = Column(String(64), nullable=True, index=True)

    # Normalized form retained for audit and for re-running a scan.
    normalized_text = Column(Text, nullable=True)
    language = Column(String(16), nullable=True)
    source_format = Column(String(32), nullable=True, default="TEXT")  # TEXT | IMAGE | URL

    # Set when the scan degraded; surfaced to the user with the verdict.
    degraded_reason = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    result = relationship(
        "ScanResult", back_populates="scan", uselist=False, cascade="all, delete-orphan"
    )
    evidence = relationship(
        "Evidence", back_populates="scan", cascade="all, delete-orphan"
    )
    indicators = relationship(
        "ScamIndicator", back_populates="scan", cascade="all, delete-orphan"
    )
    image_analysis = relationship(
        "ImageAnalysis", back_populates="scan", uselist=False, cascade="all, delete-orphan"
    )
    url_analyses = relationship(
        "UrlAnalysis", back_populates="scan", cascade="all, delete-orphan"
    )
    model_runs = relationship(
        "ModelRun", back_populates="scan", cascade="all, delete-orphan"
    )
    queries = relationship(
        "SearchQueryRecord", back_populates="scan", cascade="all, delete-orphan"
    )


Index("ix_scans_hash_recent", Scan.input_hash, Scan.type, Scan.created_at)


# ---------------------------------------------------------------------------
# scan_results -- the verdict shown to the user
# ---------------------------------------------------------------------------
class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(
        String(64), ForeignKey("scans.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # RUMOR: SUPPORTED | CONTRADICTED | UNVERIFIED | UNVERIFIED_SUSPICIOUS
    # SCAM:  LOW_RISK | MEDIUM_RISK | HIGH_RISK
    # IMAGE: LIKELY_AUTHENTIC | POSSIBLE_MANIPULATION | LIKELY_AI_GENERATED
    result = Column(String(64), nullable=False)
    confidence = Column(Float, default=0.5, nullable=False)
    summary = Column(Text, nullable=True)
    summary_bn = Column(Text, nullable=True)

    # Explanation layer output: the reasons shown to the user, never a bare label.
    explanation = Column(JSON, nullable=True)
    limitations = Column(JSON, nullable=True)
    # Module-specific scoring detail (fuzzy scores, risk breakdown, forensics).
    detail = Column(JSON, nullable=True)
    # Which signals contributed and which were unavailable.
    signal_summary = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=utcnow, nullable=False)

    scan = relationship("Scan", back_populates="result")


# ---------------------------------------------------------------------------
# evidence -- retrieved evidence for rumor scans
# ---------------------------------------------------------------------------
class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(
        String(64), ForeignKey("scans.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title = Column(String(512), nullable=False)
    source_name = Column(String(256), nullable=True)
    publisher = Column(String(256), nullable=True)
    source_type = Column(String(64), default="NEWS_MEDIA")
    url = Column(String(1024), nullable=False)
    snippet = Column(Text, nullable=True)
    published_at = Column(String(128), nullable=True)
    retrieved_at = Column(DateTime, default=utcnow, nullable=False)

    relevance_score = Column(Float, default=0.0)
    source_reliability = Column(Float, default=0.5)
    directness_score = Column(Float, default=0.0)
    temporal_match_score = Column(Float, default=1.0)

    # SUPPORTING | CONTRADICTING | NEUTRAL | INSUFFICIENT
    relationship_label = Column("relationship", String(32), default="NEUTRAL")
    stance = Column(String(32), default="NEUTRAL")
    # Which component produced the label: NLI model, or the deterministic matcher.
    stance_source = Column(String(32), default="MATCHER")
    reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utcnow, nullable=False)

    scan = relationship("Scan", back_populates="evidence")


class SearchQueryRecord(Base):
    __tablename__ = "search_queries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(
        String(64), ForeignKey("scans.id", ondelete="CASCADE"), index=True, nullable=False
    )
    query_text = Column(String(512), nullable=False)
    results_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    scan = relationship("Scan", back_populates="queries")


# ---------------------------------------------------------------------------
# scam_indicators -- rule hits for scam scans
# ---------------------------------------------------------------------------
class ScamIndicator(Base):
    __tablename__ = "scam_indicators"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(
        String(64), ForeignKey("scans.id", ondelete="CASCADE"), index=True, nullable=False
    )
    rule_id = Column(String(64), nullable=True)
    category = Column(String(64), nullable=False)
    severity = Column(String(16), nullable=False, default="MEDIUM")
    description = Column(Text, nullable=False)
    description_bn = Column(Text, nullable=True)
    matched_text = Column(Text, nullable=True)
    weight = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    scan = relationship("Scan", back_populates="indicators")


# ---------------------------------------------------------------------------
# image_analysis -- image forensics output
# ---------------------------------------------------------------------------
class ImageAnalysis(Base):
    __tablename__ = "image_analysis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(
        String(64), ForeignKey("scans.id", ondelete="CASCADE"), index=True, nullable=False
    )
    file_name = Column(String(512), nullable=False)
    stored_name = Column(String(512), nullable=True)
    file_type = Column(String(64), nullable=True)
    file_size = Column(Integer, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)

    # EXIF, software tags, timestamps, GPS, colour profile, C2PA presence.
    image_metadata = Column("metadata", JSON, nullable=True)
    # Noise, compression and frequency-domain findings.
    technical_signals = Column(JSON, nullable=True)

    ai_probability = Column(Float, nullable=True)
    manipulation_probability = Column(Float, nullable=True)

    created_at = Column(DateTime, default=utcnow, nullable=False)

    scan = relationship("Scan", back_populates="image_analysis")


# ---------------------------------------------------------------------------
# url_analysis -- URL inspection, shared by rumor and scam scans
# ---------------------------------------------------------------------------
class UrlAnalysis(Base):
    __tablename__ = "url_analysis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(
        String(64), ForeignKey("scans.id", ondelete="CASCADE"), index=True, nullable=False
    )
    url = Column(String(2048), nullable=False)
    domain = Column(String(512), nullable=True, index=True)
    registered_domain = Column(String(512), nullable=True)
    tld = Column(String(64), nullable=True)
    has_https = Column(Boolean, default=False)
    redirect_chain = Column(JSON, nullable=True)
    reputation_score = Column(Float, nullable=True)
    reputation_source = Column(String(64), nullable=True)
    flags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    scan = relationship("Scan", back_populates="url_analyses")


# ---------------------------------------------------------------------------
# model_runs -- which model version produced which number
# ---------------------------------------------------------------------------
class ModelRun(Base):
    __tablename__ = "model_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(
        String(64), ForeignKey("scans.id", ondelete="CASCADE"), index=True, nullable=False
    )
    model_name = Column(String(128), nullable=False, index=True)
    model_version = Column(String(64), nullable=False)
    # OK | UNAVAILABLE | TIMEOUT | ERROR -- a missing model is recorded, not hidden.
    status = Column(String(24), nullable=False, default="OK")
    raw_output = Column(JSON, nullable=True)
    latency_ms = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    scan = relationship("Scan", back_populates="model_runs")


__all__ = [
    "Base",
    "User",
    "UserProfile",
    "RefreshToken",
    "Scan",
    "ScanResult",
    "Evidence",
    "SearchQueryRecord",
    "ScamIndicator",
    "ImageAnalysis",
    "UrlAnalysis",
    "ModelRun",
    "compute_input_hash",
    "generate_scan_id",
    "generate_uuid",
    "utcnow",
]
