"""
Provider contract.

Proposal, "Provider-based integration":

    Every intelligent component is reached through a provider interface.
    RumorService calls NLPProvider, which wraps the loaded BanglaVerify
    session; it does not know whether that session is a local ONNX model, a
    different architecture, or a hosted API. Each provider exposes load(),
    predict(), version() and is_available().

The contract's most important property is that `predict()` never raises past
the provider boundary. A provider that cannot answer returns a Prediction with
`available=False` and a reason; the calling service degrades to its non-ML
signals and marks the scan PARTIAL. A model's absence changes the confidence
and the explanation -- it never produces a server error.
"""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

logger = logging.getLogger("factlens.providers")


class ProviderStatus(str):
    OK = "OK"
    UNAVAILABLE = "UNAVAILABLE"
    TIMEOUT = "TIMEOUT"
    ERROR = "ERROR"


@dataclass
class Prediction:
    """
    Uniform return value for every model provider.

    `available=False` is a normal, expected outcome -- not an error. It is the
    value every provider returns while its artifact has not been registered,
    and the value the services are written to handle.
    """

    available: bool
    status: str = ProviderStatus.OK
    #: Class label -> probability. Empty when unavailable.
    probabilities: Dict[str, float] = field(default_factory=dict)
    #: Highest-probability label, or None.
    label: Optional[str] = None
    #: Probability of `label`, or None.
    confidence: Optional[float] = None
    #: Free-form extra output (embeddings, per-head scores, token counts).
    raw: Dict[str, Any] = field(default_factory=dict)
    #: Human-readable reason, always set when available=False.
    reason: Optional[str] = None
    latency_ms: float = 0.0
    model_name: str = "unknown"
    model_version: str = "0.0.0"

    @classmethod
    def unavailable(
        cls,
        model_name: str,
        model_version: str,
        reason: str,
        status: str = ProviderStatus.UNAVAILABLE,
        latency_ms: float = 0.0,
    ) -> "Prediction":
        return cls(
            available=False,
            status=status,
            reason=reason,
            model_name=model_name,
            model_version=model_version,
            latency_ms=latency_ms,
        )

    def to_model_run(self) -> Dict[str, Any]:
        """Shape accepted by `modelruns.record_model_run`."""
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "status": self.status,
            "latency_ms": round(self.latency_ms, 2),
            "raw_output": {
                "label": self.label,
                "confidence": self.confidence,
                "probabilities": self.probabilities,
                **({"raw": self.raw} if self.raw else {}),
            }
            if self.available
            else None,
            "error_message": self.reason,
        }


