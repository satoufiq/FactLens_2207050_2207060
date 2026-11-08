"""
ScamNet-BN runtime: one loaded model per process, bounded inference.

`scam_model_provider.py` (copied verbatim from training, never edited) knows how
to load the ensemble and predict. This module owns everything around it:

* **Settings.** Model directory, device, ensemble size, timeout and thread
  count come from `core.config.settings`. Thresholds, temperature and labels
  are read by the provider from `scamnet_config.json` only.
* **Lifetime.** One runtime per process, loaded at worker start-up (Celery
  `worker_process_init`, or `worker_ready` for the solo pool, or the FastAPI
  lifespan when Celery runs eagerly) -- never inside a request handler.
* **Warm-up.** One prediction straight after `load()`, so the first real scan
  does not pay for lazy allocations and kernel selection.
* **Timeout.** Inference runs on its own daemon thread and the caller waits at
  most `SCAMNET_TIMEOUT_SECONDS`. PyTorch cannot be interrupted mid-forward, so
  a timed-out inference keeps running in the background until it finishes.
* **Busy.** While that background inference is still running, a new scan does
  not queue behind it: `predict()` returns immediately with reason
  "model busy" and the pipeline falls back to rules and URL analysis (PARTIAL).
* **Status.** After loading, the worker publishes its model status to Redis so
  the API process -- which never loads the model -- can report it in /health.

`predict()` never raises. Every outcome is a `ModelCall` with a status from the
existing model_runs vocabulary: OK, TIMEOUT, ERROR, UNAVAILABLE.
"""

from __future__ import annotations

import gc
import json
import logging
import os
import socket
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional

# The provider resolves the encoder config with AutoConfig.from_pretrained
# (a Hub lookup) and falls back to a built-in XLM-R-large config when that
# fails. Offline mode makes that fallback immediate instead of waiting on the
# network inside a worker. Set before transformers is imported.
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

logger = logging.getLogger("factlens.scam.scamnet")

#: Written into model_runs.model_name.
MODEL_NAME = "scamnet-bn"

#: model_runs.status values, matching the rows other models already write.
STATUS_OK = "OK"
STATUS_TIMEOUT = "TIMEOUT"
STATUS_ERROR = "ERROR"
STATUS_UNAVAILABLE = "UNAVAILABLE"

#: Why a call produced no prediction. Drives the user-facing explanation.
REASON_UNAVAILABLE = "unavailable"
REASON_BUSY = "busy"
REASON_TIMEOUT = "timeout"
REASON_ERROR = "error"

#: Fields of a prediction that may reach end users. `normalized_text` and
#: `branch_weights` stay in model_runs.raw_output only.
PUBLIC_FIELDS = ("risk", "class", "probabilities", "indicators", "model_version")

REDIS_STATUS_KEY = "factlens:model_status:scamnet-bn"

WARM_UP_TEXT = "Apnar bKash account block hoye jabe. Ekhoni OTP 4821 pathan."


