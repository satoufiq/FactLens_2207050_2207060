"""
Text cleaning applied identically across both text models.

Proposal, "Data preparation":

    1. HTML tag and URL removal
    2. Unicode NFC normalization for consistent Bangla encoding
    3. Whitespace normalization
    4. Length filtering -- articles under 20 or over 2,000 words are dropped
    5. Exact and near-duplicate removal
    6. Leakage audit
    7. Stratified 80/10/10 split

Steps 1-4 live here; 5-7 live in `splitting.py`.

Punctuation is deliberately preserved: it carries stylistic signal relevant to
fake news, and stripping it would remove part of what the classifier is meant
to learn.

The same normalization must run at inference time, or the model sees a
different distribution in production than it saw in training. `normalize()` is
the single definition of that transform.
"""

from __future__ import annotations

import html
import re
import unicodedata
from typing import Optional

HTML_TAG = re.compile(r"<[^>]+>")
URL = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
# Zero-width characters break Bangla conjunct rendering and tokenization.
ZERO_WIDTH = re.compile(r"[​‌‍﻿]")
MULTI_SPACE = re.compile(r"[ \t ]+")
MULTI_NEWLINE = re.compile(r"\n{3,}")

MIN_WORDS = 20
MAX_WORDS = 2000


def strip_markup(text: str) -> str:
    """Remove HTML tags, entities, URLs and e-mail addresses."""
    if not text:
        return ""
    text = html.unescape(text)
    text = HTML_TAG.sub(" ", text)
    text = URL.sub(" ", text)
    text = EMAIL.sub(" ", text)
    return text


def normalize(text: str, preserve_zero_width_joiner: bool = False) -> str:
    """
    NFC-normalise and tidy whitespace.

    NFC matters for Bangla specifically: the same visible grapheme can be
    encoded several ways, and without normalization the tokenizer treats them
    as different tokens. Zero-width joiners are stripped by default because
    scraped corpora are full of stray ones; set the flag if your source relies
    on them for correct conjuncts.
    """
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    if not preserve_zero_width_joiner:
        text = ZERO_WIDTH.sub("", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = MULTI_SPACE.sub(" ", text)
    text = MULTI_NEWLINE.sub("\n\n", text)
    return text.strip()


def clean(text: str) -> str:
    """Full cleaning pass: markup removal then normalization."""
    return normalize(strip_markup(text))


def word_count(text: str) -> int:
    return len((text or "").split())


def length_ok(text: str, min_words: int = MIN_WORDS, max_words: int = MAX_WORDS) -> bool:
    """
    Step 4 -- length filtering.

    Very short rows are usually scrape artifacts (a headline with no body);
    very long ones are usually several articles concatenated. Both teach the
    model about the scrape rather than about the claim.
    """
    return min_words <= word_count(text) <= max_words


def build_input(
    headline: Optional[str], body: Optional[str], max_body_words: int = 180
) -> str:
    """
    Compose the model input: headline + leading content.

    The deployed system usually receives one or two OCR'd sentences from a
    screenshot, so the leading content is truncated rather than the whole
    article being fed in. Training on the first N words keeps the training
    distribution closer to what production actually sees.
    """
    headline = clean(headline or "")
    body = clean(body or "")
    if body:
        body = " ".join(body.split()[:max_body_words])
    if headline and body:
        return f"{headline}\n{body}"
    return headline or body


def is_headline_length(text: str, threshold: int = 40) -> bool:
    """
    True when the text is short enough to route to the headline head.

    The threshold mirrors `BanglaVerifyProvider.HEADLINE_WORD_THRESHOLD`. Keep
    the two in step: if you tune it here against the evaluation set, record the
    new value in the model's registry entry so serving agrees with training.
    """
    return word_count(text) < threshold
