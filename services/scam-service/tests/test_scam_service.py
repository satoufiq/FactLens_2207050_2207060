"""
Service-level tests for the Scam Alert pipeline, with ScamNet-BN mocked.

ScamNet-BN alone decides the risk (rule engine removed 2026-11-13). These tests
pin that down:

  * model available  -> its verdict is the result, unchanged (COMPLETED)
  * model unavailable / busy / error -> no verdict: FAILED, "Unable to Analyze"
  * model timeout    -> TIMEOUT, without waiting for the inference
  * nothing -- no link flag, no keyword -- raises or lowers the model's level
  * promo + Low reads "Promotional message"
  * the API never exposes normalized_text or branch_weights
"""

from __future__ import annotations

import json
import time

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from factlens_common.lifecycle import ScanType
from factlens_common.scanflow import ScanLifecycle
from factlens_common.schema import Base, ModelRun, ScamIndicator, Scan
from factlens_common.urlanalysis import UrlAnalyzer

from src.providers.scamnet import (
    MODEL_NAME,
    REASON_BUSY,
    REASON_ERROR,
    REASON_TIMEOUT,
    REASON_UNAVAILABLE,
    STATUS_OK,
    STATUS_TIMEOUT,
    STATUS_UNAVAILABLE,
    ModelCall,
    ScamNetRuntime,
)
from src.services.scam_service import ScamAlertService

VERSION = "scamnet-bn-1x-test0001"


# -- helpers -----------------------------------------------------------------

def prediction(risk="High", cls="smish", p=None, indicators=None):
    p = p or {
        "High": {"normal": 0.003, "promo": 0.004, "smish": 0.993},
        "Medium": {"normal": 0.2, "promo": 0.1, "smish": 0.7},
        "Low": {"normal": 0.95, "promo": 0.03, "smish": 0.02},
    }[risk]
    return {
        "risk": risk,
        "class": cls,
        "probabilities": p,
        "indicators": indicators if indicators is not None else ["phone", "code", "urgent", "finance"],
        "branch_weights": {"text": 0.07, "chars": 0.89, "structure": 0.1},
        "normalized_text": "SECRET-NORMALIZED-TEXT",
        "model_version": VERSION,
    }


class FakeRuntime:
    """Stands in for ScamNetRuntime: returns a fixed ModelCall."""

    def __init__(self, call: ModelCall):
        self.call = call
        self.seen = []

    def predict(self, text):
        self.seen.append(text)
        return self.call

    def version(self):
        return self.call.version

    def health(self):
        return {}


def ok(pred):
    return ModelCall(status=STATUS_OK, version=pred["model_version"], latency_ms=420.0, prediction=pred)


def unavailable():
    return ModelCall(
        status=STATUS_UNAVAILABLE,
        version="unloaded",
        reason=REASON_UNAVAILABLE,
        error="FileNotFoundError: scamnet_config.json",
    )


class SlowProvider:
    """A provider whose prediction takes `delay` seconds -- for timeout tests."""

    def __init__(self, delay: float):
        self.delay = delay
        self.calls = 0

    def load(self):
        return True

    def is_available(self):
        return True

    def version(self):
        return VERSION

    def last_error(self):
        return None

    def predict(self, text):
        self.calls += 1
        time.sleep(self.delay)
        return prediction("High")


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    yield session
    session.close()


def new_scan(db, text):
    lifecycle = ScanLifecycle(db)
    scan = lifecycle.accept(ScanType.SCAM, input_text=text)
    lifecycle.begin(scan.id)
    return scan


def run(db, runtime, text, url=None):
    service = ScamAlertService(db, model_runtime=runtime, url_analyzer=UrlAnalyzer(follow_redirects=False))
    scan = new_scan(db, text)
    analysis = service.analyze(scan.id, text, url)
    db.flush()
    return scan, analysis


def settle(db, scan, analysis):
    """Exactly what workers/tasks.py does with an analysis."""
    lifecycle = ScanLifecycle(db)
    if analysis.status == "COMPLETED":
        return lifecycle.complete(scan.id, analysis.outcome)
    if analysis.status == "TIMEOUT":
        return lifecycle.timeout(scan.id, 10, outcome=analysis.outcome)
    return lifecycle.fail(scan.id, analysis.error, outcome=analysis.outcome)


SCAM_TEXT = "Apnar bKash account block hoye jabe. Ekhoni OTP 4821 pathan 01712345678 number e."
PLAIN_TEXT = "Meeting moved to 4pm tomorrow in room 302."


# -- model available ---------------------------------------------------------

