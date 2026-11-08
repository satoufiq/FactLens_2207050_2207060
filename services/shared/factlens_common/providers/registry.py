"""
Model registry.

Proposal, "Versioning and the model registry":

    Every exported model is stored with a manifest: model name, semantic
    version, base architecture, training dataset and commit hash, evaluation
    metrics, decision threshold, and export date. The manifest is loaded at
    application start and the active version is written into every
    model_runs row.

The manifest is `models/registry.json`. An entry whose `artifact` is null, or
whose artifact file is missing from disk, is treated as *not registered*: its
provider reports unavailable and the owning module degrades to its non-ML
signals. That is the state every model is in until the trained artifacts are
exported, and it is a designed state rather than a failure.
"""

from __future__ import annotations

import json
import logging
import os
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("factlens.registry")

DEFAULT_MANIFEST_NAME = "registry.json"


def _candidate_manifest_paths() -> List[Path]:
    """Search order for the manifest, container path first."""
    env = os.environ.get("MODEL_REGISTRY_PATH")
    here = Path(__file__).resolve()
    repo_root = here.parents[4]  # services/shared/factlens_common/providers -> repo
    candidates = []
    if env:
        candidates.append(Path(env))
    candidates += [
        Path("/models") / DEFAULT_MANIFEST_NAME,
        repo_root / "models" / DEFAULT_MANIFEST_NAME,
        Path.cwd() / "models" / DEFAULT_MANIFEST_NAME,
    ]
    return candidates


def _models_root(manifest_path: Path) -> Path:
    return manifest_path.parent


@dataclass
class ModelEntry:
    """One registered model, as described by the manifest."""

    name: str
    version: str = "0.0.0-unregistered"
    task: str = ""
    base_architecture: str = ""
    artifact: Optional[str] = None
    artifact_format: str = "onnx"
    tokenizer: Optional[str] = None
    training_dataset: Optional[str] = None
    training_commit: Optional[str] = None
    decision_threshold: Optional[float] = None
    labels: List[str] = field(default_factory=list)
    max_sequence_length: Optional[int] = None
    metrics: Dict[str, Any] = field(default_factory=dict)
    exported_at: Optional[str] = None
    notes: str = ""
    load_policy: str = "resident"  # resident | on_demand
    idle_release_s: Optional[int] = None
    #: BanglaVerify's optional short-input head, relative to the models dir.
    headline_artifact: Optional[str] = None

    #: Absolute path to the artifact, resolved against the manifest directory.
    resolved_artifact: Optional[Path] = None
    #: Absolute path to the tokenizer directory, if any.
    resolved_tokenizer: Optional[Path] = None

    @property
    def is_registered(self) -> bool:
        """True only when a declared artifact actually exists on disk."""
        return self.resolved_artifact is not None and self.resolved_artifact.exists()

    @property
    def unavailable_reason(self) -> Optional[str]:
        if self.is_registered:
            return None
        if not self.artifact:
            return (
                f"{self.name} has no artifact registered yet. The module is running on "
                f"its non-ML signals and the scan is marked PARTIAL. Export the trained "
                f"model and add its path to models/registry.json to enable it."
            )
        return (
            f"{self.name} is registered as '{self.artifact}' but that file is missing "
            f"from the models directory. The module is running on its non-ML signals."
        )

    def as_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "task": self.task,
            "base_architecture": self.base_architecture,
            "artifact": self.artifact,
            "artifact_format": self.artifact_format,
            "registered": self.is_registered,
            "training_dataset": self.training_dataset,
            "training_commit": self.training_commit,
            "decision_threshold": self.decision_threshold,
            "labels": self.labels,
            "max_sequence_length": self.max_sequence_length,
            "metrics": self.metrics,
            "exported_at": self.exported_at,
            "load_policy": self.load_policy,
            "notes": self.notes,
        }


