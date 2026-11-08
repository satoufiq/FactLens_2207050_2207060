"""
Per-user and per-IP rate limiting in Redis.

Proposal, "Application security":

    Per-user and per-IP rate limiting in Redis, since each scan triggers model
    inference and external search.

Sliding-window counter. When Redis is unreachable the limiter fails *open* --
a rate limiter outage must not take the whole platform down -- but it says so
in the health payload so the condition is visible rather than silent.
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger("factlens.ratelimit")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")


@dataclass
class RateLimitVerdict:
    allowed: bool
    limit: int
    remaining: int
    reset_after_s: int
    scope: str

    def headers(self) -> dict:
        return {
            "X-RateLimit-Limit": str(self.limit),
            "X-RateLimit-Remaining": str(max(0, self.remaining)),
            "X-RateLimit-Reset": str(self.reset_after_s),
        }


class RateLimiter:
    """Fixed-window counter keyed by identity and window start."""

    def __init__(self, url: Optional[str] = None, namespace: str = "factlens:rl") -> None:
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
        except Exception as exc:  # noqa: BLE001
            logger.warning("Rate limiter unavailable (%s); failing open.", exc)
            self._client = None
        return self._client

    @property
    def available(self) -> bool:
        return self.client is not None

    def check(
        self, identity: str, limit: int, window_s: int, scope: str = "scan"
    ) -> RateLimitVerdict:
        """Consume one unit of budget for `identity`. Fails open on outage."""
        client = self.client
        if client is None or not identity:
            return RateLimitVerdict(True, limit, limit, 0, scope)

        now = int(time.time())
        window_start = now - (now % window_s)
        key = f"{self.namespace}:{scope}:{identity}:{window_start}"

        try:
            pipe = client.pipeline()
            pipe.incr(key, 1)
            pipe.expire(key, window_s + 5)
            count = int(pipe.execute()[0])
        except Exception as exc:  # noqa: BLE001
            logger.debug("Rate limit check failed (%s); allowing.", exc)
            return RateLimitVerdict(True, limit, limit, 0, scope)

        reset_after = (window_start + window_s) - now
        return RateLimitVerdict(
            allowed=count <= limit,
            limit=limit,
            remaining=max(0, limit - count),
            reset_after_s=max(0, reset_after),
            scope=scope,
        )

    def health(self) -> dict:
        return {
            "backend": "redis",
            "available": self.available,
            "policy": "fails open when Redis is unreachable",
        }


_limiter: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    global _limiter
    if _limiter is None:
        _limiter = RateLimiter()
    return _limiter
