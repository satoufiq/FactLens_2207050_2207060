"""
External evaluation of BanglaVerify on a labelled Bangla fake-news CSV.

Uses the same code path the website uses (BanglaVerifyModel.predict, which is
the training notebook's scan()), with the calibrated thresholds from
banglaverify_v2_config.json. Three views of every row:

  full      headline + article_text as a pair     (a fetched news article)
  headline  the headline alone, short mode        (a forwarded headline)
  text      the `text` column as one pasted text  (what a user pastes)

Labels: `label` 1 = fake, 0 = real (BanglaFakeNews2025 benchmark).

    py services/rumour-service/scripts/evaluate_external.py --csv path.csv \
        [--views full,headline,text] [--limit N] [--out report.json] [--register]

--register writes the full-view result into models/registry.json as the
model's external metrics, with the acceptance-gate check.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
from collections import OrderedDict, defaultdict
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_ROOT.parents[1]
for p in (SERVICE_ROOT, REPO_ROOT / "services" / "shared"):
    sys.path.insert(0, str(p))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402


def metrics(y_fake, p_fake, pred_fake):
    y, p, yhat = np.asarray(y_fake, int), np.asarray(p_fake, float), np.asarray(pred_fake, int)
    n = len(y)
    tp = int(((yhat == 1) & (y == 1)).sum()); tn = int(((yhat == 0) & (y == 0)).sum())
    fp = int(((yhat == 1) & (y == 0)).sum()); fn = int(((yhat == 0) & (y == 1)).sum())

    def f1(prec, rec):
        return 0.0 if prec + rec == 0 else 2 * prec * rec / (prec + rec)

    fake_p = tp / (tp + fp) if tp + fp else 0.0
    fake_r = tp / (tp + fn) if tp + fn else None
    real_p = tn / (tn + fn) if tn + fn else 0.0
    real_r = tn / (tn + fp) if tn + fp else None
    both = fake_r is not None and real_r is not None
    out = OrderedDict(n=n, n_fake=int(y.sum()), n_real=int(n - y.sum()),
                      accuracy=(tp + tn) / n if n else None)
    out["macro_f1"] = (f1(fake_p, fake_r) + f1(real_p, real_r)) / 2 if both else None
    out["fake_precision"] = fake_p if (tp + fp) else None
    out["fake_recall"] = fake_r
    out["fake_f1"] = f1(fake_p, fake_r) if fake_r is not None else None
    out["real_recall"] = real_r
    out["false_alarm_rate"] = (fp / (tn + fp)) if (tn + fp) else None
    denom = math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn))
    out["mcc"] = ((tp * tn - fp * fn) / denom) if denom else None
    if both:
        order = np.argsort(p, kind="mergesort")
        ranks = np.empty(n); ranks[order] = np.arange(1, n + 1)
        # average ranks for ties
        for v in np.unique(p):
            idx = p == v
            if idx.sum() > 1:
                ranks[idx] = ranks[idx].mean()
        npos, nneg = y.sum(), n - y.sum()
        out["auc_roc"] = float((ranks[y == 1].sum() - npos * (npos + 1) / 2) / (npos * nneg))
    else:
        out["auc_roc"] = None
    bins = np.linspace(0, 1, 11)
    ece = 0.0
    for lo, hi in zip(bins[:-1], bins[1:]):
        m = (p >= lo) & ((p < hi) if hi < 1 else (p <= hi))
        if m.any():
            ece += m.mean() * abs(p[m].mean() - y[m].mean())
    out["ece"] = float(ece)
    out["confusion"] = {"tp_fake": tp, "fn_fake": fn, "fp_real_as_fake": fp, "tn_real": tn}
    return out


def fmt(m):
    def g(k, pct=True):
        v = m.get(k)
        return "  n/a " if v is None else (f"{v*100:5.1f}%" if pct else f"{v:.3f}")
    return (f"n={m['n']:5d}  acc {g('accuracy')}  macroF1 {g('macro_f1')}  "
            f"fake P {g('fake_precision')} R {g('fake_recall')}  real R {g('real_recall')}  "
            f"AUC {g('auc_roc', False)}  ECE {g('ece', False)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--model-dir", default=str(REPO_ROOT / "models" / "banglaverify"))
    ap.add_argument("--views", default="full,headline,text")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--out", default="")
    ap.add_argument("--register", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    from src.providers.banglaverify_model import BanglaVerifyModel

    df = pd.read_csv(args.csv)
    if args.limit:
        df = df.sample(n=min(args.limit, len(df)), random_state=0).reset_index(drop=True)
    y = df["label"].astype(int).to_numpy()  # 1 = fake

    model = BanglaVerifyModel(args.model_dir, device="cpu")
    t0 = time.perf_counter()
    if not model.load():
        sys.exit(f"BanglaVerify failed to load: {model.last_error()}")
    print(f"Loaded {model.version()} in {time.perf_counter()-t0:.1f}s; {len(df)} rows", flush=True)

    views = [v.strip() for v in args.views.split(",") if v.strip()]
    report = OrderedDict(dataset=Path(args.csv).name, model_version=model.version(),
                         thresholds=model.cfg["threshold"], views=OrderedDict())
    per_row = {}
    for view in views:
        p, pred, modes, lat = [], [], [], []
        t_view = time.perf_counter()
        for i, row in df.iterrows():
            head = "" if pd.isna(row["headline"]) else str(row["headline"])
            body = "" if pd.isna(row["article_text"]) else str(row["article_text"])
            t = time.perf_counter()
            if view == "full":
                r = model.predict(headline=head, content=body)
            elif view == "headline":
                r = model.predict(text=head)
            else:
                r = model.predict(text="" if pd.isna(row["text"]) else str(row["text"]))
            lat.append((time.perf_counter() - t) * 1000)
            p.append(r["p_fake"]); pred.append(int(r["label"] == "fake")); modes.append(r["mode"])
            if (i + 1) % 250 == 0:
                print(f"  [{view}] {i+1}/{len(df)}  {(time.perf_counter()-t_view)/60:.1f} min", flush=True)
        per_row[view] = (np.array(p), np.array(pred), modes)
        overall = metrics(y, p, pred)
        overall["median_latency_ms"] = float(np.median(lat))
        overall["modes"] = dict(pd.Series(modes).value_counts())
        groups = OrderedDict()
        for col in ("split", "source", "fake_type", "category"):
            if col not in df:
                continue
            keys = df[col].fillna("n/a").astype(str)
            if col == "source":
                top = set(keys.value_counts().head(4).index)
                keys = keys.where(keys.isin(top), "other")
            for k in sorted(keys.unique()):
                m = (keys == k).to_numpy()
                groups[f"{col}={k}"] = metrics(y[m], np.array(p)[m], np.array(pred)[m])
        report["views"][view] = OrderedDict(overall=overall, groups=groups)
        print(f"\n== {view} ==  {fmt(overall)}", flush=True)
        for k, m in groups.items():
            print(f"   {k:28s} {fmt(m)}")

    ind = model.cfg.get("test_metrics", {})
    report["in_distribution"] = {k: ind.get(k) for k in ("full", "headline")}
    print("\nIn-distribution (from the notebook):")
    for k in ("full", "headline"):
        if ind.get(k):
            print(f"   {k:9s} acc {ind[k]['accuracy']*100:5.1f}%  macroF1 {ind[k]['macro_f1']*100:5.1f}%  "
                  f"fake R {ind[k]['fake_recall']*100:5.1f}%  AUC {ind[k]['auc_roc']:.3f}")

    reg_path = REPO_ROOT / "models" / "registry.json"
    reg = json.loads(reg_path.read_text(encoding="utf-8"))
    max_drop = reg.get("acceptance_policy", {}).get("max_external_macro_f1_drop", 0.1)
    if "full" in report["views"] and ind.get("full"):
        drop = ind["full"]["macro_f1"] - report["views"]["full"]["overall"]["macro_f1"]
        report["acceptance"] = {"macro_f1_drop": drop, "max_allowed": max_drop, "passed": drop <= max_drop}
        print(f"\nAcceptance gate (full view): macro-F1 drop {drop*100:+.1f} pts vs max "
              f"{max_drop*100:.0f} -> {'PASS' if drop <= max_drop else 'FAIL'}")

    if args.out:
        Path(args.out).write_text(json.dumps(report, indent=2, ensure_ascii=False, default=float), encoding="utf-8")
        print(f"Report written to {args.out}")

    if args.register and "full" in report["views"]:
        entry = next(m for m in reg["models"] if m["name"] == "BanglaVerify")
        ext = OrderedDict(dataset=report["dataset"])
        for view in report["views"]:
            o = report["views"][view]["overall"]
            ext[view] = {k: o[k] for k in ("n", "accuracy", "macro_f1", "fake_precision", "fake_recall",
                                           "real_recall", "auc_roc", "ece")}
        ext["accuracy"] = ext["full"]["accuracy"]
        ext["macro_f1"] = ext["full"]["macro_f1"]
        ext["fake_class_recall"] = ext["full"]["fake_recall"]
        entry["metrics"]["external"] = ext
        entry["metrics"]["acceptance"] = report.get("acceptance")
        reg_path.write_text(json.dumps(reg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("Registry updated with the external metrics.")


if __name__ == "__main__":
    main()
