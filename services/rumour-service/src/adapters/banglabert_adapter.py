"""
Adapter decoupling the Rumor Scanner's business logic from the model layer.

The service asks for a classification and reads a `Prediction`. When
BanglaVerify is not loaded, busy, slow or failing, the Prediction says so
(`available=False` with a reason) and the evidence pipeline carries the scan.
"""

from __future__ import annotations

from typing import Any, Dict

from factlens_common.providers.base import Prediction

from ..core.singletons import get_banglaverify


class BanglaVerifyAdapter:
    """Thin façade over the BanglaVerify runtime."""

    def __init__(self, runtime=None):
        self._runtime = runtime or get_banglaverify()

    @property
    def is_operational(self) -> bool:
        return self._runtime.is_available()

    @property
    def version(self) -> str:
        return self._runtime.version()

    def classify_claim(self, claim: str) -> Prediction:
        """A claim as the user submitted it (typed, pasted or OCR-confirmed).

        Pass the raw text: the model applies its own training-time cleaning
        (csebuetnlp normalizer) and chooses short or full mode itself.
        """
        return self._runtime.classify(text=claim)

    def classify_article(self, headline: str, content: str) -> Prediction:
        """A fetched article: headline and body, as the model was trained."""
        return self._runtime.classify(headline=headline, content=content)

    def describe(self) -> Dict[str, Any]:
        return self._runtime.describe()

    def health(self) -> Dict[str, Any]:
        return self._runtime.health()


#: Previous name, kept so older imports keep resolving.
BanglaBertAdapter = BanglaVerifyAdapter

__all__ = ["BanglaVerifyAdapter", "BanglaBertAdapter"]
