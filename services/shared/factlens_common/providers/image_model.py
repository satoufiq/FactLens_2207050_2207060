"""
ImageAuth -- AI-generated and manipulated image detector.

Proposal: binary Authentic / AI-generated with a separate manipulation head,
google/vit-base-patch16-224 fine-tuned, 224x224 RGB with centre crop, ONNX
export, CPU inference, *loaded on demand and released after an idle period to
limit memory*. That idle-release policy is implemented here rather than in the
service, because memory is a serving concern.

The artifact does not exist yet, so the provider reports unavailable and the
Image Check module runs on metadata plus the technical signals, marking the
scan PARTIAL.
"""

from __future__ import annotations

import logging
import threading
import time
from pathlib import Path
from typing import Any, Dict, Optional

from .base import BaseModelProvider, Prediction
from .onnx_session import OnnxSession

logger = logging.getLogger("factlens.providers.image")

#: ImageNet statistics; overridden by the registry entry when the export differs.
DEFAULT_MEAN = (0.5, 0.5, 0.5)
DEFAULT_STD = (0.5, 0.5, 0.5)


class ImageAuthProvider(BaseModelProvider):
    """ViT-class image classifier with on-demand loading and idle release."""

    model_name = "ImageAuth"
    timeout_s = 25.0

    #: Release the session after this many seconds without an inference.
    DEFAULT_IDLE_RELEASE_S = 300
    INPUT_SIZE = 224

    def __init__(self, registry=None, timeout_s: Optional[float] = None) -> None:
        super().__init__(registry=registry, timeout_s=timeout_s)
        self._last_used = 0.0
        self._idle_timer: Optional[threading.Timer] = None
        self._idle_lock = threading.Lock()

    # -- idle release ------------------------------------------------------

    @property
    def idle_release_s(self) -> int:
        if self._entry and self._entry.idle_release_s:
            return int(self._entry.idle_release_s)
        return self.DEFAULT_IDLE_RELEASE_S

    def _arm_idle_timer(self) -> None:
        with self._idle_lock:
            if self._idle_timer is not None:
                self._idle_timer.cancel()
            timer = threading.Timer(self.idle_release_s, self._release_if_idle)
            timer.daemon = True
            self._idle_timer = timer
            timer.start()

    def _release_if_idle(self) -> None:
        with self._idle_lock:
            self._idle_timer = None
        if self._session is None:
            return
        idle_for = time.time() - self._last_used
        if idle_for >= self.idle_release_s:
            logger.info(
                "[ImageAuth] releasing session after %.0fs idle to free memory", idle_for
            )
            # Reset the load gate so the next scan reloads on demand.
            self._session = None
            self._load_attempted = False
            self._load_error = None
        else:
            self._arm_idle_timer()

    def unload(self) -> None:
        with self._idle_lock:
            if self._idle_timer is not None:
                self._idle_timer.cancel()
                self._idle_timer = None
        super().unload()

    # -- loading -----------------------------------------------------------

    def _load(self) -> Any:
        assert self._entry is not None and self._entry.resolved_artifact is not None
        session = OnnxSession(self._entry.resolved_artifact)
        self._last_used = time.time()
        self._arm_idle_timer()
        return session

    # -- preprocessing -----------------------------------------------------

    def _preprocess(self, image) -> Any:
        """Resize shortest side then centre-crop to 224x224, normalise to NCHW."""
        import numpy as np
        from PIL import Image

        if image.mode != "RGB":
            image = image.convert("RGB")

        size = self.INPUT_SIZE
        width, height = image.size
        scale = size / min(width, height)
        resized = image.resize(
            (max(size, int(round(width * scale))), max(size, int(round(height * scale)))),
            Image.Resampling.BICUBIC,
        )
        rw, rh = resized.size
        left = (rw - size) // 2
        top = (rh - size) // 2
        cropped = resized.crop((left, top, left + size, top + size))

        array = np.asarray(cropped, dtype=np.float32) / 255.0
        mean = np.array(DEFAULT_MEAN, dtype=np.float32)
        std = np.array(DEFAULT_STD, dtype=np.float32)
        array = (array - mean) / std
        array = array.transpose(2, 0, 1)[None, ...]  # NCHW
        return array.astype(np.float32)

    def _held_out_auc(self) -> Optional[float]:
        """
        The held-out-generator AUC from the registry, wherever it was recorded.

        register_model.py stores evaluation results under metrics.external; an
        entry edited by hand may carry it at the top level.
        """
        if self._entry is None:
            return None
        metrics = self._entry.metrics or {}
        external = metrics.get("external") or {}
        value = external.get("held_out_generator_auc", metrics.get("held_out_generator_auc"))
        return float(value) if isinstance(value, (int, float)) else None

    # -- inference ---------------------------------------------------------

    def _predict(self, session: Any, payload: Any) -> Prediction:
        import numpy as np

        image = payload.get("image") if isinstance(payload, dict) else payload
        if image is None:
            return Prediction.unavailable(
                self.model_name, self.version(), "No image supplied to ImageAuth."
            )

        started = time.perf_counter()
        tensor = self._preprocess(image)

        input_name = session.input_names[0] if session.input_names else "pixel_values"
        outputs = session.run({input_name: tensor})
        elapsed = (time.perf_counter() - started) * 1000.0

        self._last_used = time.time()
        self._arm_idle_timer()

        def head_probability(array) -> float:
            """Collapse a head's output to a single positive-class probability."""
            flat = np.asarray(array).reshape(-1).astype(float)
            if flat.size == 1:  # single logit -> sigmoid (BCE per head)
                return float(1.0 / (1.0 + np.exp(-flat[0])))
            shifted = flat - flat.max()
            exps = np.exp(shifted)
            return float((exps / exps.sum())[-1])

        ai_probability = head_probability(outputs[0])
        manipulation_probability = (
            head_probability(outputs[1]) if len(outputs) > 1 else None
        )

        probabilities: Dict[str, float] = {
            "AI_GENERATED": round(ai_probability, 6),
            "AUTHENTIC": round(1.0 - ai_probability, 6),
        }
        if manipulation_probability is not None:
            probabilities["MANIPULATED"] = round(manipulation_probability, 6)

        threshold = (
            float(self._entry.decision_threshold)
            if self._entry and self._entry.decision_threshold is not None
            else 0.5
        )
        label = "AI_GENERATED" if ai_probability >= threshold else "AUTHENTIC"

        return Prediction(
            available=True,
            probabilities=probabilities,
            label=label,
            confidence=max(ai_probability, 1.0 - ai_probability),
            raw={
                "ai_probability": round(ai_probability, 6),
                "manipulation_probability": (
                    round(manipulation_probability, 6)
                    if manipulation_probability is not None
                    else None
                ),
                "decision_threshold": threshold,
                "heads": len(outputs),
                # The proposal derives user-facing confidence from the
                # out-of-distribution figure, not the optimistic one.
                "ood_accuracy": self._held_out_auc(),
            },
            latency_ms=elapsed,
            model_name=self.model_name,
            model_version=self.version(),
        )
