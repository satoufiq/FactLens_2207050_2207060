"""
Test setup for the Rumor Scanner service.

Runs from any working directory:
    py -m pytest services/rumour-service/tests -q
"""

import os
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_ROOT.parents[1]

for path in (SERVICE_ROOT, REPO_ROOT / "services" / "shared"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

os.environ.setdefault("BANGLAVERIFY_MODEL_DIR", str(REPO_ROOT / "models" / "banglaverify"))
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

# Keep tests off any real infrastructure: an in-memory database, and a Redis
# URL that refuses at once so the cache and rate limiter fall back to no-ops.
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:1/0")
