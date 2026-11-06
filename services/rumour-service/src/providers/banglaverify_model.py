"""
BanglaVerify v2 -- inference code taken from the training notebook.

Everything that touches the text or the network is copied VERBATIM from the
Kaggle notebook that produced banglaverify_v2_seed42.pt:

    URL_RE, HTML_RE, WS_RE, SENT_SPLIT, NULL_STRINGS, clean, cap_words,
    encode_pair, encode_single, pad, BanglaVerify.forward, softmax_np,
    and the body of scan() (as `scan`, below)

Do not edit, reformat or "tidy" those blocks: the model only works with the
exact preprocessing it was trained on (csebuetnlp normalizer, headline/body
pairing, the 60-word short/full split, per-mode temperature and threshold).

The only changes from the notebook, each needed to serve offline:
  * `BanglaVerify.__init__` builds the backbone from a local config
    (`AutoModel.from_config`) instead of downloading the pretrained base with
    `from_pretrained` -- every weight is then replaced by the checkpoint.
  * The notebook's module globals (`CFG`, `tokenizer`, `models`, `T_full`,
    `thr_full`, ...) are filled from banglaverify_v2_config.json by
    `BanglaVerifyModel.load()` instead of by the training run.
  * `scan()` takes the loaded state explicitly and runs on CPU without AMP
    (AMP only applies on CUDA in the notebook as well).
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import unicodedata
from typing import Any, Dict, List, Optional

import numpy as np
import torch
import torch.nn as nn

try:
    from normalizer import normalize as _bn_norm
except Exception:  # noqa: BLE001
    _bn_norm = None

LABEL_FAKE, LABEL_REAL = 0, 1


class CFG:
    """Inference constants; overwritten from banglaverify_v2_config.json at load."""

    model_name = "csebuetnlp/banglabert"
    full_len = 384
    short_len = 128
    short_word_limit = 60
    max_headline_words = 60
    dropout = 0.2
    n_msd = 5
    min_words = 20


# The notebook's module-level tokenizer; set by BanglaVerifyModel.load().
tokenizer = None


# ======================= VERBATIM FROM THE NOTEBOOK ==========================
URL_RE = re.compile(r"https?://\S+|www\.\S+")
HTML_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")
SENT_SPLIT = re.compile(r"(?<=[।!?\.|])\s+")
NULL_STRINGS = {"nan", "none", "null", "na", "n/a"}


def clean(text):
    if not isinstance(text, str):
        return ""
    t = HTML_RE.sub(" ", text)
    t = URL_RE.sub(" ", t)
    if _bn_norm is not None:
        try:
            t = _bn_norm(t)
        except Exception:
            t = unicodedata.normalize("NFC", t)
    else:
        t = unicodedata.normalize("NFC", t)
    t = WS_RE.sub(" ", t).strip()
    return "" if t.lower() in NULL_STRINGS else t


def cap_words(text, n):
    w = text.split()
    return " ".join(w[:n])


def encode_pair(head, body, max_len=None):
    max_len = max_len or CFG.full_len
    head = cap_words(head, CFG.max_headline_words)
    if head and body:
        return tokenizer(head, body, truncation="only_second", max_length=max_len)
    return tokenizer(head or body or " ", truncation=True, max_length=max_len)


def encode_single(text, max_len=None):
    return tokenizer(text or " ", truncation=True, max_length=max_len or CFG.short_len)


def pad(encs):
    return tokenizer.pad([dict(e) for e in encs], padding=True,
                         pad_to_multiple_of=8, return_tensors="pt")


def softmax_np(logits, T=1.0):
    z = logits / T
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)
# ===================== END VERBATIM FROM THE NOTEBOOK ========================


class BanglaVerify(nn.Module):
    def __init__(self, encoder_config, n_classes=2):
        # CHANGED from the notebook: built from a local config instead of
        # AutoModel.from_pretrained(model_name), which would download the base
        # weights. Every weight is overwritten by the checkpoint afterwards.
        super().__init__()
        from transformers import AutoModel

        cfg = encoder_config
        cfg.hidden_dropout_prob = 0.1
        cfg.attention_probs_dropout_prob = 0.1
        self.backbone = AutoModel.from_config(cfg)
        h = cfg.hidden_size
        self.norm = nn.LayerNorm(h * 2)
        self.dropouts = nn.ModuleList([nn.Dropout(CFG.dropout) for _ in range(CFG.n_msd)])
        self.fc = nn.Linear(h * 2, n_classes)

    # ===================== VERBATIM FROM THE NOTEBOOK ========================
    def forward(self, input_ids, attention_mask, token_type_ids=None):
        kw = {"input_ids": input_ids, "attention_mask": attention_mask}
        if token_type_ids is not None:
            kw["token_type_ids"] = token_type_ids
        hidden = self.backbone(**kw).last_hidden_state
        cls = hidden[:, 0]
        m = attention_mask.unsqueeze(-1).to(hidden.dtype)
        mean = (hidden * m).sum(1) / m.sum(1).clamp(min=1e-6)
        feat = self.norm(torch.cat([cls, mean], dim=-1).float())
        if self.training:
            return torch.stack([self.fc(d(feat)) for d in self.dropouts]).mean(0)
        return self.fc(feat)
    # =================== END VERBATIM FROM THE NOTEBOOK ======================


class BanglaVerifyModel:
    """Loads the checkpoint and exposes the notebook's scan() as predict()."""

    def __init__(self, model_dir: str, device: Optional[str] = None,
                 max_models: Optional[int] = None, num_threads: Optional[int] = None):
        self.model_dir = model_dir
        self.device = torch.device(device or "cpu")
        self.max_models = max_models
        self.num_threads = num_threads
        self.models: List[BanglaVerify] = []
        self._lock = threading.Lock()
        self._error: Optional[str] = None
        self._version = "unloaded"
        self.cfg: Dict[str, Any] = {}

    def load(self) -> bool:
        """Load config, tokenizer and weights. Never raises."""
        global tokenizer
        try:
            from transformers import AutoConfig, AutoTokenizer

            if self.num_threads:
                torch.set_num_threads(self.num_threads)
            with open(os.path.join(self.model_dir, "banglaverify_v2_config.json"), encoding="utf-8") as f:
                cfg = json.load(f)
            for key in ("full_len", "short_len", "short_word_limit", "max_headline_words",
                        "dropout", "n_msd"):
                setattr(CFG, key, cfg[key])
            if cfg["labels"] != {"0": "fake", "1": "real"}:
                raise RuntimeError(f"unexpected label map {cfg['labels']}")
            if _bn_norm is None:
                raise RuntimeError(
                    "the csebuetnlp 'normalizer' package is not installed; BanglaVerify was "
                    "trained on normalized text and gives wrong answers without it"
                )
            self.cfg = cfg
            tokenizer = AutoTokenizer.from_pretrained(os.path.join(self.model_dir, "tokenizer"))
            enc_cfg = AutoConfig.from_pretrained(os.path.join(self.model_dir, "encoder_config"))
            weights = cfg["weights"][: self.max_models] if self.max_models else cfg["weights"]
            models = []
            for name in weights:
                net = BanglaVerify(enc_cfg)
                state = torch.load(os.path.join(self.model_dir, name), map_location="cpu", weights_only=True)
                # The checkpoint holds the trained modules only (no dropout state).
                net.load_state_dict({k: v.float() for k, v in state.items()}, strict=True)
                models.append(net.eval().to(self.device))
                del state
            self.models = models
            digest = hashlib.sha1(json.dumps(
                [cfg["weights"], cfg["temperature"], cfg["threshold"]], sort_keys=True
            ).encode()).hexdigest()[:8]
            self._version = f"banglaverify-v2-{len(models)}x-{digest}"
            self._error = None
        except Exception as exc:  # noqa: BLE001
            self.models = []
            self._error = f"{type(exc).__name__}: {exc}"
        return self.is_available()

    def is_available(self) -> bool:
        return bool(self.models)

    def version(self) -> str:
        return self._version

    def last_error(self) -> Optional[str]:
        return self._error

    @torch.no_grad()
    def predict(self, text=None, headline=None, content=None, recall_first=False) -> Dict[str, Any]:
        """The notebook's scan(), with its globals made explicit."""
        if not self.is_available():
            raise RuntimeError(f"BanglaVerify not loaded: {self._error}")
        T_full, T_short = self.cfg["temperature"]["full"], self.cfg["temperature"]["short"]
        thr_full, thr_short = self.cfg["threshold"]["full"], self.cfg["threshold"]["short"]
        thr_full_recall = self.cfg["threshold_recall_first"]["full"]
        thr_short_recall = self.cfg["threshold_recall_first"]["short"]
        models = self.models
        DEVICE = self.device

        with self._lock:
            # ===================== VERBATIM FROM THE NOTEBOOK (scan) =========
            if text is not None:
                t = clean(text)
                if len(t.split()) <= CFG.short_word_limit:
                    mode, enc = "short", encode_single(t)
                else:
                    parts = SENT_SPLIT.split(t, maxsplit=1)
                    head = cap_words(parts[0], CFG.max_headline_words)
                    body = parts[1] if len(parts) > 1 else ""
                    mode, enc = "full", encode_pair(head, body)
            else:
                h, b = clean(headline or ""), clean(content or "")
                if len(b.split()) >= CFG.min_words:
                    mode, enc = "full", encode_pair(h, b)
                else:
                    mode, enc = "short", encode_single(f"{h} {b}".strip())
            x = {k: v.to(DEVICE) for k, v in pad([enc]).items()}
            logits = []
            for m in models:
                m.to(DEVICE).eval()
                logits.append(m(**x).float().cpu().numpy())
            lg = np.mean(logits, axis=0)
            T = T_full if mode == "full" else T_short
            thr_map = {"full": thr_full_recall, "short": thr_short_recall} if recall_first else \
                      {"full": thr_full, "short": thr_short}
            p_fake = float(softmax_np(lg, T)[0, LABEL_FAKE])
            result = {"label": "fake" if p_fake >= thr_map[mode] else "real",
                      "p_fake": round(p_fake, 4), "mode": mode, "threshold": round(thr_map[mode], 3)}
            # =================== END VERBATIM FROM THE NOTEBOOK ==============
        result["model_version"] = self._version
        result["n_tokens"] = int(x["input_ids"].shape[1])
        return result
