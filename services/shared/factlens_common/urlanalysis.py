"""
URL inspection, shared by rumor and scam scans.

Proposal, Scam Alert step 6:

    domain structure, suspicious characters, lookalike domains, unusual
    subdomains, HTTPS status, redirect behaviour, and external reputation
    data, analyzed independently of the text.

"Independently of the text" matters: the URL verdict must not be contaminated
by what the message says, so this module never sees the message body.

Every check is deterministic and explainable -- each produces a flag with a
category, a severity and a sentence the user can act on. External reputation
is optional and behind a provider; when no reputation key is configured the
structural checks still stand on their own and the result says so.
"""

from __future__ import annotations

import ipaddress
import logging
import math
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from urllib.parse import unquote, urlparse

logger = logging.getLogger("factlens.urlanalysis")

#: TLDs over-represented in phishing and throwaway campaign domains.
HIGH_RISK_TLDS = {
    "xyz", "top", "click", "link", "work", "gq", "cf", "ml", "tk", "ga",
    "buzz", "rest", "country", "kim", "loan", "men", "download", "racing",
    "win", "bid", "stream", "date", "faith", "review", "party", "trade",
    "zip", "mov", "cam", "quest", "sbs", "cfd", "lol",
}

#: Shorteners hide the real destination, so the chain must be followed.
URL_SHORTENERS = {
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd", "buff.ly",
    "adf.ly", "bit.do", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc",
    "rebrand.ly", "s.id", "short.link", "t.ly", "v.gd", "clck.ru",
}

#: Brands commonly impersonated against Bangladeshi users.
IMPERSONATION_TARGETS = {
    "bkash": ["bkash", "bkash-bd", "bkashbd", "bkash-offer", "bkashbonus"],
    "nagad": ["nagad", "nagadbd", "nagad-offer", "mynagad"],
    "rocket": ["rocket", "dbblrocket", "rocketbd"],
    "upay": ["upay", "upaybd"],
    "facebook": ["facebook", "fb", "faceb00k", "facebok", "faceboook"],
    "google": ["google", "g00gle", "gooogle", "googl"],
    "daraz": ["daraz", "darazbd", "daraz-offer"],
    "paypal": ["paypal", "paypa1", "pypal"],
    "whatsapp": ["whatsapp", "whatsap", "whatsappweb"],
    "binance": ["binance", "binnance", "binance-bd"],
}

#: Characters that make a lookalike domain: digit-for-letter and homoglyphs.
HOMOGLYPH_MAP = {
    "0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b",
    "rn": "m", "vv": "w",
}

SENSITIVE_PATH_WORDS = {
    "login", "signin", "verify", "verification", "secure", "account",
    "update", "confirm", "password", "wallet", "recover", "unlock",
    "billing", "payment", "claim", "bonus", "winner", "prize", "otp",
}

REQUEST_TIMEOUT_S = float(os.environ.get("URL_ANALYSIS_TIMEOUT_S", "6"))
MAX_REDIRECTS = int(os.environ.get("URL_ANALYSIS_MAX_REDIRECTS", "8"))


@dataclass
class UrlFlag:
    code: str
    category: str
    severity: str  # LOW | MEDIUM | HIGH | CRITICAL
    message: str
    message_bn: Optional[str] = None
    detail: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "category": self.category,
            "severity": self.severity,
            "message": self.message,
            "message_bn": self.message_bn,
            "detail": self.detail,
        }


