import os
import re
import logging
import time
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

logger = logging.getLogger("FactLens.WebSearch")

MAX_RESULTS_PER_QUERY = int(os.environ.get("MAX_RESULTS_PER_QUERY", "4"))
MAX_TOTAL_SEARCH_RESULTS = int(os.environ.get("MAX_TOTAL_SEARCH_RESULTS", "10"))
SEARCH_TIMEOUT = int(os.environ.get("SEARCH_TIMEOUT_SECONDS", "8"))

def normalize_url(raw_url: str) -> str:
    """Strip tracking query params (utm, ref, fbclid) and normalize scheme/host."""
    if not raw_url:
        return ""
    try:
        parsed = urlparse(raw_url.strip())
        # Filter tracking params
        tracking_prefixes = ("utm_", "fbclid", "gclid", "ref", "source", "ref_src")
        clean_query = [
            (k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
            if not any(k.lower().startswith(p) for p in tracking_prefixes)
        ]
        new_query = urlencode(clean_query)
        # Normalize scheme to lower and strip trailing slash from path if empty
        clean_path = parsed.path.rstrip("/") if parsed.path != "/" else "/"
        return urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            clean_path,
            parsed.params,
            new_query,
            ""  # drop fragment
        ))
    except Exception:
        return raw_url.strip()

class WebSearchService:
    """
    Executes web metasearch using DDGS across generated queries with deduplication,
    URL sanitization, rate-limit resilience, and failure isolation.
    """

    def __init__(
        self,
        max_per_query: int = MAX_RESULTS_PER_QUERY,
        max_total: int = MAX_TOTAL_SEARCH_RESULTS,
        timeout: int = SEARCH_TIMEOUT
    ):
        self.max_per_query = max_per_query
        self.max_total = max_total
        self.timeout = timeout

    def search_queries(self, queries: List[str], timelimit: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes text and news searches across queries with deduplication and temporal bounding.
        Supports timelimit ('d' for day, 'w' for week, 'm' for month, 'y' for year).
        Returns a dictionary with status, executed queries, and result items.
        """
        executed_queries: List[str] = []
        collected_results: List[Dict[str, Any]] = []
        seen_urls = set()

        if not queries:
            return {
                "performed": False,
                "queries_executed": [],
                "total_results": 0,
                "results": []
            }

        # Lazy import of DDGS
        ddgs_cls = None
        try:
            try:
                from ddgs import DDGS
                ddgs_cls = DDGS
            except ImportError:
                from duckduckgo_search import DDGS
                ddgs_cls = DDGS
        except Exception as imp_err:
            logger.warning(f"Could not initialize search client: {imp_err}")
            return {
                "performed": False,
                "queries_executed": [],
                "total_results": 0,
                "results": [],
                "error": str(imp_err)
            }

        try:
            ddgs = ddgs_cls(timeout=self.timeout)
        except Exception as init_err:
            logger.warning(f"Failed to instantiate DDGS: {init_err}")
            return {
                "performed": False,
                "queries_executed": [],
                "total_results": 0,
                "results": [],
                "error": str(init_err)
            }

        # Every call is counted, so "the search failed" (rate limit, network) is
        # never reported as "nothing exists". "No results found" is an answer,
        # not a failure.
        calls = {"ok": 0, "failed": 0, "last_error": None}

        def run(kind: str, query: str, **kwargs):
            for attempt in range(2):
                try:
                    items = list(getattr(ddgs, kind)(query, **kwargs))
                    calls["ok"] += 1
                    return items
                except Exception as exc:  # noqa: BLE001
                    if "no results" in str(exc).lower():
                        calls["ok"] += 1
                        return []
                    calls["last_error"] = f"{type(exc).__name__}: {exc}"
                    if attempt == 0:
                        time.sleep(1.5)
            calls["failed"] += 1
            return []

        # Phase 1: Search with specified timelimit if requested
        for q in queries:
            if len(collected_results) >= self.max_total:
                break

            q_clean = q.strip()
            if not q_clean:
                continue

            executed_queries.append(q_clean)
            raw_items = []

            # 1. Primary: News search, 2. Secondary: web (text) search
            kwargs = {"max_results": self.max_per_query}
            if timelimit:
                kwargs["timelimit"] = timelimit
            raw_items.extend(run("news", q_clean, **kwargs))
            raw_items.extend(run("text", q_clean, **kwargs))

            for item in raw_items:
                raw_url = item.get("href") or item.get("url") or item.get("link")
                if not raw_url:
                    continue

                norm_url = normalize_url(raw_url)
                if not norm_url or norm_url in seen_urls:
                    continue

                seen_urls.add(norm_url)
                collected_results.append({
                    "title": item.get("title", "").strip(),
                    "url": norm_url,
                    "raw_url": raw_url,
                    "snippet": item.get("body") or item.get("snippet") or item.get("description", ""),
                    "published_date": item.get("date") or item.get("published_date") or None,
                    "query_source": q_clean,
                    "timelimit_applied": timelimit
                })

                if len(collected_results) >= self.max_total:
                    break

        # Phase 2: If strict day-level timelimit was applied and yielded very few/no results,
        # perform an unbounded query search to locate potential debunking articles or historical context
        if timelimit in ("d", "w") and len(collected_results) < 2 and queries:
            for q_fallback in queries[:2]:
                if len(collected_results) >= self.max_total:
                    break
                try:
                    fb_items = run("news", q_fallback.strip(), max_results=3) or run("text", q_fallback.strip(), max_results=3)
                    for item in fb_items:
                        raw_url = item.get("href") or item.get("url") or item.get("link")
                        if not raw_url:
                            continue
                        norm_url = normalize_url(raw_url)
                        if not norm_url or norm_url in seen_urls:
                            continue
                        seen_urls.add(norm_url)
                        collected_results.append({
                            "title": item.get("title", "").strip(),
                            "url": norm_url,
                            "raw_url": raw_url,
                            "snippet": item.get("body") or item.get("snippet") or item.get("description", ""),
                            "published_date": item.get("date") or item.get("published_date") or None,
                            "query_source": q_fallback,
                            "timelimit_applied": "unbounded_fallback"
                        })
                except Exception:
                    pass

        if calls["ok"] == 0 and calls["failed"] > 0:
            # Not one call succeeded: the search provider is unavailable.
            logger.warning("Evidence search failed for every query: %s", calls["last_error"])
            return {
                "performed": False,
                "queries_executed": executed_queries,
                "total_results": 0,
                "results": [],
                "error": calls["last_error"],
            }

        return {
            "performed": True,
            "queries_executed": executed_queries,
            "total_results": len(collected_results),
            "results": collected_results,
            "failed_calls": calls["failed"],
        }

