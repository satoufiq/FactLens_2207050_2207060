"""
Evaluation metrics.

Proposal, "Evaluation protocol" -- each model reports, on both the
in-distribution test split and the external set:

  * Accuracy, Macro F1, and per-class precision and recall
  * Confusion matrix
  * A calibration curve, since the confidence number shown to users must mean
    something
  * The chosen decision threshold and the reasoning behind it

The calibration curve is the one people skip, and it is the one the UI depends
on. FactLens shows the user a confidence figure; if the model says 0.9 on
batches that are right 60% of the time, that number is a lie with a decimal
point.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple


def confusion_matrix(
    y_true: Sequence[int], y_pred: Sequence[int], num_classes: int
) -> List[List[int]]:
    matrix = [[0] * num_classes for _ in range(num_classes)]
    for actual, predicted in zip(y_true, y_pred):
        matrix[int(actual)][int(predicted)] += 1
    return matrix


def per_class_metrics(
    y_true: Sequence[int], y_pred: Sequence[int], num_classes: int
) -> Dict[int, Dict[str, float]]:
    matrix = confusion_matrix(y_true, y_pred, num_classes)
    out: Dict[int, Dict[str, float]] = {}
    for cls in range(num_classes):
        tp = matrix[cls][cls]
        fp = sum(matrix[r][cls] for r in range(num_classes)) - tp
        fn = sum(matrix[cls]) - tp
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = (
            2 * precision * recall / (precision + recall)
            if (precision + recall)
            else 0.0
        )
        out[cls] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "support": sum(matrix[cls]),
        }
    return out


def macro_f1(y_true: Sequence[int], y_pred: Sequence[int], num_classes: int) -> float:
    per_class = per_class_metrics(y_true, y_pred, num_classes)
    return round(sum(m["f1"] for m in per_class.values()) / num_classes, 4)


def accuracy(y_true: Sequence[int], y_pred: Sequence[int]) -> float:
    if not y_true:
        return 0.0
    correct = sum(1 for a, b in zip(y_true, y_pred) if int(a) == int(b))
    return round(correct / len(y_true), 4)


def auc_roc(y_true: Sequence[int], scores: Sequence[float]) -> float:
    """
    AUC-ROC via the rank formulation (Mann-Whitney U), with tie handling.

    Primary metric for ImageAuth, where the useful question is how well the
    detector ranks generated images above authentic ones, not how it performs
    at one arbitrary threshold.
    """
    pairs = sorted(zip(scores, y_true), key=lambda p: p[0])
    n = len(pairs)
    if n == 0:
        return 0.0

    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j + 1 < n and pairs[j + 1][0] == pairs[i][0]:
            j += 1
        average_rank = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[k] = average_rank
        i = j + 1

    positives = sum(1 for _, label in pairs if int(label) == 1)
    negatives = n - positives
    if positives == 0 or negatives == 0:
        return 0.0

    rank_sum = sum(rank for rank, (_, label) in zip(ranks, pairs) if int(label) == 1)
    return round(
        (rank_sum - positives * (positives + 1) / 2.0) / (positives * negatives), 4
    )


@dataclass
class CalibrationBin:
    lower: float
    upper: float
    count: int
    mean_confidence: float
    observed_accuracy: float

    def as_dict(self) -> Dict[str, float]:
        return {
            "range": f"{self.lower:.1f}-{self.upper:.1f}",
            "count": self.count,
            "mean_confidence": round(self.mean_confidence, 4),
            "observed_accuracy": round(self.observed_accuracy, 4),
            "gap": round(self.mean_confidence - self.observed_accuracy, 4),
        }


def calibration_curve(
    confidences: Sequence[float], correct: Sequence[bool], bins: int = 10
) -> Tuple[List[CalibrationBin], float]:
    """
    Reliability bins plus Expected Calibration Error.

    ECE is the average gap between stated confidence and observed accuracy,
    weighted by bin population. Report it: it is the number that justifies
    showing a confidence figure to a non-technical user at all.
    """
    buckets: List[List[Tuple[float, bool]]] = [[] for _ in range(bins)]
    for confidence, is_correct in zip(confidences, correct):
        index = min(bins - 1, max(0, int(confidence * bins)))
        buckets[index].append((confidence, is_correct))

    curve: List[CalibrationBin] = []
    total = len(confidences) or 1
    ece = 0.0

    for index, bucket in enumerate(buckets):
        lower = index / bins
        upper = (index + 1) / bins
        if not bucket:
            curve.append(CalibrationBin(lower, upper, 0, 0.0, 0.0))
            continue
        mean_conf = sum(c for c, _ in bucket) / len(bucket)
        observed = sum(1 for _, ok in bucket if ok) / len(bucket)
        curve.append(CalibrationBin(lower, upper, len(bucket), mean_conf, observed))
        ece += (len(bucket) / total) * abs(mean_conf - observed)

    return curve, round(ece, 4)


@dataclass
class EvaluationReport:
    """Everything the proposal requires, in one serialisable object."""

    split_name: str
    num_samples: int
    labels: List[str]
    accuracy: float = 0.0
    macro_f1: float = 0.0
    per_class: Dict[str, Dict[str, float]] = field(default_factory=dict)
    confusion: List[List[int]] = field(default_factory=list)
    calibration: List[Dict[str, float]] = field(default_factory=list)
    expected_calibration_error: float = 0.0
    auc_roc: Optional[float] = None
    decision_threshold: Optional[float] = None
    threshold_rationale: Optional[str] = None

    def as_dict(self) -> Dict:
        return {
            "split": self.split_name,
            "num_samples": self.num_samples,
            "labels": self.labels,
            "accuracy": self.accuracy,
            "macro_f1": self.macro_f1,
            "per_class": self.per_class,
            "confusion_matrix": self.confusion,
            "calibration_curve": self.calibration,
            "expected_calibration_error": self.expected_calibration_error,
            "auc_roc": self.auc_roc,
            "decision_threshold": self.decision_threshold,
            "threshold_rationale": self.threshold_rationale,
        }


def build_report(
    split_name: str,
    y_true: Sequence[int],
    y_pred: Sequence[int],
    confidences: Sequence[float],
    labels: Sequence[str],
    positive_scores: Optional[Sequence[float]] = None,
    decision_threshold: Optional[float] = None,
    threshold_rationale: Optional[str] = None,
) -> EvaluationReport:
    num_classes = len(labels)
    per_class = per_class_metrics(y_true, y_pred, num_classes)
    correct = [int(a) == int(b) for a, b in zip(y_true, y_pred)]
    curve, ece = calibration_curve(confidences, correct)

    return EvaluationReport(
        split_name=split_name,
        num_samples=len(y_true),
        labels=list(labels),
        accuracy=accuracy(y_true, y_pred),
        macro_f1=macro_f1(y_true, y_pred, num_classes),
        per_class={labels[cls]: metrics for cls, metrics in per_class.items()},
        confusion=confusion_matrix(y_true, y_pred, num_classes),
        calibration=[b.as_dict() for b in curve],
        expected_calibration_error=ece,
        auc_roc=auc_roc(y_true, positive_scores) if positive_scores else None,
        decision_threshold=decision_threshold,
        threshold_rationale=threshold_rationale,
    )


def recall_favouring_threshold(
    y_true: Sequence[int],
    positive_scores: Sequence[float],
    positive_class: int = 1,
    min_precision: float = 0.5,
) -> Tuple[float, Dict[str, float]]:
    """
    Pick the threshold that maximises recall on the positive class while
    keeping precision at or above `min_precision`.

    This is how ScamNet-BN's operating point is chosen: a missed scam costs the
    user money, a false alarm costs them a moment of caution — but a detector
    that flags everything is ignored within a week, so precision still has a
    floor.
    """
    best_threshold = 0.5
    best: Dict[str, float] = {"recall": -1.0, "precision": 0.0, "f1": 0.0}

    for step in range(1, 100):
        threshold = step / 100.0
        predictions = [1 if s >= threshold else 0 for s in positive_scores]
        truths = [1 if int(t) == positive_class else 0 for t in y_true]

        tp = sum(1 for p, t in zip(predictions, truths) if p == 1 and t == 1)
        fp = sum(1 for p, t in zip(predictions, truths) if p == 1 and t == 0)
        fn = sum(1 for p, t in zip(predictions, truths) if p == 0 and t == 1)

        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        if precision < min_precision:
            continue
        if recall > best["recall"]:
            f1 = (
                2 * precision * recall / (precision + recall)
                if (precision + recall)
                else 0.0
            )
            best = {
                "recall": round(recall, 4),
                "precision": round(precision, 4),
                "f1": round(f1, 4),
            }
            best_threshold = threshold

    return best_threshold, best