@dataclass
class UrlAnalysisResult:
    url: str
    domain: Optional[str] = None
    registered_domain: Optional[str] = None
    tld: Optional[str] = None
    has_https: bool = False
    redirect_chain: List[str] = field(default_factory=list)
    final_url: Optional[str] = None
    reputation_score: Optional[float] = None
    reputation_source: Optional[str] = None
    reachable: Optional[bool] = None
    flags: List[UrlFlag] = field(default_factory=list)
    #: 0-100; higher is more suspicious.
    risk_score: float = 0.0
    error: Optional[str] = None
    latency_ms: float = 0.0

    def as_dict(self) -> Dict[str, Any]:
        return {
            "url": self.url,
            "domain": self.domain,
            "registered_domain": self.registered_domain,
            "tld": self.tld,
            "has_https": self.has_https,
            "redirect_chain": self.redirect_chain,
            "final_url": self.final_url,
            "reputation_score": self.reputation_score,
            "reputation_source": self.reputation_source,
            "reachable": self.reachable,
            "flags": [f.as_dict() for f in self.flags],
            "risk_score": round(self.risk_score, 2),
            "error": self.error,
            "latency_ms": round(self.latency_ms, 2),
        }


SEVERITY_WEIGHT = {"LOW": 6.0, "MEDIUM": 14.0, "HIGH": 26.0, "CRITICAL": 40.0}


def _shannon_entropy(text: str) -> float:
    if not text:
        return 0.0
    counts: Dict[str, int] = {}
    for ch in text:
        counts[ch] = counts.get(ch, 0) + 1
    total = len(text)
    return -sum((c / total) * math.log2(c / total) for c in counts.values())


def normalize_url(raw: str) -> str:
    """Add a scheme when the user pasted a bare domain."""
    candidate = (raw or "").strip()
    if not candidate:
        return ""
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", candidate):
        candidate = f"http://{candidate}"
    return candidate


