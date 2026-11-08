"""
Image forensics: metadata extraction and technical signal analysis.

Proposal, Module 3 steps 3 and 5:

    Metadata extraction -- EXIF data, software tags, creation and modification
    timestamps, GPS data if present, format details, dimensions, and colour
    profile, extracted with Pillow.

    Technical signal analysis -- noise pattern analysis, compression artifact
    examination, and frequency-domain analysis for synthetic signatures.

and "Why metadata is kept beside the model":

    Metadata is weak evidence but it is verifiable and cheap. A
    `Software: Midjourney` tag or a C2PA provenance block is a fact the user
    can check; the model's probability is not.

Everything here is deterministic and inspectable. None of it is a detector on
its own -- each signal is reported with what it does and does not imply, which
is what lets the module stay honest while ImageAuth is unregistered.
"""

from __future__ import annotations

import logging
import math
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("factlens.image.forensics")

#: Software tags that name a generator outright. Strong, checkable evidence.
GENERATOR_SOFTWARE = {
    "midjourney": "Midjourney",
    "stable diffusion": "Stable Diffusion",
    "stablediffusion": "Stable Diffusion",
    "automatic1111": "Stable Diffusion (AUTOMATIC1111)",
    "comfyui": "Stable Diffusion (ComfyUI)",
    "invokeai": "InvokeAI",
    "dall-e": "DALL-E",
    "dalle": "DALL-E",
    "openai": "OpenAI",
    "firefly": "Adobe Firefly",
    "imagen": "Google Imagen",
    "flux": "FLUX",
    "leonardo": "Leonardo.Ai",
    "nightcafe": "NightCafe",
    "novelai": "NovelAI",
    "craiyon": "Craiyon",
    "bing image creator": "Bing Image Creator",
    "grok": "Grok Imagine",
}

#: Editors whose presence means the file was processed, not that it is fake.
EDITOR_SOFTWARE = {
    "photoshop": "Adobe Photoshop",
    "lightroom": "Adobe Lightroom",
    "gimp": "GIMP",
    "paint.net": "Paint.NET",
    "affinity": "Affinity Photo",
    "pixelmator": "Pixelmator",
    "snapseed": "Snapseed",
    "picsart": "PicsArt",
    "canva": "Canva",
    "facetune": "Facetune",
}

#: EXIF tags that indicate a real capture device.
CAMERA_TAGS = ("Make", "Model", "LensModel", "ExposureTime", "FNumber", "ISOSpeedRatings")


@dataclass
class Signal:
    """One forensic observation, with its weight and its caveat."""

    code: str
    category: str
    #: -1.0 (points to authentic) .. +1.0 (points to synthetic/manipulated)
    direction: float
    #: 0.0 .. 1.0 -- how much this observation should count
    strength: float
    finding: str
    finding_bn: Optional[str] = None
    caveat: Optional[str] = None
    detail: Optional[Dict[str, Any]] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "category": self.category,
            "direction": round(self.direction, 3),
            "strength": round(self.strength, 3),
            "finding": self.finding,
            "finding_bn": self.finding_bn,
            "caveat": self.caveat,
            "detail": self.detail,
        }


@dataclass
class MetadataResult:
    available: bool = True
    format: Optional[str] = None
    mode: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    megapixels: Optional[float] = None
    has_exif: bool = False
    exif: Dict[str, Any] = field(default_factory=dict)
    software: Optional[str] = None
    datetime_original: Optional[str] = None
    datetime_modified: Optional[str] = None
    gps: Optional[Dict[str, Any]] = None
    icc_profile: Optional[str] = None
    has_c2pa: bool = False
    c2pa_detail: Optional[str] = None
    camera_tags_present: List[str] = field(default_factory=list)
    signals: List[Signal] = field(default_factory=list)
    error: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "available": self.available,
            "format": self.format,
            "mode": self.mode,
            "width": self.width,
            "height": self.height,
            "megapixels": self.megapixels,
            "has_exif": self.has_exif,
            "exif": self.exif,
            "software": self.software,
            "datetime_original": self.datetime_original,
            "datetime_modified": self.datetime_modified,
            "gps": self.gps,
            "icc_profile": self.icc_profile,
            "has_c2pa": self.has_c2pa,
            "c2pa_detail": self.c2pa_detail,
            "camera_tags_present": self.camera_tags_present,
            "signals": [s.as_dict() for s in self.signals],
            "error": self.error,
        }


