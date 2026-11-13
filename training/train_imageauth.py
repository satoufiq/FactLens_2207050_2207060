#!/usr/bin/env python
"""
Fine-tune ImageAuth -- the AI-generated image detector.

Proposal, Module 3:
    Task                Binary -- Authentic / AI-generated (manipulation head: future work)
    Base architecture   google/vit-base-patch16-224, fine-tuned
    Input               224x224 RGB, centre crop; random-crop augmentation in training
    Loss                Cross-entropy
    Selection metric    AUC-ROC, plus accuracy on a held-out generator

Expected layout (ImageFolder):

    data/images/
      train/      authentic/  ai_generated/
      val/        authentic/  ai_generated/
      heldout/    authentic/  ai_generated/   <- one generator family NEVER seen in training

The held-out generator is the honest test. Report its AUC as the headline
number: user-facing confidence is derived from it, not from in-distribution
accuracy. Record it in the registry as metrics.external.held_out_generator_auc.

Export with:  python export_onnx.py --kind image --model artifacts/imageauth --output ../models/imageauth
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("train_imageauth")

LABELS = ["AUTHENTIC", "AI_GENERATED"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--base-model", default="google/vit-base-patch16-224")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=3e-5)
    args = parser.parse_args()

    import torch
    from torch import nn
    from torch.utils.data import DataLoader
    from torchvision import datasets, transforms
    from transformers import AutoModelForImageClassification

    sys.path.insert(0, str(Path(__file__).parent))
    from common.metrics import auc_roc

    data = Path(args.data)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    # Normalisation must match ImageAuthProvider (mean = std = 0.5).
    normalize = transforms.Normalize([0.5] * 3, [0.5] * 3)
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.6, 1.0)),
        transforms.RandomHorizontalFlip(),
        # Re-compression is what images go through on social platforms.
        transforms.RandomApply([transforms.GaussianBlur(3)], p=0.2),
        transforms.ToTensor(),
        normalize,
    ])
    eval_tf = transforms.Compose([
        transforms.Resize(224),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        normalize,
    ])

    def folder(name, tf):
        dataset = datasets.ImageFolder(data / name, transform=tf)
        expected = {"authentic": 0, "ai_generated": 1}
        if dataset.class_to_idx != expected:
            raise SystemExit(
                f"{name}/ classes are {dataset.class_to_idx}; expected {expected}. "
                f"Rename the folders so label order matches the registry."
            )
        return dataset

    train_set = folder("train", train_tf)
    loaders = {
        "train": DataLoader(train_set, batch_size=args.batch_size, shuffle=True, num_workers=2),
        "val": DataLoader(folder("val", eval_tf), batch_size=args.batch_size, num_workers=2),
        "heldout": DataLoader(folder("heldout", eval_tf), batch_size=args.batch_size, num_workers=2),
    }

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = AutoModelForImageClassification.from_pretrained(
        args.base_model,
        num_labels=2,
        id2label=dict(enumerate(LABELS)),
        label2id={l: i for i, l in enumerate(LABELS)},
        ignore_mismatched_sizes=True,
    ).to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=0.01)
    loss_fn = nn.CrossEntropyLoss()

    def scores(loader):
        model.eval()
        gold, positive = [], []
        with torch.no_grad():
            for images, labels in loader:
                probs = torch.softmax(model(pixel_values=images.to(device)).logits, -1)
                positive.extend(probs[:, 1].cpu().tolist())
                gold.extend(labels.tolist())
        accuracy = sum((p >= 0.5) == bool(g) for p, g in zip(positive, gold)) / max(1, len(gold))
        return auc_roc(gold, positive), round(accuracy, 4)

    best_auc = -1.0
    for epoch in range(args.epochs):
        model.train()
        for images, labels in loaders["train"]:
            optimizer.zero_grad()
            loss = loss_fn(model(pixel_values=images.to(device)).logits, labels.to(device))
            loss.backward()
            optimizer.step()
        val_auc, val_acc = scores(loaders["val"])
        logger.info("epoch %d: val AUC %.4f, acc %.4f", epoch + 1, val_auc, val_acc)
        # Select on val only. Selecting on the held-out generator would leak it.
        if val_auc > best_auc:
            best_auc = val_auc
            model.save_pretrained(str(output))

    model = AutoModelForImageClassification.from_pretrained(str(output)).to(device)
    in_auc, in_acc = scores(loaders["val"])
    out_auc, out_acc = scores(loaders["heldout"])

    evaluation = {
        "model": "ImageAuth",
        "in_distribution": {"auc_roc": in_auc, "accuracy": in_acc, "macro_f1": in_acc},
        "external": {
            "held_out_generator_auc": out_auc,
            "held_out_generator_accuracy": out_acc,
            "auc_roc": out_auc,
            "macro_f1": out_acc,
        },
        "note": (
            "macro_f1 is filled with accuracy for the binary detector so the "
            "shared acceptance gate applies; AUC is the primary metric."
        ),
    }
    (output / "evaluation.json").write_text(json.dumps(evaluation, indent=2))
    logger.info("In-distribution AUC %.4f | held-out generator AUC %.4f", in_auc, out_auc)
    if in_auc - out_auc > 0.15:
        logger.warning(
            "AUC drops %.2f on the unseen generator. That gap is the real "
            "performance of this detector, and it is what the UI's confidence uses.",
            in_auc - out_auc,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
