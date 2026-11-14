"""
Shared fine-tuning loop for the two text classifiers.

BanglaVerify and ScamNet-BN differ in base model, labels, sequence length and
selection metric, but not in mechanics: both are sequence classifiers trained
with class-weighted cross-entropy and selected on the validation split. One
loop keeps them from drifting apart.

The saved directory is exactly what `export_onnx.py --kind text` expects: a
Hugging Face model plus its tokenizer, plus `training_config.json` so the
export uses the same max_length the model was trained with.
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger("factlens.training.text")


@dataclass
class TextTrainingConfig:
    model_name: str
    base_model: str
    labels: List[str]
    max_length: int
    data_dir: str
    output_dir: str
    epochs: int = 3
    batch_size: int = 16
    learning_rate: float = 2e-5
    weight_decay: float = 0.01
    warmup_ratio: float = 0.1
    seed: int = 42
    #: "macro_f1" for BanglaVerify; ScamNet-BN still selects on macro F1 and
    #: reports Scam recall separately, per the proposal.
    selection_metric: str = "macro_f1"
    fp16: bool = True
    extra: Dict[str, str] = field(default_factory=dict)


def train_text_classifier(config: TextTrainingConfig) -> Dict[str, float]:
    import numpy as np
    import pandas as pd
    import torch
    from torch import nn
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        DataCollatorWithPadding,
        Trainer,
        TrainingArguments,
        set_seed,
    )

    from .metrics import macro_f1, per_class_metrics
    from .splitting import class_weights

    set_seed(config.seed)
    data_dir = Path(config.data_dir)
    output_dir = Path(config.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    train_frame = pd.read_csv(data_dir / "train.csv")
    val_frame = pd.read_csv(data_dir / "val.csv")

    num_labels = len(config.labels)
    weights = class_weights(train_frame["label"].tolist())
    weight_tensor = torch.tensor(
        [weights.get(i, 1.0) for i in range(num_labels)], dtype=torch.float
    )

    tokenizer = AutoTokenizer.from_pretrained(config.base_model)
    model = AutoModelForSequenceClassification.from_pretrained(
        config.base_model,
        num_labels=num_labels,
        # Written into config.json, so the exported artifact carries its own
        # label names -- the absence of these is how an untrained head hides.
        id2label={i: name for i, name in enumerate(config.labels)},
        label2id={name: i for i, name in enumerate(config.labels)},
    )

    class TextDataset(torch.utils.data.Dataset):
        def __init__(self, frame):
            self.encodings = tokenizer(
                frame["text"].astype(str).tolist(),
                truncation=True,
                max_length=config.max_length,
            )
            self.labels = frame["label"].astype(int).tolist()

        def __len__(self):
            return len(self.labels)

        def __getitem__(self, index):
            item = {k: torch.tensor(v[index]) for k, v in self.encodings.items()}
            item["labels"] = torch.tensor(self.labels[index])
            return item

    class WeightedTrainer(Trainer):
        """Class-weighted cross-entropy: required, because the corpus is imbalanced."""

        def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
            labels = inputs.pop("labels")
            outputs = model(**inputs)
            loss_fn = nn.CrossEntropyLoss(weight=weight_tensor.to(outputs.logits.device))
            loss = loss_fn(outputs.logits, labels)
            return (loss, outputs) if return_outputs else loss

    def compute_metrics(prediction):
        logits, gold = prediction
        predicted = np.argmax(logits, axis=-1).tolist()
        gold = gold.tolist()
        metrics = {"macro_f1": macro_f1(gold, predicted, num_labels)}
        for index, stats in per_class_metrics(gold, predicted, num_labels).items():
            metrics[f"recall_{config.labels[index].lower()}"] = stats["recall"]
        return metrics

    arguments = TrainingArguments(
        output_dir=str(output_dir / "checkpoints"),
        num_train_epochs=config.epochs,
        per_device_train_batch_size=config.batch_size,
        per_device_eval_batch_size=config.batch_size * 2,
        learning_rate=config.learning_rate,
        weight_decay=config.weight_decay,
        warmup_ratio=config.warmup_ratio,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model=config.selection_metric,
        greater_is_better=True,
        save_total_limit=2,
        fp16=config.fp16 and torch.cuda.is_available(),
        report_to="none",
        seed=config.seed,
        logging_steps=50,
    )

    trainer = WeightedTrainer(
        model=model,
        args=arguments,
        train_dataset=TextDataset(train_frame),
        eval_dataset=TextDataset(val_frame),
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
    )

    trainer.train()
    final = trainer.evaluate()

    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))
    (output_dir / "training_config.json").write_text(
        json.dumps({**asdict(config), "class_weights": weights, "final_val": final}, indent=2)
    )
    logger.info("Saved %s to %s (val %s)", config.model_name, output_dir, final)
    return final
