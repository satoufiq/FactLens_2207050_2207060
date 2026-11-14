#!/usr/bin/env python
"""
Fine-tune ScamNet-BN -- the multilingual scam and phishing classifier.

Proposal, Module 2:
    Task                Three-class -- Legitimate / Suspicious / Scam
    Base architecture   microsoft/mdeberta-v3-base, fine-tuned
    Input               Message text, max sequence length 192
    Loss                Class-weighted cross-entropy
    Selection metric    Macro F1, with recall on the Scam class reported separately

Labels
------
If your corpus is binary (phishing / legitimate), the "Suspicious" class has no
ground truth. Either label a Suspicious set by hand from the team-collected
messages, or train binary with --binary and let the decision threshold create
the middle band at serving time. Do not invent Suspicious labels heuristically:
the model would learn the heuristic, not the task.

After training, pick the operating point on the validation set with
evaluate.py --recall-threshold and pass it to register_model.py
--decision-threshold. The provider applies it at inference time.
"""

from __future__ import annotations

import argparse
import logging
import sys

from common.text_trainer import TextTrainingConfig, train_text_classifier

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--base-model", default="microsoft/mdeberta-v3-base")
    parser.add_argument("--binary", action="store_true", help="Train Legitimate/Scam only")
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    labels = ["LEGITIMATE", "SCAM"] if args.binary else ["LEGITIMATE", "SUSPICIOUS", "SCAM"]

    config = TextTrainingConfig(
        model_name="ScamNet-BN",
        base_model=args.base_model,
        labels=labels,
        max_length=192,
        data_dir=args.data,
        output_dir=args.output,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        seed=args.seed,
        selection_metric="macro_f1",
        # mDeBERTa-v3 is unstable under fp16 on some drivers.
        fp16=False,
    )
    train_text_classifier(config)
    return 0


if __name__ == "__main__":
    sys.exit(main())
