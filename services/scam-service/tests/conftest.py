"""
Test setup for the Scam Alert service.

Runs from any working directory:
    py -m pytest services/scam-service/tests -q
"""

import os
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_ROOT.parents[1]

for path in (SERVICE_ROOT, REPO_ROOT / "services" / "shared"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

# test_scam_model_provider.py reads SCAMNET_MODEL_DIR at import time and skips
# its trained-model test when the weights are absent. Point it at the
# extracted weights so it runs whenever they exist, from any directory.
os.environ.setdefault("SCAMNET_MODEL_DIR", str(REPO_ROOT / "models" / "scamnet"))
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

# Keep tests off any real infrastructure: an in-memory database, and a Redis
# URL that refuses at once so the cache and rate limiter fall back to no-ops.
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:1/0")