@contextmanager
def memory_efficient_load():
    """
    Lower the memory peak of the provider's `load()` without changing its result.

    What the provider does, unmodified:
      1. builds the network in fp32 (XLM-R-large: ~2.25 GB),
      2. `resize_token_embeddings` allocates a second embedding matrix (~1 GB)
         while the first still exists,
      3. `torch.load`s the fp16 checkpoint (~1.07 GB) into a third buffer,
      4. copies it into the network, then calls `net.float()`.
    On top of ~1.35 GB for Python, PyTorch, transformers and the tokenizer
    (measured), that peaks well above 4 GB of committed memory, and the finished
    fp32 model still needs ~3.6 GB. An 11 GB laptop running an editor and a
    browser does not have that free, and the load fails.

    Inside this context:
      * the network is built with float16 as the default dtype, so steps 1-2
        cost half as much, and the embedding resize skips its mean/covariance
        initialisation of the new rows (which the checkpoint overwrites);
      * the provider's `net.float()` is deferred until load() has returned and
        released the checkpoint, then applied by `finish_fp32()`, so the fp32
        network never coexists with the checkpoint.

    The result is bit-identical: the checkpoint is entirely fp16, and an
    fp16 -> fp32 conversion is exact, whether it happens in `copy_` (the
    original path) or in `.float()` (this one). Randomly initialised values are
    all overwritten by `load_state_dict(strict=True)`. The provider file is not
    modified; the patches are scoped to this context and undone on exit.
    tests/test_low_memory_load.py proves the equivalence bit-for-bit, weights and
    predictions, against the provider's own load path.
    """
    import torch
    from transformers import PreTrainedModel

    original_dtype = torch.get_default_dtype()
    original_resize = PreTrainedModel.resize_token_embeddings
    original_module_float = torch.nn.Module.float

    # Deliberately NOT patched: torch.load(mmap=True). On Windows, running out
    # of commit while reading a memory-mapped checkpoint kills the process
    # with an access violation instead of raising MemoryError -- which would
    # break the guarantee that load() never takes the service down.

    def defer_float(self):
        # The provider calls net.float() while its checkpoint dict is still
        # alive, so fp32 network + checkpoint coexist (~3.3 GB). On Windows the
        # checkpoint's copy-on-write mapping is charged in full even with mmap.
        # The conversion is deferred to `finish_fp32()`, called after load()
        # returns and the checkpoint has been released.
        return self

    def resize_without_mean_init(self, *args, **kwargs):
        # transformers initialises new embedding rows from the old rows' mean
        # and covariance, upcasting the whole 250k x 1024 matrix to fp32
        # (~1 GB) to do it. The checkpoint overwrites every row -- all 250,008
        # are in it and load_state_dict is strict -- so that initialisation is
        # discarded anyway. Skipping it changes memory, not the loaded model.
        kwargs.setdefault("mean_resizing", False)
        return original_resize(self, *args, **kwargs)

    PreTrainedModel.resize_token_embeddings = resize_without_mean_init
    torch.nn.Module.float = defer_float
    torch.set_default_dtype(torch.float16)
    try:
        yield
    finally:
        torch.set_default_dtype(original_dtype)
        torch.nn.Module.float = original_module_float
        PreTrainedModel.resize_token_embeddings = original_resize
        gc.collect()


def finish_fp32(provider) -> None:
    """
    The provider's own `net.float()`, applied after load() has returned.

    Converts each loaded network to fp32 in place, parameter by parameter, so
    the fp16 copy is released as the fp32 one is built. Exact: every loaded
    value came from the fp16 checkpoint.
    """
    for net in getattr(provider, "models", []) or []:
        net.float()
    gc.collect()


def public_view(prediction: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """The subset of a prediction that the API and the UI are allowed to see."""
    if not prediction:
        return None
    return {k: prediction.get(k) for k in PUBLIC_FIELDS}


@dataclass
class ModelCall:
    """Outcome of one predict() call."""

    status: str
    version: str
    latency_ms: float = 0.0
    prediction: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None  # one of the REASON_* codes when not OK
    error: Optional[str] = None

    @property
    def ok(self) -> bool:
        return self.status == STATUS_OK and self.prediction is not None


@dataclass
class LoadReport:
    available: bool = False
    version: str = "unloaded"
    error: Optional[str] = None
    load_ms: Optional[float] = None
    warmup_ms: Optional[float] = None
    device: Optional[str] = None
    max_models: Optional[int] = None
    pid: int = field(default_factory=os.getpid)
    host: str = field(default_factory=socket.gethostname)
    loaded_at: Optional[float] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "available": self.available,
            "version": self.version,
            "error": self.error,
            "load_ms": None if self.load_ms is None else round(self.load_ms, 1),
            "warmup_ms": None if self.warmup_ms is None else round(self.warmup_ms, 1),
            "device": self.device,
            "max_models": self.max_models,
            "pid": self.pid,
            "host": self.host,
            "loaded_at": self.loaded_at,
        }


def weights_present(model_dir: str) -> Dict[str, Any]:
    """Which model files exist on disk -- checkable without loading anything."""
    config_path = os.path.join(model_dir, "scamnet_config.json")
    result: Dict[str, Any] = {
        "model_dir": model_dir,
        "config": os.path.isfile(config_path),
        "tokenizer": os.path.isdir(os.path.join(model_dir, "scamnet_tokenizer")),
        "weights": {},
    }
    if result["config"]:
        try:
            with open(config_path, encoding="utf-8") as handle:
                names = json.load(handle).get("weights", [])
            result["weights"] = {
                name: os.path.isfile(os.path.join(model_dir, name)) for name in names
            }
        except Exception as exc:  # noqa: BLE001
            result["error"] = f"scamnet_config.json unreadable: {exc}"
    result["complete"] = bool(
        result["config"] and result["tokenizer"] and result["weights"]
        and all(result["weights"].values())
    )
    return result


