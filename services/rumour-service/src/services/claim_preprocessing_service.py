import re
import unicodedata
from typing import Dict, Any, List
import datetime
from ..utils.text_normalizer import normalize_bengali_text, detect_language

# Known entities and authority terms in Bengali and English
KNOWN_ENTITIES = [
    # Authorities & Organizations
    ("ইউজিসি", "UGC"),
    ("বিশ্ববিদ্যালয় মঞ্জুরি কমিশন", "University Grants Commission"),
    ("শিক্ষা মন্ত্রণালয়", "Ministry of Education"),
    ("প্রাথমিক ও গণশিক্ষা মন্ত্রণালয়", "Ministry of Primary and Mass Education"),
    ("ঢাকা বিশ্ববিদ্যালয়", "Dhaka University"),
    ("বুয়েট", "BUET"),
    ("জাতীয় বিশ্ববিদ্যালয়", "National University"),
    ("স্বাস্থ্য অধিদপ্তর", "DGHS"),
    ("পিআইডি", "PID"),
    ("বাংলাদেশ ব্যাংক", "Bangladesh Bank"),
    ("নির্বাচন কমিশন", "Election Commission"),
    # General institutions
    ("বিশ্ববিদ্যালয়", "University"),
    ("স্কুল", "School"),
    ("কলেজ", "College"),
    ("মাদ্রাসা", "Madrasa"),
    ("শিক্ষা প্রতিষ্ঠান", "Educational Institutions"),
    ("বার্ন ইনস্টিটিউট", "Burn Institute"),
    ("জাতীয় বার্ন ও প্লাস্টিক সার্জারি ইনস্টিটিউট", "National Burn & Plastic Surgery Institute"),
    ("শেখ হাসিনা বার্ন ইনস্টিটিউট", "Sheikh Hasina Burn Institute"),
    ("ঢাকা মেডিকেল", "Dhaka Medical College Hospital"),
    ("ঢামেক", "DMCH"),
    ("ফায়ার সার্ভিস", "Fire Service"),
    ("ফায়ার সার্ভিস", "Fire Service"),
    ("হাসপাতাল", "Hospital"),
    ("পুলিশ", "Police"),
    ("পরীক্ষা", "Exam"),
    ("এইচএসসি", "HSC"),
    ("এসএসসি", "SSC"),
]

# Action / Stance tokens
ACTION_KEYWORDS = [
    # Closures / Notices / Classes / Exams
    "বন্ধ", "ছুটি", "স্থগিত", "বাতিল", "ঘোষণা", "বিজ্ঞপ্তি", "প্রজ্ঞাপন",
    "চালু", "খোলা", "পুনরায়", "নিষেধাজ্ঞা", "অনুমোদন",
    "ক্লাস", "পরীক্ষা", "ক্লাস-পরীক্ষা",
    # Accidents / Disasters / Casualties / Hospitalization
    "আগুন", "অগ্নিকাণ্ড", "অগ্নিকান্ড", "দগ্ধ", "আহত", "ভর্তি", "হাসপাতাল",
    "মৃত্যু", "নিহত", "মৃত", "লাশ", "উদ্ধার", "বিস্ফোরণ", "দুর্ঘটনা", "আক্রান্ত",
    # Law enforcement & Reporting actions
    "গ্রেপ্তার", "আটক", "তদন্ত", "মামলা", "হামলা", "সংঘর্ষ",
    # English equivalents
    "closed", "holiday", "postponed", "cancelled", "circular", "notice", "shutdown",
    "class", "classes", "exam", "exams",
    "fire", "injured", "burnt", "burn", "admitted", "hospitalized", "dead", "died", "accident", "explosion"
]

# Granular Temporal Markers & Categories
# The search is restricted to a period ONLY when the claim uses a relative time
# word (আজকে, গতকাল, আগামীকাল, পরশু, এই মাসে, আগামী বছর ...). A calendar date
# ("১৫ নভেম্বর") or a year number ("২০২৬") does not restrict it: such claims
# are searched without a date limit.
#
# Bangla words are matched as whole words: "কাল" must not fire inside "সকাল" or
# "বিকাল", nor "আজ" inside a name like "আজাদ". Python's \b does not work around
# Bangla vowel signs, so explicit look-arounds are used.
_BN_L = r'(?<![ঀ-৿\w])'
_BN_R = r'(?![ঀ-৿\w])'


