"""
Claim-evidence matching: stance must follow meaning, not keywords.

The first group reproduces a real misclassification -- a negative claim
("…শর্ট সার্কিট নয়") whose word-for-word copy in the news was labelled
CONTRADICTING because the article, like the claim, contains "নয়".
"""

from __future__ import annotations

import pytest

from src.services.claim_preprocessing_service import ClaimPreprocessingService
from src.services.evidence_matching_service import EvidenceMatchingService
from src.utils.bn_text import build_claim_frame

PRE = ClaimPreprocessingService()


def stance(claim: str, title: str, snippet: str = "", published: str = "2026-11-13", url: str = "https://example.com/n"):
    from datetime import datetime, timezone
    item = {"title": title, "snippet": snippet, "url": url, "published_date": published,
            "article_age_days": 0.5 if published == "recent" else None}
    if published == "recent":
        item["published_date"] = datetime.now(timezone.utc).isoformat()
    return EvidenceMatchingService().analyze_evidence_item(PRE.process_claim(claim), item)["stance"]


NEG_CLAIM = "নুসরাতের বাড়িতে আগুনের কারণ শর্ট সার্কিট নয়: তোজাম্মেল হক"


def test_negative_claim_frame():
    f = build_claim_frame(NEG_CLAIM)
    assert f.negated
    assert "তোজাম্মেল" in f.speaker and "তোজাম্মেল" not in f.content
    assert {"নুসরাত", "বাড়ি", "আগুন", "শর্ট", "সার্কিট"} <= set(f.content)


@pytest.mark.parametrize("title,snippet,expected", [
    # identical headline from another outlet
    ("নুসরাতের বাড়িতে আগুনের কারণ শর্ট সার্কিট নয়: তোজাম্মেল হক | আমার দেশ", "", "SUPPORTING"),
    # same meaning, different negative form and a different speaker label
    ("এমপি নুসরাতের বাড়িতে ‘শর্ট সার্কিট থেকে আগুন লাগেনি’: পল্লী বিদ্যুৎ সমিতি", "", "SUPPORTING"),
    ("নুসরাত তাবাসসুমের বাড়িতে আগুনের কারণ শর্ট সার্কিট নয়: পল্লী বিদ্যুতের এজিএম", "", "SUPPORTING"),
    # the opposite statement
    ("শর্ট সার্কিট থেকেই নুসরাতের বাড়িতে আগুন: ফায়ার সার্ভিস", "", "CONTRADICTING"),
    # joined spelling + a hedge: "short circuit MAY be the cause" asserts nothing
    ("নুসরাতের বাড়িতে পেট্রোলবোমার আলামত নেই, শর্টসার্কিট হতে পারে: স্বরাষ্ট্রমন্ত্রী", "", "NEUTRAL"),
    # same event, but nothing about the cause
    ("নুসরাতের বাড়িতে আগুন, কেউ হতাহত হয়নি", "", "NEUTRAL"),
    # unrelated
    ("ঢাকায় বৃষ্টি, জলাবদ্ধতা", "রাজধানীতে ভারী বৃষ্টি", "INSUFFICIENT"),
])
def test_negative_claim(title, snippet, expected):
    assert stance(NEG_CLAIM, title, snippet) == expected


@pytest.mark.parametrize("title,expected", [
    ("নুসরাতের বাড়িতে আগুন, কেউ হতাহত হয়নি", "SUPPORTING"),          # negation is about casualties
    ("নুসরাতের বাড়িতে আগুন লাগলেও কেউ আহত হয়নি", "SUPPORTING"),      # concessive clause
    ("নুসরাতের বাড়িতে আগুন লাগার খবর গুজব: পুলিশ", "CONTRADICTING"),   # refutation
    ("নুসরাতের বাড়িতে আগুন লাগার খবর গুজব নয়", "SUPPORTING"),         # double negation
    ("নুসরাতের বাড়িতে আগুন লাগেনি", "CONTRADICTING"),
    ("নুসরাতের বাড়িতে কি আগুন লেগেছে?", "NEUTRAL"),                   # a question is not an answer
])
def test_affirmative_claim(title, expected):
    assert stance("নুসরাতের বাড়িতে আগুন লেগেছে", title) == expected


