import os
from typing import Dict, Type
from ..strategies.search_strategies import ISearchStrategy, DDGSSearchStrategy, MockSearchStrategy

class SearchProviderFactory:
    """
    Factory Pattern: Creates and configures search provider strategies
    based on environment configuration or dynamic request parameters.
    """
    _registry: Dict[str, Type[ISearchStrategy]] = {
        "ddgs": DDGSSearchStrategy,
        "mock": MockSearchStrategy
    }

    @classmethod
    def register_provider(cls, name: str, strategy_cls: Type[ISearchStrategy]) -> None:
        """Allows runtime plugin registration of third-party search strategies."""
        cls._registry[name.lower()] = strategy_cls

    @classmethod
    def create_search_strategy(cls, provider_name: str = None) -> ISearchStrategy:
        """
        Instantiates appropriate search strategy.
        Defaults to environment SEARCH_PROVIDER or 'ddgs'.
        """
        target = (provider_name or os.environ.get("SEARCH_PROVIDER", "ddgs")).lower()
        strategy_class = cls._registry.get(target, DDGSSearchStrategy)
        return strategy_class()

