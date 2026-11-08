"""
ONNX Runtime session wrapper.

Proposal, "Serving and fallback": ONNX export, CPU inference, loaded once per
worker process. Keeping the runtime behind this wrapper means the services
never import onnxruntime directly, and a provider can fall back to a different
backend without touching business logic.

onnxruntime is an optional import. Until the trained artifacts exist there is
nothing to run, so a missing runtime is reported as a normal unavailability
rather than crashing the service at startup.
"""

from __future__ import annotations

import logging
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("factlens.onnx")

try:  # pragma: no cover - import probe
    import onnxruntime as ort

    ONNX_AVAILABLE = True
    ONNX_IMPORT_ERROR: Optional[str] = None
except Exception as exc:  # noqa: BLE001
    ort = None  # type: ignore[assignment]
    ONNX_AVAILABLE = False
    ONNX_IMPORT_ERROR = str(exc)


class OnnxSessionError(RuntimeError):
    """Raised inside a provider's _load(); the base class converts it."""


class OnnxSession:
    """
    A thread-safe ONNX Runtime InferenceSession pinned to CPU.

    `intra_op_num_threads` is capped because the deployment target is a 2 vCPU
    VPS shared with the web process: letting ORT grab every core makes the API
    unresponsive while a scan runs.
    """

    def __init__(
        self,
        artifact_path: Path,
        providers: Optional[List[str]] = None,
        intra_op_threads: int = 2,
    ) -> None:
        if not ONNX_AVAILABLE:
            raise OnnxSessionError(
                f"onnxruntime is not installed in this image ({ONNX_IMPORT_ERROR}). "
                f"Add 'onnxruntime' to the service requirements to serve ONNX models."
            )
        if not artifact_path.exists():
            raise OnnxSessionError(f"ONNX artifact not found at {artifact_path}")

        options = ort.SessionOptions()
        options.intra_op_num_threads = intra_op_threads
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        started = time.perf_counter()
        self._session = ort.InferenceSession(
            str(artifact_path),
            sess_options=options,
            providers=providers or ["CPUExecutionProvider"],
        )
        self._lock = threading.Lock()
        self.artifact_path = artifact_path
        self.load_ms = (time.perf_counter() - started) * 1000.0

        self.input_names = [i.name for i in self._session.get_inputs()]
        self.output_names = [o.name for o in self._session.get_outputs()]
        logger.info(
            "ONNX session ready: %s (inputs=%s, outputs=%s, %.0f ms)",
            artifact_path.name,
            self.input_names,
            self.output_names,
            self.load_ms,
        )

    def run(self, feeds: Dict[str, Any]) -> List[Any]:
        """Run inference. Serialised, because ORT sessions are not reentrant."""
        accepted = {k: v for k, v in feeds.items() if k in self.input_names}
        missing = [n for n in self.input_names if n not in accepted]
        if missing:
            raise OnnxSessionError(
                f"Missing required ONNX inputs {missing} for {self.artifact_path.name}"
            )
        with self._lock:
            return self._session.run(self.output_names, accepted)

    def describe(self) -> Dict[str, Any]:
        return {
            "artifact": str(self.artifact_path),
            "inputs": self.input_names,
            "outputs": self.output_names,
            "load_ms": round(self.load_ms, 2),
            "runtime": "onnxruntime",
        }
