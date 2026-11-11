import tldextract
from typing import Dict, Any, Optional
from urllib.parse import urlparse

# Canonical registries for Bangladesh and international authoritative domains
PRIMARY_OFFICIAL_DOMAINS = {
    "gov.bd": "Bangladesh Government",
    "ugc.gov.bd": "University Grants Commission of Bangladesh",
    "moedu.gov.bd": "Ministry of Education Bangladesh",
    "mopme.gov.bd": "Ministry of Primary and Mass Education",
    "pressinform.gov.bd": "Press Information Department (PID)",
    "bangladesh.gov.bd": "Bangladesh National Web Portal",
    "dghs.gov.bd": "Directorate General of Health Services",
    "bpsc.gov.bd": "Bangladesh Public Service Commission",
    "banbeis.gov.bd": "BANBEIS Bangladesh",
    "police.gov.bd": "Bangladesh Police",
    "nbr.gov.bd": "National Board of Revenue",
    "ecs.gov.bd": "Election Commission Bangladesh",
    "cabinet.gov.bd": "Cabinet Division Bangladesh",
    "ac.bd": "Academic Institution Bangladesh",
    "du.ac.bd": "University of Dhaka",
    "buet.ac.bd": "BUET",
    "ru.ac.bd": "University of Rajshahi",
    "cu.ac.bd": "University of Chittagong",
    "sust.ac.bd": "Shahjalal University of Science & Technology",
    "ju.ac.bd": "Jahangirnagar University",
    "bup.edu.bd": "Bangladesh University of Professionals",
    # Official National News Agency
    "bssnews.net": "Bangladesh Sangbad Sangstha (BSS National News Wire)",
}

# Established Mainstream Official News Media treated as Official Verified Sources
OFFICIAL_NEWS_DOMAINS = {
    "prothomalo.com": "Prothom Alo",
    "thedailystar.net": "The Daily Star",
    "bdnews24.com": "bdnews24",
    "ittefaq.com.bd": "Daily Ittefaq",
    "banglatribune.com": "Bangla Tribune",
    "somoynews.tv": "Somoy News",
    "dhakatribune.com": "Dhaka Tribune",
    "tbsnews.net": "The Business Standard",
    "kalerkantho.com": "Kaler Kantho",
    "jugantor.com": "Daily Jugantor",
    "channelionline.com": "Channel i Online",
    "jamuna.tv": "Jamuna Television",
    "independent24.tv": "Independent Television",
    "dbcnews.tv": "DBC News",
    "ekattor.tv": "Ekattor TV",
    "unb.com.bd": "United News of Bangladesh (UNB)",
    "sarabangla.net": "Sarabangla",
    "dailynayadiganta.com": "Daily Naya Diganta",
    "jagonews24.com": "Jago News 24",
    "dhakapost.com": "Dhaka Post",
    "rtvonline.com": "RTV Online",
    "satv.tv": "SATV",
    "satv.com.bd": "SATV",
    "ntvbd.com": "NTV",
    "desh.tv": "Desh TV",
    "boishakhionline.com": "Boishakhi TV",
    "banglavision.tv": "BanglaVision",
    "atnbangla.tv": "ATN Bangla",
    "atnnewstv.com": "ATN News",
    "news24bd.tv": "NEWS24",
    "maasranga.tv": "Maasranga TV",
    "probashirdiganta.com": "Probashir Diganta",
    "banglanews24.com": "Banglanews24",
    "bbc.com": "BBC News",
    "reuters.com": "Reuters",
    "apnews.com": "Associated Press",
    "aljazeera.com": "Al Jazeera",
}

SECONDARY_NEWS_DOMAINS = {
    "dailyamardesh.com": "Amar Desh",
    "risingbd.com": "Risingbd",
    "manabzamin.com": "Daily Manab Zamin",
    "bhorerkagoj.com": "Bhorer Kagoj",
    "protidinersangbad.com": "Protidin-er Sangbad",
    "dainikshiksha.com": "Dainik Shiksha",
    "agamirsomoy.com": "Agamir Somoy",
    "onenewsbd.com": "One News BD",
    "banglabazarpatrika.net": "Banglabazar Patrika",
}

