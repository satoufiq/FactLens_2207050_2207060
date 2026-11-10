import re
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, Any
import dateutil.parser

# Bengali to English digit translation map
BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

# Bengali Month names to English
BN_MONTHS = {
    "জানুয়ারি": "January", "জানুয়ারি": "January",
    "ফেব্রুয়ারি": "February", "ফেব্রুয়ারি": "February",
    "মার্চ": "March",
    "এপ্রিল": "April",
    "মে": "May",
    "জুন": "June",
    "জুলাই": "July",
    "আগস্ট": "August", "আগষ্ট": "August",
    "সেপ্টেম্বর": "September",
    "অক্টোবর": "October",
    "নভেম্বর": "November",
    "ডিসেম্বর": "December"
}

def convert_bengali_numerals(text: str) -> str:
    """Translates Bengali digits (০-৯) into ASCII digits (0-9)."""
    if not text:
        return ""
    return text.translate(BN_DIGITS)

def normalize_date_text(text: str) -> str:
    """Normalizes Bengali date string into standard transliterated format."""
    if not text:
        return ""
    norm = convert_bengali_numerals(text)
    for bn_month, en_month in BN_MONTHS.items():
        norm = re.sub(re.escape(bn_month), en_month, norm, flags=re.IGNORECASE)
    return norm

def extract_date_from_url(url: str) -> Optional[datetime]:
    """Extracts date patterns commonly embedded in news URLs (e.g., /2023/10/15/ or /2022-05-12/)."""
    if not url:
        return None
    
    # 1. /YYYY/MM/DD/ or /YYYY/MM/
    m_full = re.search(r'/(20\d\d)[/-](0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])(?:[/-]|\b|\.)', url)
    if m_full:
        try:
            year, month, day = int(m_full.group(1)), int(m_full.group(2)), int(m_full.group(3))
            return datetime(year, month, day, tzinfo=timezone.utc)
        except ValueError:
            pass

    # 2. Compact /YYYYMMDD/
    m_compact = re.search(r'/(20\d\d)(0[1-9]|1[0-2])([0-2]\d|3[01])(?:[/-]|\b|\.)', url)
    if m_compact:
        try:
            year, month, day = int(m_compact.group(1)), int(m_compact.group(2)), int(m_compact.group(3))
            return datetime(year, month, day, tzinfo=timezone.utc)
        except ValueError:
            pass

    # 3. /YYYY/MM/
    m_year_month = re.search(r'/(20\d\d)[/-](0?[1-9]|1[0-2])(?:[/-]|\b)', url)
    if m_year_month:
        try:
            year, month = int(m_year_month.group(1)), int(m_year_month.group(2))
            return datetime(year, month, 1, tzinfo=timezone.utc)
        except ValueError:
            pass

    # 4. Trailing or segment year /2021/
    m_year = re.search(r'/(20\d\d)/', url)
    if m_year:
        try:
            year = int(m_year.group(1))
            return datetime(year, 1, 1, tzinfo=timezone.utc)
        except ValueError:
            pass

    return None

def parse_relative_time_string(text: str) -> Optional[datetime]:
    """Parses relative time expressions such as '3 hours ago', '2 days ago', '২ দিন আগে', '৩ বছর আগে'."""
    if not text:
        return None

    norm = convert_bengali_numerals(text.lower())
    now = datetime.now(timezone.utc)

    # Years ago / বছর আগে
    m_year = re.search(r'(\d+)\s*(?:year|years|বছর)\s*(?:ago|আগে)', norm)
    if m_year:
        years = int(m_year.group(1))
        return now - timedelta(days=years * 365)

    # Months ago / মাস আগে
    m_month = re.search(r'(\d+)\s*(?:month|months|মাস)\s*(?:ago|আগে)', norm)
    if m_month:
        months = int(m_month.group(1))
        return now - timedelta(days=months * 30)

    # Weeks ago / সপ্তাহ আগে
    m_week = re.search(r'(\d+)\s*(?:week|weeks|সপ্তাহ)\s*(?:ago|আগে)', norm)
    if m_week:
        weeks = int(m_week.group(1))
        return now - timedelta(weeks=weeks)

    # Days ago / দিন আগে
    m_day = re.search(r'(\d+)\s*(?:day|days|দিন)\s*(?:ago|আগে)', norm)
    if m_day:
        days = int(m_day.group(1))
        return now - timedelta(days=days)

    # Hours / Minutes / ঘণ্টা / মিনিট
    if re.search(r'(?:hour|hours|minute|minutes|ঘণ্টা|ঘন্টা|মিনিট)\s*(?:ago|আগে)', norm) or "yesterday" in norm or "গতকাল" in norm:
        return now - timedelta(days=1)

    return None

