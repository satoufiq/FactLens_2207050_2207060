"""Shared FastAPI dependencies: JWT identity and Redis rate limiting."""

from __future__ import annotations

from typing import Any, Dict, Optional

import jwt
from factlens_common.ratelimit import get_rate_limiter
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..core.config import settings

_optional_bearer = HTTPBearer(auto_error=False)
_required_bearer = HTTPBearer(auto_error=True)


def _decode(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
) -> Optional[Dict[str, Any]]:
    """
    Identify the caller if a token is present.

    Anonymous scanning is supported without an account (proposal, "Privacy"),
    so this never rejects an unauthenticated request.
    """
    if not credentials:
        return None
    return _decode(credentials.credentials)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_required_bearer),
) -> Dict[str, Any]:
    payload = _decode(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token."
        )
    return payload


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_rate_limit(
    request: Request,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
) -> None:
    """
    Per-user and per-IP limits, since each scan triggers model inference and
    external lookups. Fails open when Redis is down.
    """
    limiter = get_rate_limiter()

    identity = user.get("sub") if user else None
    if identity:
        verdict = limiter.check(
            f"user:{identity}",
            settings.RATE_LIMIT_PER_USER,
            settings.RATE_LIMIT_WINDOW_S,
            scope="scam",
        )
    else:
        verdict = limiter.check(
            f"ip:{client_ip(request)}",
            settings.RATE_LIMIT_PER_IP,
            settings.RATE_LIMIT_WINDOW_S,
            scope="scam",
        )

    if not verdict.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Rate limit reached ({verdict.limit} scans per hour). "
                f"Try again in {verdict.reset_after_s} seconds."
            ),
            headers=verdict.headers(),
        )