LOW_CREDIBILITY_DOMAINS = {
    "blogspot.com": "Personal Blog",
    "wordpress.com": "Personal Blog",
    "facebook.com": "Social Media (Facebook)",
    "twitter.com": "Social Media (Twitter/X)",
    "x.com": "Social Media (X)",
    "tiktok.com": "Social Media (TikTok)",
    "youtube.com": "Social Media (YouTube)",
    "instagram.com": "Social Media (Instagram)",
    "telegra.ph": "Anonymous Post",
    "medium.com": "Blogger Platform",
}

def evaluate_source_reliability(url: str, publisher: Optional[str] = None) -> Dict[str, Any]:
    """
    Evaluates source reliability score (0-100) based on domain hierarchy,
    canonical institution registry, and official news publisher credentials.
    Official national news organizations are treated with official authority.
    """
    if not url:
        return {
            "source_reliability": 20.0,
            "tier": "LOW_CREDIBILITY",
            "domain": "unknown",
            "is_primary_official": False,
            "source_name": publisher or "Unknown Source"
        }

    parsed = urlparse(url.strip())
    hostname = (parsed.hostname or "").lower()
    extracted = tldextract.extract(url)
    registered_domain = f"{extracted.domain}.{extracted.suffix}".lower()
    suffix = extracted.suffix.lower()

    # 1. Primary Official Government, UGC, and National News Agency Check
    for official_dom in sorted(PRIMARY_OFFICIAL_DOMAINS.keys(), key=len, reverse=True):
        official_name = PRIMARY_OFFICIAL_DOMAINS[official_dom]
        if hostname == official_dom or hostname.endswith(f".{official_dom}") or registered_domain == official_dom:
            return {
                "source_reliability": 98.0,
                "tier": "PRIMARY_OFFICIAL",
                "domain": hostname,
                "is_primary_official": True,
                "source_name": official_name if not publisher else f"{official_name} ({publisher})"
            }

    if suffix == "gov.bd" or suffix.endswith(".gov.bd"):
        return {
            "source_reliability": 98.0,
            "tier": "PRIMARY_OFFICIAL",
            "domain": hostname,
            "is_primary_official": True,
            "source_name": publisher or f"Official Government Portal ({hostname})"
        }

    if suffix == "ac.bd" or suffix.endswith(".ac.bd") or suffix == "edu.bd":
        return {
            "source_reliability": 95.0,
            "tier": "PRIMARY_OFFICIAL",
            "domain": hostname,
            "is_primary_official": True,
            "source_name": publisher or f"Official Academic Portal ({hostname})"
        }

    # 2. Mainstream Official News Media (Treated as Official Sources)
    for news_dom in sorted(OFFICIAL_NEWS_DOMAINS.keys(), key=len, reverse=True):
        news_name = OFFICIAL_NEWS_DOMAINS[news_dom]
        if hostname == news_dom or hostname.endswith(f".{news_dom}") or registered_domain == news_dom:
            return {
                "source_reliability": 94.0,
                "tier": "PRIMARY_OFFICIAL",
                "domain": hostname,
                "is_primary_official": True,  # User specification: official news treated as official source
                "source_name": news_name
            }

    # 3. Secondary Regional / Online News Outlets
    for sec_dom in sorted(SECONDARY_NEWS_DOMAINS.keys(), key=len, reverse=True):
        sec_name = SECONDARY_NEWS_DOMAINS[sec_dom]
        if hostname == sec_dom or hostname.endswith(f".{sec_dom}") or registered_domain == sec_dom:
            return {
                "source_reliability": 80.0,
                "tier": "SECONDARY_NEWS",
                "domain": hostname,
                "is_primary_official": False,
                "source_name": sec_name
            }

    # 4. Low Credibility / Blogs / Social Media
    for low_dom, low_name in LOW_CREDIBILITY_DOMAINS.items():
        if hostname == low_dom or hostname.endswith(f".{low_dom}") or registered_domain == low_dom:
            return {
                "source_reliability": 22.0,
                "tier": "LOW_CREDIBILITY",
                "domain": hostname,
                "is_primary_official": False,
                "source_name": low_name
            }

    # Generic fallback
    if any(k in hostname for k in ["news", "tv", "times", "patrika", "daily", "barta", "protidin"]):
        return {
            "source_reliability": 70.0,
            "tier": "SECONDARY_NEWS",
            "domain": hostname,
            "is_primary_official": False,
            "source_name": publisher or hostname.removeprefix("www.")
        }

    return {
        "source_reliability": 40.0,
        "tier": "UNVERIFIED_SOURCE",
        "domain": hostname,
        "is_primary_official": False,
        "source_name": publisher or hostname.removeprefix("www.")
    }
