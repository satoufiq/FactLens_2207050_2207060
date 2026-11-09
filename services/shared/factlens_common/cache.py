"""
Redis verdict cache and input-hash reuse.

Proposal, `scans.input_hash`:

    A SHA-256 of the normalized input. The same viral rumor arrives from
    hundreds of users; hashing it allows a recent verdict to be reused instead
    of re-running search and inference. This is a cost and latency decision as
    much as a correctness one.

News claims are time-sensitive -- a claim that is Unverified today may be
Contradicted tomorrow once a denial is published -- so every cached verdict
carries a TTL, shorter for Unverified results than for ones backed by evidence.
Redis being down is never fatal: every call degrades to a miss.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger("factlens.cache")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

#: TTLs in seconds, by how much the verdict can be trusted to stay true.
TTL_BY_RESULT: Dict[str, int] = {
    # Backed by retrieved evidence: stable for a few hours.
    "SUPPORTED": 6 * 3600,
    "CONTRADICTED": 6 * 3600,
    # Absence of evidence is the most perishable verdict of all.
    "UNVERIFIED": 30 * 60,
    "UNVERIFIED_SUSPICIOUS": 30 * 60,
    # Scam verdicts rest on rules and message text, not on breaking news.
    "HIGH_RISK": 24 * 3600,
    "MEDIUM_RISK": 12 * 3600,
    "LOW_RISK": 12 * 3600,
    # Image forensics on identical bytes is deterministic.
    "LIKELY_AUTHENTIC": 24 * 3600,
    "POSSIBLE_MANIPULATION": 24 * 3600,
    "LIKELY_AI_GENERATED": 24 * 3600,
}
DEFAULT_TTL = 30 * 60

#: A degraded scan must never be cached as if it were complete.
NON_CACHEABLE_STATUSES = {"PARTIAL", "FAILED", "TIMEOUT", "AWAITING_INPUT", "PENDING", "PROCESSING"}


class VerdictCache:
    """Thin Redis wrapper. Every method degrades to a no-op when Redis is down."""

    def __init__(self, url: Optional[str] = None, namespace: str = "factlens:verdict") -> None:
        self.url = url or REDIS_URL
        self.namespace = namespace
        self._client = None
        self._attempted = False

    @property
    def client(self):
        if self._client is not None or self._attempted:
            return self._client
        self._attempted = True
        try:
            import redis  # noqa: PLC0415

            client = redis.Redis.from_url(
                self.url, socket_connect_timeout=1.5, socket_timeout=1.5, decode_responses=True
            )
            client.ping()
            self._client = client
            logger.info("Verdict cache connected to %s", self.url)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Verdict cache unavailable (%s); running without it.", exc)
            self._client = None
        return self._client

    @property
    def available(self) -> bool:
        return self.client is not None

    def _key(self, scan_type: str, input_hash: str) -> str:
        return f"{self.namespace}:{scan_type}:{input_hash}"

    def get(self, scan_type: str, input_hash: str) -> Optional[Dict[str, Any]]:
        """Return a cached verdict payload, or None on miss or outage."""
        client = self.client
        if client is None or not input_hash:
            return None
        try:
            raw = client.get(self._key(scan_type, input_hash))
            if not raw:
                return None
            payload = json.loads(raw)
            payload["cache_hit"] = True
            return payload
        except Exception as exc:  # noqa: BLE001
            logger.debug("Cache read failed: %s", exc)
            return None

    def set(
        self,
        scan_type: str,
        input_hash: str,
        payload: Dict[str, Any],
        status: str,
        result: str,
        ttl: Optional[int] = None,
    ) -> bool:
        """
        Store a verdict. Refuses to cache degraded scans: a PARTIAL result was
        produced without a model or without evidence, and replaying it to the
        next user would hide a transient outage behind a stale answer.
        """
        client = self.client
        if client is None or not input_hash:
            return False
        if status in NON_CACHEABLE_STATUSES:
            return False
        try:
            seconds = ttl if ttl is not None else TTL_BY_RESULT.get(result, DEFAULT_TTL)
            client.setex(
                self._key(scan_type, input_hash),
                seconds,
                json.dumps(payload, ensure_ascii=False, default=str),
            )
            return True
        except Exception as exc:  # noqa: BLE001
            logger.debug("Cache write failed: %s", exc)
            return False

    def invalidate(self, scan_type: str, input_hash: str) -> None:
        client = self.client
        if client is None:
            return
        try:
            client.delete(self._key(scan_type, input_hash))
        except Exception:  # noqa: BLE001
            pass

    def health(self) -> Dict[str, Any]:
        return {"backend": "redis", "url": self.url, "available": self.available}


_cache: Optional[VerdictCache] = None


def get_cache() -> VerdictCache:
    global _cache
    if _cache is None:
        _cache = VerdictCache()
    return _cache