class BaseModelProvider(ABC):
    """
    Base class the four model providers inherit from.

    Subclasses implement `_load()` and `_predict()`. The base class owns
    lazy loading, the timeout budget, latency measurement, failure
    classification and the "never raise" guarantee.
    """

    #: Registry key, e.g. "BanglaVerify".
    model_name: str = "unknown"
    #: Seconds a single inference may take before the provider reports TIMEOUT.
    timeout_s: float = 20.0

    def __init__(
        self,
        registry: Optional["ModelRegistry"] = None,  # noqa: F821
        timeout_s: Optional[float] = None,
    ) -> None:
        from .registry import get_registry  # local import, avoids a cycle

        self._registry = registry if registry is not None else get_registry()
        self._entry = self._registry.get(self.model_name)
        self._session: Any = None
        self._load_attempted = False
        self._load_error: Optional[str] = None
        if timeout_s is not None:
            self.timeout_s = timeout_s

    # -- subclass hooks ----------------------------------------------------

    @abstractmethod
    def _load(self) -> Any:
        """
        Build and return the underlying inference session.

        Raise to signal that the model cannot be served; the base class turns
        that into a permanent `available=False` for this process.
        """

    @abstractmethod
    def _predict(self, session: Any, payload: Any) -> Prediction:
        """Run one inference against an already-loaded session."""

    # -- public contract ---------------------------------------------------

    def load(self) -> bool:
        """
        Load the model if it has not been loaded. Idempotent and safe to call
        from a worker's startup hook to pre-warm. Returns True when a session
        is resident.
        """
        if self._session is not None:
            return True
        if self._load_attempted:
            return False

        self._load_attempted = True

        if self._entry is None:
            self._load_error = (
                f"'{self.model_name}' is not present in the model registry "
                f"({self._registry.manifest_path}). Register the trained artifact "
                f"to enable it."
            )
            logger.warning("[%s] %s", self.model_name, self._load_error)
            return False

        if not self._entry.is_registered:
            self._load_error = self._entry.unavailable_reason
            logger.warning("[%s] %s", self.model_name, self._load_error)
            return False

        try:
            started = time.perf_counter()
            self._session = self._load()
            elapsed = (time.perf_counter() - started) * 1000.0
            logger.info(
                "[%s] loaded v%s in %.0f ms", self.model_name, self.version(), elapsed
            )
            return True
        except Exception as exc:  # noqa: BLE001 -- the boundary swallows everything
            self._session = None
            self._load_error = f"Failed to load {self.model_name}: {exc}"
            logger.error("[%s] %s", self.model_name, self._load_error)
            return False

    def unload(self) -> None:
        """
        Release the session. Used by the image provider, which loads on demand
        and is released after an idle period to limit memory.
        """
        self._session = None
        self._load_attempted = False
        self._load_error = None

    def is_available(self) -> bool:
        """True when this provider can currently answer a predict() call."""
        if self._session is not None:
            return True
        if self._load_attempted:
            return False
        return self.load()

    def version(self) -> str:
        """Semantic version of the active artifact, written into model_runs."""
        if self._entry is not None and self._entry.version:
            return self._entry.version
        return "0.0.0-unregistered"

    def manifest(self) -> Dict[str, Any]:
        """Full registry entry: architecture, dataset, metrics, threshold."""
        return self._entry.as_dict() if self._entry else {}

    def unavailable_reason(self) -> str:
        if self._load_error:
            return self._load_error
        if self._entry is None:
            return f"'{self.model_name}' is not registered."
        return self._entry.unavailable_reason or "Model is not available."

    def predict(self, payload: Any) -> Prediction:
        """
        Run one inference. Never raises.

        Returns a Prediction whose `available` flag tells the caller whether a
        model signal exists at all. Timeouts and crashes are classified and
        reported, not propagated.
        """
        started = time.perf_counter()

        if not self.is_available():
            return Prediction.unavailable(
                self.model_name,
                self.version(),
                self.unavailable_reason(),
                latency_ms=(time.perf_counter() - started) * 1000.0,
            )

        try:
            prediction = self._predict(self._session, payload)
        except TimeoutError as exc:
            return Prediction.unavailable(
                self.model_name,
                self.version(),
                f"Inference exceeded the {self.timeout_s:.0f}s budget: {exc}",
                status=ProviderStatus.TIMEOUT,
                latency_ms=(time.perf_counter() - started) * 1000.0,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("[%s] inference failed", self.model_name)
            return Prediction.unavailable(
                self.model_name,
                self.version(),
                f"Inference failed: {exc}",
                status=ProviderStatus.ERROR,
                latency_ms=(time.perf_counter() - started) * 1000.0,
            )

        elapsed = (time.perf_counter() - started) * 1000.0
        prediction.latency_ms = prediction.latency_ms or elapsed
        prediction.model_name = self.model_name
        prediction.model_version = self.version()

        if elapsed > self.timeout_s * 1000.0:
            logger.warning(
                "[%s] inference took %.0f ms, over the %.0f s budget",
                self.model_name,
                elapsed,
                self.timeout_s,
            )
        return prediction

    def health(self) -> Dict[str, Any]:
        """Health-endpoint payload for this provider."""
        available = self.is_available()
        return {
            "model": self.model_name,
            "version": self.version(),
            "available": available,
            "reason": None if available else self.unavailable_reason(),
            "manifest": self.manifest(),
        }
