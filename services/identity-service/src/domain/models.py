"""
Domain models for the Identity service.

All four services share the one schema described in the proposal's "Database
Design" section, so `users` is declared once in `factlens_common.schema` and
re-exported here. That is what lets a scan's `user_id` mean the same thing in
every module.
"""

from factlens_common.schema import (  # noqa: F401
    Base,
    RefreshToken,
    Scan,
    ScanResult,
    User,
    UserProfile,
    generate_uuid,
    utcnow,
)

__all__ = [
    "Base",
    "User",
    "UserProfile",
    "RefreshToken",
    "Scan",
    "ScanResult",
    "generate_uuid",
    "utcnow",
]