def _bn_words(*words: str) -> str:
    # "আগামী" is often typed "আগামি"; accept both spellings
    variants = set()
    for w in words:
        variants.add(w)
        if "আগামী" in w:
            variants.add(w.replace("আগামী", "আগামি"))
    alts = "|".join(sorted((w.replace(" ", r"\s*") for w in variants), key=len, reverse=True))
    return _BN_L + "(" + alts + ")" + _BN_R


# 1. Immediate / Day-Level (window: about 3 days)
DAY_LEVEL_PATTERNS = [
    _bn_words("আজ", "আজকে", "আজকের", "আজই", "আজও", "আগামীকাল", "আগামীকালের", "আগামী কাল",
              "কাল", "কালকে", "কালকের", "গতকাল", "গতকালের", "গত কাল", "পরশু", "আগামী পরশু",
              "গত পরশু", "আজ রাতে", "গত রাতে", "কাল রাতে", "এইমাত্র"),
    # Banglish
    r'\b(aj|aaj|ajke|aajke|ajker|aajker|kal|kaal|kalke|kaalke|kalker|agamikal|agamikaal|'
    r'agami\s*kal|gotokal|gotokaal|gotokalker|goto\s*kal|gatokal|porshu|porsu)\b',
    r'\b(tomorrow|today|yesterday|day\s*after\s*tomorrow|day\s*before\s*yesterday|tonight|just\s*now)\b',
]

# 2. Month / Week-Level (window: about 35 days)
MONTH_LEVEL_PATTERNS = [
    _bn_words("এই মাস", "এই মাসে", "এই মাসের", "এ মাসে", "চলতি মাস", "চলতি মাসে", "চলতি মাসের",
              "গত মাস", "গত মাসে", "গত মাসের", "আগামী মাস", "আগামী মাসে", "আগামী মাসের",
              "এ সপ্তাহে", "এই সপ্তাহ", "এই সপ্তাহে", "চলতি সপ্তাহে", "গত সপ্তাহে", "আগামী সপ্তাহে"),
    # Banglish
    r'\b(ei\s*mash|ei\s*mashe|ei\s*mase|ei\s*mas\s*e|ei\s*mash\s*e|e\s*mashe|cholti\s*mash|'
    r'cholti\s*mashe|goto\s*mash|goto\s*mashe|agami\s*mash|agami\s*mashe|ei\s*shoptah|'
    r'ei\s*shoptahe|ei\s*saptahe|ei\s*soptahe|ei\s*week)\b',
    r'\b(this\s*month|current\s*month|last\s*month|next\s*month|this\s*week|last\s*week|next\s*week)\b',
]

# 3. Year-level (window: about a year)
YEAR_LEVEL_PATTERNS = [
    _bn_words("এই বছর", "এই বছরে", "এই বছরের", "চলতি বছর", "চলতি বছরে", "চলতি বছরের",
              "গত বছর", "গত বছরে", "গত বছরের", "আগামী বছর", "আগামী বছরে", "আগামী বছরের"),
    r'\b(ei\s*bochor|ei\s*bochore|cholti\s*bochor|cholti\s*bochore|goto\s*bochor|'
    r'agami\s*bochor|agami\s*bochore)\b',
    r'\b(this\s*year|current\s*year|last\s*year|next\s*year)\b',
]

