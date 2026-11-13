"""
BanglaVerify integration tests.

The runtime and precedence tests use a stand-in model, so they run anywhere.
The trained-model tests load models/banglaverify and are skipped when the
weights are absent. Their texts are the training notebook's own "examples:",
and the expected values are what the integrated model produced for them.

    py -m pytest services/rumour-service/tests -q
"""

from __future__ import annotations

import os
import time
from pathlib import Path

import pytest

from factlens_common.providers.base import Prediction, ProviderStatus
from src.providers.banglaverify_runtime import BanglaVerifyRuntime
from src.services.result_precedence import ResultPrecedenceGate


# --------------------------------------------------------------------------
# A stand-in for BanglaVerifyModel
# --------------------------------------------------------------------------

class FakeModel:
    def __init__(self, p_fake=0.9, threshold=0.485, delay=0.0, fail_load=False, fail_predict=False):
        self.p_fake, self.threshold, self.delay = p_fake, threshold, delay
        self.fail_load, self.fail_predict = fail_load, fail_predict
        self.calls = 0
        self._loaded = False

    def load(self):
        self._loaded = not self.fail_load
        return self._loaded

    def is_available(self):
        return self._loaded

    def version(self):
        return "banglaverify-test"

    def last_error(self):
        return "weights missing" if self.fail_load else None

    def predict(self, text=None, headline=None, content=None, recall_first=False):
        self.calls += 1
        if self.delay:
            time.sleep(self.delay)
        if self.fail_predict:
            raise RuntimeError("boom")
        return {
            "label": "fake" if self.p_fake >= self.threshold else "real",
            "p_fake": self.p_fake,
            "mode": "full" if content else "short",
            "threshold": self.threshold,
            "model_version": "banglaverify-test",
            "n_tokens": 12,
        }


def runtime_with(model, timeout_s=2.0, warm_up=False):
    rt = BanglaVerifyRuntime("unused", timeout_s=timeout_s, model_factory=lambda: model)
    rt.load(warm_up=warm_up)
    return rt


# --------------------------------------------------------------------------
# Runtime behaviour
# --------------------------------------------------------------------------

def test_fake_text_maps_to_fake_label():
    pred = runtime_with(FakeModel(p_fake=0.9)).classify(text="x")
    assert pred.available and pred.label == "FAKE"
    assert pred.probabilities["FAKE"] == pytest.approx(0.9)
    assert pred.probabilities["REAL"] == pytest.approx(0.1)
    assert pred.confidence == pytest.approx(0.9)
    assert pred.raw["mode"] == "short" and pred.raw["threshold"] == 0.485


def test_label_follows_the_models_own_threshold():
    # 0.6 is below the full-mode threshold 0.65, so the label is REAL.
    pred = runtime_with(FakeModel(p_fake=0.6, threshold=0.65)).classify(headline="h", content="body")
    assert pred.label == "REAL" and pred.raw["mode"] == "full"
    assert pred.confidence == pytest.approx(0.4)


def test_warm_up_runs_once_after_load():
    model = FakeModel()
    rt = runtime_with(model, warm_up=True)
    assert model.calls == 1 and rt.warmup_ms is not None


def test_load_is_idempotent():
    model = FakeModel()
    rt = runtime_with(model, warm_up=True)
    assert rt.load(warm_up=True)
    assert model.calls == 1


def test_load_failure_is_unavailable_and_never_raises():
    rt = runtime_with(FakeModel(fail_load=True))
    pred = rt.classify(text="x")
    assert not pred.available and pred.status == ProviderStatus.UNAVAILABLE
    assert "weights missing" in pred.reason


def test_never_loaded_is_unavailable():
    rt = BanglaVerifyRuntime("unused", model_factory=FakeModel)
    pred = rt.classify(text="x")
    assert not pred.available and "not been loaded" in pred.reason


def test_timeout_returns_without_waiting_for_the_model():
    rt = runtime_with(FakeModel(delay=1.5), timeout_s=0.2)
    started = time.perf_counter()
    pred = rt.classify(text="x")
    assert time.perf_counter() - started < 1.0
    assert not pred.available and pred.status == ProviderStatus.TIMEOUT


def test_busy_model_does_not_queue():
    rt = runtime_with(FakeModel(delay=0.8), timeout_s=0.1)
    first = rt.classify(text="x")  # times out; the inference is still running
    assert first.status == ProviderStatus.TIMEOUT and rt.busy
    started = time.perf_counter()
    second = rt.classify(text="y")
    assert time.perf_counter() - started < 0.1
    assert not second.available and second.reason == "model busy"
    time.sleep(1.0)
    assert not rt.busy


