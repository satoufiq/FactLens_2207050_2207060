from typing import Dict, Type
from ..strategies.report_strategies import IReportStrategy, PdfReportStrategy, JsonReportStrategy

class ReportGeneratorFactory:
    """
    Factory Pattern: Creates and provides format-specific report generation strategies.
    Supports PDF (ReportLab) and JSON, with extensibility for future CSV/HTML reports.
    """
    _registry: Dict[str, Type[IReportStrategy]] = {
        "pdf": PdfReportStrategy,
        "json": JsonReportStrategy
    }

    @classmethod
    def register_generator(cls, format_key: str, strategy_cls: Type[IReportStrategy]) -> None:
        cls._registry[format_key.lower()] = strategy_cls

    @classmethod
    def create_generator(cls, format_key: str = "pdf") -> IReportStrategy:
        target = format_key.lower().strip()
        strategy_cls = cls._registry.get(target, PdfReportStrategy)
        return strategy_cls()