class ModelRegistry:
    """Reads the manifest once at application start and serves entries."""

    def __init__(self, manifest_path: Optional[Path] = None) -> None:
        self.manifest_path: Optional[Path] = manifest_path
        self._entries: Dict[str, ModelEntry] = {}
        self._loaded = False
        self._lock = threading.Lock()

    def load(self) -> "ModelRegistry":
        with self._lock:
            if self._loaded:
                return self
            path = self.manifest_path
            if path is None:
                for candidate in _candidate_manifest_paths():
                    if candidate.exists():
                        path = candidate
                        break
            self.manifest_path = path

            if path is None or not path.exists():
                logger.warning(
                    "No model registry manifest found (searched %s). All model "
                    "providers will report unavailable.",
                    ", ".join(str(p) for p in _candidate_manifest_paths()),
                )
                self._loaded = True
                return self

            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except Exception as exc:  # noqa: BLE001
                logger.error("Model registry at %s is unreadable: %s", path, exc)
                self._loaded = True
                return self

            root = _models_root(path)
            for raw in data.get("models", []):
                entry = self._build_entry(raw, root)
                self._entries[entry.name] = entry

            registered = [e.name for e in self._entries.values() if e.is_registered]
            pending = [e.name for e in self._entries.values() if not e.is_registered]
            logger.info(
                "Model registry %s loaded. Registered: %s. Awaiting artifacts: %s.",
                path,
                ", ".join(registered) or "none",
                ", ".join(pending) or "none",
            )
            self._loaded = True
            return self

    @staticmethod
    def _build_entry(raw: Dict[str, Any], root: Path) -> ModelEntry:
        entry = ModelEntry(
            name=raw.get("name", "unknown"),
            version=raw.get("version") or "0.0.0-unregistered",
            task=raw.get("task", ""),
            base_architecture=raw.get("base_architecture", ""),
            artifact=raw.get("artifact"),
            artifact_format=raw.get("artifact_format", "onnx"),
            tokenizer=raw.get("tokenizer"),
            training_dataset=raw.get("training_dataset"),
            training_commit=raw.get("training_commit"),
            decision_threshold=raw.get("decision_threshold"),
            labels=raw.get("labels", []),
            max_sequence_length=raw.get("max_sequence_length"),
            metrics=raw.get("metrics", {}),
            exported_at=raw.get("exported_at"),
            notes=raw.get("notes", ""),
            load_policy=raw.get("load_policy", "resident"),
            idle_release_s=raw.get("idle_release_s"),
            headline_artifact=raw.get("headline_artifact"),
        )
        if entry.artifact:
            candidate = Path(entry.artifact)
            entry.resolved_artifact = (
                candidate if candidate.is_absolute() else (root / candidate)
            )
        if entry.tokenizer:
            candidate = Path(entry.tokenizer)
            entry.resolved_tokenizer = (
                candidate if candidate.is_absolute() else (root / candidate)
            )
        return entry

    def get(self, name: str) -> Optional[ModelEntry]:
        self.load()
        return self._entries.get(name)

    def all(self) -> Dict[str, ModelEntry]:
        self.load()
        return dict(self._entries)

    def summary(self) -> Dict[str, Any]:
        """Registry state for the /health endpoint and the UI's model panel."""
        self.load()
        return {
            "manifest_path": str(self.manifest_path) if self.manifest_path else None,
            "models": [e.as_dict() for e in self._entries.values()],
            "registered_count": sum(1 for e in self._entries.values() if e.is_registered),
            "total_count": len(self._entries),
        }

    def reload(self) -> "ModelRegistry":
        """Re-read the manifest -- used by the admin route after a model drop."""
        with self._lock:
            self._entries.clear()
            self._loaded = False
        return self.load()


_registry: Optional[ModelRegistry] = None
_registry_lock = threading.Lock()


def get_registry() -> ModelRegistry:
    """Process-wide singleton, loaded at application start."""
    global _registry
    if _registry is None:
        with _registry_lock:
            if _registry is None:
                _registry = ModelRegistry().load()
    return _registry