def test_prediction_error_is_reported_not_raised():
    pred = runtime_with(FakeModel(fail_predict=True)).classify(text="x")
    assert not pred.available and pred.status == ProviderStatus.ERROR
    assert "boom" in pred.reason


def test_model_run_row_payload():
    payload = runtime_with(FakeModel(p_fake=0.2)).classify(text="x").to_model_run()
    assert payload["model_name"] == "BanglaVerify"
    assert payload["status"] == "OK"


# --------------------------------------------------------------------------
# Verdict combination: BanglaVerify first, web evidence as a weighted backup
# --------------------------------------------------------------------------

def _pred(label, p_fake, threshold=0.485):
    return Prediction(available=True, label=label, confidence=max(p_fake, 1 - p_fake),
                      probabilities={"FAKE": p_fake, "REAL": 1 - p_fake},
                      raw={"p_fake": p_fake, "threshold": threshold},
                      model_name="BanglaVerify", model_version="t")


def _ev(stance, score=90, reliability=90):
    key = "support_score" if stance == "SUPPORTING" else "contradiction_score"
    return {"stance": stance, key: score, "source_reliability": reliability,
            "relevance_score": 90, "directness_score": 90}


GATE = ResultPrecedenceGate()
NOW = {"timeline_scope": "GENERAL"}
TODAY = {"timeline_scope": "DAY"}


# 1. Confident model (>= 80 %) decides on its own

def test_confident_real_model_without_evidence_is_supported():
    # The reported case: 90.7 % genuine, no matching article -> follows the model
    d = GATE.decide({}, [], _pred("REAL", 0.093), temporal_profile=NOW)
    assert d.verdict == "SUPPORTED" and d.decided_by == "model"
    assert d.confidence == pytest.approx(0.907)


def test_confident_fake_model_without_evidence_is_contradicted():
    d = GATE.decide({}, [], _pred("FAKE", 0.92), temporal_profile=NOW)
    assert d.verdict == "CONTRADICTED" and d.decided_by == "model"


def test_confident_model_is_not_overturned_by_evidence_but_disagreement_is_stated():
    d = GATE.decide({}, [_ev("CONTRADICTING"), _ev("CONTRADICTING")], _pred("REAL", 0.10), temporal_profile=NOW)
    assert d.verdict == "SUPPORTED" and d.decided_by == "model" and d.disagreement


def test_confident_model_with_agreeing_evidence():
    d = GATE.decide({}, [_ev("SUPPORTING")], _pred("REAL", 0.15), temporal_profile=NOW)
    assert d.verdict == "SUPPORTED" and d.decided_by == "model+evidence"


def test_bar_is_exactly_eighty_percent():
    assert GATE.decide({}, [], _pred("REAL", 0.20), temporal_profile=NOW).verdict == "SUPPORTED"
    assert GATE.decide({}, [], _pred("REAL", 0.21), temporal_profile=NOW).verdict == "UNVERIFIED"


# 2. Otherwise the evidence decides

def test_unsure_model_lets_supporting_evidence_decide():
    d = GATE.decide({}, [_ev("SUPPORTING"), _ev("SUPPORTING")], _pred("FAKE", 0.55), temporal_profile=NOW)
    assert d.verdict == "SUPPORTED" and d.decided_by == "evidence"


def test_unsure_model_and_contradicting_evidence_is_contradicted():
    d = GATE.decide({}, [_ev("CONTRADICTING"), _ev("CONTRADICTING")], _pred("REAL", 0.40), temporal_profile=NOW)
    assert d.verdict == "CONTRADICTED"


def test_unsure_model_and_agreeing_evidence_is_model_plus_evidence():
    d = GATE.decide({}, [_ev("SUPPORTING")], _pred("REAL", 0.35), temporal_profile=NOW)
    assert d.verdict == "SUPPORTED" and d.decided_by == "model+evidence"


def test_split_evidence_and_unsure_model_is_unverified():
    d = GATE.decide({}, [_ev("SUPPORTING"), _ev("CONTRADICTING")], _pred("FAKE", 0.6), temporal_profile=NOW)
    assert d.verdict == "UNVERIFIED_SUSPICIOUS"


# 3. Nothing decisive

