"""
Secure image storage with a retention window.

Proposal, Module 3 step 2:

    Secure storage -- stored with a sanitized, system-generated filename in a
    controlled location outside the web root.

and "Privacy":

    Uploaded images are deleted after a configurable retention window; only
    derived analysis fields are kept. [...] the user can delete any scan, which
    removes the row and its associated files.

Users upload screenshots of private conversations, so nothing here is served
statically: the directory is never mounted by the web layer, filenames are
generated rather than taken from the upload, and a retention sweep deletes the
bytes while the derived analysis survives.
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Tuple

from factlens_common.security import safe_stored_name

logger = logging.getLogger("factlens.image.storage")


@dataclass
class StoredFile:
    stored_name: str
    path: Path
    size_bytes: int


class ImageStore:
    """File storage for uploaded images, outside anything the web layer serves."""

    def __init__(self, root: Path, retention_hours: int = 24) -> None:
        self.root = Path(root)
        self.retention_hours = retention_hours
        self.root.mkdir(parents=True, exist_ok=True)
        # Belt and braces: if this directory is ever mis-mounted, deny listing.
        self._write_guard()

    def _write_guard(self) -> None:
        guard = self.root / ".htaccess"
        if not guard.exists():
            try:
                guard.write_text("Deny from all\n", encoding="utf-8")
            except Exception:  # noqa: BLE001
                pass

    def save(self, data: bytes, original_name: str, extension: Optional[str]) -> StoredFile:
        """Write bytes under a generated name. The user's filename never lands on disk."""
        stored_name = safe_stored_name(original_name, extension)
        # Shard by day so the retention sweep and any manual audit stay cheap.
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        directory = self.root / day
        directory.mkdir(parents=True, exist_ok=True)

        path = directory / stored_name
        path.write_bytes(data)
        try:
            os.chmod(path, 0o600)
        except Exception:  # noqa: BLE001
            pass

        return StoredFile(
            stored_name=f"{day}/{stored_name}", path=path, size_bytes=len(data)
        )

    def read(self, stored_name: str) -> Optional[bytes]:
        path = self._resolve(stored_name)
        if path is None or not path.exists():
            return None
        return path.read_bytes()

    def delete(self, stored_name: str) -> bool:
        """Remove one stored file. Called when a user deletes their scan."""
        path = self._resolve(stored_name)
        if path is None or not path.exists():
            return False
        try:
            path.unlink()
            return True
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not delete %s: %s", stored_name, exc)
            return False

    def _resolve(self, stored_name: str) -> Optional[Path]:
        """Resolve a stored name, refusing anything that escapes the root."""
        if not stored_name:
            return None
        candidate = (self.root / stored_name).resolve()
        try:
            candidate.relative_to(self.root.resolve())
        except ValueError:
            logger.error("Refused path traversal attempt: %r", stored_name)
            return None
        return candidate

    def sweep(self) -> Tuple[int, int]:
        """
        Delete files past the retention window.

        Returns (files_deleted, bytes_freed). The derived analysis rows stay;
        only the original bytes go.
        """
        cutoff = time.time() - (self.retention_hours * 3600)
        deleted = 0
        freed = 0

        for path in self.root.rglob("*"):
            if not path.is_file() or path.name == ".htaccess":
                continue
            try:
                stat = path.stat()
                if stat.st_mtime < cutoff:
                    freed += stat.st_size
                    path.unlink()
                    deleted += 1
            except Exception as exc:  # noqa: BLE001
                logger.debug("Sweep skipped %s: %s", path, exc)

        # Drop empty day directories left behind.
        for directory in sorted(self.root.glob("*"), reverse=True):
            if directory.is_dir():
                try:
                    next(directory.iterdir())
                except StopIteration:
                    try:
                        directory.rmdir()
                    except Exception:  # noqa: BLE001
                        pass
                except Exception:  # noqa: BLE001
                    pass

        if deleted:
            logger.info(
                "Retention sweep removed %d files (%.1f MB) older than %dh",
                deleted,
                freed / 1_048_576,
                self.retention_hours,
            )
        return deleted, freed

    def health(self) -> dict:
        try:
            files = sum(1 for p in self.root.rglob("*") if p.is_file())
        except Exception:  # noqa: BLE001
            files = -1
        return {
            "root": str(self.root),
            "retention_hours": self.retention_hours,
            "stored_files": files,
            "served_statically": False,
        }
