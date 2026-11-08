"""
Check the RUNNING Scam Alert service with the real ScamNet-BN model.

Sends real messages through the API, exactly as the website does, and checks:
  * the model is loaded in the process that runs scans,
  * every scan is COMPLETED (not PARTIAL) with a model_runs row status OK,
  * the expectations from test_scam_model_provider.py hold end to end,
  * a promotional message is labelled "Promotional message",
and reports per-message model latency from model_runs.

    py services/scam-service/scripts/check_live.py [--base http://127.0.0.1:8003]

Writes the same report to scamnet_check_report.txt in the repository root.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
import urllib.request
from pathlib import Path

REPORT = Path(__file__).resolve().parents[3] / "scamnet_check_report.txt"

CASES = [
    # (label, message, expectation)
    ("smish, Banglish OTP",
     "Apnar bKash account block hoye jabe. Ekhoni OTP 4821 pathan 01712345678 number e.",
     {"class": "smish", "risk_in": ["High", "Medium"], "indicators_include": ["finance", "phone"]}),
    ("smish, Bengali prize",
     "অভিনন্দন! আপনি ৫০,০০০ টাকা জিতেছেন। ৫০০ টাকা পাঠান: www.pr1ze-claim.xyz/win",
     {"risk_in": ["High", "Medium"]}),
    ("smish, homoglyphs",
     "Your bКash ассount is suspended. Verify now: bit.ly/bk-verify",
     {"risk_in": ["High", "Medium"]}),
    ("promo, Grameenphone",
     "Grameenphone: 30GB internet mattro 299 takay! Offer cholbe 30 November porjonto. Dial *121*3#",
     {"class": "promo", "risk_in": ["Low"], "label": "Promotional message"}),
    ("normal, Bengali notice",
     "আজ সন্ধ্যা ৭টায় বিভাগীয় সভা অনুষ্ঠিত হবে। সবাইকে উপস্থিত থাকার অনুরোধ করা হলো।",
     {"risk_in": ["Low"]}),
    ("normal, English",
     "Meeting moved to 4pm tomorrow in room 302. Please bring the printed report.",
     {"risk_in": ["Low"]}),
]

lines: list[str] = []


def out(text: str = "") -> None:
    print(text, flush=True)
    lines.append(text)


def call(base: str, path: str, body: dict | None = None, timeout: float = 120) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        base + path,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"} if data else {},
        method="POST" if data else "GET",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def scan(base: str, message: str) -> dict:
    accepted = call(base, "/api/v1/scams/scans", {"message": message})
    deadline = time.time() + 120
    while True:
        result = call(base, accepted["poll_url"])
        if result.get("is_terminal"):
            return result
        if time.time() > deadline:
            raise TimeoutError(f"scan {accepted['scan_id']} still {result['status']}")
        time.sleep(0.5)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8003")
    args = parser.parse_args()

    out(f"ScamNet-BN live check  {time.strftime('%Y-%m-%d %H:%M:%S')}  against {args.base}")
    health = call(args.base, "/health")
    model = health.get("model", {})
    out(f"service: {health.get('status')} | queue: {health.get('queue', {}).get('mode')}")
    out(f"model  : available={model.get('available')} version={model.get('version')} "
        f"device={model.get('device')} max_models={model.get('max_models')}")
    report = model.get("worker_status") or {}
    if report:
        out(f"load   : {report.get('load_ms', 0) / 1000:.1f}s, warm-up {report.get('warmup_ms')} ms")
    if not model.get("available"):
        out(f"\nFAIL: the model is not loaded. Reason: {model.get('last_error')}")
        REPORT.write_text("\n".join(lines), encoding="utf-8")
        return 1

    failures = 0
    latencies = []
    out(f"\n{'message':24} {'status':9} {'risk':7} {'class':6} {'p(smish)':>8} {'model ms':>9}  label / check")
    for label, message, expect in CASES:
        result = scan(args.base, message)
        run = next((r for r in result.get("model_runs", []) if r["model_name"] == "scamnet-bn"), {})
        latency = run.get("latency_ms")
        if latency is not None and run.get("status") == "OK":
            latencies.append(latency)

        problems = []
        if result["status"] != "COMPLETED":
            problems.append(f"status {result['status']}")
        if run.get("status") != "OK":
            problems.append(f"model_runs {run.get('status')}: {run.get('error_message')}")
        if "class" in expect and result.get("class") != expect["class"]:
            problems.append(f"class {result.get('class')} != {expect['class']}")
        if result.get("risk") not in expect["risk_in"]:
            problems.append(f"risk {result.get('risk')} not in {expect['risk_in']}")
        for indicator in expect.get("indicators_include", []):
            if indicator not in (result.get("indicators") or []):
                problems.append(f"missing indicator {indicator}")
        if "label" in expect and result.get("risk_label") != expect["label"]:
            problems.append(f"label {result.get('risk_label')!r} != {expect['label']!r}")
        failures += bool(problems)

        p_smish = (result.get("probabilities") or {}).get("smish")
        out(
            f"{label:24} {result['status']:9} {str(result.get('risk')):7} "
            f"{str(result.get('class')):6} {p_smish if p_smish is not None else float('nan'):8.4f} "
            f"{latency if latency is not None else float('nan'):9.0f}  "
            f"{result.get('risk_label')} -> {'OK' if not problems else 'FAIL: ' + '; '.join(problems)}"
        )

    if latencies:
        out(
            f"\nmodel latency per message (CPU, {len(latencies)} scans): median "
            f"{statistics.median(latencies):.0f} ms, max {max(latencies):.0f} ms -> "
            + ("under 2 s target" if max(latencies) < 2000 else "OVER the 2 s target")
        )
    out("\nRESULT: " + ("ALL CHECKS PASSED" if failures == 0 else f"{failures} CHECK(S) FAILED"))
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    out(f"report written to {REPORT}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