def test_model_verdict_is_the_result(db):
    runtime = FakeRuntime(ok(prediction("High")))
    scan, analysis = run(db, runtime, SCAM_TEXT)
    outcome = analysis.outcome

    assert analysis.status == "COMPLETED"
    assert outcome.result == "HIGH_RISK"
    assert outcome.detail["risk"] == "High"
    assert outcome.detail["scamnet"]["class"] == "smish"
    assert outcome.explanation["scoring"]["decided_by"] == "scamnet-bn"
    # The model gets the message as submitted; it normalizes it itself.
    assert runtime.seen == [SCAM_TEXT]
    assert settle(db, scan, analysis).status == "COMPLETED"

    run_row = db.query(ModelRun).filter_by(scan_id=scan.id).one()
    assert run_row.model_name == MODEL_NAME == "scamnet-bn"
    assert run_row.status == "OK"
    assert run_row.model_version == VERSION
    assert run_row.latency_ms == pytest.approx(420.0)
    assert run_row.raw_output["normalized_text"] == "SECRET-NORMALIZED-TEXT"

    rows = {r.rule_id: r for r in db.query(ScamIndicator).filter_by(scan_id=scan.id)}
    assert set(rows) == {"model:phone", "model:code", "model:urgent", "model:finance"}
    assert rows["model:finance"].severity == "HIGH"
    assert rows["model:urgent"].severity == "MEDIUM"


@pytest.mark.parametrize("risk, level", [("High", "HIGH_RISK"), ("Medium", "MEDIUM_RISK"), ("Low", "LOW_RISK")])
def test_every_model_level_passes_through_unchanged(db, risk, level):
    _, analysis = run(db, FakeRuntime(ok(prediction(risk, cls="normal" if risk == "Low" else "smish"))), PLAIN_TEXT)
    assert analysis.outcome.result == level
    assert analysis.outcome.detail["risk"] == risk


def test_suspicious_link_does_not_change_a_low_model_verdict(db):
    low = prediction("Low", cls="normal", indicators=["url"])
    _, analysis = run(db, FakeRuntime(ok(low)), "Details here: www.pr1ze-claim.xyz/win")
    assert analysis.outcome.result == "LOW_RISK"
    link_reasons = [r for r in analysis.outcome.explanation["reasons"] if r["source"] == "url_info"]
    assert link_reasons, "link flags are still shown as information"
    assert all(r["affects_risk"] is False for r in link_reasons)


@pytest.mark.parametrize("notice", [
    # The genuine bKash/Nagad security notices the removed rules raised to Medium.
    "আপনার অ্যাকাউন্ট নিরাপত্তা পর্যবেক্ষণে আছে। কোনো OTP বা PIN শেয়ার করবেন না।",
    "নিরাপত্তা সতর্কতা: বিকাশ কখনো PIN/OTP জানতে চায় না। বিস্তারিত অফিসিয়াল অ্যাপে দেখা যাবে।",
    "নগদ সার্ভিস আপডেট: নির্ধারিত রক্ষণাবেক্ষণের সময় কিছু সেবা ধীর হতে পারে।",
])
def test_genuine_security_notices_stay_low_when_the_model_says_low(db, notice):
    low = prediction("Low", cls="normal", indicators=["finance", "code"])
    _, analysis = run(db, FakeRuntime(ok(low)), notice)
    assert analysis.outcome.result == "LOW_RISK"


def test_private_model_fields_never_reach_the_result(db):
    _, analysis = run(db, FakeRuntime(ok(prediction("High"))), SCAM_TEXT)
    outcome = analysis.outcome
    public = json.dumps(
        {"detail": outcome.detail, "explanation": outcome.explanation, "summary": outcome.signal_summary},
        default=str,
    )
    assert "SECRET-NORMALIZED-TEXT" not in public
    assert "branch_weights" not in public
    assert set(outcome.detail["scamnet"]) == {"risk", "class", "probabilities", "indicators", "model_version"}


# -- promo -------------------------------------------------------------------

def test_promo_with_low_risk_is_shown_as_promotional(db):
    promo = prediction("Low", cls="promo", p={"normal": 0.05, "promo": 0.93, "smish": 0.02}, indicators=["money"])
    _, analysis = run(db, FakeRuntime(ok(promo)), "30GB internet mattro 299 takay! Dial *121*3#")
    outcome = analysis.outcome
    assert outcome.result == "LOW_RISK"
    assert outcome.detail["risk"] == "Low"
    assert outcome.detail["risk_label"] == "Promotional message"
    assert outcome.explanation["headline"].startswith("Promotional message")


# -- no verdict ----------------------------------------------------------------

def test_model_unavailable_gives_failed_unable_to_analyze(db):
    scan, analysis = run(db, FakeRuntime(unavailable()), SCAM_TEXT)
    outcome = analysis.outcome

    assert analysis.status == "FAILED"
    assert outcome.result == "UNABLE_TO_ANALYZE"
    assert outcome.detail["risk"] == "Unable to Analyze"
    assert outcome.detail["scamnet"] is None
    assert outcome.detail["scamnet_reason"] == REASON_UNAVAILABLE
    assert "try again" in outcome.summary.lower()

    stored = settle(db, scan, analysis)
    assert stored.status == "FAILED"
    assert stored.result.result == "UNABLE_TO_ANALYZE", "a failed scan must never read as Low risk"
    assert stored.result.summary == outcome.summary, "the model-specific message is kept"

    run_row = db.query(ModelRun).filter_by(scan_id=scan.id).one()
    assert run_row.status == "UNAVAILABLE"
    assert run_row.raw_output is None
    assert db.query(ScamIndicator).filter_by(scan_id=scan.id).count() == 0


