"""
Evaluate ScamNet-BN end to end through the RUNNING Scam Alert website API.

Every message goes through the same path as a user's scan: POST /scams/scans,
poll, read the result. ScamNet-BN alone decides the risk the website shows, so
a scam counts as DETECTED when that risk is High or Medium (a warning). The
model's class (smish / promo / normal) is reported alongside.

Scans are sent one at a time: in local eager mode a second concurrent scan would
find the model busy and come back "Unable to analyze", which is not what is
being measured. Scans that come back without a model verdict are reported and
excluded from the metrics rather than silently counted.

Usage (Scam Alert must be running with the model loaded):
    py services/scam-service/scripts/evaluate_live.py \
        --csv data/external/banglaphish_2026_master.csv --text-col text_bn \
        --label-col label --name BanglaPhish-2026 --synthetic [--split test] [--register]

Any CSV works: --label-col values are mapped to scam / legitimate / promo
(scam, smish, spam, phishing, fraud, 1 -> scam; legitimate, legit, normal, ham,
0 -> legitimate; promo, promotional, ad -> promo).
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

SCAM_LABELS = {"scam", "smish", "smishing", "spam", "phishing", "fraud", "1", "true"}
LEGIT_LABELS = {"legitimate", "legit", "normal", "ham", "benign", "0", "false", "safe"}
PROMO_LABELS = {"promo", "promotional", "promotion", "ad", "advert", "marketing"}
WARNING_RISKS = {"High", "Medium"}

lines: list[str] = []


def out(text: str = "") -> None:
    print(text, flush=True)
    lines.append(text)


def map_label(raw) -> str | None:
    value = str(raw).strip().lower()
    if value in SCAM_LABELS:
        return "scam"
    if value in LEGIT_LABELS:
        return "legitimate"
    if value in PROMO_LABELS:
        return "promo"
    return None


def canonical(text: str) -> str:
    return " ".join(unicodedata.normalize("NFC", text).casefold().split())


def api(base: str, path: str, body: dict | None = None, timeout: float = 120) -> dict:
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
    accepted = api(base, "/api/v1/scams/scans", {"message": message})
    deadline = time.time() + 120
    while True:
        result = api(base, accepted["poll_url"])
        if result.get("is_terminal"):
            return result
        if time.time() > deadline:
            raise TimeoutError(f"scan {accepted['scan_id']} still {result['status']}")
        time.sleep(0.3)


def binary_scores(gold: list[bool], pred: list[bool]) -> dict:
    """Scam = positive. Precision/recall/F1 for both classes, macro F1, accuracy."""
    tp = sum(g and p for g, p in zip(gold, pred))
    tn = sum((not g) and (not p) for g, p in zip(gold, pred))
    fp = sum((not g) and p for g, p in zip(gold, pred))
    fn = sum(g and (not p) for g, p in zip(gold, pred))

    def f1(precision, recall):
        return 2 * precision * recall / (precision + recall) if precision + recall else 0.0

    p_pos = tp / (tp + fp) if tp + fp else 0.0
    r_pos = tp / (tp + fn) if tp + fn else 0.0
    p_neg = tn / (tn + fn) if tn + fn else 0.0
    r_neg = tn / (tn + fp) if tn + fp else 0.0
    both_classes = any(gold) and not all(gold)
    return {
        "n": len(gold),
        "accuracy": round((tp + tn) / len(gold), 4) if gold else 0.0,
        "scam_recall": round(r_pos, 4) if tp + fn else None,
        "scam_precision": round(p_pos, 4) if tp + fp else None,
        "false_alarm_rate": round(fp / (fp + tn), 4) if fp + tn else None,
        # Undefined with only one class present: reporting 0.5 would read as a
        # poor score when it is simply not measurable.
        "macro_f1": round((f1(p_pos, r_pos) + f1(p_neg, r_neg)) / 2, 4) if both_classes else None,
        "tp": tp, "fn": fn, "fp": fp, "tn": tn,
    }


def fmt(value, kind: str = "pct") -> str:
    if value is None:
        return "n/a"
    return pct(value) if kind == "pct" else f"{value:.4f}"


def pct(x: float) -> str:
    return f"{100 * x:.2f}%"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--csv", required=True)
    parser.add_argument("--text-col", default=None, help="Defaults to text_bn, text or message")
    parser.add_argument("--label-col", default="label")
    parser.add_argument("--group-col", default="domain", help="Per-group breakdown column, if present")
    parser.add_argument("--split", default=None, help="Keep only rows whose 'split' column equals this")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--name", default=None, help="Dataset name for the report and registry")
    parser.add_argument("--synthetic", action="store_true", help="Mark the dataset as synthetic in the report")
    parser.add_argument("--base", default="http://127.0.0.1:8003")
    parser.add_argument("--out-dir", default=str(REPO_ROOT / "evaluation"))
    parser.add_argument("--register", action="store_true",
                        help="Record the result as ScamNet-BN's external evaluation in models/registry.json")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    name = args.name or csv_path.stem
    with open(csv_path, encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    columns = rows[0].keys() if rows else []
    text_col = args.text_col or next((c for c in ("text_bn", "text", "message") if c in columns), None)
    if not text_col or args.label_col not in columns:
        raise SystemExit(f"Need a text column and '{args.label_col}'. Columns: {list(columns)}")
    if args.split:
        rows = [r for r in rows if r.get("split") == args.split]

    # Map labels and drop exact duplicates so no message is counted twice.
    seen, items, unknown_labels, duplicates = set(), [], Counter(), 0
    for row in rows:
        label = map_label(row[args.label_col])
        if label is None:
            unknown_labels[row[args.label_col]] += 1
            continue
        text = (row[text_col] or "").strip()
        key = canonical(text)
        if not text or key in seen:
            duplicates += 1
            continue
        seen.add(key)
        items.append({"text": text, "label": label, "group": row.get(args.group_col, "") or ""})
    if args.limit:
        items = items[: args.limit]

    out(f"ScamNet-BN website evaluation  {datetime.now():%Y-%m-%d %H:%M:%S}")
    out(f"dataset : {name} ({csv_path.name})" + (f", split={args.split}" if args.split else ""))
    if args.synthetic:
        out("          SYNTHETIC messages: unseen by the model, but generated, not collected from real phones.")
    out(f"messages: {len(items)} unique ({duplicates} duplicates/empty removed"
        + (f", {sum(unknown_labels.values())} with unknown labels skipped: {dict(unknown_labels)}" if unknown_labels else "")
        + ")")
    out(f"labels  : {dict(Counter(i['label'] for i in items))}")

    health = api(args.base, "/health")
    model = health.get("model", {})
    out(f"service : {args.base} | model available={model.get('available')} version={model.get('version')}")
    if not model.get("available"):
        out(f"\nSTOP: ScamNet-BN is not loaded ({model.get('last_error')}). Nothing to evaluate.")
        return 1

    # -- run ---------------------------------------------------------------
    results, started = [], time.time()
    for index, item in enumerate(items, 1):
        try:
            r = scan(args.base, item["text"])
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            out(f"  request failed for message {index}: {exc}")
            results.append({**item, "status": "REQUEST_FAILED"})
            continue
        run = next((x for x in r.get("model_runs", []) if x["model_name"] == "scamnet-bn"), {})
        detail = r.get("detail") or {}
        results.append({
            **item,
            "status": r["status"],
            "model_status": run.get("status"),
            "risk": r.get("risk"),
            "risk_label": r.get("risk_label"),
            "model_class": r.get("class"),
            "p_smish": (r.get("probabilities") or {}).get("smish"),
            "no_verdict_reason": detail.get("scamnet_reason"),
            "latency_ms": run.get("latency_ms"),
            "scan_id": r.get("scan_id"),
        })
        if index % 50 == 0 or index == len(items):
            elapsed = time.time() - started
            eta = elapsed / index * (len(items) - index)
            print(f"  {index}/{len(items)} scanned, {elapsed / 60:.1f} min elapsed, ~{eta / 60:.1f} min left", flush=True)

    with_model = [x for x in results if x.get("model_status") == "OK"]
    without = [x for x in results if x.get("model_status") != "OK"]
    out(f"\nscans   : {len(results)} done, {len(with_model)} with the model, {len(without)} without"
        + (f" ({dict(Counter(x.get('model_status') or x['status'] for x in without))})" if without else ""))
    if not with_model:
        out("No scan used the model; nothing to measure.")
        return 1

    scams = [x for x in with_model if x["label"] == "scam"]
    benign = [x for x in with_model if x["label"] != "scam"]

    # -- what the website shows (= ScamNet-BN's verdict) ------------------------
    gold = [x["label"] == "scam" for x in with_model]
    site = binary_scores(gold, [x["risk"] in WARNING_RISKS for x in with_model])
    out("\n== WHAT THE WEBSITE SHOWS (ScamNet-BN's verdict) ==")
    out(f"scams detected (High or Medium warning): {site['tp']}/{len(scams)} = {fmt(site['scam_recall'])}")
    out(f"  of which High: {sum(x['risk'] == 'High' for x in scams)}, Medium: {sum(x['risk'] == 'Medium' for x in scams)}")
    out(f"scams MISSED (shown as Low risk)       : {site['fn']}/{len(scams)} = "
        f"{fmt(None if site['scam_recall'] is None else 1 - site['scam_recall'])}")
    if benign:
        high_fp = sum(x["risk"] == "High" for x in benign)
        med_fp = sum(x["risk"] == "Medium" for x in benign)
        out(f"legitimate messages wrongly shown High : {high_fp}/{len(benign)} = {pct(high_fp / len(benign))}")
        out(f"legitimate messages shown Medium       : {med_fp}/{len(benign)} = {pct(med_fp / len(benign))}")
    out(f"accuracy {pct(site['accuracy'])} | macro F1 {fmt(site['macro_f1'], 'num')} | scam precision {fmt(site['scam_precision'])}")

    class_scores = binary_scores(gold, [x["model_class"] == "smish" for x in with_model])
    out(f"by class (smish vs not): recall {fmt(class_scores['scam_recall'])}, "
        f"macro F1 {fmt(class_scores['macro_f1'], 'num')}")
    if benign:
        promo = sum(x["risk_label"] == "Promotional message" for x in benign)
        out(f"legitimate messages labelled 'Promotional message': {promo}/{len(benign)}")

    # -- groups ----------------------------------------------------------------
    groups = defaultdict(list)
    for x in scams:
        groups[x["group"]].append(x)
    if any(groups):
        out(f"\n== SCAM DETECTION BY TYPE ({args.group_col}), weakest first ==")
        ranked = sorted(groups.items(), key=lambda kv: sum(x["risk"] in WARNING_RISKS for x in kv[1]) / len(kv[1]))
        for group, members in ranked:
            caught = sum(x["risk"] in WARNING_RISKS for x in members)
            out(f"  {caught / len(members):7.2%}  {caught:4}/{len(members):<4} {group or '(none)'}")

    # -- latency ---------------------------------------------------------------
    lat = sorted(x["latency_ms"] for x in with_model if x.get("latency_ms") is not None)
    if lat:
        out(f"\nmodel latency: median {statistics.median(lat):.0f} ms, "
            f"p95 {lat[max(0, int(0.95 * len(lat)) - 1)]:.0f} ms, max {lat[-1]:.0f} ms")

    # -- examples ----------------------------------------------------------------
    missed = [x for x in scams if x["risk"] not in WARNING_RISKS]
    false_high = [x for x in benign if x["risk"] == "High"]
    if missed:
        out(f"\n== MISSED SCAMS (first {min(15, len(missed))} of {len(missed)}) ==")
        for x in missed[:15]:
            out(f"  [{x['group']}] p(smish)={x['p_smish']:.3f} class={x['model_class']}: {x['text'][:140]}")
    if false_high:
        out(f"\n== LEGITIMATE MESSAGES SHOWN AS HIGH RISK (first {min(15, len(false_high))} of {len(false_high)}) ==")
        for x in false_high[:15]:
            out(f"  [{x['group']}] p(smish)={x['p_smish']:.3f} class={x['model_class']}: {x['text'][:140]}")

    # -- files -----------------------------------------------------------------
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    slug = "".join(c if c.isalnum() else "_" for c in name).strip("_")
    report_path = out_dir / f"scamnet_eval_{slug}_{stamp}.txt"
    preds_path = out_dir / f"scamnet_eval_{slug}_{stamp}_predictions.csv"
    with open(preds_path, "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(results[0].keys()))
        writer.writeheader()
        writer.writerows(results)

    summary = {
        "dataset": name,
        "synthetic": args.synthetic,
        "split": args.split,
        "evaluated_at": datetime.now().isoformat(timespec="seconds"),
        "model_version": model.get("version"),
        "n_with_model": len(with_model),
        # The website's verdict IS ScamNet-BN's (no rule override), so the
        # website figures are the model figures.
        "website": site,
        "model_only": site,
        "model_class_only": class_scores,
        "latency_ms_median": statistics.median(lat) if lat else None,
        "report": report_path.name,
    }
    (out_dir / f"scamnet_eval_{slug}_{stamp}.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    if args.register:
        register(summary)

    out(f"\nreport      : {report_path}")
    out(f"predictions : {preds_path}")
    report_path.write_text("\n".join(lines), encoding="utf-8")
    # Stable name for the latest run, so it is easy to find and share.
    (REPO_ROOT / "scamnet_eval_report.txt").write_text("\n".join(lines), encoding="utf-8")
    return 0


def register(summary: dict) -> None:
    """Record this run as ScamNet-BN's external evaluation and apply the gate."""
    path = REPO_ROOT / "models" / "registry.json"
    registry = json.loads(path.read_text(encoding="utf-8"))
    entry = next(m for m in registry["models"] if m["name"] == "ScamNet-BN")
    max_drop = float((registry.get("acceptance_policy") or {}).get("max_external_macro_f1_drop", 0.10))
    in_dist = ((entry.get("metrics") or {}).get("in_distribution") or {}).get("macro_f1")
    ext = summary["model_only"]["macro_f1"]
    drop = None if (in_dist is None or ext is None) else round(float(in_dist) - ext, 4)
    entry.setdefault("metrics", {})["external"] = summary
    entry["metrics"]["acceptance"] = {
        "in_distribution_macro_f1": in_dist,
        "external_macro_f1": ext,
        "drop": drop,
        "max_allowed_drop": max_drop,
        "passed": None if drop is None else drop <= max_drop,
        "note": (
            "In-distribution macro F1 is 3-class (normal/promo/smish); the external "
            "figure is binary (scam vs not), because the external set has no promo "
            "label. " + ("The external set is synthetic." if summary["synthetic"] else "")
        ).strip(),
    }
    registry["updated_at"] = datetime.now().date().isoformat()
    path.write_text(json.dumps(registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    verdict = entry["metrics"]["acceptance"]["passed"]
    out(f"\nregistry    : external evaluation recorded; acceptance gate "
        f"{'PASSED' if verdict else 'FAILED' if verdict is False else 'not computed'} "
        f"(drop {drop}, max {max_drop})")


if __name__ == "__main__":
    sys.exit(main())
