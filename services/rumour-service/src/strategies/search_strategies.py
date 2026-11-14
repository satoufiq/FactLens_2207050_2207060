from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class ISearchStrategy(ABC):
    """Abstract Strategy interface for web search providers."""
    
    @abstractmethod
    def search(self, query: str, max_results: int = 5, timelimit: Optional[str] = None) -> List[Dict[str, Any]]:
        """Execute search for a single query string with optional temporal timelimit ('d', 'w', 'm', 'y')."""
        pass

class DDGSSearchStrategy(ISearchStrategy):
    """Concrete Strategy implementing DuckDuckGo (DDGS) metasearch."""

    def __init__(self, timeout: int = 8):
        self.timeout = timeout

    def search(self, query: str, max_results: int = 5, timelimit: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            from duckduckgo_search import DDGS
            results = []
            with DDGS(timeout=self.timeout) as ddgs:
                # 1. Text Search
                text_iter = ddgs.text(query, region="bd-bn", timelimit=timelimit, max_results=max_results)
                for item in (text_iter or []):
                    results.append({
                        "title": item.get("title", ""),
                        "url": item.get("href", item.get("link", "")),
                        "snippet": item.get("body", item.get("snippet", "")),
                        "source_type": "web_search",
                        "provider": "DDGS_TEXT"
                    })
                # 2. News Search
                news_iter = ddgs.news(query, region="bd-bn", timelimit=timelimit, max_results=max_results)
                for item in (news_iter or []):
                    results.append({
                        "title": item.get("title", ""),
                        "url": item.get("url", item.get("href", "")),
                        "snippet": item.get("body", item.get("snippet", "")),
                        "published_date": item.get("date", ""),
                        "publisher": item.get("source", ""),
                        "source_type": "news_article",
                        "provider": "DDGS_NEWS"
                    })
            return results
        except Exception as e:
            # Fallback or empty on transient network errors
            return []

class MockSearchStrategy(ISearchStrategy):
    """Concrete Strategy providing simulated deterministic evidence for testing or offline operation."""

    def search(self, query: str, max_results: int = 5, timelimit: Optional[str] = None) -> List[Dict[str, Any]]:
        return [
            {
                "title": f"Verified Announcement on {query[:30]}",
                "url": "https://pid.gov.bd/press-release/official-notice",
                "snippet": f"The official press office has reviewed the claim regarding '{query}'. Evidence indicates accurate factual details.",
                "publisher": "Press Information Department (PID)",
                "source_type": "official_gazette",
                "provider": "MOCK_SEARCH"
            }
        ]

