import os
import re
from typing import List, Dict, Any, Optional
from .claim_preprocessing_service import ClaimPreprocessingService
from ..utils.bn_text import is_content, norm

DEFAULT_MAX_QUERIES = int(os.environ.get("MAX_SEARCH_QUERIES", "5"))

def clean_quotes_and_symbols(text: str) -> str:
    """Removes curly and straight quotes, brackets, and redundant punctuation."""
    if not text:
        return ""
    # Strip quotes
    text = re.sub(r'[\u2018\u2019\u201C\u201D\'"`]', ' ', text)
    # Strip brackets
    text = re.sub(r'[()\[\]{}]', ' ', text)
    # Collapse whitespace
    return " ".join(text.split()).strip()

class QueryGenerationService:
    """
    Generates high-yield search queries for news events, announcements,
    political visits, sports competitions, educational circulars, and claims.
    """

    def __init__(self, max_queries: int = DEFAULT_MAX_QUERIES):
        self.max_queries = max_queries
        self.preprocessor = ClaimPreprocessingService()

    def generate_queries(
        self,
        claim_text: str,
        processed_data: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        if not processed_data:
            processed_data = self.preprocessor.process_claim(claim_text)

        normalized = processed_data.get("normalized_text", "").strip()
        lang = processed_data.get("language", "bn")
        temporal_profile = processed_data.get("temporal_profile") or {}
        timeline_scope = temporal_profile.get("timeline_scope", "GENERAL")
        current_year = temporal_profile.get("current_year")

        # Clean quotes from normalized text
        clean_claim = clean_quotes_and_symbols(normalized).rstrip(".!?। ")

        # "<statement>: <speaker>" -- outlets often word the attribution differently,
        # so the statement alone is searched as well.
        statement, speaker = clean_claim, ""
        if ":" in clean_claim:
            head, _, tail = clean_claim.rpartition(":")
            if head.strip() and 0 < len(tail.split()) <= 4:
                statement, speaker = head.strip(), tail.strip()

        # Key terms in their original order: content words of the statement,
        # without function words or negators (search engines ignore those).
        raw_words = re.findall(r'[\u0980-\u09FFa-zA-Z0-9]+', statement)
        # Time words are handled by the search's date filter, not as terms
        time_words = {norm(w) for m in temporal_profile.get("all_markers", []) for w in str(m).split()}
        key_terms = [w for w in raw_words if is_content(norm(w)) and norm(w) not in time_words]

        # The main clause on its own, for claims that add details in further
        # clauses ("X উদ্ধার, চিরকুটে লেখা ছিল …"): reports often carry only that.
        main_clause = ""
        clauses = [c.strip() for c in re.split(r"[,;:–—]|\s-\s", statement) if c.strip()]
        if len(clauses) >= 2:
            main_clause = max(clauses, key=lambda c: sum(1 for w in c.split() if is_content(norm(w))))

        # The most specific terms (longer words are names, places, technical terms),
        # kept in their original order
        ranked = sorted(range(len(key_terms)), key=lambda i: -len(key_terms[i]))[:4]
        specific = [key_terms[i] for i in sorted(ranked)]

        queries: List[str] = []
        if clean_claim:
            queries.append(clean_claim)                       # the headline as written
        if statement != clean_claim:
            queries.append(statement)                         # without the speaker
        if main_clause and len(main_clause.split()) >= 3:
            queries.append(main_clause)                       # the main statement alone
        if len(key_terms) >= 3:
            queries.append(" ".join(key_terms[:7]))           # the proposition's terms
        if speaker and key_terms:
            queries.append(f"{speaker} {' '.join(key_terms[-3:])}")
        if timeline_scope in ("DAY", "MONTH", "YEAR") and current_year and key_terms:
            queries.append(f"{' '.join(key_terms[:5])} {current_year}")
        if lang == "en" and key_terms:
            queries.append(f"{' '.join(key_terms[:5])} Bangladesh")

        # Fallback if list is short
        if len(queries) < 4 and len(specific) >= 2:
            queries.append(" ".join(specific))

        # Deduplicate while preserving order
        unique_queries = []
        for q in queries:
            q_clean = " ".join(q.split())
            if q_clean and q_clean not in unique_queries:
                unique_queries.append(q_clean)

        return unique_queries[:self.max_queries]
