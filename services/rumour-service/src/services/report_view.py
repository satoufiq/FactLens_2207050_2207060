"""
Flat view of a scan for the PDF dossier.

The report generator was written against the old single-table `rumour_scans`
shape. The schema now spreads the same information across `scans`,
`scan_results`, `evidence` and `model_runs`, which is the right shape for the
database but a poor one for a template.

This adapter presents the new rows under the old attribute names, so the
reporting code keeps working unchanged while the storage layer matches the
proposal's ERD.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from factlens_common.schema import Scan


class ScanReportView:
    """Read-only façade over a Scan and its related rows."""

    def __init__(self, scan: Scan) -> None:
        self._scan = scan
        self._result = scan.result
        self._detail: Dict[str, Any] = (self._result.detail or {}) if self._result else {}

    # -- identity ----------------------------------------------------------

    @property
    def id(self) -> str:
        return self._scan.id

    @property
    def user_id(self) -> Optional[str]:
        return self._scan.user_id

    @property
    def status(self) -> str:
        return self._scan.status

    @property
    def created_at(self):
        return self._scan.created_at

    @property
    def completed_at(self):
        return self._scan.completed_at

    # -- input -------------------------------------------------------------

    @property
    def claim_text(self) -> str:
        return self._scan.input_text or ""

    @property
    def normalized_text(self) -> str:
        return self._scan.normalized_text or self._scan.input_text or ""

    @property
    def input_url(self) -> Optional[str]:
        return self._scan.input_url

    # -- verdict -----------------------------------------------------------

    @property
    def verdict(self) -> str:
        return self._result.result if self._result else "UNVERIFIED"

    @property
    def confidence(self) -> float:
        return float(self._result.confidence) if self._result else 0.0

    @property
    def summary(self) -> str:
        return (self._result.summary if self._result else "") or ""

    @property
    def summary_bn(self) -> str:
        return (self._result.summary_bn if self._result else "") or ""

    @property
    def explanation(self) -> Dict[str, Any]:
        """
        The old shape was {"english": ..., "bangla": ...}; the new explanation
        layer is richer. Both keys are provided so the template keeps working.
        """
        explanation = (self._result.explanation if self._result else None) or {}
        return {
            **explanation,
            "english": explanation.get("summary") or self.summary,
            "bangla": explanation.get("summary_bn") or self.summary_bn,
        }

    @property
    def limitations(self) -> List[str]:
        return (self._result.limitations if self._result else None) or []

    # -- model and scoring -------------------------------------------------

    @property
    def banglabert_metrics(self) -> Dict[str, Any]:
        """
        Model panel for the dossier.

        Reports the registered version and, when the model was unavailable,
        says so rather than printing a number that no model produced.
        """
        describe = self._detail.get("banglaverify") or {}
        prediction = self._detail.get("model_prediction") or {}
        available = bool(prediction.get("available"))

        return {
            "model_name": describe.get("model_name", "BanglaVerify"),
            "version": describe.get("version", "0.0.0-unregistered"),
            "base_architecture": describe.get("base_architecture", "csebuetnlp/banglabert"),
            "task_type": describe.get("task_type", "Binary classification — Fake / Real"),
            "available": available,
            "prediction": prediction.get("label") if available else "UNAVAILABLE",
            "confidence": prediction.get("confidence") if available else None,
            "raw_probabilities": prediction.get("probabilities") if available else {},
            "head": prediction.get("head"),
            "p_fake": prediction.get("p_fake") if available else None,
            "threshold": prediction.get("threshold") if available else None,
            "inference_time_ms": round(float(prediction.get("latency_ms") or 0), 1),
            "unavailable_reason": None if available else prediction.get("reason"),
        }

    @property
    def fuzzy_scores(self) -> Dict[str, Any]:
        scores = dict(self._detail.get("fuzzy_scores") or {})
        precedence = self._detail.get("precedence") or {}
        scores["decided_by"] = precedence.get("decided_by")
        scores["overrode_fuzzy"] = precedence.get("overrode_fuzzy")
        return scores

    @property
    def precedence(self) -> Dict[str, Any]:
        return self._detail.get("precedence") or {}

    @property
    def evidence_summary(self) -> Dict[str, Any]:
        items = self._scan.evidence or []
        web_search = self._detail.get("web_search") or {}
        return {
            "supporting_sources": sum(1 for e in items if e.stance == "SUPPORTING"),
            "contradicting_sources": sum(1 for e in items if e.stance == "CONTRADICTING"),
            "neutral_sources": sum(
                1 for e in items if e.stance in ("NEUTRAL", "INSUFFICIENT")
            ),
            "primary_sources": sum(
                1 for e in items if (e.source_type or "") == "PRIMARY_OFFICIAL"
            ),
            "queries_executed": web_search.get("queries_executed", []),
            "search_performed": web_search.get("performed", False),
            "independent_sources": web_search.get("independent_sources", 0),
        }

    @property
    def degraded_reason(self) -> Optional[List[Dict[str, Any]]]:
        return self._scan.degraded_reason

    # -- related rows ------------------------------------------------------

    @property
    def evidences(self) -> List[Any]:
        """Old attribute name; the rows now carry `published_at`."""
        items = list(self._scan.evidence or [])
        for item in items:
            # The template reads `published_date`; map it without a migration.
            if not hasattr(item, "published_date"):
                try:
                    setattr(item, "published_date", item.published_at)
                except Exception:  # noqa: BLE001
                    pass
        return sorted(items, key=lambda e: (e.relevance_score or 0), reverse=True)

    @property
    def queries(self) -> List[Any]:
        return list(self._scan.queries or [])

    @property
    def model_runs(self) -> List[Any]:
        return list(self._scan.model_runs or [])

    @property
    def url_analyses(self) -> List[Any]:
        return list(self._scan.url_analyses or [])

    def __getattr__(self, name: str) -> Any:
        """Anything not mapped above falls through to the underlying Scan."""
        return getattr(self._scan, name)
