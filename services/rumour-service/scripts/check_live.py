"""
Check the RUNNING Rumor Scanner service with the real BanglaVerify model.

Sends claims through the API exactly as the website does and checks:
  * the model is loaded in the process that runs scans,
  * every scan finishes (COMPLETED, or PARTIAL only because web search was
    unavailable) with a BanglaVerify model_runs row whose status is OK,
  * the model's label matches the training notebook's own examples,
  * the precedence gate used the label correctly: with no evidence, FAKE gives
    "Unverified - suspicious pattern" and REAL gives plain "Unverified",
and reports per-claim model latency from model_runs.

    py services/rumour-service/scripts/check_live.py [--base http://127.0.0.1:8002]

Writes the same report to banglaverify_check_report.txt in the repository root.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
import urllib.request
from pathlib import Path

REPORT = Path(__file__).resolve().parents[3] / "banglaverify_check_report.txt"

HEADLINE = "আগামীকাল দেশের সব শিক্ষা প্রতিষ্ঠান বন্ধ থাকবে"
CASES = [
    # (label, claim, expected model label or None to only report)
    ("notebook headline", HEADLINE, "REAL"),
    ("notebook share-bait",
     "URGENT!! সবাই শেয়ার করুন আগামীকাল দেশের সব শিক্ষা প্রতিষ্ঠান বন্ধ থাকবে Like Comment Share",
     "FAKE"),
    ("share-bait, prize",
     "সবাই শেয়ার করুন!!! প্রধানমন্ত্রী ঘোষণা দিয়েছেন সবাইকে ৫০০০ টাকা দেওয়া হবে, এখনই লিংকে ক্লিক করুন",
     None),
    ("news-style report",
     "বাংলাদেশ ব্যাংক নীতি সুদহার ২৫ বেসিস পয়েন্ট বাড়িয়েছে বলে আজ এক বিজ্ঞপ্তিতে জানানো হয়েছে",
     None),
]

lines: list[str] = []


def out(text: str = "") -> None:
    print(text, flush=True)
    lines.append(text)


def call(base: str, path: str, body: dict | None = None, timeout: float = 180) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        base + path,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"} if data else {},
        method="POST" if data else "GET",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def scan(base: str, claim: str) -> dict:
    accepted = call(base, "/api/v1/rumours/scans", {"claim": claim})
    deadline = time.time() + 240
    while True:
        result = call(base, accepted["poll_url"])
        if result.get("is_terminal"):
            return result
        if time.time() > deadline:
            raise TimeoutError(f"scan {accepted['scan_id']} still {result['status']}")
        time.sleep(1.0)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8002")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    out(f"BanglaVerify live check  {time.strftime('%Y-%m-%d %H:%M:%S')}  against {args.base}")
    health = call(args.base, "/health")
    model = health.get("model", {})
    out(f"service: {health.get('status')} | queue: {health.get('queue', {}).get('mode')}")
    out(f"model  : available={model.get('available')} version={model.get('version')}")
    if model.get("load_ms") is not None:
        out(f"load   : {model['load_ms'] / 1000:.1f}s, warm-up {model.get('warmup_ms')} ms")
    if not model.get("available"):
        out(f"\nFAIL: the model is not loaded. Reason: {model.get('reason')}")
        REPORT.write_text("\n".join(lines), encoding="utf-8")
        return 1

    failures = 0
    latencies = []
    out(f"\n{'claim':20} {'status':9} {'model':5} {'p_fake':>6} {'mode':5} {'ms':>5}  "
        f"{'decided by':15} verdict -> check")
    for label, claim, expected in CASES:
        result = scan(args.base, claim)
        detail = result.get("detail") or {}
        if detail.get("served_from_cache"):
            out(f"{label:20} {result['status']:9} served from the Redis cache (no new model run) -> SKIPPED")
            continue
        run = next((r for r in result.get("model_runs", []) if r["model_name"] == "BanglaVerify"), {})
        pred = detail.get("model_prediction") or {}
        precedence = detail.get("precedence") or {}
        verdict = result.get("verdict")
        latency = run.get("latency_ms")
        if run.get("status") == "OK" and latency is not None:
            latencies.append(latency)

        problems = []
        if result["status"] not in ("COMPLETED", "PARTIAL"):
            problems.append(f"status {result['status']}")
        degraded = [d.get("component") for d in (result.get("degraded_reason") or [])]
        if any("banglaverify" in str(c).lower() or "model" in str(c).lower() for c in degraded):
            problems.append(f"model degraded: {result.get('degraded_reason')}")
        if run.get("status") != "OK":
            problems.append(f"model_runs {run.get('status')}: {run.get('error_message')}")
        if expected and pred.get("label") != expected:
            problems.append(f"model {pred.get('label')} != {expected}")
        if precedence.get("decided_by") == "model_prior":
            want = "UNVERIFIED_SUSPICIOUS" if pred.get("label") == "FAKE" else "UNVERIFIED"
            if verdict != want:
                problems.append(f"gate gave {verdict}, expected {want}")
        failures += bool(problems)

        p_fake = pred.get("p_fake")
        out(
            f"{label:20} {result['status']:9} {str(pred.get('label')):5} "
            f"{p_fake if p_fake is not None else float('nan'):6.3f} {str(pred.get('head')):5} "
            f"{latency if latency is not None else float('nan'):5.0f}  "
            f"{str(precedence.get('decided_by')):15} {verdict} -> "
            + ("OK" if not problems else "FAIL: " + "; ".join(problems))
        )
        if degraded:
            out(f"{'':20} PARTIAL because: {', '.join(map(str, degraded))}")

    if latencies:
        out(
            f"\nmodel latency per claim (CPU, {len(latencies)} scans): median "
            f"{statistics.median(latencies):.0f} ms, max {max(latencies):.0f} ms"
        )
    out("\nRESULT: " + ("ALL CHECKS PASSED" if failures == 0 else f"{failures} CHECK(S) FAILED"))
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    out(f"report written to {REPORT}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
