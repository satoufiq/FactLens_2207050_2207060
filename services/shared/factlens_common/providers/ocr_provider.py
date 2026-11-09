"""
OCR provider.

Proposal, "Unified Input and OCR Integration":

    EasyOCR with the bn and en language packs. This is the one pretrained
    component kept as-is [...] The choice is stated plainly rather than
    hidden, and OCR sits behind a provider interface like everything else.

Because it is behind the interface, the engine is swappable. EasyOCR is the
declared primary. Tesseract (ben+eng) remains wired as a fallback so the
service still extracts text on a host where EasyOCR's weights have not been
downloaded -- the provider reports which engine actually ran, and that string
reaches the UI, so the user is never misled about what read their screenshot.

OCR failure is not a server error: it yields AWAITING_INPUT and the user is
asked to type the text.
"""

from __future__ import annotations

import io
import logging
import os
import re
import threading
import time
import unicodedata
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger("factlens.providers.ocr")

#: Matches a URL inside OCR'd text, so screenshots feed the URL-analysis pipeline.
URL_PATTERN = re.compile(
    r"\b(?:https?://|www\.)[^\s<>\"'\\^`{|}]+|"
    r"\b[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9\-]{1,63})+\.(?:com|net|org|xyz|top|info|biz|online|site|shop|club|live|link|co|io|me|ru|cn|bd|gov\.bd|edu\.bd|ac\.bd)"
    r"(?:/[^\s<>\"']*)?",
    re.IGNORECASE,
)

BENGALI_RANGE = re.compile(r"[ঀ-৿]")


@dataclass
class OcrResult:
    success: bool
    text: str = ""
    confidence: float = 0.0
    language: str = "bn"
    engine: str = "none"
    resolution: str = ""
    urls: List[str] = field(default_factory=list)
    blocks: List[Dict[str, Any]] = field(default_factory=list)
    latency_ms: float = 0.0
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "extracted_text": self.text,
            "confidence": round(self.confidence, 4),
            "confidence_pct": f"{int(round(self.confidence * 100))}%",
            "language": self.language,
            "engine": self.engine,
            "resolution": self.resolution,
            "detected_urls": self.urls,
            "blocks": self.blocks,
            "latency_ms": round(self.latency_ms, 2),
            "error": self.error,
            # The review step is not optional; the UI must not skip it.
            "requires_user_review": self.success,
        }


def normalize_ocr_text(text: str) -> str:
    """NFC normalise, strip OCR dust, collapse whitespace, drop 1-char lines."""
    if not text:
        return ""
    normalized = unicodedata.normalize("NFC", text)
    cleaned = re.sub(r"[\~\|\^\$\`\*\_\=\#\+]+", " ", normalized)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    lines = [ln.strip() for ln in cleaned.split("\n") if len(ln.strip()) > 1]
    return "\n".join(lines).strip()


def extract_urls(text: str) -> List[str]:
    """Pull URLs out of OCR'd text for the URL-analysis pipeline."""
    if not text:
        return []
    found: List[str] = []
    for match in URL_PATTERN.finditer(text):
        candidate = match.group(0).rstrip(".,;:)]}>।")
        if candidate.lower() not in (u.lower() for u in found):
            found.append(candidate)
    return found[:10]


