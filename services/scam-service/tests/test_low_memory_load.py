"""
The runtime's low-memory load must give exactly the model the provider builds.

`ScamNetRuntime.load()` wraps the provider's own `load()` in
`memory_efficient_load()` (fp16 construction, no mean-resizing, deferred
`.float()`). These tests build a *tiny* ScamNet -- same code, same tokenizer,
same features, a 2-layer encoder -- save it as an fp16 checkpoint like the real
ones, then load it twice:

  * with the unmodified provider (`ScamModelProvider.load()`), and
  * through `ScamNetRuntime` (the low-memory path),

and require every weight and every prediction to be bit-identical. That is
the property the real 1 GB checkpoint relies on, checked without needing the
memory to load the real model.
"""

from __future__ import annotations

import json
import os
import shutil

import pytest
import torch

from src.providers import scam_model_provider as smp
from src.providers.scamnet import ScamNetRuntime

REAL_DIR = os.environ.get("SCAMNET_MODEL_DIR", "models/scamnet")
HAVE_CONFIG = os.path.exists(os.path.join(REAL_DIR, "scamnet_config.json")) and os.path.isdir(
    os.path.join(REAL_DIR, "scamnet_tokenizer")
)

TINY_ENCODER = dict(
    vocab_size=250002, hidden_size=32, num_hidden_layers=2, num_attention_heads=2,
    intermediate_size=64, hidden_act="gelu", max_position_embeddings=514, type_vocab_size=1,
    layer_norm_eps=1e-5, pad_token_id=1, bos_token_id=0, eos_token_id=2,
    model_type="xlm-roberta",
)

MESSAGES = [
    "Apnar bKash account block hoye jabe. Ekhoni OTP 4821 pathan 01712345678 number e.",
    "অভিনন্দন! আপনি ৫০,০০০ টাকা জিতেছেন। ৫০০ টাকা পাঠান: www.pr1ze-claim.xyz/win",
    "Meeting moved to 4pm tomorrow.",
]


@pytest.fixture(scope="module")
def tiny_model_dir(tmp_path_factory):
    if not HAVE_CONFIG:
        pytest.skip("scamnet_config.json / tokenizer not present")
    root = tmp_path_factory.mktemp("tiny_scamnet")
    cfg = json.load(open(os.path.join(REAL_DIR, "scamnet_config.json"), encoding="utf-8"))
    cfg["weights"] = ["tiny_seed1.pt"]
    (root / "scamnet_config.json").write_text(json.dumps(cfg), encoding="utf-8")
    shutil.copytree(os.path.join(REAL_DIR, "scamnet_tokenizer"), root / "scamnet_tokenizer")

    from transformers import AutoTokenizer, XLMRobertaConfig

    enc_cfg = XLMRobertaConfig(**{k: v for k, v in TINY_ENCODER.items() if k != "model_type"})
    enc_cfg.save_pretrained(root / "encoder_config")  # the provider reads this dir if present

    tokenizer = AutoTokenizer.from_pretrained(root / "scamnet_tokenizer")
    torch.manual_seed(1)
    net = smp._ScamNet(enc_cfg, len(tokenizer), len(cfg["chars"]), len(smp.FEATURE_NAMES), cfg)
    # Like the real checkpoints: every tensor stored as fp16.
    state = {k: v.detach().half() for k, v in net.state_dict().items()}
    torch.save(state, root / "tiny_seed1.pt")
    return str(root)


def test_low_memory_load_gives_identical_weights_and_predictions(tiny_model_dir):
    reference = smp.ScamModelProvider(tiny_model_dir, device="cpu", max_models=1)
    assert reference.load(), reference.last_error()

    runtime = ScamNetRuntime(tiny_model_dir, device="cpu", max_models=1, timeout_s=60)
    assert runtime.load(warm_up=False), runtime.last_error()
    candidate = runtime.provider

    ref_state = reference.models[0].state_dict()
    new_state = candidate.models[0].state_dict()
    assert ref_state.keys() == new_state.keys()
    for key in ref_state:
        assert ref_state[key].dtype == new_state[key].dtype, key
        assert torch.equal(ref_state[key], new_state[key]), f"{key} differs"
    assert all(p.dtype == torch.float32 for p in candidate.models[0].parameters())

    for text in MESSAGES:
        a, b = reference.predict(text), candidate.predict(text)
        assert a == b, f"prediction differs for {text!r}:\n{a}\n{b}"

    assert runtime.version() == reference.version()


def test_low_memory_load_restores_global_torch_state(tiny_model_dir):
    float_before = torch.nn.Module.float
    runtime = ScamNetRuntime(tiny_model_dir, device="cpu", max_models=1)
    assert runtime.load(warm_up=False)
    assert torch.get_default_dtype() == torch.float32
    assert torch.nn.Module.float is float_before
    from transformers import PreTrainedModel

    assert "resize_without_mean_init" not in PreTrainedModel.resize_token_embeddings.__qualname__
