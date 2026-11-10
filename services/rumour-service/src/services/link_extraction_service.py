import re
import logging
from typing import Optional, Dict, Any
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
import trafilatura

from ..utils.url_validator import is_safe_url
from ..utils.source_registry import evaluate_source_reliability

logger = logging.getLogger("FactLens.LinkExtractionService")

class LinkExtractionService:
    """
    Safely extracts article title, main body text, and core claim
    from a submitted news or digital media URL for rumour verification.
    """

    URL_REGEX = re.compile(r'https?://(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:/[^\s]*)?', re.IGNORECASE)

    def __init__(self, timeout: int = 12):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 FactLens/2.4",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7",
        })

    def is_url(self, text: str) -> bool:
        """Determines if a string is a single valid HTTP/HTTPS URL."""
        if not text:
            return False
        clean = text.strip()
        if clean.startswith("http://") or clean.startswith("https://"):
            return bool(self.URL_REGEX.match(clean))
        return False

    def extract_url_from_text(self, text: str) -> Optional[str]:
        """Finds the first URL in a mixed text input if present."""
        if not text:
            return None
        match = self.URL_REGEX.search(text)
        return match.group(0) if match else None

    def fetch_and_extract_article(self, url: str) -> Dict[str, Any]:
        """
        Fetches an article from a verified safe URL and extracts headline,
        readable text, publisher, and core claim.
        """
        result = {
            "is_url": True,
            "url": url,
            "domain": "",
            "publisher": "",
            "is_primary_official": False,
            "headline": "",
            "body": "",
            "extracted_claim": "",
            "success": False,
            "error": None
        }

        # 1. SSRF Security check
        if not is_safe_url(url):
            result["error"] = "Blocked URL: Resolves to private, local, or unsafe IP network."
            return result

        try:
            meta = evaluate_source_reliability(url)
            result["domain"] = meta.get("domain", "")
            result["publisher"] = meta.get("source_name", "")
            result["is_primary_official"] = meta.get("is_primary_official", False)

            resp = self.session.get(url, timeout=self.timeout, allow_redirects=True, stream=True)
            if resp.status_code != 200:
                result["error"] = f"Failed to retrieve article: HTTP {resp.status_code}"
                return result

            # Limit download size to 6MB
            content_chunks = []
            total_bytes = 0
            for chunk in resp.iter_content(chunk_size=16384):
                total_bytes += len(chunk)
                if total_bytes > 6 * 1024 * 1024:
                    break
                content_chunks.append(chunk)

            html = b"".join(content_chunks).decode(resp.encoding or "utf-8", errors="ignore")
            soup = BeautifulSoup(html, "html.parser")

            # 2. Extract Headline / Title
            headline = ""
            og_title = soup.find("meta", property="og:title")
            if og_title and og_title.get("content"):
                headline = og_title["content"].strip()
            elif soup.find("meta", attrs={"name": "twitter:title"}):
                tw_title = soup.find("meta", attrs={"name": "twitter:title"})
                headline = (tw_title.get("content") or "").strip()
            elif soup.find("h1"):
                h1 = soup.find("h1")
                headline = h1.get_text().strip()
            elif soup.title and soup.title.string:
                headline = soup.title.string.strip()

            # Clean trailing publisher names like " - Prothom Alo", " | Daily Ittefaq"
            clean_headline = re.sub(r'[\s\-|–—]+(?:প্রথম আলো|দৈনিক ইত্তেফাক|যুগান্তর|কালের কণ্ঠ|সমকাল|Prothom Alo|Daily Star|BSS|PID|bdnews24).*$', '', headline, flags=re.IGNORECASE).strip()
            result["headline"] = clean_headline or headline

            # 3. Extract Full Readable Text via Trafilatura
            extracted_text = trafilatura.extract(html, include_comments=False, include_tables=False)
            if not extracted_text:
                paragraphs = [p.get_text().strip() for p in soup.find_all("p") if len(p.get_text().strip()) > 30]
                extracted_text = "\n".join(paragraphs[:6])

            result["body"] = extracted_text or ""

            # 4. Formulate the Core Claim for verification
            # If headline exists, use it as the primary claim. If too brief, prepend to first salient sentence.
            if clean_headline:
                if len(clean_headline) >= 15:
                    result["extracted_claim"] = clean_headline
                elif extracted_text:
                    first_sent = extracted_text.split("।")[0] if "।" in extracted_text else extracted_text.split(".")[0]
                    result["extracted_claim"] = f"{clean_headline}: {first_sent.strip()}"
                else:
                    result["extracted_claim"] = clean_headline
            elif extracted_text:
                first_sent = extracted_text.split("।")[0] if "।" in extracted_text else extracted_text.split(".")[0]
                result["extracted_claim"] = first_sent.strip()
            else:
                result["extracted_claim"] = url

            result["success"] = True
            return result

        except Exception as e:
            logger.error(f"Error extracting article from {url}: {e}")
            result["error"] = str(e)
            return result
