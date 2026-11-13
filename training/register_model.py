#!/usr/bin/env python
"""
Register a trained model into models/registry.json.

This is the gate between "I trained something" and "the application will serve
it". Proposal, "Evaluation protocol":

    A model is accepted for integration only if its external-set Macro F1 is
    within a declared margin of its in-distribution score. A model that scores
    95% in-distribution and 60% externally is overfitted to its corpus and is
    not shipped, regardless of how good the first number looks.

The margin is declared in `models/registry.json` under `acceptance_policy`, so
the gate is a checkable number rather than a sentence in a report. This script
enforces it and refuses to register a model that fails.

Usage
-----
    python register_model.py \
        --name BanglaVerify \
        --version 1.0.0 \
        --artifact banglaverify/model.onnx \
        --tokenizer banglaverify \
        --evaluation artifacts/banglaverify/evaluation.json

Paths in --artifact and --tokenizer are relative to the models/ directory,
which is what the ModelRegistry resolves against at runtime.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = REPO_ROOT / "models"
REGISTRY_PATH = MODELS_DIR / "registry.json"


class AcceptanceError(SystemExit):
    """Raised when a model fails the acceptance gate."""


def git_commit() -> Optional[str]:
    """Record which code produced the artifact, for reproducibility."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        return result.stdout.strip() or None if result.returncode == 0 else None
    except Exception:  # noqa: BLE001
        return None


