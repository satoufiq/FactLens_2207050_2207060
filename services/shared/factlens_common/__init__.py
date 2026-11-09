"""
FactLens Common Library
=======================
Shared infrastructure installed into every FactLens service image.

Contents
--------
lifecycle   : ScanStatus / ScanType / Verdict vocabularies (proposal "Scan Lifecycle")
schema      : the unified SQLAlchemy schema (proposal "Database Design")
db          : engine + session factory with SQLite fallback
providers   : BaseModelProvider contract, OnnxSession, ModelRegistry
cache       : Redis input-hash verdict cache (proposal "scans.input_hash")
ratelimit   : Redis per-user / per-IP limiter
queue       : Celery application factory (proposal "Async processing")
modelruns   : helper writing a model_runs row for every inference
"""

__version__ = "3.0.0"

from .lifecycle import ScanStatus, ScanType, RumorVerdict, RiskLevel, ImageAssessment

__all__ = [
    "ScanStatus",
    "ScanType",
    "RumorVerdict",
    "RiskLevel",
    "ImageAssessment",
    "__version__",
]