class UrlAnalyzer:
    """Structural URL inspection plus optional reputation lookup."""

    provider_name = "UrlAnalyzer"

    def __init__(self, follow_redirects: bool = True) -> None:
        self.follow_redirects = follow_redirects
        self._reputation_key = os.environ.get("URL_REPUTATION_API_KEY") or None
        self._reputation_endpoint = os.environ.get("URL_REPUTATION_ENDPOINT") or None

    # -- entry point -------------------------------------------------------

    def analyze(self, raw_url: str) -> UrlAnalysisResult:
        """Inspect one URL. Never raises."""
        started = time.perf_counter()
        url = normalize_url(raw_url)
        result = UrlAnalysisResult(url=url)

        if not url:
            result.error = "No URL supplied."
            return result

        try:
            parsed = urlparse(url)
        except Exception as exc:  # noqa: BLE001
            result.error = f"The URL could not be parsed: {exc}"
            result.flags.append(
                UrlFlag(
                    "malformed_url",
                    "structure",
                    "MEDIUM",
                    "This link is malformed and could not be read as a web address.",
                    "এই লিংকটি ত্রুটিপূর্ণ এবং একটি বৈধ ওয়েব ঠিকানা হিসেবে পড়া যায়নি।",
                )
            )
            result.risk_score = SEVERITY_WEIGHT["MEDIUM"]
            result.latency_ms = (time.perf_counter() - started) * 1000.0
            return result

        host = (parsed.hostname or "").lower()
        result.domain = host
        result.has_https = parsed.scheme == "https"
        result.registered_domain, result.tld = self._split_domain(host)

        self._check_scheme(result, parsed)
        self._check_host(result, host)
        self._check_lookalike(result, host)
        self._check_path(result, parsed)

        if self.follow_redirects:
            self._trace_redirects(result, url)

        self._lookup_reputation(result)

        result.risk_score = min(
            100.0, sum(SEVERITY_WEIGHT.get(f.severity, 0.0) for f in result.flags)
        )
        result.latency_ms = (time.perf_counter() - started) * 1000.0
        return result

    # -- structural checks -------------------------------------------------

    @staticmethod
    def _split_domain(host: str):
        if not host:
            return None, None
        try:
            import tldextract  # noqa: PLC0415

            extracted = tldextract.extract(host)
            registered = (
                f"{extracted.domain}.{extracted.suffix}"
                if extracted.suffix
                else extracted.domain
            )
            return registered or None, extracted.suffix or None
        except Exception:  # noqa: BLE001
            parts = host.split(".")
            if len(parts) >= 2:
                return ".".join(parts[-2:]), parts[-1]
            return host, None

    def _check_scheme(self, result: UrlAnalysisResult, parsed) -> None:
        if parsed.scheme not in ("http", "https"):
            result.flags.append(
                UrlFlag(
                    "unusual_scheme",
                    "structure",
                    "HIGH",
                    f"This link uses the unusual '{parsed.scheme}' scheme rather than http or https.",
                    f"এই লিংকটি http বা https-এর বদলে অস্বাভাবিক '{parsed.scheme}' স্কিম ব্যবহার করছে।",
                )
            )
        elif not result.has_https:
            result.flags.append(
                UrlFlag(
                    "no_https",
                    "transport",
                    "MEDIUM",
                    "This link is not secured with HTTPS, so anything you type on it "
                    "travels unencrypted.",
                    "এই লিংকটি HTTPS দিয়ে সুরক্ষিত নয়, তাই এখানে যা লিখবেন তা এনক্রিপশন "
                    "ছাড়াই যাবে।",
                )
            )

        if parsed.username or parsed.password:
            result.flags.append(
                UrlFlag(
                    "embedded_credentials",
                    "structure",
                    "CRITICAL",
                    "This link hides credentials before the '@' sign, a classic trick "
                    "for disguising the real destination.",
                    "এই লিংকটি '@' চিহ্নের আগে লগইন তথ্য লুকিয়ে রেখেছে — আসল গন্তব্য "
                    "আড়াল করার পরিচিত কৌশল।",
                )
            )

        if parsed.port and parsed.port not in (80, 443):
            result.flags.append(
                UrlFlag(
                    "unusual_port",
                    "structure",
                    "MEDIUM",
                    f"This link connects on the unusual port {parsed.port}.",
                    f"এই লিংকটি অস্বাভাবিক পোর্ট {parsed.port}-এ সংযোগ করে।",
                )
            )

    def _check_host(self, result: UrlAnalysisResult, host: str) -> None:
        if not host:
            result.flags.append(
                UrlFlag(
                    "no_host", "structure", "HIGH", "This link has no domain name.",
                    "এই লিংকে কোনো ডোমেইন নাম নেই।",
                )
            )
            return

        try:
            ipaddress.ip_address(host)
            result.flags.append(
                UrlFlag(
                    "raw_ip_host",
                    "structure",
                    "HIGH",
                    "This link points at a raw IP address instead of a domain name, "
                    "which legitimate services almost never do.",
                    "এই লিংকটি ডোমেইন নামের বদলে সরাসরি একটি আইপি ঠিকানায় যাচ্ছে — "
                    "বৈধ সেবাগুলো প্রায় কখনোই এমন করে না।",
                )
            )
            return
        except ValueError:
            pass

        if result.tld and result.tld.split(".")[-1] in HIGH_RISK_TLDS:
            result.flags.append(
                UrlFlag(
                    "high_risk_tld",
                    "domain",
                    "MEDIUM",
                    f"The domain ends in .{result.tld}, a cheap extension heavily used "
                    f"for short-lived scam sites.",
                    f"ডোমেইনটি .{result.tld} দিয়ে শেষ — স্বল্পমেয়াদি প্রতারণামূলক সাইটে "
                    f"বহুল ব্যবহৃত সস্তা এক্সটেনশন।",
                )
            )

        if result.registered_domain in URL_SHORTENERS:
            result.flags.append(
                UrlFlag(
                    "url_shortener",
                    "domain",
                    "MEDIUM",
                    "This is a shortened link, so the real destination is hidden until "
                    "you open it.",
                    "এটি একটি সংক্ষিপ্ত লিংক, তাই না খোলা পর্যন্ত আসল গন্তব্য লুকানো থাকে।",
                )
            )

        labels = host.split(".")
        if len(labels) > 4:
            result.flags.append(
                UrlFlag(
                    "deep_subdomain",
                    "domain",
                    "MEDIUM",
                    f"This address stacks {len(labels)} subdomain levels, often used to "
                    f"push the real domain out of view on a phone screen.",
                    f"এই ঠিকানায় {len(labels)} স্তরের সাবডোমেইন আছে — মোবাইল স্ক্রিনে আসল "
                    f"ডোমেইন আড়াল করতে প্রায়ই এটি ব্যবহৃত হয়।",
                )
            )

        if "xn--" in host:
            result.flags.append(
                UrlFlag(
                    "punycode_domain",
                    "domain",
                    "HIGH",
                    "This domain uses punycode, which can render as letters that look "
                    "identical to a trusted brand's name.",
                    "এই ডোমেইনটি পিউনিকোড ব্যবহার করছে, যা দেখতে বিশ্বস্ত ব্র্যান্ডের "
                    "নামের মতো হতে পারে।",
                )
            )

        if host.count("-") >= 3:
            result.flags.append(
                UrlFlag(
                    "hyphen_heavy_domain",
                    "domain",
                    "LOW",
                    "The domain is padded with hyphens, a pattern common in disposable "
                    "campaign domains.",
                    "ডোমেইনে একাধিক হাইফেন রয়েছে — ব্যবহার-এবং-ফেলে দেওয়া ক্যাম্পেইন "
                    "ডোমেইনে সাধারণ।",
                )
            )

        core = (result.registered_domain or host).split(".")[0]

        # Digit-for-letter substitution inside an otherwise alphabetic word:
        # "pr1ze", "g00gle", "faceb00k". Flagged on its own, because the word
        # being imitated need not be a brand FactLens knows about.
        leet = re.findall(r"[a-z]+[0137458]+[a-z]+", core)
        if leet and not re.fullmatch(r"[a-z]*\d{4}[a-z]*", core):
            swapped = []
            for token in leet[:3]:
                plain = token
                for glyph, letter in HOMOGLYPH_MAP.items():
                    plain = plain.replace(glyph, letter)
                if plain != token:
                    swapped.append(f"{token} -> {plain}")
            if swapped:
                result.flags.append(
                    UrlFlag(
                        "lookalike_token",
                        "impersonation",
                        "HIGH",
                        "The domain replaces letters with digits that look like them "
                        "(" + ", ".join(swapped) + "), a trick used to make a "
                        "fraudulent address read like a familiar one at a glance.",
                        "ডোমেইনটিতে অক্ষরের বদলে দেখতে একইরকম সংখ্যা বসানো হয়েছে ("
                        + ", ".join(swapped)
                        + ") — প্রতারণামূলক ঠিকানাকে এক নজরে পরিচিত দেখাতে ব্যবহৃত কৌশল।",
                        detail=", ".join(swapped),
                    )
                )

        if len(core) >= 12 and _shannon_entropy(core) > 3.5:
            result.flags.append(
                UrlFlag(
                    "random_looking_domain",
                    "domain",
                    "MEDIUM",
                    "The domain name looks machine-generated rather than chosen, which "
                    "is typical of bulk-registered scam infrastructure.",
                    "ডোমেইন নামটি বেছে নেওয়ার বদলে যন্ত্রে তৈরি বলে মনে হচ্ছে — পাইকারি "
                    "নিবন্ধিত প্রতারণা অবকাঠামোর বৈশিষ্ট্য।",
                )
            )

    def _check_lookalike(self, result: UrlAnalysisResult, host: str) -> None:
        """Detect digit-for-letter and homoglyph impersonation of known brands."""
        core = (result.registered_domain or host).split(".")[0].lower()
        if not core:
            return

        deglyphed = core
        for glyph, letter in HOMOGLYPH_MAP.items():
            deglyphed = deglyphed.replace(glyph, letter)

        for brand, variants in IMPERSONATION_TARGETS.items():
            if core == brand:
                return  # the genuine name; nothing to flag here
            for variant in variants:
                if variant == core:
                    continue
                if deglyphed == brand or (
                    brand in deglyphed and brand not in core
                ):
                    result.flags.append(
                        UrlFlag(
                            "lookalike_domain",
                            "impersonation",
                            "CRITICAL",
                            f"The domain '{core}' imitates '{brand}' using substituted "
                            f"characters. This is not {brand}'s real address.",
                            f"'{core}' ডোমেইনটি অক্ষর বদলে '{brand}'-এর নকল করছে। এটি "
                            f"{brand}-এর আসল ঠিকানা নয়।",
                            detail=f"normalized='{deglyphed}' brand='{brand}'",
                        )
                    )
                    return
                if brand in core and core != brand and not core.endswith(brand):
                    result.flags.append(
                        UrlFlag(
                            "brand_in_subdomain",
                            "impersonation",
                            "HIGH",
                            f"The domain embeds the name '{brand}' inside a larger, "
                            f"unrelated domain. Check the address carefully.",
                            f"ডোমেইনটি একটি বড় ও সম্পর্কহীন ঠিকানার ভেতরে '{brand}' নামটি "
                            f"ঢুকিয়ে রেখেছে। ঠিকানাটি ভালো করে দেখুন।",
                        )
                    )
                    return

    def _check_path(self, result: UrlAnalysisResult, parsed) -> None:
        path = unquote(parsed.path or "").lower()
        query = unquote(parsed.query or "").lower()
        combined = f"{path} {query}"

        hits = sorted({w for w in SENSITIVE_PATH_WORDS if w in combined})
        if hits:
            result.flags.append(
                UrlFlag(
                    "sensitive_path",
                    "path",
                    "MEDIUM",
                    "The link path mentions "
                    + ", ".join(hits[:4])
                    + " — wording typical of pages built to harvest credentials or payments.",
                    "লিংকের পাথে "
                    + ", ".join(hits[:4])
                    + " উল্লেখ আছে — লগইন তথ্য বা অর্থ হাতিয়ে নিতে তৈরি পৃষ্ঠার সাধারণ শব্দ।",
                    detail=", ".join(hits),
                )
            )

        if re.search(r"\.(exe|apk|scr|bat|cmd|msi|jar|vbs|ps1)(\?|$)", path):
            result.flags.append(
                UrlFlag(
                    "executable_download",
                    "path",
                    "CRITICAL",
                    "This link downloads an executable file. Do not run it.",
                    "এই লিংকটি একটি চালানোযোগ্য ফাইল ডাউনলোড করে। এটি চালাবেন না।",
                )
            )

    # -- network checks ----------------------------------------------------

    def _trace_redirects(self, result: UrlAnalysisResult, url: str) -> None:
        """Follow the redirect chain without executing anything at the far end."""
        try:
            import requests  # noqa: PLC0415
        except Exception:  # noqa: BLE001
            return

        chain: List[str] = []
        current = url
        try:
            session = requests.Session()
            session.max_redirects = MAX_REDIRECTS
            for _ in range(MAX_REDIRECTS):
                response = session.head(
                    current,
                    allow_redirects=False,
                    timeout=REQUEST_TIMEOUT_S,
                    headers={"User-Agent": "FactLens-URLCheck/1.0"},
                )
                chain.append(current)
                if response.status_code in (301, 302, 303, 307, 308):
                    location = response.headers.get("Location")
                    if not location:
                        break
                    current = requests.compat.urljoin(current, location)
                    continue
                result.reachable = response.status_code < 400
                break
            else:
                result.flags.append(
                    UrlFlag(
                        "redirect_loop",
                        "redirect",
                        "HIGH",
                        f"This link redirects more than {MAX_REDIRECTS} times without "
                        f"settling, which can indicate a cloaking chain.",
                        f"এই লিংকটি স্থির না হয়ে {MAX_REDIRECTS} বারের বেশি রিডাইরেক্ট "
                        f"করছে — আড়াল করার কৌশল হতে পারে।",
                    )
                )

            result.redirect_chain = chain
            result.final_url = current

            if len(chain) > 2:
                result.flags.append(
                    UrlFlag(
                        "multi_hop_redirect",
                        "redirect",
                        "MEDIUM",
                        f"This link passes through {len(chain)} hops before arriving at "
                        f"its destination.",
                        f"এই লিংকটি গন্তব্যে পৌঁছানোর আগে {len(chain)}টি ধাপ পার হয়।",
                        detail=" -> ".join(chain[:5]),
                    )
                )

            start_host = (urlparse(url).hostname or "").lower()
            end_host = (urlparse(current).hostname or "").lower()
            if start_host and end_host and start_host != end_host:
                start_reg, _ = self._split_domain(start_host)
                end_reg, _ = self._split_domain(end_host)
                if start_reg != end_reg:
                    result.flags.append(
                        UrlFlag(
                            "cross_domain_redirect",
                            "redirect",
                            "HIGH",
                            f"This link starts at {start_host} but ends at {end_host} — "
                            f"the destination is not the domain you were shown.",
                            f"লিংকটি {start_host} থেকে শুরু হয়ে {end_host}-এ শেষ হয় — "
                            f"দেখানো ডোমেইনই আসল গন্তব্য নয়।",
                        )
                    )
                    # The destination deserves its own structural pass.
                    self._check_host(result, end_host)
                    self._check_lookalike(result, end_host)

        except Exception as exc:  # noqa: BLE001
            logger.debug("Redirect trace failed for %s: %s", url, exc)
            result.reachable = False
            result.flags.append(
                UrlFlag(
                    "unreachable",
                    "availability",
                    "LOW",
                    "This address could not be reached, so its destination could not be "
                    "confirmed.",
                    "এই ঠিকানায় পৌঁছানো যায়নি, তাই এর গন্তব্য নিশ্চিত করা যায়নি।",
                    detail=str(exc)[:200],
                )
            )

    def _lookup_reputation(self, result: UrlAnalysisResult) -> None:
        """
        Optional external reputation lookup.

        Sends only the URL, never the message body. With no key configured the
        structural analysis stands alone and the result records that the
        reputation signal was absent rather than implying a clean verdict.
        """
        if not self._reputation_key or not self._reputation_endpoint:
            result.reputation_source = "not_configured"
            return

        try:
            import requests  # noqa: PLC0415

            response = requests.post(
                self._reputation_endpoint,
                json={"url": result.final_url or result.url},
                headers={"Authorization": f"Bearer {self._reputation_key}"},
                timeout=REQUEST_TIMEOUT_S,
            )
            if response.status_code != 200:
                result.reputation_source = f"error_{response.status_code}"
                return
            payload = response.json()
            score = payload.get("score")
            if score is not None:
                result.reputation_score = float(score)
                result.reputation_source = payload.get("source", "external")
                if result.reputation_score >= 70:
                    result.flags.append(
                        UrlFlag(
                            "bad_reputation",
                            "reputation",
                            "CRITICAL",
                            "This address appears on an external blocklist of malicious "
                            "or fraudulent sites.",
                            "এই ঠিকানাটি ক্ষতিকর বা প্রতারণামূলক সাইটের বাহ্যিক তালিকায় আছে।",
                        )
                    )
        except Exception as exc:  # noqa: BLE001
            logger.debug("Reputation lookup failed: %s", exc)
            result.reputation_source = "unavailable"

    def health(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "available": True,
            "reputation_configured": bool(
                self._reputation_key and self._reputation_endpoint
            ),
            "follow_redirects": self.follow_redirects,
        }


_analyzer: Optional[UrlAnalyzer] = None


def get_url_analyzer() -> UrlAnalyzer:
    global _analyzer
    if _analyzer is None:
        # URL_ANALYSIS_FOLLOW_REDIRECTS=false skips only the network step
        # (redirect tracing / reachability). Used for bulk evaluation, where
        # thousands of HEAD requests to synthetic domains would be slow and
        # pointless; every structural check still runs.
        follow = os.environ.get("URL_ANALYSIS_FOLLOW_REDIRECTS", "true").lower() != "false"
        _analyzer = UrlAnalyzer(follow_redirects=follow)
    return _analyzer
