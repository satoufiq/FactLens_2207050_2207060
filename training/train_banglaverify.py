#!/usr/bin/env python
"""
Fine-tune BanglaVerify -- the Bangla fake/real news classifier.

Proposal, Module 1:
    Task                Binary classification -- Fake (0) / Real (1)
    Base architecture   csebuetnlp/banglabert, fine-tuned
    Input               Headline + leading content, max sequence length 256
    Loss                Class-weighted cross-entropy
    Selection metric    Macro F1 on the validation split

Headline head
-------------
Production mostly sees one or two OCR'd sentences, while BanFakeNews is full
articles. Train a second model on headline-only inputs (or BD-FakeDetect social
posts) by running this script again with --variant headline on a dataset
prepared with the bd_fakedetect preset. Register it with
`register_model.py --headline-artifact`; inputs under 40 words are then routed
to it automatically.

Kaggle
------
    !pip install -q -r training/requirements.txt
    !python training/train_banglaverify.py \
        --data data/processed/banglaverify --output artifacts/banglaverify
"""

from __future__ import annotations

import argparse
import logging
import sys

from common.text_trainer import TextTrainingConfig, train_text_classifier

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", required=True, help="Directory from prepare_data.py")
    parser.add_argument("--output", required=True)
    parser.add_argument("--variant", choices=["article", "headline"], default="article")
    parser.add_argument("--base-model", default="csebuetnlp/banglabert")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    config = TextTrainingConfig(
        model_name="BanglaVerify" if args.variant == "article" else "BanglaVerify-headline",
        base_model=args.base_model,
        # Order matters: it must match the registry entry ["FAKE", "REAL"].
        labels=["FAKE", "REAL"],
        # Headlines are short; a smaller window trains faster and wastes no padding.
        max_length=256 if args.variant == "article" else 64,
        data_dir=args.data,
        output_dir=args.output,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        seed=args.seed,
        selection_metric="macro_f1",
    )
    train_text_classifier(config)
    return 0


if __name__ == "__main__":
    sys.exit(main())
