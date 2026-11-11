"""
Bangla / English text helpers for claim-evidence matching.

Everything here is generic language handling -- normalisation, a light
inflection stemmer, negation and refutation detection, clause splitting. No
rule refers to any particular news story.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Iterable, List, Optional, Sequence, Set

from rapidfuzz import fuzz

from .text_normalizer import normalize_bengali_text

_ZW = re.compile(r"[​‌‍﻿]")
_TOKEN = re.compile(r"[ঀ-৿a-z0-9]+")
# Sentence boundaries: danda, ! ?, newline, the "|" before a site name, and ". "
_SENTENCE_SPLIT = re.compile(r"([।!?\n|]+|\.\s+|\.$)")
# Clause boundaries inside a sentence (the colon separates a quote from its speaker)
_CLAUSE_SPLIT = re.compile(r"[,;:–—]|\s-\s|\(|\)")


def norm(text: Optional[str]) -> str:
    """Canonical form used on both the claim and the evidence."""
    if not text:
        return ""
    text = normalize_bengali_text(text)  # NFC, strips quotes/URLs/emoji
    text = _ZW.sub("", text)
    text = unicodedata.normalize("NFC", text).lower()
    # Khanda-ta and ta-hasanta are the same letter in practice (বিদ্যুৎ / বিদ্যুত)
    text = text.replace("ৎ", "ত")
    return text


def _n(words: Iterable[str]) -> Set[str]:
    return {norm(w) for w in words}


# Grammatical negators (standalone tokens)
NEGATORS: Set[str] = _n([
    "না", "নয়", "নই", "নও", "নন", "নেই", "নাই", "নি", "নহে", "নহ", "নয়কো",
    "not", "no", "never", "nor", "neither", "without", "cannot",
    "didnt", "doesnt", "isnt", "wasnt", "werent", "hasnt", "havent", "hadnt",
    "cant", "wont", "arent", "couldnt", "shouldnt", "wouldnt",
])
# Past-tense negative verb endings: লাগেনি, ঘটেনি, হয়নি, দেয়নি, যাননি, করেননি
NEG_SUFFIXES: List[str] = sorted(_n(["েনি", "য়নি", "ননি", "ায়নি", "ইনি"]), key=len, reverse=True)

# Words that declare a statement false (they negate what they describe)
REFUTERS: Set[str] = _n([
    "গুজব", "মিথ্যা", "ভিত্তিহীন", "ভুয়া", "ভুয়া", "অসত্য", "অপপ্রচার", "বানোয়াট",
    "মনগড়া", "ভুল", "বিভ্রান্তিকর",
    "fake", "false", "hoax", "rumour", "rumor", "baseless", "debunked", "debunk",
    "misleading", "fabricated", "untrue", "unfounded", "misinformation", "disinformation",
])

# Hedges: the statement is a possibility, not an assertion
HEDGES: Set[str] = _n([
    "সম্ভবত", "সম্ভাব্য", "সম্ভাবনা", "আশঙ্কা", "ধারণা", "সন্দেহ", "হয়তো",
    "may", "might", "could", "possibly", "probably", "likely", "suspected", "perhaps",
])
_PARE = norm("পারে")
_HOTE = norm("হতে")


def is_hedged(clause: Sequence[str], anchor_positions: Sequence[int], window: int = 4) -> bool:
    """True when the clause only says the matched statement *may* be so."""
    if not anchor_positions:
        return False
    for i, tok in enumerate(clause):
        hedge = tok in HEDGES or (tok == _PARE and i > 0 and clause[i - 1] == _HOTE)
        if hedge and min(abs(i - p) for p in anchor_positions) <= window:
            return True
    return False


# Function words and news boilerplate that carry no claim content
STOPWORDS: Set[str] = _n([
    "এই", "এ", "সেই", "সে", "ও", "এবং", "বা", "কিন্তু", "তবে", "যে", "যা", "যার", "যিনি", "এক", "একটি",
    "থেকে", "জন্য", "করে", "করা", "করেন", "করেছেন", "করেছে", "হয়", "হয়ে", "হয়েছে", "হবে", "ছিল",
    "ছিলেন", "আছে", "আছেন", "দিয়ে", "নিয়ে", "পর", "পরে", "আগে", "মধ্যে", "সঙ্গে", "সাথে", "তার",
    "তাদের", "তিনি", "তারা", "কি", "কী", "কার", "কেন", "কিভাবে", "কীভাবে", "কোনো", "কোন", "বলে", "বলেন", "বলেছেন", "জানান",
    "জানিয়েছেন", "জানা", "গেছে", "যায়", "হলো", "হল", "এখন", "সব", "সকল", "আর", "অনেক", "প্রতি",
    "থাকবে", "থাকবেন", "থাকছে", "থাকছেন", "থাকে", "হচ্ছে", "হলেন", "হয়েছেন", "যাচ্ছে", "গেলেন",
    "প্রকাশ", "প্রকাশিত", "আপডেট", "অনলাইন", "ডেস্ক", "প্রতিবেদক", "সংবাদদাতা", "ছবি", "সংগৃহীত",
    "ঘণ্টা", "মিনিট", "আগে", "বৃহস্পতিবার", "বুধবার", "মঙ্গলবার", "সোমবার", "রবিবার", "শনিবার", "শুক্রবার",
    "the", "a", "an", "of", "in", "on", "at", "to", "for", "and", "or", "is", "are", "was", "were",
    "be", "been", "by", "with", "from", "that", "this", "it", "as", "has", "have", "had", "said", "says",
    "do", "does", "did", "will", "would", "shall", "should", "can", "could", "may", "might", "there",
])

# Light verbs: they carry tense, not meaning ("আগুন লাগা", "ঘোষণা দেওয়া", "পদত্যাগ করা")
LIGHT_VERB_PREFIXES: List[str] = sorted(_n([
    "লাগ", "লেগ", "কর", "দে", "দিয়", "দিল", "দিচ্", "হয়", "হল", "হচ্", "হব", "নে", "নিয়", "নিল",
    "পড়", "গেছ", "গেল", "ঘট",
]), key=len, reverse=True)

# Relative time words: timing is enforced through the article's publication
# date, and an article written a day later says "আজ" where the claim said "কাল".
TIME_WORDS: Set[str] = _n([
    "আজ", "আজকে", "আজকের", "আজই", "কাল", "কালকে", "কালকের", "আগামীকাল", "আগামীকালের", "গতকাল",
    "গতকালের", "পরশু", "আগামী", "চলতি", "গত", "মাস", "মাসে", "মাসের", "সপ্তাহ", "সপ্তাহে", "বছর", "বছরে",
    "রাতে", "সকালে", "বিকেলে", "এইমাত্র",
    "today", "tomorrow", "yesterday", "tonight", "week", "month", "year",
    "aj", "aaj", "ajke", "aajke", "ajker", "kal", "kalke", "kalker", "agamikal", "gotokal", "porshu",
    "mash", "mashe", "mase", "shoptahe", "bochor",
])

# Clause-initial conjunctions that start a new proposition
CLAUSE_CONJUNCTIONS: Set[str] = _n(["কিন্তু", "তবে", "যদিও", "বরং", "অথচ", "but", "however", "although", "though", "whereas"])

# Inflectional suffixes, longest first. Only one is removed, and only when a
# reasonable stem remains, so the stemmer cannot collapse unrelated words.
_SUFFIXES: List[str] = sorted(_n([
    "গুলোর", "গুলোতে", "গুলোকে", "গুলো", "গুলি", "দেরকে", "দের", "েরা", "রা",
    "কেও", "কেই", "কে", "তেই", "তেও", "তে", "টির", "টিতে", "টিকে", "টি", "টার", "টাকে", "টা",
    "খানা", "য়ের", "য়েরও", "য়ে", "েরও", "েরই", "ের", "এর", "েই", "য়ও", "ও", "ই", "ে",
    "'s", "s",
]), key=len, reverse=True)


def stem(token: str) -> str:
    if token.isascii():
        if len(token) > 4 and token.endswith("s") and not token.endswith("ss"):
            return token[:-1]
        return token
    for suf in _SUFFIXES:
        if suf and token.endswith(suf) and len(token) - len(suf) >= 3:
            return token[: -len(suf)]
    return token


def tokens(text: str) -> List[str]:
    return _TOKEN.findall(text)


def is_negator(tok: str) -> bool:
    if tok in NEGATORS:
        return True
    return len(tok) > 3 and any(tok.endswith(s) for s in NEG_SUFFIXES)


def is_refuter(tok: str) -> bool:
    return tok in REFUTERS or stem(tok) in REFUTERS


def is_content(tok: str) -> bool:
    return (
        len(tok) >= 2
        and tok not in STOPWORDS
        and tok not in TIME_WORDS
        and not is_negator(tok)
        and not tok.isdigit()
    )


def stems_match(a: str, b: str) -> bool:
    """Same word allowing for inflection and minor spelling variation."""
    if a == b:
        return True
    shorter, longer = (a, b) if len(a) <= len(b) else (b, a)
    if len(shorter) >= 3 and longer.startswith(shorter) and len(longer) - len(shorter) <= 3:
        return True
    # Compounds written as one word ("শর্টসার্কিট" for "শর্ট সার্কিট")
    if len(shorter) >= 4 and shorter in longer:
        return True
    if len(shorter) >= 5 and fuzz.ratio(a, b) >= 88:
        return True
    return False


# General antonym pairs: a predicate replaced by its opposite is a contradiction
# even without a negation word ("বন্ধ থাকবে" vs "খোলা থাকবে").
_ANTONYM_PAIRS = [
    ("বন্ধ", "খোলা"), ("বন্ধ", "চালু"), ("স্থগিত", "চালু"), ("বাতিল", "বহাল"),
    ("বাড়বে", "কমবে"), ("বাড়ছে", "কমছে"), ("বেড়েছে", "কমেছে"), ("বৃদ্ধি", "হ্রাস"),
    ("জীবিত", "মৃত"), ("জীবিত", "নিহত"), ("বেঁচে", "মারা"), ("পাস", "ফেল"), ("জয়", "পরাজয়"),
    ("জিতেছে", "হেরেছে"), ("সত্য", "মিথ্যা"), ("গ্রেপ্তার", "মুক্ত"), ("অনুমোদন", "বাতিল"),
    ("open", "closed"), ("open", "shut"), ("increase", "decrease"), ("rise", "fall"),
    ("alive", "dead"), ("won", "lost"), ("approved", "rejected"), ("arrested", "released"),
]
ANTONYMS: dict = {}
for _a, _b in _ANTONYM_PAIRS:
    _a, _b = stem(norm(_a)), stem(norm(_b))
    ANTONYMS.setdefault(_a, set()).add(_b)
    ANTONYMS.setdefault(_b, set()).add(_a)


def has_antonym_of(focus: Sequence[str], clause_stems: Sequence[str]) -> bool:
    """True when the clause uses the opposite of a focus word instead of the word."""
    for f in focus:
        opposites = ANTONYMS.get(f) or next((v for k, v in ANTONYMS.items() if stems_match(f, k)), None)
        if not opposites:
            continue
        if any(s and stems_match(f, s) for s in clause_stems):
            continue  # the word itself is there; negation logic decides
        if any(s and any(stems_match(o, s) for o in opposites) for s in clause_stems):
            return True
    return False



def split_sentences(text: str) -> List[str]:
    """Sentences, each keeping a trailing '?' so a question is still recognisable."""
    parts = _SENTENCE_SPLIT.split(text or "")
    out: List[str] = []
    for i in range(0, len(parts), 2):
        body = parts[i].strip()
        end = parts[i + 1] if i + 1 < len(parts) else ""
        if len(body) > 3:
            out.append(body + ("?" if "?" in end else ""))
    return out


def split_clauses(sentence: str) -> List[List[str]]:
    """Clauses as token lists. Conjunctions and concessive '-লেও' start a new clause."""
    clauses: List[List[str]] = []
    for part in _CLAUSE_SPLIT.split(sentence):
        current: List[str] = []
        for tok in tokens(part):
            if tok in CLAUSE_CONJUNCTIONS and current:
                clauses.append(current)
                current = []
                continue
            current.append(tok)
            if tok.endswith(norm("লেও")) and len(tok) > 4:
                clauses.append(current)
                current = []
        if current:
            clauses.append(current)
    return [c for c in clauses if c]


@dataclass
class ClaimFrame:
    """The claim reduced to what evidence must match."""

    text: str
    content: List[str] = field(default_factory=list)      # stems the evidence must cover
    weights: List[float] = field(default_factory=list)
    speaker: List[str] = field(default_factory=list)      # quoted speaker, not required
    negated: bool = False
    is_question: bool = False
    focus: List[str] = field(default_factory=list)          # what the claim asserts
    # The main statement on its own, when the claim adds further details in
    # other clauses ("X উদ্ধার, চিরকুটে লেখা ছিল ..."). Reports often carry only
    # the main statement; matching it is partial but real support.
    core: List[str] = field(default_factory=list)
    core_weights: List[float] = field(default_factory=list)
    core_text: str = ""


def _weight(stem_: str) -> float:
    # Longer stems are more specific (names, places, technical terms)
    return 1.0 + 0.12 * min(len(stem_), 10)


def polarity(clause: Sequence[str], anchor_positions: Sequence[int], window: int = 3) -> bool:
    """
    True when the clause negates the proposition it shares with the claim.

    A negator or refuting word counts only near a matched content word, so a
    negation about something else in the same clause ("…কেউ আহত হয়নি") does
    not flip the meaning. Two negations cancel ("গুজব নয়" = not a rumour).
    """
    if not anchor_positions:
        return False
    anchors = set(anchor_positions)

    def neighbour(i: int, step: int) -> Optional[int]:
        j = i + step
        while 0 <= j < len(clause) and abs(j - i) <= window:
            if is_content(clause[j]):
                return j
            j += step
        return None

    return negation_analysis(clause, anchor_positions, window)[0]


def negation_analysis(clause: Sequence[str], anchor_positions: Sequence[int], window: int = 3):
    """(negated, positions of the claim words the negation attaches to)."""
    anchors = set(anchor_positions)

    def neighbour(i: int, step: int) -> Optional[int]:
        j = i + step
        while 0 <= j < len(clause) and abs(j - i) <= window:
            if is_content(clause[j]):
                return j
            j += step
        return None

    counted: List[int] = []
    targets: List[int] = []
    for i, tok in enumerate(clause):
        if is_refuter(tok):
            # "…এর খবর গুজব", "claim that … is fake": labels the whole statement
            counted.append(i)
        elif is_negator(tok):
            # A negator belongs to the content word next to it (Bangla negates the
            # word before; English "no/not" the word after). It only negates the
            # claim if that word is one of the claim's own words.
            before, after = neighbour(i, -1), neighbour(i, +1)
            if before in anchors:
                counted.append(i)
                targets.append(before)
            elif after in anchors and tok.isascii():
                counted.append(i)
                targets.append(after)
            elif any(i - c == 1 for c in counted):
                counted.append(i)          # chained: "গুজব নয়"
    return len(counted) % 2 == 1, targets


def build_claim_frame(claim_text: str) -> ClaimFrame:
    text = norm(claim_text)
    frame = ClaimFrame(text=text, is_question="?" in text)

    clauses: List[List[str]] = []
    speaker: List[str] = []
    for sent in split_sentences(text) or [text]:
        sent_clauses = split_clauses(sent)
        # "<statement>: <speaker>" -- a short trailing clause after a colon is attribution
        if ":" in sent and len(sent_clauses) >= 2 and len(sent_clauses[-1]) <= 4:
            speaker.extend(sent_clauses[-1])
            sent_clauses = sent_clauses[:-1]
        clauses.extend(sent_clauses)

    seen: List[str] = []
    for clause in clauses:
        for tok in clause:
            if is_content(tok):
                s = stem(tok)
                if not any(stems_match(s, x) for x in seen):
                    seen.append(s)
    frame.content = seen
    frame.weights = [_weight(s) for s in seen]
    frame.speaker = [stem(t) for t in speaker if is_content(t)]

    # Polarity of the main clause (the one carrying most of the claim)
    main = max(clauses, key=lambda c: sum(1 for t in c if is_content(t)), default=[])
    anchors = [i for i, t in enumerate(main) if is_content(t)]
    frame.negated, targets = negation_analysis(main, anchors)

    core: List[str] = []
    for tok in main:
        if is_content(tok):
            s = stem(tok)
            if not any(stems_match(s, x) for x in core):
                core.append(s)
    if len(core) >= 3 and len(core) < len(seen):
        frame.core = core
        frame.core_weights = [_weight(s) for s in core]
        frame.core_text = " ".join(main)

    # Focus: what the claim is actually asserting about its subject. For a
    # negated claim, the words the negation attaches to; otherwise the final
    # predicate words of a Bangla clause (SOV), or the whole clause in English.
    content_positions = [i for i, t in enumerate(main) if is_content(t)]
    if targets:
        focus_tokens = [main[i] for i in targets]
    elif main and all(t.isascii() for t in main):
        focus_tokens = [main[i] for i in content_positions]
    elif content_positions:
        # Bangla is verb-final: the predicate is the last content word, unless it
        # is a light verb ("আগুন লেগেছে", "ঘোষণা দিয়েছে"), whose noun carries the meaning.
        last = main[content_positions[-1]]
        if len(content_positions) >= 2 and any(last.startswith(p) for p in LIGHT_VERB_PREFIXES):
            focus_tokens = [main[content_positions[-2]]]
        else:
            focus_tokens = [last]
    else:
        focus_tokens = []
    frame.focus = [stem(t) for t in focus_tokens]
    return frame
