"""
Admin routes.

Proposal, "Application security": role-based access control on admin routes.

The registry-reload endpoint exists so a newly exported model can be picked up
without restarting the service: drop the ONNX file into models/, run
register_model.py, then POST here. That is the operational half of "the models
are replaceable".
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from factlens_common.providers.registry import get_registry
from fastapi import APIRouter, Depends, HTTPException, status

from ..deps import get_current_user

logger = logging.getLogger("factlens.rumor.admin")

router = APIRouter(prefix="/admin", tags=["Administration"])

ADMIN_ROLES = ("ROLE_ADMIN",)


def require_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("role") not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint requires an administrator account.",
        )
    return user


@router.get("/registry")
def read_registry(_: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    """Current manifest state: which models are registered, and at what version."""
    return get_registry().summary()


@router.post("/registry/reload")
def reload_registry(user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    """
    Re-read models/registry.json.

    Providers hold their entry from construction, so a reload is picked up by
    newly constructed providers. Workers hold resident sessions for the life of
    the process: restart them to swap a model that is already loaded. The
    response says which models the manifest now declares so the caller can tell
    whether a restart is still needed.
    """
    registry = get_registry().reload()
    summary = registry.summary()
    logger.info(
        "Registry reloaded by %s: %d of %d models registered",
        user.get("sub"),
        summary["registered_count"],
        summary["total_count"],
    )
    return {
        "reloaded": True,
        "manifest_path": summary["manifest_path"],
        "registered_count": summary["registered_count"],
        "total_count": summary["total_count"],
        "models": [
            {"name": m["name"], "registered": m["registered"], "version": m["version"]}
            for m in summary["models"]
        ],
        "note": (
            "Workers keep resident model sessions for the life of the process. "
            "Restart the worker containers to serve a model that was already "
            "loaded under a different version."
        ),
    }