@pytest.mark.parametrize("title,expected", [
    ("Fire broke out at the minister's house in Dhaka", "SUPPORTING"),
    ("No fire broke out at the minister's house, police say", "CONTRADICTING"),
    ("Claim that fire broke out at minister's house is fake", "CONTRADICTING"),
])
def test_english(title, expected):
    assert stance("Fire broke out at the minister's house", title) == expected


@pytest.mark.parametrize("claim,title,expected", [
    ("ঢাকা বিশ্ববিদ্যালয় আগামীকাল বন্ধ থাকবে", "আগামীকাল বন্ধ থাকবে ঢাকা বিশ্ববিদ্যালয়", "SUPPORTING"),
    ("ঢাকা বিশ্ববিদ্যালয় আগামীকাল বন্ধ থাকবে", "ঢাকা বিশ্ববিদ্যালয় বন্ধের খবর ভিত্তিহীন: প্রশাসন", "CONTRADICTING"),
    ("ঢাকা বিশ্ববিদ্যালয় আগামীকাল বন্ধ থাকবে", "ঢাকা বিশ্ববিদ্যালয় আগামীকাল খোলা থাকবে", "CONTRADICTING"),   # antonym
    ("ঢাকা বিশ্ববিদ্যালয় আগামীকাল বন্ধ থাকবে", "ঢাকা বিশ্ববিদ্যালয় আগামীকাল বন্ধ থাকছে না", "CONTRADICTING"),
    ("ঢাকা বিশ্ববিদ্যালয় আগামীকাল বন্ধ থাকবে", "ঢাকা বিশ্ববিদ্যালয়ে ভর্তি পরীক্ষার ফল প্রকাশ", "NEUTRAL"),
    ("প্রধানমন্ত্রী পদত্যাগ করেছেন", "পদত্যাগ করলেন প্রধানমন্ত্রী", "SUPPORTING"),
    ("প্রধানমন্ত্রী পদত্যাগ করেছেন", "প্রধানমন্ত্রী পদত্যাগ করেননি: প্রেস সচিব", "CONTRADICTING"),
    ("প্রধানমন্ত্রী পদত্যাগ করেছেন", "প্রধানমন্ত্রীর পদত্যাগের খবর গুজব", "CONTRADICTING"),
    ("পদ্মা সেতুতে টোল বাড়ছে", "পদ্মা সেতুর টোল বাড়ছে, নতুন হার কার্যকর ১ ডিসেম্বর", "SUPPORTING"),
    ("পদ্মা সেতুতে টোল বাড়ছে", "পদ্মা সেতুতে টোল বাড়ছে না: সেতু কর্তৃপক্ষ", "CONTRADICTING"),
    ("পদ্মা সেতুতে টোল বাড়ছে", "পদ্মা সেতুতে টোল কমছে", "CONTRADICTING"),                      # antonym
    ("Schools will remain closed tomorrow", "Schools to remain closed tomorrow due to strike", "SUPPORTING"),
    ("Schools will remain closed tomorrow", "Schools will remain open tomorrow, ministry says", "CONTRADICTING"),
])
def test_other_claims(claim, title, expected):
    assert stance(claim, title, published="recent") == expected


# -- time-anchored claims ------------------------------------------------------