def test_timeout_ends_timeout_without_waiting_for_the_model(db):
    runtime = ScamNetRuntime(model_dir="unused", timeout_s=0.2, provider_factory=lambda: SlowProvider(delay=1.5))
    assert runtime.load(warm_up=False)

    started = time.perf_counter()
    scan, analysis = run(db, runtime, SCAM_TEXT)
    elapsed = time.perf_counter() - started

    assert elapsed < 1.0, f"pipeline waited {elapsed:.2f}s for a timed-out model"
    assert analysis.status == "TIMEOUT"
    assert analysis.outcome.detail["scamnet_reason"] == REASON_TIMEOUT
    assert settle(db, scan, analysis).status == "TIMEOUT"
    assert db.query(ModelRun).filter_by(scan_id=scan.id).one().status == STATUS_TIMEOUT


def test_busy_model_fails_immediately_instead_of_queueing(db):
    provider = SlowProvider(delay=1.0)
    runtime = ScamNetRuntime(model_dir="unused", timeout_s=0.1, provider_factory=lambda: provider)
    assert runtime.load(warm_up=False)

    assert runtime.predict("first message").status == STATUS_TIMEOUT  # keeps running
    assert runtime.busy

    started = time.perf_counter()
    scan, analysis = run(db, runtime, SCAM_TEXT)
    assert time.perf_counter() - started < 0.5, "a busy model must not be queued behind"
    assert analysis.status == "FAILED"
    assert analysis.outcome.detail["scamnet_reason"] == REASON_BUSY
    row = db.query(ModelRun).filter_by(scan_id=scan.id).one()
    assert row.status == "UNAVAILABLE" and row.error_message == "model busy"
    assert provider.calls == 1, "the busy scan must not start a second inference"

    deadline = time.time() + 3
    while runtime.busy and time.time() < deadline:
        time.sleep(0.05)
    runtime.timeout_s = 3.0
    assert runtime.predict("third message").status == STATUS_OK


def test_provider_exception_fails_cleanly(db):
    class Broken(SlowProvider):
        def predict(self, text):
            raise RuntimeError("CUDA out of memory")

    runtime = ScamNetRuntime(model_dir="unused", timeout_s=1, provider_factory=lambda: Broken(0))
    assert runtime.load(warm_up=False)
    scan, analysis = run(db, runtime, PLAIN_TEXT)
    assert analysis.status == "FAILED"
    assert analysis.outcome.detail["scamnet_reason"] == REASON_ERROR
    row = db.query(ModelRun).filter_by(scan_id=scan.id).one()
    assert row.status == "ERROR" and "CUDA out of memory" in row.error_message
    assert not runtime.busy, "a failed inference must release the model"


def test_load_failure_never_raises(tmp_path):
    runtime = ScamNetRuntime(model_dir=str(tmp_path))  # no files there
    assert runtime.load() is False
    assert runtime.last_error()
    call = runtime.predict("hello")
    assert call.status == STATUS_UNAVAILABLE and call.reason == REASON_UNAVAILABLE


# -- API schema --------------------------------------------------------------

def test_api_response_shape(db):
    from src.api.v1 import scams

    scan, analysis = run(db, FakeRuntime(ok(prediction("High"))), SCAM_TEXT)
    settle(db, scan, analysis)
    body = scams._build_response(db, db.query(Scan).filter_by(id=scan.id).one()).model_dump(
        by_alias=True, mode="json"
    )
    assert body["status"] == "COMPLETED"
    assert body["risk"] == "High"
    assert body["risk_label"] == "High Risk"
    assert body["class"] == "smish"
    assert body["probabilities"]["smish"] == pytest.approx(0.993)
    assert body["indicators"] == ["phone", "code", "urgent", "finance"]
    assert body["model_version"] == VERSION
    assert any(d["rule_id"] == "model:finance" for d in body["indicator_details"])
    dumped = json.dumps(body)
    assert "SECRET-NORMALIZED-TEXT" not in dumped and "branch_weights" not in dumped


def test_api_response_for_a_scan_without_a_verdict(db):
    from src.api.v1 import scams

    scan, analysis = run(db, FakeRuntime(unavailable()), SCAM_TEXT)
    settle(db, scan, analysis)
    body = scams._build_response(db, db.query(Scan).filter_by(id=scan.id).one()).model_dump(
        by_alias=True, mode="json"
    )
    assert body["status"] == "FAILED"
    assert body["is_terminal"] is True
    assert body["risk"] == "Unable to Analyze"
    assert body["class"] is None and body["indicators"] == []
