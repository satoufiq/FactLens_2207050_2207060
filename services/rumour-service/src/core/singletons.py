"""
Process-wide model instance.

Proposal, "Serving and fallback": models load once per worker process and stay
resident. The BanglaVerify runtime is that single instance; `load()` is called
at worker start-up (or API start-up when Celery runs eagerly), never inside a
request.
"""

from __future__ import annotations

from ..providers.banglaverify_runtime import BanglaVerifyRuntime, get_banglaverify_runtime


def get_banglaverify() -> BanglaVerifyRuntime:
    return get_banglaverify_runtime()


#: Previous name, kept so older imports keep resolving.
get_banglabert = get_banglaverify

__all__ = ["get_banglaverify", "get_banglabert"]