def test_no_evidence_and_unsure_fake_label_is_suspicious():
    d = GATE.decide({}, [], _pred("FAKE", 0.7), temporal_profile=NOW)
    assert d.verdict == "UNVERIFIED_SUSPICIOUS" and d.decided_by == "model"


def test_no_evidence_and_unsure_real_label_is_plain_unverified():
    d = GATE.decide({}, [], _pred("REAL", 0.3), temporal_profile=NOW)
    assert d.verdict == "UNVERIFIED"


# Time-anchored claims need a more confident model to skip the evidence

def test_time_anchored_claim_raises_the_bar():
    general = GATE.decide({}, [_ev("CONTRADICTING")], _pred("REAL", 0.15), temporal_profile=NOW)
    today = GATE.decide({}, [_ev("CONTRADICTING")], _pred("REAL", 0.15), temporal_profile=TODAY)
    assert general.verdict == "SUPPORTED"          # 85 % >= 80 %: the model decides
    assert today.verdict == "CONTRADICTED"         # 85 % < 90 %: the in-window evidence decides
    assert GATE.decide({}, [], _pred("REAL", 0.05), temporal_profile=TODAY).verdict == "SUPPORTED"


def test_unavailable_model_uses_evidence_alone():
    d = GATE.decide({}, [_ev("CONTRADICTING"), _ev("CONTRADICTING")],
                    Prediction.unavailable("BanglaVerify", "t", "model busy"), temporal_profile=NOW)
    assert d.verdict == "CONTRADICTED" and d.decided_by == "evidence"


def test_unavailable_model_and_no_evidence_is_unverified():
    d = GATE.decide({}, [], Prediction.unavailable("BanglaVerify", "t", "model busy"))
    assert d.verdict == "UNVERIFIED" and d.decided_by == "no_signal"


# --------------------------------------------------------------------------
# The trained model (skipped when the weights are not on this machine)
# --------------------------------------------------------------------------

MODEL_DIR = Path(os.environ["BANGLAVERIFY_MODEL_DIR"])
HAS_WEIGHTS = (MODEL_DIR / "banglaverify_v2_config.json").exists() and any(MODEL_DIR.glob("*.pt"))
trained_model = pytest.mark.skipif(not HAS_WEIGHTS, reason=f"no BanglaVerify weights in {MODEL_DIR}")

HEADLINE = "আগামীকাল দেশের সব শিক্ষা প্রতিষ্ঠান বন্ধ থাকবে"
SPAM = "URGENT!! সবাই শেয়ার করুন আগামীকাল দেশের সব শিক্ষা প্রতিষ্ঠান বন্ধ থাকবে Like Comment Share"
BODY = (
    "সামাজিক যোগাযোগ মাধ্যমে ছড়িয়ে পড়া একটি পোস্টে দাবি করা হয়েছে যে আগামীকাল থেকে "
    "দেশের সকল শিক্ষা প্রতিষ্ঠান অনির্দিষ্টকালের জন্য বন্ধ ঘোষণা করা হয়েছে। "
    "তবে শিক্ষা মন্ত্রণালয় এ বিষয়ে কোনো আনুষ্ঠানিক ঘোষণা দেয়নি বলে জানা গেছে।"
)


@pytest.fixture(scope="module")
def real_runtime():
    rt = BanglaVerifyRuntime(str(MODEL_DIR), timeout_s=60)
    assert rt.load(warm_up=True), rt.unavailable_reason()
    return rt


@trained_model
def test_trained_model_headline_reads_real(real_runtime):
    pred = real_runtime.classify(text=HEADLINE)
    assert pred.label == "REAL" and pred.raw["mode"] == "short"
    assert pred.raw["p_fake"] == pytest.approx(0.1488, abs=0.005)


@trained_model
def test_trained_model_share_bait_reads_fake(real_runtime):
    pred = real_runtime.classify(text=SPAM)
    assert pred.label == "FAKE" and pred.raw["mode"] == "short"
    assert pred.raw["p_fake"] == pytest.approx(0.998, abs=0.005)


@trained_model
def test_trained_model_article_pair_reads_fake(real_runtime):
    pred = real_runtime.classify(headline=HEADLINE, content=BODY)
    assert pred.label == "FAKE" and pred.raw["mode"] == "full"
    assert pred.raw["threshold"] == pytest.approx(0.65)
    assert pred.raw["p_fake"] == pytest.approx(0.8887, abs=0.005)


@trained_model
def test_trained_model_version(real_runtime):
    assert real_runtime.version().startswith("banglaverify-v2-1x-")
