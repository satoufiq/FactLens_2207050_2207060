"""
BanglaVerify runtime: one loaded model per process, bounded inference.

`banglaverify_model.py` holds the notebook's code (verbatim where it touches
text or weights). This module owns everything around it, mirroring the ScamNet
runtime in the Scam Alert service:

* settings (model dir, device, timeout) from core.config;
* one load per process at worker start-up -- never inside a request;
* a warm-up prediction straight after loading;
* a real timeout: inference runs on a daemon thread and the caller waits at
  most BANGLAVERIFY_TIMEOUT_SECONDS;
* "busy" never queues: if a timed-out inference is still running, a new call
  returns at once without a model signal;
* never raises.

It returns the shared `Prediction` type, so the Rumor Scanner's precedence
gate, fuzzy engine and model_runs recording consume it unchanged.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any, Dict, Optional

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

from factlens_common.providers.base import Prediction, ProviderStatus  # noqa: E402

logger = logging.getLogger("factlens.rumor.banglaverify")

MODEL_NAME = "BanglaVerify"
REDIS_STATUS_KEY = "factlens:model_status:banglaverify"
WARM_UP_TEXT = "আগামীকাল দেশের সব শিক্ষা প্রতিষ্ঠান বন্ধ থাকবে"


class BanglaVerifyRuntime:
    """Process-wide owner of the BanglaVerify model."""

    def __init__(self, model_dir: str, device: str = "cpu", timeout_s: float = 10.0,
                 num_threads: Optional[int] = None, model_factory=None) -> None:
        self.model_dir = model_dir
        self.device = device
        self.timeout_s = float(timeout_s)
        self.num_threads = num_threads or None
        self._factory = model_factory
        self.model: Any = None
        self._loaded_once = False
        self._load_lock = threading.Lock()
        self._inference_lock = threading.Lock()
        self.load_ms: Optional[float] = None
        self.warmup_ms: Optional[float] = None
        self._error: Optional[str] = None

    # -- loading -----------------------------------------------------------

    def load(self, warm_up: bool = True) -> bool:
        with self._load_lock:
            if self._loaded_once:
                return self.is_available()
            self._loaded_once = True
            started = time.perf_counter()
            try:
                if self._factory is not None:
                    self.model = self._factory()
                else:
                    from .banglaverify_model import BanglaVerifyModel

                    self.model = BanglaVerifyModel(self.model_dir, device=self.device,
                                                   num_threads=self.num_threads)
                ok = bool(self.model.load())
                self._error = None if ok else self.model.last_error()
            except Exception as exc:  # noqa: BLE001
                ok, self._error, self.model = False, f"{type(exc).__name__}: {exc}", None
            self.load_ms = (time.perf_counter() - started) * 1000.0
            if not ok:
                logger.error("BanglaVerify failed to load from %s: %s", self.model_dir, self._error)
                self._publish()
                return False
            logger.info("BanglaVerify %s loaded in %.1fs", self.version(), self.load_ms / 1000)
            if warm_up:
                t = time.perf_counter()
                try:
                    self.model.predict(text=WARM_UP_TEXT)
                    self.warmup_ms = (time.perf_counter() - t) * 1000.0
                except Exception as exc:  # noqa: BLE001
                    self._error = f"warm-up failed: {exc}"
                    logger.error("BanglaVerify warm-up failed: %s", exc)
            self._publish()
            return True

    def _publish(self) -> None:
        """Share this process's load result with the API process via Redis."""
        try:
            import json

            from factlens_common.cache import get_cache

            client = get_cache().client
            if client is not None:
                client.set(REDIS_STATUS_KEY, json.dumps({
                    "available": self.is_available(), "version": self.version(),
                    "error": self._error, "load_ms": self.load_ms, "warmup_ms": self.warmup_ms,
                    "pid": os.getpid(), "loaded_at": time.time(),
                }))
        except Exception as exc:  # noqa: BLE001
            logger.debug("Could not publish BanglaVerify status: %s", exc)

    def worker_status(self) -> Optional[Dict[str, Any]]:
        try:
            import json

            from factlens_common.cache import get_cache

            client = get_cache().client
            raw = client.get(REDIS_STATUS_KEY) if client is not None else None
            return json.loads(raw) if raw else None
        except Exception:  # noqa: BLE001
            return None

    def is_available(self) -> bool:
        try:
            return bool(self.model is not None and self.model.is_available())
        except Exception:  # noqa: BLE001
            return False

    def version(self) -> str:
        try:
            return self.model.version() if self.model is not None else "unloaded"
        except Exception:  # noqa: BLE001
            return "unloaded"

    def unavailable_reason(self) -> str:
        if self._error:
            return self._error
        if not self._loaded_once:
            return "BanglaVerify has not been loaded in this process."
        return "BanglaVerify is not available."

    @property
    def busy(self) -> bool:
        return self._inference_lock.locked()

    # -- inference -----------------------------------------------------------

    def classify(self, text: Optional[str] = None, headline: Optional[str] = None,
                 content: Optional[str] = None) -> Prediction:
        """One prediction as a shared Prediction. Never raises, never queues."""
        version = self.version()
        if not self.is_available():
            return Prediction.unavailable(MODEL_NAME, version, self.unavailable_reason())
        if not self._inference_lock.acquire(blocking=False):
            return Prediction.unavailable(MODEL_NAME, version, "model busy")

        box: Dict[str, Any] = {}
        done = threading.Event()
        started = time.perf_counter()

        def run() -> None:
            try:
                if text is not None:
                    box["result"] = self.model.predict(text=text)
                else:
                    box["result"] = self.model.predict(headline=headline, content=content)
            except BaseException as exc:  # noqa: BLE001
                box["error"] = exc
            finally:
                box["finished"] = time.perf_counter()
                self._inference_lock.release()
                done.set()

        try:
            threading.Thread(target=run, name="banglaverify-inference", daemon=True).start()
        except Exception as exc:  # noqa: BLE001
            self._inference_lock.release()
            return Prediction.unavailable(MODEL_NAME, version, f"could not start inference: {exc}",
                                          status=ProviderStatus.ERROR)

        if not done.wait(self.timeout_s):
            return Prediction.unavailable(
                MODEL_NAME, version, f"no answer within {self.timeout_s:g}s",
                status=ProviderStatus.TIMEOUT,
                latency_ms=(time.perf_counter() - started) * 1000.0,
            )
        latency = (box["finished"] - started) * 1000.0
        if "error" in box:
            return Prediction.unavailable(
                MODEL_NAME, version, f"{type(box['error']).__name__}: {box['error']}",
                status=ProviderStatus.ERROR, latency_ms=latency,
            )

        r = box["result"]
        p_fake = float(r["p_fake"])
        is_fake = r["label"] == "fake"  # the model's own calibrated, per-mode threshold
        return Prediction(
            available=True,
            probabilities={"FAKE": round(p_fake, 6), "REAL": round(1.0 - p_fake, 6)},
            label="FAKE" if is_fake else "REAL",
            confidence=round(p_fake if is_fake else 1.0 - p_fake, 6),
            raw={
                "p_fake": p_fake,
                "mode": r["mode"],            # short (<= 60 words) or full (headline + body)
                "head": r["mode"],
                "threshold": r["threshold"],
                "n_tokens": r.get("n_tokens"),
            },
            latency_ms=latency,
            model_name=MODEL_NAME,
            model_version=r.get("model_version", version),
        )

    # -- reporting -----------------------------------------------------------

    def describe(self) -> Dict[str, Any]:
        cfg = getattr(self.model, "cfg", {}) or {}
        available = self.is_available()
        return {
            "model_name": MODEL_NAME,
            "base_architecture": "csebuetnlp/banglabert + [CLS, mean] pooling, LayerNorm, linear head",
            "task_type": "Binary classification — Fake / Real (short <= 60 words, or headline + article)",
            "version": self.version(),
            "available": available,
            "reason": None if available else self.unavailable_reason(),
            "decision_threshold": cfg.get("threshold"),
            "metrics": {k: (cfg.get("test_metrics") or {}).get(k) for k in ("full", "headline")},
            "headline_word_threshold": cfg.get("short_word_limit"),
        }

    def health(self) -> Dict[str, Any]:
        available = self.is_available()
        return {
            "model": MODEL_NAME,
            "version": self.version(),
            "available": available,
            "busy": self.busy,
            "reason": None if available else self.unavailable_reason(),
            "load_ms": None if self.load_ms is None else round(self.load_ms, 1),
            "warmup_ms": None if self.warmup_ms is None else round(self.warmup_ms, 1),
            "model_dir": self.model_dir,
            "timeout_s": self.timeout_s,
        }


_runtime: Optional[BanglaVerifyRuntime] = None
_runtime_lock = threading.Lock()


def get_banglaverify_runtime() -> BanglaVerifyRuntime:
    global _runtime
    if _runtime is None:
        with _runtime_lock:
            if _runtime is None:
                from ..core.config import settings

                _runtime = BanglaVerifyRuntime(
                    model_dir=settings.BANGLAVERIFY_MODEL_DIR,
                    device=settings.BANGLAVERIFY_DEVICE,
                    timeout_s=settings.BANGLAVERIFY_TIMEOUT_SECONDS,
                    num_threads=settings.BANGLAVERIFY_NUM_THREADS,
                )
    return _runtime