class ScamNetRuntime:
    """Process-wide owner of the ScamNet-BN provider."""

    def __init__(
        self,
        model_dir: str,
        device: Optional[str] = None,
        max_models: Optional[int] = None,
        timeout_s: float = 10.0,
        num_threads: Optional[int] = None,
        provider_factory: Optional[Callable[[], Any]] = None,
    ) -> None:
        self.model_dir = model_dir
        self.device = device
        self.max_models = max_models
        self.timeout_s = float(timeout_s)
        self.num_threads = num_threads or None
        self._provider_factory = provider_factory
        self.provider: Any = None
        self.report = LoadReport(device=device, max_models=max_models)
        self._load_lock = threading.Lock()
        self._loaded_once = False
        # Held for the whole life of one inference, including after the caller
        # has given up on it. Acquired non-blocking: a busy model never queues.
        self._inference_lock = threading.Lock()

    # -- loading -----------------------------------------------------------

    def _make_provider(self):
        if self._provider_factory is not None:
            return self._provider_factory()
        from .scam_model_provider import ScamModelProvider

        return ScamModelProvider(
            self.model_dir,
            device=self.device,
            max_models=self.max_models,
            num_threads=self.num_threads,
        )

    def load(self, warm_up: bool = True) -> bool:
        """
        Load the model once for this process, then run one warm-up prediction.

        Never raises. On failure the reason is logged and kept in
        `last_error()`, and the service keeps running on rules and URL analysis.
        """
        with self._load_lock:
            if self._loaded_once:
                return self.is_available()
            self._loaded_once = True

            started = time.perf_counter()
            try:
                self.provider = self._make_provider()
                if self._provider_factory is None:
                    with memory_efficient_load():
                        ok = bool(self.provider.load())
                    if ok:
                        finish_fp32(self.provider)
                else:
                    ok = bool(self.provider.load())
                error = None if ok else self.provider.last_error()
            except Exception as exc:  # noqa: BLE001 -- includes a missing torch install
                ok, error = False, f"{type(exc).__name__}: {exc}"
                self.provider = None
            self.report.load_ms = (time.perf_counter() - started) * 1000.0
            self.report.available = ok
            self.report.error = error
            self.report.version = self.version()
            self.report.loaded_at = time.time()

            if not ok:
                logger.error(
                    "ScamNet-BN failed to load from %s: %s. Scam scans will use "
                    "rules and URL analysis only and be marked PARTIAL.",
                    self.model_dir,
                    error,
                )
                self._publish()
                return False

            logger.info(
                "ScamNet-BN %s loaded on %s in %.1fs",
                self.version(),
                self.device,
                self.report.load_ms / 1000.0,
            )

            if warm_up:
                warm_started = time.perf_counter()
                try:
                    self.provider.predict(WARM_UP_TEXT)
                    self.report.warmup_ms = (time.perf_counter() - warm_started) * 1000.0
                    logger.info("ScamNet-BN warm-up prediction took %.0f ms", self.report.warmup_ms)
                except Exception as exc:  # noqa: BLE001
                    # A failed warm-up is a real problem with the model, not a
                    # cold-start cost: report it, but keep the model available
                    # so the per-scan timeout and error handling decide.
                    logger.error("ScamNet-BN warm-up prediction failed: %s", exc)
                    self.report.error = f"warm-up failed: {type(exc).__name__}: {exc}"

            self._publish()
            return True

    def is_available(self) -> bool:
        try:
            return bool(self.provider is not None and self.provider.is_available())
        except Exception:  # noqa: BLE001
            return False

    def version(self) -> str:
        try:
            return self.provider.version() if self.provider is not None else "unloaded"
        except Exception:  # noqa: BLE001
            return "unloaded"

    def last_error(self) -> Optional[str]:
        if self.report.error:
            return self.report.error
        if self.provider is not None:
            try:
                return self.provider.last_error()
            except Exception:  # noqa: BLE001
                return None
        return "ScamNet-BN has not been loaded in this process."

    @property
    def busy(self) -> bool:
        return self._inference_lock.locked()

    # -- inference ---------------------------------------------------------

    def predict(self, text: str) -> ModelCall:
        """
        One prediction, bounded by the timeout. Never raises, never queues.
        """
        version = self.version()

        if not self.is_available():
            return ModelCall(
                status=STATUS_UNAVAILABLE,
                version=version,
                reason=REASON_UNAVAILABLE,
                error=self.last_error() or "ScamNet-BN is not loaded.",
            )

        if not self._inference_lock.acquire(blocking=False):
            return ModelCall(
                status=STATUS_UNAVAILABLE,
                version=version,
                reason=REASON_BUSY,
                error="model busy",
            )

        box: Dict[str, Any] = {}
        done = threading.Event()
        started = time.perf_counter()

        def run() -> None:
            try:
                box["prediction"] = self.provider.predict(text)
            except BaseException as exc:  # noqa: BLE001
                box["error"] = exc
            finally:
                box["finished"] = time.perf_counter()
                self._inference_lock.release()
                done.set()

        try:
            threading.Thread(target=run, name="scamnet-inference", daemon=True).start()
        except Exception as exc:  # noqa: BLE001
            self._inference_lock.release()
            return ModelCall(
                status=STATUS_ERROR,
                version=version,
                reason=REASON_ERROR,
                error=f"could not start inference thread: {exc}",
            )

        if not done.wait(self.timeout_s):
            elapsed = (time.perf_counter() - started) * 1000.0
            logger.warning(
                "ScamNet-BN inference exceeded %.1fs; continuing without it. The "
                "inference finishes in the background and the model reports busy "
                "until it does.",
                self.timeout_s,
            )
            return ModelCall(
                status=STATUS_TIMEOUT,
                version=version,
                latency_ms=elapsed,
                reason=REASON_TIMEOUT,
                error=f"no answer within {self.timeout_s:g}s",
            )

        latency = (box["finished"] - started) * 1000.0
        if "error" in box:
            exc = box["error"]
            logger.error("ScamNet-BN inference failed: %s", exc)
            return ModelCall(
                status=STATUS_ERROR,
                version=version,
                latency_ms=latency,
                reason=REASON_ERROR,
                error=f"{type(exc).__name__}: {exc}",
            )

        return ModelCall(
            status=STATUS_OK,
            version=box["prediction"].get("model_version", version),
            latency_ms=latency,
            prediction=box["prediction"],
        )

    # -- status ------------------------------------------------------------

    def _publish(self) -> None:
        """Share this process's load result with the API via Redis."""
        try:
            from factlens_common.cache import get_cache

            client = get_cache().client
            if client is not None:
                client.set(REDIS_STATUS_KEY, json.dumps(self.report.as_dict()))
        except Exception as exc:  # noqa: BLE001
            logger.debug("Could not publish ScamNet-BN status: %s", exc)

    def health(self) -> Dict[str, Any]:
        worker_status = None
        try:
            from factlens_common.cache import get_cache

            client = get_cache().client
            if client is not None:
                raw = client.get(REDIS_STATUS_KEY)
                worker_status = json.loads(raw) if raw else None
        except Exception:  # noqa: BLE001
            worker_status = None

        return {
            "model": MODEL_NAME,
            "loaded_in_this_process": self.is_available(),
            "version": self.version(),
            "busy": self.busy,
            "device": self.device,
            "max_models": self.max_models,
            "timeout_s": self.timeout_s,
            "last_error": None if self.is_available() else self.last_error(),
            "files": weights_present(self.model_dir),
            # The worker loads the model; the API process does not. This is
            # the worker's own report of its last load.
            "worker_status": worker_status,
        }


_runtime: Optional[ScamNetRuntime] = None
_runtime_lock = threading.Lock()


def get_scamnet_runtime() -> ScamNetRuntime:
    """The process-wide runtime. Construction is cheap; `load()` is not."""
    global _runtime
    if _runtime is None:
        with _runtime_lock:
            if _runtime is None:
                from ..core.config import settings

                _runtime = ScamNetRuntime(
                    model_dir=settings.SCAMNET_MODEL_DIR,
                    device=settings.SCAMNET_DEVICE,
                    max_models=settings.SCAMNET_MAX_MODELS,
                    timeout_s=settings.SCAMNET_TIMEOUT_SECONDS,
                    num_threads=settings.SCAMNET_NUM_THREADS,
                )
    return _runtime
