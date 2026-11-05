"""
Password hashing for the Identity service.

Proposal, "Application security": passwords hashed with bcrypt.

The implementation lives in `factlens_common.security` so the hashing policy is
one decision shared by every service rather than four copies that drift. This
module re-exports it and documents the migration.

Migration from the previous scheme
----------------------------------
Accounts created before this change hold PBKDF2-HMAC-SHA256 digests (100,000
iterations, per-user salt). Those digests cannot be converted to bcrypt without
the plaintext, so `verify_password` accepts both and tells the caller when a
row needs upgrading. `AuthService.login` rehashes with bcrypt on the next
successful sign-in, so the legacy rows disappear as users return, without
anyone being locked out.
"""

from factlens_common.security import (  # noqa: F401
    BCRYPT_AVAILABLE,
    BCRYPT_ROUNDS,
    LEGACY_PBKDF2_ITERATIONS,
    generate_salt,
    hash_password,
    hash_password_pbkdf2,
    hash_password_sha256,
    is_bcrypt_hash,
    verify_password,
)


def verify_password_sha256(
    plain_password: str, stored_hash: str, salt: str, iterations: int = LEGACY_PBKDF2_ITERATIONS
) -> bool:
    """
    Deprecated. Verifies only the legacy scheme.

    Use `verify_password`, which handles bcrypt and legacy rows and reports
    whether the row should be upgraded.
    """
    valid, _ = verify_password(plain_password, stored_hash, salt)
    return valid


__all__ = [
    "generate_salt",
    "hash_password",
    "verify_password",
    "is_bcrypt_hash",
    "hash_password_pbkdf2",
    "hash_password_sha256",
    "verify_password_sha256",
    "BCRYPT_AVAILABLE",
    "BCRYPT_ROUNDS",
    "LEGACY_PBKDF2_ITERATIONS",
]