def extract_date_from_text(text: str) -> Optional[datetime]:
    """Searches text/snippet for explicit Bengali or English dates."""
    if not text:
        return None
    
    norm = normalize_date_text(text)

    # Look for "DD Month YYYY" or "Month DD, YYYY"
    m_date = re.search(
        r'\b(0?[1-9]|[12]\d|3[01])\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d\d)\b',
        norm,
        re.IGNORECASE
    )
    if m_date:
        try:
            day, month_str, year = int(m_date.group(1)), m_date.group(2), int(m_date.group(3))
            parsed = dateutil.parser.parse(f"{day} {month_str} {year}")
            return parsed.replace(tzinfo=timezone.utc)
        except Exception:
            pass

    # Look for YYYY-MM-DD
    m_iso = re.search(r'\b(20\d\d)[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b', norm)
    if m_iso:
        try:
            year, month, day = int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3))
            return datetime(year, month, day, tzinfo=timezone.utc)
        except ValueError:
            pass

    # Look for 4-digit years like 2021, 2022, 2023, 2024
    m_y = re.search(r'\b(201\d|202[0-9])\b', norm)
    if m_y:
        try:
            year = int(m_y.group(1))
            return datetime(year, 1, 1, tzinfo=timezone.utc)
        except ValueError:
            pass

    return None

def resolve_article_publication_date(
    raw_date: Optional[str] = None,
    url: Optional[str] = None,
    snippet: Optional[str] = None,
    content: Optional[str] = None
) -> Tuple[Optional[datetime], Optional[float]]:
    """
    Multilayer zero-cost publication date resolver:
    1. Parse raw_date from API/Trafilatura metadata.
    2. Fallback to URL path date extraction.
    3. Fallback to relative time parsing in snippet/snippet text.
    4. Fallback to explicit date regex in snippet/content.
    
    Returns: (parsed_datetime, age_in_days)
    """
    parsed_dt: Optional[datetime] = None
    now = datetime.now(timezone.utc)

    # 1. Parse raw_date string
    if raw_date and isinstance(raw_date, str) and raw_date.strip():
        clean_raw = raw_date.strip()
        try:
            norm_raw = normalize_date_text(clean_raw)
            dt = dateutil.parser.parse(norm_raw)
            if not dt.tzinfo:
                dt = dt.replace(tzinfo=timezone.utc)
            parsed_dt = dt
        except Exception:
            # Try regex or relative on raw_date string
            parsed_dt = parse_relative_time_string(clean_raw) or extract_date_from_text(clean_raw)

    # 2. Extract from URL
    if not parsed_dt and url:
        parsed_dt = extract_date_from_url(url)

    # 3. Parse relative time in snippet
    if not parsed_dt and snippet:
        parsed_dt = parse_relative_time_string(snippet)

    # 4. Extract explicit date from snippet or content header
    if not parsed_dt and snippet:
        parsed_dt = extract_date_from_text(snippet)

    if not parsed_dt and content:
        # Check first 500 characters of content
        parsed_dt = extract_date_from_text(content[:500])

    # Calculate age in days
    age_days: Optional[float] = None
    if parsed_dt:
        diff = now - parsed_dt
        age_days = max(0.0, diff.total_seconds() / 86400.0)

    return parsed_dt, age_days