def load_registry() -> Dict[str, Any]:
    if not REGISTRY_PATH.exists():
        raise SystemExit(f"Model registry not found at {REGISTRY_PATH}")
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def check_acceptance(
    evaluation: Dict[str, Any], max_drop: float, force: bool
) -> Dict[str, Any]:
    """
    Compare in-distribution and external Macro F1.

    Returns a verdict dict. Exits non-zero when the gate fails and --force was
    not supplied.
    """
    in_dist = evaluation.get("in_distribution") or {}
    external = evaluation.get("external") or {}

    in_f1 = in_dist.get("macro_f1")
    ext_f1 = external.get("macro_f1")

    if in_f1 is None:
        raise SystemExit(
            "The evaluation report has no in-distribution macro_f1. Run "
            "evaluate.py before registering."
        )
    if ext_f1 is None:
        raise SystemExit(
            "The evaluation report has no external-set macro_f1.\n\n"
            "An external set is not optional. Evaluating only on a held-out "
            "split of the same corpus measures how well the model memorised "
            "that corpus, not whether it will work on a screenshot a user "
            "pastes in. Run evaluate.py with --external."
        )

    drop = float(in_f1) - float(ext_f1)
    passed = drop <= max_drop

    verdict = {
        "in_distribution_macro_f1": round(float(in_f1), 4),
        "external_macro_f1": round(float(ext_f1), 4),
        "drop": round(drop, 4),
        "max_allowed_drop": max_drop,
        "passed": passed,
        "forced": bool(force and not passed),
    }

    print("\n── Acceptance gate ──────────────────────────────────────────")
    print(f"  in-distribution Macro F1 : {float(in_f1):.4f}")
    print(f"  external-set    Macro F1 : {float(ext_f1):.4f}")
    print(f"  drop                     : {drop:.4f}  (max allowed {max_drop:.4f})")

    if passed:
        print("  RESULT                   : PASS\n")
        return verdict

    message = (
        f"  RESULT                   : FAIL\n\n"
        f"This model loses {drop:.1%} Macro F1 on data from a different\n"
        f"distribution, against a declared margin of {max_drop:.1%}. That gap\n"
        f"means it has learned its training corpus rather than the task, and\n"
        f"the in-distribution number would mislead anyone reading the report.\n\n"
        f"Before registering it, try: more aggressive deduplication, a lower\n"
        f"learning rate with fewer epochs, or adding the external corpus to\n"
        f"training and sourcing a different held-out set.\n"
    )
    if not force:
        print(message)
        raise AcceptanceError(1)

    print(message)
    print("  --force supplied: registering anyway. Record this in the report.\n")
    return verdict


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--name", required=True, help="Registry key, e.g. BanglaVerify")
    parser.add_argument("--version", required=True, help="Semantic version, e.g. 1.0.0")
    parser.add_argument("--artifact", required=True, help="Path to the .onnx file, relative to models/")
    parser.add_argument("--tokenizer", help="Tokenizer directory, relative to models/")
    parser.add_argument("--headline-artifact", help="Optional second head for BanglaVerify")
    parser.add_argument("--evaluation", required=True, help="evaluation.json from evaluate.py")
    parser.add_argument("--training-dataset", help="Dataset description for the manifest")
    parser.add_argument("--decision-threshold", type=float, help="Chosen operating point")
    parser.add_argument("--notes", default="", help="Anything a future reader should know")
    parser.add_argument("--force", action="store_true", help="Register despite a failed gate")
    args = parser.parse_args()

    registry = load_registry()

    entry = next((m for m in registry.get("models", []) if m.get("name") == args.name), None)
    if entry is None:
        known = ", ".join(m.get("name", "?") for m in registry.get("models", []))
        raise SystemExit(
            f"'{args.name}' is not in the registry. Known models: {known}.\n"
            f"Add an entry to models/registry.json first so the manifest stays "
            f"the single description of what the system serves."
        )

    evaluation_path = Path(args.evaluation)
    if not evaluation_path.exists():
        raise SystemExit(f"Evaluation report not found at {evaluation_path}")
    evaluation = json.loads(evaluation_path.read_text(encoding="utf-8"))

    artifact_path = MODELS_DIR / args.artifact
    if not artifact_path.exists():
        raise SystemExit(
            f"Artifact not found at {artifact_path}.\n"
            f"Run export_onnx.py first — the registry only ever points at files "
            f"that exist, so a registered model is always a servable one."
        )

    max_drop = float(
        (registry.get("acceptance_policy") or {}).get("max_external_macro_f1_drop", 0.10)
    )
    verdict = check_acceptance(evaluation, max_drop, args.force)

    entry.update(
        {
            "registered": True,
            "version": args.version,
            "artifact": args.artifact,
            "tokenizer": args.tokenizer or entry.get("tokenizer"),
            "training_dataset": args.training_dataset or entry.get("training_dataset"),
            "training_commit": git_commit(),
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "metrics": {
                **(entry.get("metrics") or {}),
                "in_distribution": evaluation.get("in_distribution"),
                "external": evaluation.get("external"),
                "acceptance": verdict,
            },
            "notes": args.notes or f"Registered from {evaluation_path.name}.",
        }
    )

    # Label order and sequence length come from the artifact itself, written by
    # export_onnx.py, never from hand-typed values.
    export_manifest = artifact_path.parent / "export_manifest.json"
    if export_manifest.exists():
        exported = json.loads(export_manifest.read_text(encoding="utf-8"))
        if exported.get("labels"):
            if entry.get("labels") and entry["labels"] != exported["labels"]:
                print(
                    f"Label order updated from the artifact: {entry['labels']} -> "
                    f"{exported['labels']}"
                )
            entry["labels"] = exported["labels"]
        if exported.get("max_sequence_length"):
            entry["max_sequence_length"] = exported["max_sequence_length"]
    else:
        print(
            "WARNING: no export_manifest.json beside the artifact; keeping the "
            f"registry's label order {entry.get('labels')}. Verify it matches the model."
        )

    if args.decision_threshold is not None:
        entry["decision_threshold"] = args.decision_threshold
    if args.headline_artifact:
        entry["headline_artifact"] = args.headline_artifact

    registry["updated_at"] = datetime.now(timezone.utc).isoformat()
    REGISTRY_PATH.write_text(
        json.dumps(registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(f"Registered {args.name} v{args.version} -> {args.artifact}")
    print(f"Manifest updated: {REGISTRY_PATH}")
    print(
        "\nRestart the services (or POST /api/v1/admin/registry/reload) and the "
        "provider will pick it up. No application code changes."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
