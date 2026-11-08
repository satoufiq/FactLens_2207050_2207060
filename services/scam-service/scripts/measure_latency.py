"""
Measure ScamNet-BN load time, warm-up and per-message CPU latency.

Loads the real model through the same runtime the worker uses (settings,
warm-up, timeout path), then times a fixed set of messages. Run with other
memory-heavy apps closed: one ensemble member needs about 2.3 GB of RAM.

    py services/scam-service/scripts/measure_latency.py [--rounds 5]
"""

from __future__ import annotations

import argparse
import os
import statistics
import sys
import time
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_ROOT.parents[1]
sys.path[:0] = [str(SERVICE_ROOT), str(REPO_ROOT / "services" / "shared")]
os.environ.setdefault("SCAMNET_MODEL_DIR", str(REPO_ROOT / "models" / "scamnet"))
os.environ.setdefault("SCAMNET_MAX_MODELS", "1")
os.environ.setdefault("SCAMNET_DEVICE", "cpu")
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:1/0")

MESSAGES = [
    ("smish, Banglish", "Apnar bKash account block hoye jabe. Ekhoni OTP 4821 pathan 01712345678 number e."),
    ("smish, Bengali", "অভিনন্দন! আপনি ৫০,০০০ টাকা জিতেছেন। ৫০০ টাকা পাঠান: www.pr1ze-claim.xyz/win"),
    ("smish, homoglyph", "Your bКash ассount is suspended. Verify now: bit.ly/bk-verify"),
    ("promo", "Grameenphone: 30GB internet mattro 299 takay! Offer cholbe 30 November porjonto. Dial *121*3#"),
    ("normal, Bengali", "আজ সন্ধ্যা ৭টায় বিভাগীয় সভা অনুষ্ঠিত হবে। সবাইকে উপস্থিত থাকার অনুরোধ করা হলো।"),
    ("normal, English", "Meeting moved to 4pm tomorrow in room 302. Please bring the printed report."),
    ("long message", " ".join(["Dear customer, your parcel is waiting at the depot."] * 12)),
]


def rss_mb() -> float | None:
    try:
        import psutil

        return psutil.Process().memory_info().rss / 1_048_576
    except Exception:  # noqa: BLE001
        return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds", type=int, default=5)
    args = parser.parse_args()

    from src.core.config import settings
    from src.providers.scamnet import ScamNetRuntime

    print(f"model dir : {settings.SCAMNET_MODEL_DIR}")
    print(f"device    : {settings.SCAMNET_DEVICE}  | max models: {settings.SCAMNET_MAX_MODELS}")
    print(f"timeout   : {settings.SCAMNET_TIMEOUT_SECONDS}s")
    before = rss_mb()

    runtime = ScamNetRuntime(
        model_dir=settings.SCAMNET_MODEL_DIR,
        device=settings.SCAMNET_DEVICE,
        max_models=settings.SCAMNET_MAX_MODELS,
        # Generous here: this script measures the model, not the timeout path.
        timeout_s=120,
        num_threads=settings.SCAMNET_NUM_THREADS,
    )
    if not runtime.load(warm_up=True):
        print("LOAD FAILED:", runtime.last_error())
        return 1

    after = rss_mb()
    print(f"\nloaded    : {runtime.version()} in {runtime.report.load_ms / 1000:.1f}s")

    # The runtime builds the network in fp16 to fit in memory, then the
    # provider converts it to fp32. Prove the result equals the checkpoint
    # exactly, tensor by tensor, as the provider's normal fp32 path would.
    import torch

    net = runtime.provider.models[0]
    weights_file = os.path.join(settings.SCAMNET_MODEL_DIR, runtime.provider.cfg["weights"][0])
    checkpoint = torch.load(weights_file, map_location="cpu", weights_only=True, mmap=True)
    state = net.state_dict()
    mismatched = [k for k, v in checkpoint.items()
                  if not torch.equal(state[k], v.to(state[k].dtype))]
    non_fp32 = sorted({str(p.dtype) for p in net.parameters() if p.dtype != torch.float32})
    extra = [k for k, v in net.state_dict(keep_vars=True).items()
             if k not in checkpoint and v.is_floating_point()]
    print(f"verify    : {len(checkpoint)} tensors compared, {len(mismatched)} differ; "
          f"parameter dtypes not fp32: {non_fp32 or 'none'}; "
          f"float tensors not from the checkpoint: {extra or 'none'}")
    if mismatched or non_fp32 or extra:
        print("VERIFY FAILED:", mismatched[:5], non_fp32, extra[:5])
        return 1
    del checkpoint, state
    print(f"warm-up   : {runtime.report.warmup_ms:.0f} ms (first prediction after load)")
    if before is not None and after is not None:
        print(f"memory    : {after - before:,.0f} MB added (process RSS {after:,.0f} MB)")

    print(f"\n{'message':18} {'class':7} {'risk':7} {'p(smish)':>9} {'median ms':>10} {'max ms':>8}")
    all_times = []
    for label, text in MESSAGES:
        times = []
        last = None
        for _ in range(args.rounds):
            call = runtime.predict(text)
            if not call.ok:
                print(f"{label:18} FAILED: {call.status} {call.error}")
                return 1
            times.append(call.latency_ms)
            last = call.prediction
        all_times.extend(times)
        print(
            f"{label:18} {last['class']:7} {last['risk']:7} "
            f"{last['probabilities']['smish']:9.4f} {statistics.median(times):10.0f} {max(times):8.0f}"
        )

    all_times.sort()
    p95 = all_times[max(0, int(round(0.95 * len(all_times))) - 1)]
    print(
        f"\nper message over {len(all_times)} predictions: median "
        f"{statistics.median(all_times):.0f} ms, p95 {p95:.0f} ms, max {all_times[-1]:.0f} ms"
    )
    print(
        "target    : well under 2000 ms -> "
        + ("MET" if p95 < 2000 else "NOT MET")
    )
    return 0


if __name__ == "__main__":
    t = time.perf_counter()
    code = main()
    print(f"total run : {time.perf_counter() - t:.1f}s")
    sys.exit(code)