class OCRProvider:
    """
    EasyOCR (bn+en) with a Tesseract fallback, behind one interface.

    Mirrors the model-provider contract -- load(), is_available(), version() --
    without inheriting BaseModelProvider, because OCR is a pretrained component
    kept as-is and is deliberately not in the model registry.
    """

    provider_name = "OCRProvider"

    def __init__(self, languages: Optional[List[str]] = None) -> None:
        self.languages = languages or ["bn", "en"]
        self._reader = None
        self._engine = "none"
        self._load_attempted = False
        self._load_error: Optional[str] = None
        self._lock = threading.Lock()
        self._gpu = os.environ.get("EASYOCR_GPU", "false").lower() == "true"

    # -- loading -----------------------------------------------------------

    def load(self) -> bool:
        if self._reader is not None:
            return True
        if self._load_attempted:
            return self._engine == "tesseract"

        with self._lock:
            if self._reader is not None:
                return True
            self._load_attempted = True
            try:
                import easyocr  # noqa: PLC0415

                started = time.perf_counter()
                self._reader = easyocr.Reader(
                    self.languages,
                    gpu=self._gpu,
                    verbose=False,
                    download_enabled=os.environ.get(
                        "EASYOCR_DOWNLOAD", "true"
                    ).lower()
                    == "true",
                )
                self._engine = "easyocr"
                logger.info(
                    "EasyOCR ready (%s) in %.0f ms",
                    "+".join(self.languages),
                    (time.perf_counter() - started) * 1000.0,
                )
                return True
            except Exception as exc:  # noqa: BLE001
                self._load_error = str(exc)
                logger.warning(
                    "EasyOCR unavailable (%s); falling back to Tesseract ben+eng.", exc
                )

            if self._tesseract_available():
                self._engine = "tesseract"
                return True

            self._engine = "none"
            return False

    @staticmethod
    def _tesseract_available() -> bool:
        try:
            import pytesseract  # noqa: PLC0415

            pytesseract.get_tesseract_version()
            return True
        except Exception:  # noqa: BLE001
            return False

    def is_available(self) -> bool:
        return self.load()

    def version(self) -> str:
        self.load()
        if self._engine == "easyocr":
            try:
                import easyocr  # noqa: PLC0415

                return f"easyocr-{getattr(easyocr, '__version__', 'unknown')}"
            except Exception:  # noqa: BLE001
                return "easyocr-unknown"
        if self._engine == "tesseract":
            try:
                import pytesseract  # noqa: PLC0415

                return f"tesseract-{pytesseract.get_tesseract_version()}"
            except Exception:  # noqa: BLE001
                return "tesseract-unknown"
        return "none"

    def engine_label(self) -> str:
        self.load()
        return {
            "easyocr": "EasyOCR (bn + en)",
            "tesseract": "Tesseract ben+eng (EasyOCR fallback)",
        }.get(self._engine, "No OCR engine available")

    # -- preprocessing -----------------------------------------------------

    @staticmethod
    def preprocess(image):
        """Flatten transparency, upscale small screenshots, lift contrast."""
        from PIL import Image, ImageEnhance, ImageFilter

        if image.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(image, mask=image.split()[-1] if "A" in image.mode else None)
            image = background
        else:
            image = image.convert("RGB")

        width, height = image.size
        if width < 900:
            scale = 900.0 / width
            image = image.resize(
                (int(width * scale), int(height * scale)), Image.Resampling.LANCZOS
            )

        image = ImageEnhance.Contrast(image).enhance(1.25)
        return image.filter(ImageFilter.SHARPEN)

    # -- inference ---------------------------------------------------------

    def extract(self, image_bytes: bytes) -> OcrResult:
        """Extract text from raw image bytes. Never raises."""
        from PIL import Image

        started = time.perf_counter()

        try:
            image = Image.open(io.BytesIO(image_bytes))
            original_w, original_h = image.size
            processed = self.preprocess(image)
        except Exception as exc:  # noqa: BLE001
            return OcrResult(
                success=False,
                error=f"The uploaded file could not be opened as an image: {exc}",
                latency_ms=(time.perf_counter() - started) * 1000.0,
            )

        resolution = f"{original_w}x{original_h}"

        if not self.load():
            return OcrResult(
                success=False,
                resolution=resolution,
                error=(
                    "No OCR engine is available in this environment "
                    f"({self._load_error or 'EasyOCR and Tesseract both missing'}). "
                    "Please type the text from the image instead."
                ),
                latency_ms=(time.perf_counter() - started) * 1000.0,
            )

        try:
            if self._engine == "easyocr":
                text, confidence, blocks = self._run_easyocr(processed)
            else:
                text, confidence, blocks = self._run_tesseract(processed)
        except Exception as exc:  # noqa: BLE001
            logger.exception("OCR extraction failed")
            return OcrResult(
                success=False,
                resolution=resolution,
                engine=self.engine_label(),
                error=f"OCR failed while reading the image: {exc}",
                latency_ms=(time.perf_counter() - started) * 1000.0,
            )

        cleaned = normalize_ocr_text(text)
        elapsed = (time.perf_counter() - started) * 1000.0

        if not cleaned:
            return OcrResult(
                success=False,
                resolution=resolution,
                engine=self.engine_label(),
                error="No readable text was detected in the provided image.",
                latency_ms=elapsed,
            )

        return OcrResult(
            success=True,
            text=cleaned,
            confidence=confidence,
            language="bn" if BENGALI_RANGE.search(cleaned) else "en",
            engine=self.engine_label(),
            resolution=resolution,
            urls=extract_urls(cleaned),
            blocks=blocks,
            latency_ms=elapsed,
        )

    def _run_easyocr(self, image):
        import numpy as np

        results = self._reader.readtext(np.asarray(image), detail=1, paragraph=False)
        lines: List[str] = []
        confidences: List[float] = []
        blocks: List[Dict[str, Any]] = []

        for item in results:
            if len(item) >= 3:
                box, text, score = item[0], item[1], float(item[2])
            else:
                box, text, score = item[0], item[1], 0.0
            text = (text or "").strip()
            if not text:
                continue
            lines.append(text)
            confidences.append(score)
            try:
                xs = [float(p[0]) for p in box]
                ys = [float(p[1]) for p in box]
                bbox = [min(xs), min(ys), max(xs), max(ys)]
            except Exception:  # noqa: BLE001
                bbox = []
            blocks.append({"text": text, "confidence": round(score, 4), "bbox": bbox})

        mean_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        return "\n".join(lines), mean_confidence, blocks

    def _run_tesseract(self, image):
        import pytesseract  # noqa: PLC0415

        lang = "+".join({"bn": "ben", "en": "eng"}.get(x, x) for x in self.languages)
        data = pytesseract.image_to_data(
            image, lang=lang, output_type=pytesseract.Output.DICT
        )

        lines: List[str] = []
        confidences: List[float] = []
        blocks: List[Dict[str, Any]] = []

        for i, word in enumerate(data.get("text", [])):
            word = (word or "").strip()
            if not word:
                continue
            try:
                score = float(data["conf"][i])
            except (ValueError, KeyError, IndexError):
                score = -1.0
            if score < 0:
                continue
            lines.append(word)
            confidences.append(score / 100.0)
            blocks.append(
                {
                    "text": word,
                    "confidence": round(score / 100.0, 4),
                    "bbox": [
                        data["left"][i],
                        data["top"][i],
                        data["left"][i] + data["width"][i],
                        data["top"][i] + data["height"][i],
                    ],
                }
            )

        mean_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        return " ".join(lines), mean_confidence, blocks

    def health(self) -> Dict[str, Any]:
        available = self.is_available()
        return {
            "provider": self.provider_name,
            "engine": self.engine_label(),
            "version": self.version(),
            "languages": self.languages,
            "available": available,
            "reason": None if available else (self._load_error or "no engine"),
        }


_ocr_provider: Optional[OCRProvider] = None
_ocr_lock = threading.Lock()


def get_ocr_provider() -> OCRProvider:
    global _ocr_provider
    if _ocr_provider is None:
        with _ocr_lock:
            if _ocr_provider is None:
                _ocr_provider = OCRProvider()
    return _ocr_provider