@dataclass
class TechnicalResult:
    available: bool = True
    noise: Dict[str, Any] = field(default_factory=dict)
    compression: Dict[str, Any] = field(default_factory=dict)
    frequency: Dict[str, Any] = field(default_factory=dict)
    signals: List[Signal] = field(default_factory=list)
    error: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "available": self.available,
            "noise": self.noise,
            "compression": self.compression,
            "frequency": self.frequency,
            "signals": [s.as_dict() for s in self.signals],
            "error": self.error,
        }


class MetadataExtractor:
    """Step 3 -- EXIF, software tags, timestamps, GPS, colour profile, C2PA."""

    def extract(self, image, raw_bytes: bytes) -> MetadataResult:
        result = MetadataResult()
        try:
            result.format = image.format
            result.mode = image.mode
            result.width, result.height = image.size
            result.megapixels = round((image.width * image.height) / 1_000_000, 2)

            self._read_exif(image, result)
            self._read_icc(image, result)
            self._detect_c2pa(raw_bytes, result)
            self._build_signals(result)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Metadata extraction failed: %s", exc)
            result.available = False
            result.error = str(exc)
        return result

    def _read_exif(self, image, result: MetadataResult) -> None:
        try:
            from PIL import ExifTags
        except Exception:  # noqa: BLE001
            return

        raw_exif = None
        try:
            raw_exif = image.getexif()
        except Exception:  # noqa: BLE001
            pass

        if not raw_exif:
            return

        tag_names = {v: k for k, v in ExifTags.TAGS.items()}
        readable: Dict[str, Any] = {}
        for tag_id, value in raw_exif.items():
            name = ExifTags.TAGS.get(tag_id, str(tag_id))
            readable[name] = self._stringify(value)

        # GPS lives in its own IFD.
        try:
            gps_ifd = raw_exif.get_ifd(tag_names.get("GPSInfo", 34853))
            if gps_ifd:
                result.gps = {
                    ExifTags.GPSTAGS.get(k, str(k)): self._stringify(v)
                    for k, v in gps_ifd.items()
                }
        except Exception:  # noqa: BLE001
            pass

        result.has_exif = bool(readable)
        result.exif = readable
        result.software = readable.get("Software")
        result.datetime_original = readable.get("DateTimeOriginal") or readable.get(
            "DateTime"
        )
        result.datetime_modified = readable.get("DateTime")
        result.camera_tags_present = [t for t in CAMERA_TAGS if t in readable]

    @staticmethod
    def _stringify(value: Any) -> Any:
        if isinstance(value, bytes):
            try:
                return value.decode("utf-8", errors="replace")[:512]
            except Exception:  # noqa: BLE001
                return f"<{len(value)} bytes>"
        if isinstance(value, (int, float, str)):
            return value if not isinstance(value, str) else value[:512]
        if isinstance(value, tuple):
            return [MetadataExtractor._stringify(v) for v in value[:16]]
        return str(value)[:512]

    @staticmethod
    def _read_icc(image, result: MetadataResult) -> None:
        profile = image.info.get("icc_profile")
        if not profile:
            return
        try:
            from io import BytesIO

            from PIL import ImageCms

            parsed = ImageCms.ImageCmsProfile(BytesIO(profile))
            result.icc_profile = ImageCms.getProfileDescription(parsed).strip()
        except Exception:  # noqa: BLE001
            result.icc_profile = f"present ({len(profile)} bytes)"

    @staticmethod
    def _detect_c2pa(raw_bytes: bytes, result: MetadataResult) -> None:
        """
        Look for a C2PA / Content Credentials provenance block.

        A full C2PA verification needs the c2pa library and a trust list; this
        is a presence check, and it says so. Presence of a manifest is a fact
        the user can go and verify themselves.
        """
        window = raw_bytes[:2_000_000]
        markers = [b"c2pa", b"jumbf", b"urn:uuid:c2pa", b"contentcredentials"]
        hits = [m.decode("ascii", "ignore") for m in markers if m in window.lower()]
        if hits:
            result.has_c2pa = True
            result.c2pa_detail = (
                "A Content Credentials (C2PA) block is present. FactLens detects its "
                "presence but does not cryptographically verify it — open the file at "
                "contentcredentials.org/verify to read the signed history."
            )

    def _build_signals(self, result: MetadataResult) -> None:
        software = (result.software or "").lower()

        for needle, label in GENERATOR_SOFTWARE.items():
            if needle in software:
                result.signals.append(
                    Signal(
                        code="generator_software_tag",
                        category="metadata",
                        direction=1.0,
                        strength=0.85,
                        finding=(
                            f"The file's Software tag names {label}, an AI image "
                            f"generator. This is written by the tool that produced the file."
                        ),
                        finding_bn=(
                            f"ফাইলের সফটওয়্যার ট্যাগে {label} নামের একটি এআই ইমেজ জেনারেটরের "
                            f"নাম রয়েছে। ফাইলটি তৈরির সময় সরঞ্জামটি নিজেই এটি লিখে দেয়।"
                        ),
                        caveat=(
                            "Metadata can be edited or stripped, so its presence is "
                            "stronger evidence than its absence."
                        ),
                        detail={"software": result.software, "generator": label},
                    )
                )
                break
        else:
            for needle, label in EDITOR_SOFTWARE.items():
                if needle in software:
                    result.signals.append(
                        Signal(
                            code="editor_software_tag",
                            category="metadata",
                            direction=0.35,
                            strength=0.4,
                            finding=(
                                f"The file was saved by {label}. That means it was "
                                f"processed in an editor, which is ordinary for photos "
                                f"that have been cropped or colour-corrected."
                            ),
                            finding_bn=(
                                f"ফাইলটি {label} দিয়ে সংরক্ষণ করা হয়েছে। অর্থাৎ এটি একটি "
                                f"এডিটরে প্রক্রিয়া করা হয়েছে — ক্রপ বা রং সংশোধনের ক্ষেত্রে "
                                f"যা স্বাভাবিক।"
                            ),
                            caveat="Editing is not the same as deception.",
                            detail={"software": result.software, "editor": label},
                        )
                    )
                    break

        if result.has_c2pa:
            result.signals.append(
                Signal(
                    code="c2pa_present",
                    category="provenance",
                    direction=-0.2,
                    strength=0.5,
                    finding=(
                        "This image carries a Content Credentials (C2PA) provenance "
                        "block recording how it was made and edited."
                    ),
                    finding_bn=(
                        "এই ছবিতে Content Credentials (C2PA) প্রভেন্যান্স ব্লক রয়েছে, যা "
                        "ছবিটি কীভাবে তৈরি ও সম্পাদনা হয়েছে তার রেকর্ড রাখে।"
                    ),
                    caveat=(
                        "A C2PA block can itself record that an image was AI-generated. "
                        "Read the manifest rather than treating its presence as proof "
                        "of authenticity."
                    ),
                )
            )

        if result.camera_tags_present:
            result.signals.append(
                Signal(
                    code="camera_exif_present",
                    category="metadata",
                    direction=-0.45,
                    strength=0.5,
                    finding=(
                        "The file carries camera EXIF data ("
                        + ", ".join(result.camera_tags_present[:4])
                        + "), consistent with a photograph taken on a real device."
                    ),
                    finding_bn=(
                        "ফাইলটিতে ক্যামেরার EXIF তথ্য রয়েছে ("
                        + ", ".join(result.camera_tags_present[:4])
                        + "), যা প্রকৃত যন্ত্রে তোলা ছবির সঙ্গে সঙ্গতিপূর্ণ।"
                    ),
                    caveat="EXIF data can be copied from another file or fabricated.",
                )
            )
        elif not result.has_exif:
            result.signals.append(
                Signal(
                    code="no_exif",
                    category="metadata",
                    direction=0.2,
                    strength=0.25,
                    finding=(
                        "The file carries no EXIF metadata at all. AI generators "
                        "usually write none — but so does every screenshot, and every "
                        "image re-saved by a social platform."
                    ),
                    finding_bn=(
                        "ফাইলটিতে কোনো EXIF মেটাডেটা নেই। এআই জেনারেটর সাধারণত কিছু "
                        "লেখে না — তবে প্রতিটি স্ক্রিনশট এবং সোশ্যাল প্ল্যাটফর্মে পুনরায় "
                        "সংরক্ষিত ছবিও একইরকম।"
                    ),
                    caveat=(
                        "This is the weakest signal in the set and means very little "
                        "on its own."
                    ),
                )
            )

        if result.datetime_original and result.datetime_modified:
            if result.datetime_original != result.datetime_modified:
                result.signals.append(
                    Signal(
                        code="timestamp_mismatch",
                        category="metadata",
                        direction=0.3,
                        strength=0.3,
                        finding=(
                            f"The capture time ({result.datetime_original}) differs "
                            f"from the last-modified time ({result.datetime_modified}), "
                            f"so the file was changed after it was created."
                        ),
                        finding_bn=(
                            f"ছবি তোলার সময় ({result.datetime_original}) এবং সর্বশেষ "
                            f"পরিবর্তনের সময় ({result.datetime_modified}) আলাদা, অর্থাৎ "
                            f"তৈরির পর ফাইলটি পরিবর্তন করা হয়েছে।"
                        ),
                        caveat="Any crop, rotation or re-save produces this difference.",
                    )
                )


