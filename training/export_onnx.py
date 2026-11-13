#!/usr/bin/env python
"""
Export a fine-tuned model to ONNX.

Proposal, "Serving and fallback": ONNX export, CPU inference, loaded once per
worker process. The export is what keeps PyTorch and the training stack out of
the deployment image — the server loads exported artifacts only, which is what
allows the deployment target to be a modest VPS.

The export is verified before it is written as final: the ONNX output is
compared against the PyTorch output on real samples. An export that silently
changes the model's predictions is worse than no export, because every number
in the evaluation report would then describe a model that is not the one being
served.

Usage
-----
    python export_onnx.py --model artifacts/banglaverify --output ../models/banglaverify
    python export_onnx.py --model artifacts/imageauth   --output ../models/imageauth --kind image
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path
from typing import List

OPSET = 17
TOLERANCE = 1e-3


def export_text_model(model_dir: Path, output_dir: Path, max_length: int) -> Path:
    import numpy as np
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    print(f"Loading {model_dir} ...")
    tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
    model = AutoModelForSequenceClassification.from_pretrained(str(model_dir))
    model.eval()

    output_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = output_dir / "model.onnx"

    sample = tokenizer(
        "FactLens ONNX export verification sample.",
        return_tensors="pt",
        padding="max_length",
        truncation=True,
        max_length=max_length,
    )
    input_names = list(sample.keys())
    args = tuple(sample[name] for name in input_names)

    # Dynamic batch and sequence axes: the worker batches one scan at a time
    # today, but a fixed shape would make that impossible to change later.
    dynamic_axes = {name: {0: "batch", 1: "sequence"} for name in input_names}
    dynamic_axes["logits"] = {0: "batch"}

    print(f"Exporting to {onnx_path} (opset {OPSET}) ...")
    torch.onnx.export(
        model,
        args,
        str(onnx_path),
        input_names=input_names,
        output_names=["logits"],
        dynamic_axes=dynamic_axes,
        opset_version=OPSET,
        do_constant_folding=True,
    )

    # The tokenizer travels with the artifact. A model served with a different
    # tokenizer than it was trained with produces confident nonsense.
    tokenizer.save_pretrained(str(output_dir))
    write_export_manifest(model, output_dir, max_length)

    verify_text_export(model, tokenizer, onnx_path, max_length)
    return onnx_path


def write_export_manifest(model, output_dir: Path, max_length: int | None) -> None:
    """
    Record the label order and sequence length beside the artifact.

    register_model.py copies these into the registry, so the label list the
    provider uses at serving time is read from the model itself rather than
    typed by hand -- a swapped label order would invert every verdict silently.
    """
    import json

    id2label = getattr(model.config, "id2label", None) or {}
    labels = [id2label[k] for k in sorted(id2label, key=lambda k: int(k))]
    if not labels or all(str(l).startswith("LABEL_") for l in labels):
        raise SystemExit(
            "The model's config has no real label names (id2label is missing or "
            "generic LABEL_n). That is the signature of an untrained head. Train "
            "with train_banglaverify.py / train_scamnet.py, which set id2label."
        )
    (output_dir / "export_manifest.json").write_text(
        json.dumps({"labels": labels, "max_sequence_length": max_length}, indent=2)
    )
    print(f"Labels recorded: {labels}")


def resolve_max_length(model_dir: Path, fallback: int) -> int:
    """Use the training max_length when training_config.json records it."""
    import json

    config_path = model_dir / "training_config.json"
    if config_path.exists():
        value = json.loads(config_path.read_text()).get("max_length")
        if value:
            return int(value)
    return fallback


def verify_text_export(model, tokenizer, onnx_path: Path, max_length: int) -> None:
    import numpy as np
    import onnxruntime as ort
    import torch

    samples: List[str] = [
        "আগামীকাল দেশের সব শিক্ষা প্রতিষ্ঠান বন্ধ থাকবে।",
        "The Ministry of Education confirmed the examination schedule today.",
        "অভিনন্দন! আপনি ৫০,০০০ টাকা জিতেছেন। দ্রুত যোগাযোগ করুন।",
    ]

    session = ort.InferenceSession(
        str(onnx_path), providers=["CPUExecutionProvider"]
    )
    accepted = {i.name for i in session.get_inputs()}
    worst = 0.0

    for text in samples:
        encoded = tokenizer(
            text,
            return_tensors="pt",
            padding="max_length",
            truncation=True,
            max_length=max_length,
        )
        with torch.no_grad():
            torch_logits = model(**encoded).logits.numpy()

        feeds = {
            name: tensor.numpy().astype(np.int64)
            for name, tensor in encoded.items()
            if name in accepted
        }
        onnx_logits = session.run(None, feeds)[0]

        delta = float(np.max(np.abs(torch_logits - onnx_logits)))
        worst = max(worst, delta)
        print(f"  verify: max |torch - onnx| = {delta:.2e}  ({text[:40]}...)")

    if worst > TOLERANCE:
        raise SystemExit(
            f"\nExport verification FAILED: outputs differ by {worst:.2e}, over the "
            f"{TOLERANCE:.0e} tolerance.\n\n"
            f"The ONNX model does not reproduce the PyTorch model, so every number "
            f"in the evaluation report would describe a different model from the "
            f"one being served. Do not register this artifact."
        )

    print(f"Export verified: outputs match within {worst:.2e}\n")


def export_image_model(model_dir: Path, output_dir: Path) -> Path:
    import numpy as np
    import torch

    print(f"Loading {model_dir} ...")
    try:
        from transformers import AutoModelForImageClassification

        model = AutoModelForImageClassification.from_pretrained(str(model_dir))
    except Exception:
        model = torch.load(model_dir / "model.pt", map_location="cpu")
    model.eval()

    output_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = output_dir / "model.onnx"

    dummy = torch.randn(1, 3, 224, 224)
    print(f"Exporting to {onnx_path} (opset {OPSET}) ...")
    torch.onnx.export(
        model,
        dummy,
        str(onnx_path),
        input_names=["pixel_values"],
        output_names=["logits"],
        dynamic_axes={"pixel_values": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=OPSET,
        do_constant_folding=True,
    )

    import onnxruntime as ort

    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    with torch.no_grad():
        torch_out = model(dummy)
        torch_logits = (
            torch_out.logits.numpy() if hasattr(torch_out, "logits") else torch_out.numpy()
        )
    onnx_logits = session.run(None, {"pixel_values": dummy.numpy()})[0]

    delta = float(np.max(np.abs(torch_logits - onnx_logits)))
    print(f"  verify: max |torch - onnx| = {delta:.2e}")
    if delta > TOLERANCE:
        raise SystemExit(
            f"Export verification FAILED: outputs differ by {delta:.2e}. "
            f"Do not register this artifact."
        )
    print("Export verified.\n")
    if hasattr(model, "config"):
        write_export_manifest(model, output_dir, None)
    return onnx_path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", required=True, help="Fine-tuned model directory")
    parser.add_argument("--output", required=True, help="Destination under models/")
    parser.add_argument("--kind", choices=["text", "image"], default="text")
    parser.add_argument(
        "--max-length",
        type=int,
        default=256,
        help="Sequence length used at export; must match the registry entry.",
    )
    args = parser.parse_args()

    model_dir = Path(args.model).resolve()
    output_dir = Path(args.output).resolve()

    if not model_dir.exists():
        raise SystemExit(f"Model directory not found: {model_dir}")

    if args.kind == "text":
        max_length = resolve_max_length(model_dir, args.max_length)
        onnx_path = export_text_model(model_dir, output_dir, max_length)
    else:
        onnx_path = export_image_model(model_dir, output_dir)

    size_mb = onnx_path.stat().st_size / 1_048_576
    print(f"Wrote {onnx_path} ({size_mb:.1f} MB)")
    print(
        "\nNext: python register_model.py --name <Model> --version <x.y.z> "
        f"--artifact {output_dir.name}/model.onnx --evaluation <evaluation.json>"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
