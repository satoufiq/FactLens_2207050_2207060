#!/usr/bin/env python
"""
Evaluate a fine-tuned text classifier on the in-distribution test split and the
external set.

Proposal, "Evaluation protocol": each model reports, on both sets, accuracy,
Macro F1, per-class precision and recall, the confusion matrix, a calibration
curve, and the chosen decision threshold with the reasoning behind it.

The output `evaluation.json` is what register_model.py reads to apply the
acceptance gate, so its shape is fixed:

    {
      "model": "...",
      "in_distribution": { "macro_f1": ..., ... },
      "external":        { "macro_f1": ..., ... },
      "operating_point": { ... }            # only with --recall-threshold
    }

Usage
-----
    python evaluate.py --model artifacts/banglaverify \
        --test data/processed/banglaverify/test.csv \
        --external data/processed/banglaverify/external.csv \
        --output artifacts/banglaverify/evaluation.json

    # ScamNet-BN: also choose the recall-favouring Scam threshold on val
    python evaluate.py --model artifacts/scamnet \
        --test data/processed/scamnet/test.csv \
        --external data/processed/scamnet/external.csv \
        --recall-threshold --positive-label SCAM --threshold-split data/processed/scamnet/val.csv \
        --output artifacts/scamnet/evaluation.json
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import List, Tuple

from common.metrics import build_report, recall_favouring_threshold

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("evaluate")


def predict(model_dir: Path, texts: List[str], max_length: int, batch_size: int = 32):
    """Return (probabilities per row, label names)."""
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
    model = AutoModelForSequenceClassification.from_pretrained(str(model_dir))
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device).eval()

    id2label = model.config.id2label
    labels = [id2label[k] for k in sorted(id2label, key=lambda k: int(k))]

    probabilities: List[List[float]] = []
    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        encoded = tokenizer(
            batch, truncation=True, max_length=max_length, padding=True, return_tensors="pt"
        ).to(device)
        with torch.no_grad():
            logits = model(**encoded).logits
        probabilities.extend(torch.softmax(logits, dim=-1).cpu().tolist())
    return probabilities, labels


def evaluate_split(
    name: str, model_dir: Path, csv_path: Path, max_length: int
) -> Tuple[dict, List[int], List[List[float]], List[str]]:
    import pandas as pd

    frame = pd.read_csv(csv_path)
    texts = frame["text"].astype(str).tolist()
    gold = frame["label"].astype(int).tolist()

    probabilities, labels = predict(model_dir, texts, max_length)
    predicted = [max(range(len(p)), key=p.__getitem__) for p in probabilities]
    confidences = [max(p) for p in probabilities]
    positive = [p[-1] for p in probabilities] if len(labels) == 2 else None

    report = build_report(
        split_name=name,
        y_true=gold,
        y_pred=predicted,
        confidences=confidences,
        labels=labels,
        positive_scores=positive,
    )
    logger.info(
        "%s: accuracy %.4f, macro F1 %.4f, ECE %.4f (n=%d)",
        name,
        report.accuracy,
        report.macro_f1,
        report.expected_calibration_error,
        report.num_samples,
    )
    return report.as_dict(), gold, probabilities, labels


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", required=True)
    parser.add_argument("--test", required=True, help="In-distribution test split")
    parser.add_argument("--external", required=True, help="External validation set")
    parser.add_argument("--output", required=True)
    parser.add_argument("--max-length", type=int, default=None)
    parser.add_argument("--recall-threshold", action="store_true")
    parser.add_argument("--positive-label", default="SCAM")
    parser.add_argument("--threshold-split", default=None, help="Split to tune the threshold on (use val, never test)")
    parser.add_argument("--min-precision", type=float, default=0.5)
    args = parser.parse_args()

    model_dir = Path(args.model)
    max_length = args.max_length
    config_path = model_dir / "training_config.json"
    if max_length is None and config_path.exists():
        max_length = json.loads(config_path.read_text()).get("max_length")
    max_length = max_length or 256

    in_dist, _, _, labels = evaluate_split("in_distribution", model_dir, Path(args.test), max_length)
    external, _, _, _ = evaluate_split("external", model_dir, Path(args.external), max_length)

    result = {
        "model": model_dir.name,
        "labels": labels,
        "max_length": max_length,
        "in_distribution": in_dist,
        "external": external,
        "external_gap_macro_f1": round(in_dist["macro_f1"] - external["macro_f1"], 4),
    }

    if args.recall_threshold:
        if args.positive_label not in labels:
            raise SystemExit(f"--positive-label {args.positive_label} not in {labels}")
        if not args.threshold_split:
            raise SystemExit(
                "--threshold-split is required: tune the threshold on the "
                "validation split, never on the test set you report."
            )
        positive_index = labels.index(args.positive_label)
        _, gold, probabilities, _ = evaluate_split(
            "threshold_tuning", model_dir, Path(args.threshold_split), max_length
        )
        threshold, stats = recall_favouring_threshold(
            [1 if g == positive_index else 0 for g in gold],
            [p[positive_index] for p in probabilities],
            positive_class=1,
            min_precision=args.min_precision,
        )
        result["operating_point"] = {
            "positive_label": args.positive_label,
            "threshold": threshold,
            **stats,
            "rationale": (
                f"Maximises {args.positive_label} recall subject to precision >= "
                f"{args.min_precision}. A missed scam costs the user money; a false "
                f"alarm costs a moment of caution — but a detector that flags "
                f"everything is soon ignored, so precision keeps a floor."
            ),
        }
        logger.info("Operating point: %s", result["operating_point"])

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps(result, indent=2, ensure_ascii=False))
    logger.info(
        "Wrote %s. External gap: %.4f Macro F1.", args.output, result["external_gap_macro_f1"]
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