class TechnicalAnalyzer:
    """Step 5 -- noise, compression artifacts, frequency-domain signatures."""

    def analyze(self, image) -> TechnicalResult:
        result = TechnicalResult()
        try:
            import numpy as np
        except Exception as exc:  # noqa: BLE001
            result.available = False
            result.error = f"numpy is required for technical analysis: {exc}"
            return result

        try:
            rgb = image.convert("RGB")
            # Cap the working size: these statistics are scale-stable and a
            # 48MP upload must not blow the worker's memory budget.
            if max(rgb.size) > 1600:
                from PIL import Image as PILImage

                ratio = 1600 / max(rgb.size)
                rgb = rgb.resize(
                    (int(rgb.width * ratio), int(rgb.height * ratio)),
                    PILImage.Resampling.BILINEAR,
                )

            array = np.asarray(rgb, dtype=np.float64)
            grey = array.mean(axis=2)

            result.noise = self._noise(grey, np)
            result.compression = self._compression(grey, np)
            result.frequency = self._frequency(grey, np)
            result.noise["flat_fraction"] = self._flat_fraction(grey, np)
            self._build_signals(result)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Technical analysis failed: %s", exc)
            result.available = False
            result.error = str(exc)
        return result

    # -- individual analyses ----------------------------------------------

    #: Share of perfectly flat 8x8 blocks above which the image is treated as a
    #: screenshot or graphic rather than a photograph.
    GRAPHIC_FLAT_FRACTION = 0.45
    #: How much of a photo-only signal's strength survives on graphic content.
    GRAPHIC_SIGNAL_DISCOUNT = 0.3

    @staticmethod
    def _flat_fraction(grey, np) -> float:
        """
        Fraction of 8x8 blocks that are essentially flat.

        No camera sensor produces large regions of identical pixels: sensor
        noise alone guarantees variation. Screenshots, UI captures, slides and
        flat graphics are dominated by them. The noise and frequency statistics
        below are calibrated for photographs, so on this kind of content they
        fire for reasons that have nothing to do with generation or editing.
        """
        h, w = grey.shape
        block = 8
        rows, cols = h // block, w // block
        if rows == 0 or cols == 0:
            return 0.0
        tiles = grey[: rows * block, : cols * block].reshape(rows, block, cols, block)
        stds = tiles.std(axis=(1, 3))
        return round(float((stds < 1.5).mean()), 4)

    @staticmethod
    def _noise(grey, np) -> Dict[str, Any]:
        """
        Residual-noise statistics.

        A Laplacian high-pass leaves sensor noise and fine texture. Camera
        sensors produce a broadly uniform noise floor across the frame;
        diffusion models tend to produce unusually clean, spatially uneven
        residuals.
        """
        kernel = np.array([[0, -1, 0], [-1, 4, -1], [0, -1, 0]], dtype=np.float64)
        padded = np.pad(grey, 1, mode="reflect")
        residual = np.zeros_like(grey)
        for dy in range(3):
            for dx in range(3):
                weight = kernel[dy, dx]
                if weight:
                    residual += weight * padded[dy : dy + grey.shape[0], dx : dx + grey.shape[1]]

        sigma = float(np.std(residual))

        # Block-wise variance of the residual: how evenly noise is distributed.
        block = 32
        h, w = grey.shape
        variances = []
        for y in range(0, h - block + 1, block):
            for x in range(0, w - block + 1, block):
                variances.append(float(np.var(residual[y : y + block, x : x + block])))

        if variances:
            arr = np.array(variances)
            mean_v = float(arr.mean())
            uniformity = float(arr.std() / mean_v) if mean_v > 1e-9 else 0.0
        else:
            mean_v, uniformity = 0.0, 0.0

        return {
            "residual_sigma": round(sigma, 4),
            "block_variance_mean": round(mean_v, 4),
            # Coefficient of variation: low = suspiciously even, high = normal scene.
            "spatial_uniformity": round(uniformity, 4),
            "blocks_sampled": len(variances),
        }

    @staticmethod
    def _compression(grey, np) -> Dict[str, Any]:
        """
        JPEG blocking strength.

        JPEG works on an 8x8 grid. Measuring discontinuity at multiples of 8
        against the discontinuity elsewhere reveals how heavily the image has
        been compressed, and re-compression of a spliced region often leaves a
        different blocking strength from its surroundings.
        """
        h, w = grey.shape
        if w < 24 or h < 24:
            return {"insufficient_size": True}

        col_diff = np.abs(np.diff(grey, axis=1)).mean(axis=0)
        row_diff = np.abs(np.diff(grey, axis=0)).mean(axis=1)

        def grid_ratio(diffs) -> float:
            idx = np.arange(len(diffs))
            on_grid = diffs[(idx + 1) % 8 == 0]
            off_grid = diffs[(idx + 1) % 8 != 0]
            if off_grid.size == 0 or off_grid.mean() < 1e-9:
                return 1.0
            return float(on_grid.mean() / off_grid.mean())

        horizontal = grid_ratio(col_diff)
        vertical = grid_ratio(row_diff)
        strength = (horizontal + vertical) / 2.0

        return {
            "horizontal_blockiness": round(horizontal, 4),
            "vertical_blockiness": round(vertical, 4),
            "blocking_strength": round(strength, 4),
            "interpretation": (
                "strong JPEG grid"
                if strength > 1.25
                else "weak or absent JPEG grid"
                if strength < 1.05
                else "moderate JPEG grid"
            ),
        }

    @staticmethod
    def _frequency(grey, np) -> Dict[str, Any]:
        """
        Frequency-domain profile.

        Natural images follow roughly a 1/f power spectrum. Upsampling layers in
        generative models leave periodic peaks and an unusually heavy or
        unusually flat high-frequency tail.
        """
        h, w = grey.shape
        size = min(512, 1 << int(math.floor(math.log2(min(h, w)))))
        if size < 64:
            return {"insufficient_size": True}

        top = (h - size) // 2
        left = (w - size) // 2
        patch = grey[top : top + size, left : left + size]
        patch = patch - patch.mean()

        window = np.outer(np.hanning(size), np.hanning(size))
        spectrum = np.fft.fftshift(np.abs(np.fft.fft2(patch * window)))
        power = spectrum**2

        centre = size // 2
        yy, xx = np.ogrid[:size, :size]
        radius = np.sqrt((yy - centre) ** 2 + (xx - centre) ** 2).astype(int)

        profile = np.bincount(radius.ravel(), power.ravel()) / np.maximum(
            np.bincount(radius.ravel()), 1
        )
        profile = profile[: centre]

        usable = profile[1:]
        if usable.size < 8:
            return {"insufficient_size": True}

        freqs = np.arange(1, usable.size + 1)
        with np.errstate(divide="ignore", invalid="ignore"):
            log_f = np.log(freqs)
            log_p = np.log(np.maximum(usable, 1e-12))
        finite = np.isfinite(log_f) & np.isfinite(log_p)
        slope = (
            float(np.polyfit(log_f[finite], log_p[finite], 1)[0])
            if finite.sum() > 4
            else 0.0
        )

        total = float(usable.sum()) or 1.0
        high_band = float(usable[int(usable.size * 0.6) :].sum()) / total

        # Periodic peaks in the radial profile hint at upsampling artifacts.
        detrended = usable / np.maximum(
            np.convolve(usable, np.ones(5) / 5, mode="same"), 1e-12
        )
        peak_ratio = float(detrended.max()) if detrended.size else 1.0

        return {
            "spectral_slope": round(slope, 4),
            "high_frequency_energy": round(high_band, 5),
            "peak_ratio": round(peak_ratio, 4),
            "patch_size": size,
            "interpretation": (
                "natural 1/f-like falloff"
                if -3.2 <= slope <= -1.4
                else "atypical spectral falloff"
            ),
        }

    # -- signals -----------------------------------------------------------

    def _build_signals(self, result: TechnicalResult) -> None:
        noise = result.noise
        compression = result.compression
        frequency = result.frequency

        sigma = noise.get("residual_sigma")
        uniformity = noise.get("spatial_uniformity")

        if sigma is not None and sigma < 1.2:
            result.signals.append(
                Signal(
                    code="unusually_clean_noise",
                    category="noise",
                    direction=0.45,
                    strength=0.4,
                    finding=(
                        "The image has an unusually clean noise floor for a "
                        "photograph. Generated images are often smoother than any "
                        "camera sensor produces."
                    ),
                    finding_bn=(
                        "ছবিটির নয়েজ স্তর একটি আলোকচিত্রের তুলনায় অস্বাভাবিকভাবে পরিষ্কার। "
                        "তৈরি করা ছবি প্রায়ই যেকোনো ক্যামেরা সেন্সরের চেয়ে মসৃণ হয়।"
                    ),
                    caveat=(
                        "Heavy denoising, a screenshot, or a low-quality re-save "
                        "produces the same reading."
                    ),
                    detail={"residual_sigma": sigma},
                )
            )

        if uniformity is not None and uniformity > 2.2:
            result.signals.append(
                Signal(
                    code="uneven_noise_distribution",
                    category="noise",
                    direction=0.4,
                    strength=0.35,
                    finding=(
                        "Noise is distributed unevenly across the frame. In a single "
                        "unedited exposure the noise floor is usually consistent; "
                        "patchiness can indicate a composited or partially edited region."
                    ),
                    finding_bn=(
                        "ফ্রেম জুড়ে নয়েজ অসমভাবে বিতরণ করা হয়েছে। একটি একক অসম্পাদিত "
                        "ছবিতে নয়েজ সাধারণত সমান থাকে; অসমতা জোড়া লাগানো বা আংশিক "
                        "সম্পাদিত অংশের ইঙ্গিত দিতে পারে।"
                    ),
                    caveat=(
                        "Scenes mixing bright sky with deep shadow naturally vary this way."
                    ),
                    detail={"spatial_uniformity": uniformity},
                )
            )

        strength = compression.get("blocking_strength")
        if strength is not None and strength > 1.35:
            result.signals.append(
                Signal(
                    code="heavy_recompression",
                    category="compression",
                    direction=0.2,
                    strength=0.3,
                    finding=(
                        "Strong JPEG block boundaries are visible, so the image has "
                        "been compressed heavily or saved repeatedly."
                    ),
                    finding_bn=(
                        "শক্তিশালী JPEG ব্লক সীমানা দেখা যাচ্ছে, অর্থাৎ ছবিটি ভারীভাবে "
                        "সংকুচিত বা বারবার সংরক্ষণ করা হয়েছে।"
                    ),
                    caveat=(
                        "Every image forwarded through a messaging app looks like this. "
                        "It indicates re-saving, not manipulation."
                    ),
                    detail={"blocking_strength": strength},
                )
            )

        slope = frequency.get("spectral_slope")
        peak_ratio = frequency.get("peak_ratio")

        if slope is not None and not (-3.2 <= slope <= -1.4):
            result.signals.append(
                Signal(
                    code="atypical_spectrum",
                    category="frequency",
                    direction=0.4,
                    strength=0.35,
                    finding=(
                        f"The frequency falloff (slope {slope:.2f}) departs from the "
                        f"roughly 1/f profile natural photographs follow."
                    ),
                    finding_bn=(
                        f"ফ্রিকোয়েন্সির অবক্ষয় (স্লোপ {slope:.2f}) প্রাকৃতিক আলোকচিত্রের "
                        f"প্রায় 1/f ধরনের প্রোফাইল থেকে আলাদা।"
                    ),
                    caveat=(
                        "Graphics, screenshots, text-heavy images and illustrations "
                        "also depart from this profile without being AI-generated."
                    ),
                    detail={"spectral_slope": slope},
                )
            )

        if peak_ratio is not None and peak_ratio > 2.6:
            result.signals.append(
                Signal(
                    code="periodic_frequency_peaks",
                    category="frequency",
                    direction=0.5,
                    strength=0.4,
                    finding=(
                        "Periodic peaks appear in the frequency spectrum, a pattern "
                        "left by the upsampling layers many image generators use."
                    ),
                    finding_bn=(
                        "ফ্রিকোয়েন্সি স্পেকট্রামে পর্যায়বৃত্ত শিখর দেখা যাচ্ছে — বহু ইমেজ "
                        "জেনারেটরের আপস্যাম্পলিং স্তর এই ধরন রেখে যায়।"
                    ),
                    caveat=(
                        "Halftone printing, screen moiré and some resizing filters "
                        "produce similar peaks."
                    ),
                    detail={"peak_ratio": peak_ratio},
                )
            )

        # Screenshot / graphic content: discount the photo-only statistics and
        # say so, rather than letting flat backgrounds and evenly spaced text
        # lines read as signs of generation.
        flat_fraction = noise.get("flat_fraction") or 0.0
        if flat_fraction >= self.GRAPHIC_FLAT_FRACTION:
            for signal in result.signals:
                if signal.category in ("noise", "frequency"):
                    signal.strength = round(signal.strength * self.GRAPHIC_SIGNAL_DISCOUNT, 4)
                    signal.caveat = (
                        (signal.caveat or "")
                        + " Discounted: this image looks like a screenshot or graphic, "
                        "where this photographic statistic is unreliable."
                    ).strip()
            result.signals.append(
                Signal(
                    code="screenshot_or_graphic",
                    category="content",
                    direction=0.0,
                    strength=0.2,
                    finding=(
                        f"{flat_fraction:.0%} of this image is perfectly flat colour, "
                        "so it looks like a screenshot, a graphic or a UI capture "
                        "rather than a photograph. Noise and frequency checks are "
                        "designed for photographs and were given little weight."
                    ),
                    finding_bn=(
                        f"এই ছবির {flat_fraction:.0%} অংশ সম্পূর্ণ একরঙা, তাই এটি "
                        "আলোকচিত্রের বদলে স্ক্রিনশট, গ্রাফিক বা ইউআই ক্যাপচার বলে মনে "
                        "হচ্ছে। নয়েজ ও ফ্রিকোয়েন্সি যাচাই আলোকচিত্রের জন্য তৈরি, তাই "
                        "সেগুলোকে কম গুরুত্ব দেওয়া হয়েছে।"
                    ),
                    caveat=(
                        "If the screenshot shows a photo, analyze the original photo "
                        "instead — a screenshot of an image destroys most of the "
                        "evidence about how that image was made."
                    ),
                    detail={"flat_fraction": flat_fraction},
                )
            )

        if not [s for s in result.signals if s.code != "screenshot_or_graphic"]:
            result.signals.append(
                Signal(
                    code="no_technical_anomaly",
                    category="technical",
                    direction=-0.3,
                    strength=0.35,
                    finding=(
                        "The noise, compression and frequency profiles are all within "
                        "the range expected of an ordinary photograph."
                    ),
                    finding_bn=(
                        "নয়েজ, কম্প্রেশন ও ফ্রিকোয়েন্সির ধরন সবই একটি সাধারণ আলোকচিত্রের "
                        "প্রত্যাশিত সীমার মধ্যে রয়েছে।"
                    ),
                    caveat=(
                        "Current generators can produce images that pass all three "
                        "checks. This is not evidence of authenticity."
                    ),
                )
            )


def run_forensics(image, raw_bytes: bytes) -> Tuple[MetadataResult, TechnicalResult, float]:
    """Run both analyses and report how long they took."""
    started = time.perf_counter()
    metadata = MetadataExtractor().extract(image, raw_bytes)
    technical = TechnicalAnalyzer().analyze(image)
    return metadata, technical, (time.perf_counter() - started) * 1000.0