class ClaimPreprocessingService:
    """
    Dedicated service for cleaning claims and extracting structured entities,
    temporal anchors, and action keywords without altering semantic meaning.
    """

    def process_claim(self, claim_text: str) -> Dict[str, Any]:
        raw_text = claim_text.strip() if claim_text else ""
        normalized_text = normalize_bengali_text(raw_text)
        language = detect_language(normalized_text)

        # 1. Granular Temporal Anchoring
        day_matches = []
        for pat in DAY_LEVEL_PATTERNS:
            found = re.findall(pat, normalized_text, flags=re.IGNORECASE)
            for f in found:
                if isinstance(f, tuple):
                    day_matches.extend([x for x in f if x])
                elif f:
                    day_matches.append(f)

        month_matches = []
        for pat in MONTH_LEVEL_PATTERNS:
            found = re.findall(pat, normalized_text, flags=re.IGNORECASE)
            for f in found:
                if isinstance(f, tuple):
                    month_matches.extend([x for x in f if x])
                elif f:
                    month_matches.append(f)

        year_matches = []
        for pat in YEAR_LEVEL_PATTERNS:
            found = re.findall(pat, normalized_text, flags=re.IGNORECASE)
            for f in found:
                if isinstance(f, tuple):
                    year_matches.extend([x for x in f if x])
                elif f:
                    year_matches.append(f)

        day_matches = list(dict.fromkeys(day_matches))
        month_matches = list(dict.fromkeys(month_matches))
        year_matches = list(dict.fromkeys(year_matches))

        # Determine Primary Temporal Scope
        current_year = datetime.datetime.now().year
        if day_matches:
            timeline_scope = "DAY"
            max_age_days = 3.0  # At most 72 hours old for day-level notices
            # Search the past week, then keep only articles dated inside the
            # 3-day window (matching uses each article's publication metadata).
            timelimit_param = "w"
            strict_date_filtering = True
            display_scope = "Immediate / Day-Level (আজ/কাল/পরশু)"
        elif month_matches:
            timeline_scope = "MONTH"
            max_age_days = 35.0  # Within a month
            timelimit_param = "m"
            strict_date_filtering = True
            display_scope = "Monthly Timeline (চলতি/এই মাস)"
        elif year_matches:
            timeline_scope = "YEAR"
            max_age_days = 365.0
            timelimit_param = "y"
            strict_date_filtering = True
            display_scope = "Annual Timeline (চলতি/এই বছর)"
        else:
            timeline_scope = "GENERAL"
            max_age_days = 3650.0  # General historical/policy claims
            timelimit_param = None
            strict_date_filtering = False
            display_scope = "General Policy / Timeless Claim"

        temporal_profile = {
            "has_temporal_anchor": timeline_scope != "GENERAL",
            "timeline_scope": timeline_scope,
            "display_scope": display_scope,
            "day_markers": day_matches,
            "month_markers": month_matches,
            "year_markers": year_matches,
            "all_markers": day_matches + month_matches + year_matches,
            "timelimit_param": timelimit_param,
            "max_acceptable_age_days": max_age_days,
            "strict_date_filtering": strict_date_filtering,
            "current_year": current_year
        }

        # 2. Extract Entities
        matched_entities = []
        for bn_name, en_name in KNOWN_ENTITIES:
            if bn_name in normalized_text or (en_name.lower() in normalized_text.lower()):
                matched_entities.append({"bn": bn_name, "en": en_name})

        # 3. Extract Action / Event Keywords
        matched_actions = []
        for act in ACTION_KEYWORDS:
            if act in normalized_text.lower():
                matched_actions.append(act)

        # 4. Extract Core Content Tokens (filtering basic stopwords)
        stopwords_bn = {"এই", "সেই", "সব", "সকল", "একটি", "হবে", "আছে", "ছিল", "থাকবে", "করেছে", "করবে", "থেকে", "দিয়ে", "বা", "ও", "এবং"}
        words = re.findall(r'[\u0980-\u09FFa-zA-Z0-9]+', normalized_text)
        content_keywords = [w for w in words if len(w) > 2 and w.lower() not in stopwords_bn]

        return {
            "raw_text": raw_text,
            "normalized_text": normalized_text,
            "language": language,
            "entities": matched_entities,
            "actions": matched_actions,
            "temporal_expressions": temporal_profile["all_markers"],
            "temporal_profile": temporal_profile,
            "keywords": content_keywords[:10],
            "claim_length": len(normalized_text)
        }
