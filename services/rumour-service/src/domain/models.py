"""
Domain models for the Rumor Scanner.

The service no longer declares its own tables. All three analysis modules share
the one schema described in the proposal's "Database Design" section, so a scan
written by any module has the same shape, the same lifecycle and the same
audit trail.

This module re-exports the shared definitions so existing imports resolve, and
documents the mapping from the old per-service tables:

    rumour_scans     -> scans          (type = 'RUMOR') + scan_results
    rumour_evidences -> evidence
    search_queries   -> search_queries (unchanged)

Fields that used to live on `rumour_scans` now live where they belong:
`verdict`/`confidence`/`summary` on `scan_results`, the BanglaVerify output in
`model_runs`, and the fuzzy scores in `scan_results.detail`.
"""

from factlens_common.schema import (  # noqa: F401
    Base,
    Evidence,
    ImageAnalysis,
    ModelRun,
    RefreshToken,
    Scan,
    ScanResult,
    ScamIndicator,
    SearchQueryRecord,
    UrlAnalysis,
    User,
    UserProfile,
    compute_input_hash,
    generate_scan_id,
    generate_uuid,
    utcnow,
)

__all__ = [
    "Base",
    "Scan",
    "ScanResult",
    "Evidence",
    "SearchQueryRecord",
    "UrlAnalysis",
    "ModelRun",
    "ImageAnalysis",
    "ScamIndicator",
    "User",
    "UserProfile",
    "RefreshToken",
    "generate_scan_id",
    "generate_uuid",
    "compute_input_hash",
    "utcnow",
]
