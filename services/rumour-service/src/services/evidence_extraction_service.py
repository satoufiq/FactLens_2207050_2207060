import os
import logging
from typing import Dict, Any, Optional
import requests
import trafilatura
from bs4 import BeautifulSoup

from ..utils.url_validator import is_safe_url

logger = logging.getLogger("FactLens.EvidenceExtraction")

REQUEST_TIMEOUT = int(os.environ.get("EXTRACTION_TIMEOUT_SECONDS", "6"))
MAX_RESPONSE_BYTES = 5 * 1024 * 1024  # 5 MB max
MAX_EXTRACTED_CHARS = 4000

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 FactLens-Verifier/1.0"

class EvidenceExtractionService:
    """
    Safely retrieves and parses readable article text from public web resources
    using Trafilatura with BeautifulSoup4 fallback, enforcing strict SSRF defenses.
    """

    def __init__(self, timeout: int = REQUEST_TIMEOUT):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})

    def extract_evidence(self, search_item: Dict[str, Any]) -> Dict[str, Any]:
        url = search_item.get("url", "")
        base_title = search_item.get("title", "")
        base_snippet = search_item.get("snippet", "")
        base_date = search_item.get("published_date")

        # 1. Strict URL Security & SSRF Validation
        if not is_safe_url(url):
            logger.warning(f"URL failed safety check: {url}")
            return {
                "url": url,
                "success": False,
                "title": base_title,
                "content": "",
                "snippet": base_snippet,
                "published_date": base_date,
                "content_length": 0,
                "extraction_method": "snippet_only",
                "error": "URL failed safety check or resolved to private address"
            }

        # 2. HTTP Retrieval with Size & Timeout Controls
        html_content = ""
        try:
            resp = self.session.get(
                url,
                timeout=self.timeout,
                allow_redirects=True,
                stream=True
            )
            # Validate final redirect URL safety
            if not is_safe_url(resp.url):
                return {
                    "url": url,
                    "success": False,
                    "title": base_title,
                    "content": "",
                    "snippet": base_snippet,
                    "published_date": base_date,
                    "content_length": 0,
                    "extraction_method": "snippet_only",
                    "error": "Redirect target failed safety check"
                }

            if resp.status_code == 200:
                raw_bytes = bytearray()
                for chunk in resp.iter_content(chunk_size=16384):
                    raw_bytes.extend(chunk)
                    if len(raw_bytes) > MAX_RESPONSE_BYTES:
                        break
                html_content = raw_bytes.decode(resp.encoding or "utf-8", errors="replace")
            else:
                return {
                    "url": url,
                    "success": False,
                    "title": base_title,
                    "content": "",
                    "snippet": base_snippet,
                    "published_date": base_date,
                    "content_length": 0,
                    "extraction_method": "snippet_only",
                    "error": f"HTTP status {resp.status_code}"
                }
        except Exception as http_err:
            return {
                "url": url,
                "success": False,
                "title": base_title,
                "content": "",
                "snippet": base_snippet,
                "published_date": base_date,
                "content_length": 0,
                "extraction_method": "snippet_only",
                "error": str(http_err)
            }

        # 3. Content Extraction via Trafilatura
        extracted_text = None
        extracted_title = None
        extracted_date = None
        method = "trafilatura"

        try:
            extracted_text = trafilatura.extract(
                html_content,
                include_comments=False,
                include_tables=False,
                no_fallback=False
            )
            meta = trafilatura.extract_metadata(html_content)
            if meta:
                extracted_title = meta.title
                extracted_date = meta.date
        except Exception:
            extracted_text = None

        # 4. Fallback to BeautifulSoup4 if Trafilatura yielded nothing
        if not extracted_text or len(extracted_text.strip()) < 50:
            try:
                soup = BeautifulSoup(html_content, "html.parser")
                # Remove boilerplate tags
                for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "aside"]):
                    tag.decompose()
                paragraphs = [p.get_text().strip() for p in soup.find_all("p") if len(p.get_text().strip()) > 20]
                if paragraphs:
                    extracted_text = "\n\n".join(paragraphs)
                    method = "beautifulsoup"
                if not extracted_title and soup.title:
                    extracted_title = soup.title.get_text().strip()
            except Exception:
                pass

        # 5. Assemble extracted package and resolve published date
        final_text = (extracted_text or "").strip()
        final_title = extracted_title or base_title
        
        from ..utils.date_parser import resolve_article_publication_date
        resolved_dt, age_days = resolve_article_publication_date(
            raw_date=extracted_date or base_date,
            url=url,
            snippet=base_snippet,
            content=final_text
        )
        final_date = resolved_dt.isoformat() if resolved_dt else (extracted_date or base_date)

        has_content = bool(final_text and len(final_text) >= 40)

        return {
            "url": url,
            "success": has_content,
            "title": final_title,
            "content": final_text[:MAX_EXTRACTED_CHARS] if has_content else "",
            "snippet": base_snippet,
            "published_date": final_date,
            "published_datetime": resolved_dt,
            "article_age_days": age_days,
            "content_length": len(final_text) if has_content else 0,
            "extraction_method": method if has_content else "snippet_only"
        }