@pytest.mark.parametrize("claim,scope", [
    ("আজকে সব স্কুল বন্ধ", "DAY"),
    ("ajke sob school bondho", "DAY"),
    ("kalke hartal", "DAY"),
    ("এই মাসে বেতন বাড়বে", "MONTH"),
    ("ei mash e beton barbe", "MONTH"),
    ("সকালে আগুন লেগেছে", "GENERAL"),          # "কাল" inside "সকাল"
    ("আজাদের বাড়িতে আগুন", "GENERAL"),          # "আজ" inside a name
    ("২০২১ সালের বন্যা", "GENERAL"),             # a year number does not restrict the search
    ("২০২৬ সালের বাজেটে ভ্যাট বাড়ছে", "GENERAL"),
    ("১৫ নভেম্বর হরতাল ডাকা হয়েছে", "GENERAL"),     # nor does a calendar date
    ("Strike called on 15 November", "GENERAL"),
    ("গতকাল ঢাকায় ভূমিকম্প হয়েছে", "DAY"),
    ("আগামীকাল ছুটি ঘোষণা", "DAY"),
    ("আগামিকাল ছুটি ঘোষণা", "DAY"),              # common spelling without dirgho-i
    ("পরশু থেকে হরতাল", "DAY"),
    ("আগামী বছর নির্বাচন হবে", "YEAR"),
    ("আগামি বছর নির্বাচন হবে", "YEAR"),
])
def test_time_scope(claim, scope):
    assert PRE.process_claim(claim)["temporal_profile"]["timeline_scope"] == scope


@pytest.mark.parametrize("claim,limit", [
    ("আজকে সব স্কুল বন্ধ", "w"),
    ("এই মাসে বেতন বাড়বে", "m"),
    ("আগামী বছর নির্বাচন হবে", "y"),
    ("স্বামীর ইয়াবা বিক্রিতে বাধা দেওয়ায় মারধরের শিকার স্ত্রীর আত্মহত্যা", None),
    ("২০২৬ সালের বাজেটে ভ্যাট বাড়ছে", None),
])
def test_search_date_limit_only_for_relative_time_words(claim, limit):
    assert PRE.process_claim(claim)["temporal_profile"]["timelimit_param"] == limit


def test_time_anchored_claim_ignores_articles_outside_the_window():
    claim = "আজকে ঢাকার সব স্কুল বন্ধ ঘোষণা"
    title = "ঢাকার সব স্কুল বন্ধ ঘোষণা"
    assert stance(claim, title, published="2023-05-01") == "INSUFFICIENT"
    assert stance(claim, title, published="recent") == "SUPPORTING"


# -- claims with extra details, and disguised spellings ------------------------

DETAIL_CLAIM = "বিএনপি নেতার বাড়ির পাশ থেকে বো/মাসদৃশ বস্তু উদ্ধার, চিরকুটে লেখা ছিল— ‘না থামলে পথে মা/রা যাবি’"


def test_disguised_spelling_is_undone():
    f = build_claim_frame(DETAIL_CLAIM)
    assert "বোমাসদৃশ" in f.content and "মারা" in f.content
    assert not f.negated                        # the "না" belongs to the quoted note
    assert PRE.process_claim("১.৫ লাখ টাকা")["normalized_text"] == "১.৫ লাখ টাকা"


@pytest.mark.parametrize("title,snippet,expected", [
    # reports the main statement but not the note: still support
    ("বিএনপি নেতার বাড়ির পাশে বোমাসদৃশ বস্তু",
     "মেহেরপুরের গাংনীতে বিএনপি নেতার বাড়ির পাশ থেকে লাল টেপে মোড়ানো দুটি বোমাসদৃশ বস্তু উদ্ধার করেছে পুলিশ।",
     "SUPPORTING"),
    ("বিএনপি নেতার বাড়ির পাশ থেকে বোমাসদৃশ বস্তু উদ্ধার, সঙ্গে হুমকির চিরকুট", "", "SUPPORTING"),
    # denies the main statement
    ("বিএনপি নেতার বাড়ির পাশে বোমাসদৃশ বস্তু উদ্ধারের খবর গুজব: পুলিশ", "", "CONTRADICTING"),
    # same people, different event
    ("বিএনপি নেতার বাড়িতে হামলা, আহত ৩", "", "NEUTRAL"),
])
def test_claim_with_extra_details(title, snippet, expected):
    assert stance(DETAIL_CLAIM, title, snippet) == expected
