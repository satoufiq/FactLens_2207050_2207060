"""
Password hashing and upload validation.

Proposal, "Application security":

  * passwords hashed with bcrypt
  * uploads are checked by magic bytes, not by extension, and stored outside
    the web root under system-generated names

Password migration
------------------
Existing accounts were stored as PBKDF2-HMAC-SHA256, 100,000 iterations, with a
per-user salt. Rehashing them is impossible without the plaintext, so
`verify_password` accepts either scheme and reports whether the row needs
upgrading; the auth service rehashes with bcrypt on the next successful login.
Nobody is locked out, and no legacy row survives a login.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
import secrets
import unicodedata
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger("factlens.security")

try:  # pragma: no cover
    import bcrypt

    BCRYPT_AVAILABLE = True
except Exception as exc:  # noqa: BLE001
    bcrypt = None  # type: ignore[assignment]
    BCRYPT_AVAILABLE = False
    logger.error("bcrypt is not installed (%s); password hashing is degraded.", exc)

BCRYPT_ROUNDS = int(os.environ.get("BCRYPT_ROUNDS", "12"))
#: bcrypt silently truncates past 72 bytes, so long passwords are pre-hashed.
BCRYPT_MAX_BYTES = 72

#: Parameters of the pre-bcrypt scheme. Do not change: existing rows depend on
#: them, and every verified row is rehashed with bcrypt on the next login.
LEGACY_PBKDF2_ITERATIONS = 100_000


def generate_salt(length: int = 32) -> str:
    return secrets.token_hex(length)


def hash_password_pbkdf2(
    password: str, salt: str, iterations: int = LEGACY_PBKDF2_ITERATIONS
) -> str:
    """Legacy scheme. Retained only to verify pre-migration rows."""
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
    ).hex()


#: Previous name, kept so older imports keep resolving.
hash_password_sha256 = hash_password_pbkdf2


def _prepare(password: str) -> bytes:
    """
    NFC-normalise, then pre-hash when over bcrypt's 72-byte limit so that a
    long passphrase is not silently truncated to its first 72 bytes.
    """
    normalized = unicodedata.normalize("NFC", password).encode("utf-8")
    if len(normalized) > BCRYPT_MAX_BYTES:
        return hashlib.sha256(normalized).hexdigest().encode("ascii")
    return normalized


def hash_password(password: str) -> str:
    """Hash with bcrypt. The returned string embeds its own salt and cost."""
    if not BCRYPT_AVAILABLE:
        raise RuntimeError(
            "bcrypt is not installed; refusing to store a password with a weaker "
            "scheme. Add 'bcrypt' to the service requirements."
        )
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode(
        "utf-8"
    )


def is_bcrypt_hash(stored: str) -> bool:
    return bool(stored) and stored.startswith(("$2a$", "$2b$", "$2y$"))


def verify_password(password: str, stored_hash: str, salt: str = "") -> Tuple[bool, bool]:
    """
    Verify against either scheme.

    Returns (is_valid, needs_rehash). `needs_rehash` is True when the row
    verified under the legacy PBKDF2 scheme, or under a bcrypt cost lower than
    the current policy -- the caller rehashes and saves.
    """
    if not stored_hash:
        return False, False

    if is_bcrypt_hash(stored_hash):
        if not BCRYPT_AVAILABLE:
            return False, False
        try:
            valid = bcrypt.checkpw(_prepare(password), stored_hash.encode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            logger.warning("bcrypt verification failed: %s", exc)
            return False, False
        needs_rehash = False
        if valid:
            try:
                cost = int(stored_hash.split("$")[2])
                needs_rehash = cost < BCRYPT_ROUNDS
            except (IndexError, ValueError):
                needs_rehash = False
        return valid, needs_rehash

    # Legacy PBKDF2-HMAC-SHA256. Constant-time compare, then flag for upgrade.
    if not salt:
        return False, False
    legacy = hash_password_pbkdf2(password, salt)
    valid = secrets.compare_digest(legacy, stored_hash)
    return valid, valid


# ---------------------------------------------------------------------------
# Upload validation -- magic bytes, not extension
# ---------------------------------------------------------------------------

#: (offset, signature) -> mime type. Covers the formats Image Check accepts.
MAGIC_SIGNATURES = [
    (0, b"\xff\xd8\xff", "image/jpeg", "jpg"),
    (0, b"\x89PNG\r\n\x1a\n", "image/png", "png"),
    (0, b"GIF87a", "image/gif", "gif"),
    (0, b"GIF89a", "image/gif", "gif"),
    (0, b"BM", "image/bmp", "bmp"),
    (0, b"II*\x00", "image/tiff", "tiff"),
    (0, b"MM\x00*", "image/tiff", "tiff"),
]

#: Formats the system refuses outright, even when the extension claims otherwise.
DANGEROUS_SIGNATURES = [
    (b"MZ", "a Windows executable"),
    (b"\x7fELF", "a Linux executable"),
    (b"\xca\xfe\xba\xbe", "a Mach-O / Java class file"),
    (b"PK\x03\x04", "a ZIP archive"),
    (b"%PDF", "a PDF document"),
    (b"#!", "a shell script"),
    (b"<?php", "a PHP script"),
    (b"<script", "an HTML/script document"),
]

ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"}
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


@dataclass
class UploadVerdict:
    valid: bool
    mime_type: Optional[str] = None
    extension: Optional[str] = None
    size_bytes: int = 0
    reason: Optional[str] = None


def sniff_mime(data: bytes) -> Tuple[Optional[str], Optional[str]]:
    """Identify an image from its leading bytes. Returns (mime, extension)."""
    if len(data) >= 12 and data[0:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", "webp"
    for offset, signature, mime, ext in MAGIC_SIGNATURES:
        if data[offset : offset + len(signature)] == signature:
            return mime, ext
    return None, None


def validate_image_upload(
    data: bytes,
    declared_name: str = "",
    max_bytes: int = MAX_UPLOAD_BYTES,
    verify_decodable: bool = True,
) -> UploadVerdict:
    """
    Confirm an upload is a genuine image, not a renamed executable or
    corrupted data (proposal, Image Check step 1).
    """
    size = len(data)
    if size == 0:
        return UploadVerdict(False, size_bytes=0, reason="The uploaded file is empty.")
    if size > max_bytes:
        return UploadVerdict(
            False,
            size_bytes=size,
            reason=(
                f"The file is {size / 1_048_576:.1f} MB, over the "
                f"{max_bytes / 1_048_576:.0f} MB limit."
            ),
        )

    head = data[:64]
    for signature, description in DANGEROUS_SIGNATURES:
        if head.startswith(signature):
            return UploadVerdict(
                False,
                size_bytes=size,
                reason=f"This file is {description}, not an image, whatever its name says.",
            )

    mime, ext = sniff_mime(data)
    if mime is None:
        return UploadVerdict(
            False,
            size_bytes=size,
            reason="The file's contents do not match any supported image format.",
        )
    if mime not in ALLOWED_IMAGE_MIME:
        return UploadVerdict(
            False, mime, ext, size, f"{mime} images are not accepted."
        )

    if verify_decodable:
        try:
            import io

            from PIL import Image

            probe = Image.open(io.BytesIO(data))
            probe.verify()  # structural check; consumes the handle
            reopened = Image.open(io.BytesIO(data))
            reopened.load()  # forces full decode, catching truncated data
        except Exception as exc:  # noqa: BLE001
            return UploadVerdict(
                False,
                mime,
                ext,
                size,
                f"The image is corrupted or incomplete and could not be decoded ({exc}).",
            )

    return UploadVerdict(True, mime, ext, size)


def safe_stored_name(original_name: str, extension: Optional[str] = None) -> str:
    """
    System-generated filename for storage outside the served directory.
    The user's filename never reaches the filesystem.
    """
    ext = (extension or Path(original_name or "").suffix.lstrip(".") or "bin").lower()
    ext = _SAFE_NAME.sub("", ext)[:8] or "bin"
    return f"{uuid.uuid4().hex}.{ext}"


def sanitize_filename(name: str, max_length: int = 128) -> str:
    """Make a user-supplied filename safe to echo back in JSON and reports."""
    cleaned = _SAFE_NAME.sub("_", (name or "").strip())
    cleaned = cleaned.lstrip(".") or "upload"
    return cleaned[:max_length]
