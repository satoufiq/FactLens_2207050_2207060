from abc import ABC, abstractmethod
from typing import Dict, Any

class ISourceReliabilityStrategy(ABC):
    """Abstract Strategy interface for assessing web source credibility."""

    @abstractmethod
    def evaluate(self, domain: str, publisher: str = None) -> Dict[str, Any]:
        """Calculates credibility score and institutional categorization."""
        pass

class GovernmentGazetteStrategy(ISourceReliabilityStrategy):
    """Strategy for evaluating sovereign government portals and gazettes (.gov.bd, pid.gov.bd)."""

    def evaluate(self, domain: str, publisher: str = None) -> Dict[str, Any]:
        return {
            "tier": 1,
            "source_type": "official_gazette",
            "source_reliability": 96.0,
            "is_authoritative": True,
            "verification_status": "STATE_AUTHORITY"
        }

class MainstreamMediaStrategy(ISourceReliabilityStrategy):
    """Strategy for accredited national and international news agencies."""

    def evaluate(self, domain: str, publisher: str = None) -> Dict[str, Any]:
        return {
            "tier": 2,
            "source_type": "mainstream_news",
            "source_reliability": 82.0,
            "is_authoritative": True,
            "verification_status": "VERIFIED_JOURNALISM"
        }

class GeneralWebStrategy(ISourceReliabilityStrategy):
    """Fallback Strategy for unclassified web portals, blogs, and community forums."""

    def evaluate(self, domain: str, publisher: str = None) -> Dict[str, Any]:
        return {
            "tier": 3,
            "source_type": "open_web",
            "source_reliability": 45.0,
            "is_authoritative": False,
            "verification_status": "UNVERIFIED_THIRD_PARTY"
        }

class ReliabilityStrategyResolver:
    """Strategy selector selecting the appropriate reliability evaluator."""

    @staticmethod
    def resolve(domain: str) -> ISourceReliabilityStrategy:
        clean = domain.lower()
        if any(g in clean for g in [".gov.bd", "pid.gov.bd", "dpp.gov.bd", ".ac.bd", "police.gov.bd"]):
            return GovernmentGazetteStrategy()
        if any(m in clean for m in ["prothomalo.com", "thedailystar.net", "bdnews24.com", "bssnews.net", "banglanews24.com", "jugantor.com", "dhakatribune.com"]):
            return MainstreamMediaStrategy()
        return GeneralWebStrategy()

