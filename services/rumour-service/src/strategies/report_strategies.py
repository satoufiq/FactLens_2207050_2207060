import json
from abc import ABC, abstractmethod
from typing import Any, Dict

# Strategies receive a ScanReportView (services/report_view.py): the scan and
# its result, evidence and model rows presented as one flat object.
RumourScan = Any

class IReportStrategy(ABC):
    """Abstract Strategy interface for dossier and report generators."""

    @abstractmethod
    def generate(self, scan: RumourScan) -> bytes:
        """Returns binary document bytes."""
        pass

    @property
    @abstractmethod
    def content_type(self) -> str:
        """MIME Content-Type string."""
        pass

    @property
    @abstractmethod
    def file_extension(self) -> str:
        """File extension string."""
        pass

class PdfReportStrategy(IReportStrategy):
    """Concrete Strategy wrapping ReportLab PDF document compilation."""

    def __init__(self):
        from ..services.pdf_report_service import PdfReportService
        self._service = PdfReportService()

    def generate(self, scan: RumourScan) -> bytes:
        return self._service.generate_report(scan)

    @property
    def content_type(self) -> str:
        return "application/pdf"

    @property
    def file_extension(self) -> str:
        return "pdf"

class JsonReportStrategy(IReportStrategy):
    """Concrete Strategy generating formatted JSON audit dossiers."""

    def generate(self, scan: RumourScan) -> bytes:
        model = scan.banglabert_metrics or {}
        fuzzy = scan.fuzzy_scores or {}
        data = {
            "report_type": "FACTLENS_AUDIT_DOSSIER",
            "scan_id": scan.id,
            "status": scan.status,
            "claim": scan.claim_text,
            "normalized_claim": scan.normalized_text,
            "verdict": scan.verdict,
            "confidence": scan.confidence,
            "summary_en": scan.summary,
            "summary_bn": scan.summary_bn,
            "banglaverify": model,
            "fuzzy_support_score": fuzzy.get("support_score"),
            "fuzzy_contradiction_score": fuzzy.get("contradiction_score"),
            "precedence": scan.precedence,
            "degraded_reason": scan.degraded_reason,
            "created_at": scan.created_at.isoformat() if scan.created_at else None,
            "evidence_count": len(scan.evidences or []),
            "evidence": [
                {
                    "title": getattr(e, "title", None),
                    "publisher": getattr(e, "publisher", None),
                    "url": getattr(e, "url", None),
                    "stance": getattr(e, "stance", None),
                    "reliability": getattr(e, "source_reliability", None),
                    "relevance": getattr(e, "relevance_score", None),
                    "snippet": getattr(e, "snippet", None),
                }
                for e in (scan.evidences or [])
            ],
        }
        return json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")

    @property
    def content_type(self) -> str:
        return "application/json"

    @property
    def file_extension(self) -> str:
        return "json"

