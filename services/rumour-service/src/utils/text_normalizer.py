import re
import unicodedata

def detect_language(text: str) -> str:
    """Detect if text contains Bengali characters."""
    bengali_chars = len(re.findall(r'[\u0980-\u09FF]', text))
    total_chars = len(re.findall(r'\w', text))
    if total_chars == 0:
        return "unknown"
    ratio = bengali_chars / total_chars
    if ratio > 0.3:
        return "bn"
    elif ratio > 0.05:
        return "mixed"
    return "en"

def normalize_bengali_text(text: str) -> str:
    """
    Normalizes Bengali text by:
    - Stripping HTML/emojis/social media noise (hashtags, @mentions, URL patterns)
    - Normalizing Unicode representations (NFC)
    - Collapsing redundant punctuation and whitespace
    """
    if not text:
        return ""

    # Normalize unicode
    text = unicodedata.normalize('NFC', text)

    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)

    # Remove hashtags and mentions
    text = re.sub(r'[@#]\w+', '', text)

    # De-obfuscate intra-word apostrophes, quotes, and punctuation symbols
    # e.g., আ'গু'ন -> আগুন, দ'গ্ধ-আ'হত -> দগ্ধ-আহত, ব*ন্ধ -> বন্ধ
    text = re.sub(r"['\"`’‘*^~_]", "", text)
    # Slashes / dots / backslashes typed inside a Bangla word to dodge filters:
    # বো/মাসদৃশ -> বোমাসদৃশ, মা/রা -> মারা, ধ.র্ষ.ণ -> ধর্ষণ (Bangla digits are
    # excluded so ১.৫ stays a number)
    _bn_letter = r"[ঀ-৥ৰ-৿]"
    text = re.sub(rf"(?<={_bn_letter})[/\\.]+(?={_bn_letter})", "", text)

    # Remove common social media prefixes like "URGENT!!", "ব্রেকিং নিউজ:", "Please share!"
    noise_patterns = [
        r'^\s*(urgent|breaking\s*news|please\s*share|viral|alert)[:! \-]*',
        r'^\s*(জরুরি|ব্রেকিং\s*নিউজ|শেয়ার\s*করুন|ভাইরাল)[:! \-]*'
    ]
    for pat in noise_patterns:
        text = re.sub(pat, '', text, flags=re.IGNORECASE)

    # Remove emojis
    text = re.sub(r'[\U00010000-\U0010ffff]', '', text)

    # Collapse multiple punctuations except Bengali dari (।)
    text = re.sub(r'([!?.,]){2,}', r'\1', text)

    # Collapse excess whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    return text

