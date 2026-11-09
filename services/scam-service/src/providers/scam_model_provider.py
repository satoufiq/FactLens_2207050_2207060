import hashlib
import json
import math
import os
import re
import threading
import unicodedata

import numpy as np
import torch
import torch.nn as nn
from transformers import AutoConfig, AutoModel, AutoTokenizer, XLMRobertaConfig

LABELS = ["normal", "promo", "smish"]
L_NORMAL, L_PROMO, L_SMISH = 0, 1, 2


ZERO_WIDTH = dict.fromkeys(map(ord, "​‌‍‎‏⁠⁡⁢⁣⁤"
                                    "﻿­᠎‪‫‬‭‮⁦⁧⁨⁩"), None)
HOMOGLYPHS = {
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i", "ј": "j",
    "ԁ": "d", "ɡ": "g", "һ": "h", "ӏ": "l", "ѕ": "s", "ԛ": "q", "ԝ": "w", "ν": "v", "ο": "o",
    "ρ": "p", "α": "a", "ε": "e", "ι": "i", "κ": "k", "τ": "t", "υ": "u",
    "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O", "Р": "P", "С": "C",
    "Т": "T", "Х": "X", "Ү": "Y", "Α": "A", "Β": "B", "Ε": "E", "Η": "H", "Ι": "I", "Κ": "K",
    "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Χ": "X", "Υ": "Y", "Ζ": "Z",
}
HOMO_TABLE = str.maketrans(HOMOGLYPHS)
BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
TAGS = ["[URL]", "[EMAIL]", "[PHONE]", "[MONEY]", "[ACCOUNT]", "[CODE]"]
REDACT_RE = re.compile(r"\[\s*REDACTED[_ ]?([A-Za-z]+)\s*\]", re.I)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
URL_RE = re.compile(
    r"(?i)(?:https?://|www\.)\S+|\b[a-z0-9][a-z0-9-]{1,62}\.(?:com|net|org|info|xyz|top|bd|me|io|co|ly|"
    r"link|site|online|club|app|biz|shop|live|click|in|us|cc|tk|gl|page|store|buzz|vip)(?![a-z])(?:/\S*)?")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?88[\s-]?)?0?1[3-9]\d{2}[\s-]?\d{6}(?!\d)|(?<!\d)\+\d[\d\s-]{8,14}\d(?!\d)")
MONEY_RE = re.compile(
    r"(?i)(?:৳|\btk\.?|\btaka\w*|\bbdt\b|টাকা[\u0980-\u09ff]*)\s*\d[\d,]*(?:\.\d+)?|"
    r"\d[\d,]*(?:\.\d+)?\s*(?:৳|tk\b\.?|taka\w*|bdt\b|টাকা[\u0980-\u09ff]*|/-)")
ACCOUNT_RE = re.compile(r"(?<!\d)\d{9,}(?!\d)")
ALNUM_ID_RE = re.compile(r"\b(?=(?:[A-Za-z]*\d){2})(?=(?:\d*[A-Za-z]){2})[A-Za-z0-9]{6,}\b")
CODE_RE = re.compile(r"(?<!\d)\d{4,8}(?!\d)")
WS_RE = re.compile(r"\s+")


def _redact_tag(m):
    k = m.group(1).upper()
    if "URL" in k or "LINK" in k:
        return " [URL] "
    if "PHONE" in k or "MOBILE" in k or "NUMBER" in k:
        return " [PHONE] "
    if "OTP" in k or "PIN" in k or "CODE" in k:
        return " [CODE] "
    if "ACC" in k:
        return " [ACCOUNT] "
    if "AMOUNT" in k or "MONEY" in k:
        return " [MONEY] "
    if "EMAIL" in k:
        return " [EMAIL] "
    return " [CODE] "


def normalize(text, defend=True):
    t = text if isinstance(text, str) else ""
    if defend:
        t = unicodedata.normalize("NFKC", t).translate(ZERO_WIDTH).translate(HOMO_TABLE)
    t = t.translate(BN_DIGITS)
    t = REDACT_RE.sub(_redact_tag, t)
    t = EMAIL_RE.sub(" [EMAIL] ", t)
    t = URL_RE.sub(" [URL] ", t)
    t = PHONE_RE.sub(" [PHONE] ", t)
    t = MONEY_RE.sub(" [MONEY] ", t)
    t = ACCOUNT_RE.sub(" [ACCOUNT] ", t)
    t = ALNUM_ID_RE.sub(" [CODE] ", t)
    t = CODE_RE.sub(" [CODE] ", t)
    return WS_RE.sub(" ", t).strip()


KEYWORDS = {
    "urgent": ["urgent", "immediately", "now", "today", "last chance", "expire", "hurry", "within 24",
               "জরুরি", "এখনই", "দ্রুত", "আজই", "শেষ সুযোগ", "মেয়াদ", "joruri", "ekhoni", "druto"],
    "finance": ["bkash", "nagad", "rocket", "upay", "bank", "account", "otp", "pin", "password", "kyc",
                "বিকাশ", "নগদ", "রকেট", "ব্যাংক", "একাউন্ট", "অ্যাকাউন্ট", "ওটিপি", "পিন", "পাসওয়ার্ড",
                "bikash", "hisab"],
    "reward": ["win", "won", "winner", "prize", "lottery", "bonus", "gift", "reward", "cashback",
               "congratulations", "free", "জিতেছেন", "পুরস্কার", "লটারি", "বোনাস", "উপহার", "অভিনন্দন",
               "ফ্রি", "ক্যাশব্যাক", "jitechen", "puroskar"],
    "action": ["click", "call", "send", "reply", "verify", "update", "confirm", "login", "ক্লিক", "কল",
               "পাঠান", "ভেরিফাই", "আপডেট", "নিশ্চিত", "লগইন", "pathan"],
    "threat": ["block", "suspend", "close", "locked", "deactivat", "ব্লক", "বন্ধ", "স্থগিত", "bondho"],
    "job": ["job", "salary", "income", "earn", "work from home", "চাকরি", "বেতন", "আয়", "ইনকাম", "chakri"],
}
FEATURE_NAMES = ([f"n_{t[1:-1].lower()}" for t in TAGS] + [f"kw_{k}" for k in KEYWORDS] +
                 ["bangla_ratio", "latin_ratio", "digit_ratio", "upper_ratio", "punct_bang", "log_len"])


def features(norm_text):
    t = norm_text
    low = t.lower()
    n = max(1, len(t))
    letters = [c for c in t if c.isalpha()]
    latin = [c for c in letters if c.isascii()]
    vals = [t.count(tag) for tag in TAGS]
    vals += [sum(low.count(k) for k in kws) for kws in KEYWORDS.values()]
    vals += [sum(1 for c in t if "ঀ" <= c <= "৿") / n,
             len(latin) / n,
             sum(c.isdigit() for c in t) / n,
             sum(c.isupper() for c in latin) / max(1, len(latin)),
             t.count("!") + t.count("?"),
             math.log1p(len(t))]
    n_counts = len(TAGS) + len(KEYWORDS)
    return np.array([math.log1p(v) if i < n_counts else v for i, v in enumerate(vals)], dtype=np.float32)




def indicators(norm_text):
    low = norm_text.lower()
    found = [tag[1:-1].lower() for tag in TAGS if tag in norm_text]
    found += [k for k, kws in KEYWORDS.items() if any(w in low for w in kws)]
    return found


XLMR_LARGE = dict(vocab_size=250002, hidden_size=1024, num_hidden_layers=24, num_attention_heads=16,
                  intermediate_size=4096, hidden_act="gelu", max_position_embeddings=514, type_vocab_size=1,
                  layer_norm_eps=1e-5, pad_token_id=1, bos_token_id=0, eos_token_id=2)


class _CharCNN(nn.Module):
    def __init__(self, n_chars, emb, filters, kernels):
        super().__init__()
        self.kernels = tuple(kernels)
        self.emb = nn.Embedding(n_chars, emb, padding_idx=0)
        self.convs = nn.ModuleList([nn.Conv1d(emb, filters, k) for k in self.kernels])
        self.out_dim = filters * len(self.kernels)
        self.norm = nn.LayerNorm(self.out_dim)

    def forward(self, ids):
        x = self.emb(ids).transpose(1, 2)
        lengths = (ids != 0).sum(1).clamp(min=1)
        pooled = []
        for k, conv in zip(self.kernels, self.convs):
            h = torch.relu(conv(x))
            valid = torch.arange(h.size(2), device=ids.device)[None, :] < (lengths - k + 1).clamp(min=1)[:, None]
            pooled.append(h.masked_fill(~valid[:, None, :], -1e4).max(dim=2).values)
        return self.norm(torch.cat(pooled, dim=1))


class _ScamNet(nn.Module):
    def __init__(self, encoder_config, vocab_size, n_chars, n_feats, char_cfg):
        super().__init__()
        self.encoder = AutoModel.from_config(encoder_config)
        self.encoder.resize_token_embeddings(vocab_size)
        H = self.encoder.config.hidden_size
        self.text_proj = nn.Sequential(nn.LayerNorm(2 * H), nn.Linear(2 * H, 512), nn.GELU(), nn.Dropout(0.1))
        self.char = _CharCNN(n_chars, char_cfg["char_emb"], char_cfg["char_filters"], char_cfg["char_kernels"])
        self.char_proj = nn.Sequential(nn.Linear(self.char.out_dim, 512), nn.GELU(), nn.Dropout(0.1))
        self.feat_proj = nn.Sequential(nn.Linear(n_feats, 64), nn.GELU(), nn.LayerNorm(64))
        fused = 512 + 512 + 64
        self.gate = nn.Linear(fused, 3)
        self.head = nn.Sequential(nn.LayerNorm(fused), nn.Dropout(0.2), nn.Linear(fused, 256), nn.GELU(),
                                  nn.Dropout(0.2), nn.Linear(256, 3))
        self.char_head = nn.Linear(512, 3)

    def forward(self, input_ids, attention_mask, char_ids, feats):
        h = self.encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state
        m = attention_mask.unsqueeze(-1).to(h.dtype)
        mean = (h * m).sum(1) / m.sum(1).clamp(min=1e-6)
        t = self.text_proj(torch.cat([h[:, 0], mean], dim=-1).float())
        c = self.char_proj(self.char(char_ids).float())
        f = self.feat_proj(feats.float())
        g = torch.sigmoid(self.gate(torch.cat([t, c, f], dim=-1)))
        z = torch.cat([t * g[:, :1], c * g[:, 1:2], f * g[:, 2:]], dim=-1)
        return self.head(z), self.char_head(c), g


class ScamModelProvider:
    def __init__(self, model_dir, device=None, max_models=None, num_threads=None):
        self.model_dir = model_dir
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.max_models = max_models
        self.num_threads = num_threads
        self.models = []
        self._lock = threading.Lock()
        self._error = None

    def load(self):
        try:
            if self.num_threads:
                torch.set_num_threads(self.num_threads)
            with open(os.path.join(self.model_dir, "scamnet_config.json"), encoding="utf-8") as f:
                cfg = json.load(f)
            if list(cfg["feature_names"]) != FEATURE_NAMES:
                raise RuntimeError("feature definitions differ from the trained model; provider code is out of sync")
            self.cfg = cfg
            self.tokenizer = AutoTokenizer.from_pretrained(os.path.join(self.model_dir, "scamnet_tokenizer"))
            self.char_idx = {c: i for i, c in enumerate(cfg["chars"])}
            self.feat_mean = np.asarray(cfg["feature_mean"], dtype=np.float32)
            self.feat_std = np.asarray(cfg["feature_std"], dtype=np.float32)
            self.temperature = float(cfg["temperature"])
            self.threshold_high = float(cfg["threshold_high"])
            self.threshold_medium = float(cfg["threshold_medium"])
            self.max_len = int(cfg["max_len"])
            self.max_chars = int(cfg["max_chars"])
            self.min_chars = max(cfg["char_kernels"])
            local_cfg = os.path.join(self.model_dir, "encoder_config")
            try:
                enc_cfg = AutoConfig.from_pretrained(local_cfg if os.path.isdir(local_cfg) else cfg["model_name"])
            except Exception:
                enc_cfg = XLMRobertaConfig(**XLMR_LARGE)
            weights = cfg["weights"][: self.max_models] if self.max_models else cfg["weights"]
            models = []
            for w in weights:
                net = _ScamNet(enc_cfg, len(self.tokenizer), len(cfg["chars"]), len(FEATURE_NAMES), cfg)
                state = torch.load(os.path.join(self.model_dir, w), map_location="cpu", weights_only=True)
                net.load_state_dict(state, strict=True)
                models.append(net.float().eval().to(self.device))
            self.models = models
            digest = hashlib.sha1(json.dumps([cfg["weights"], cfg["temperature"], cfg["threshold_high"],
                                              cfg["threshold_medium"]]).encode()).hexdigest()[:8]
            self._version = f"scamnet-bn-{len(models)}x-{digest}"
            self._error = None
        except Exception as e:
            self.models = []
            self._error = f"{type(e).__name__}: {e}"
        return self.is_available()

    def is_available(self):
        return bool(self.models)

    def version(self):
        return getattr(self, "_version", "unloaded")

    def last_error(self):
        return self._error

    def _char_ids(self, text):
        ids = [self.char_idx.get(c, 1) for c in text[: self.max_chars]]
        return ids + [0] * (self.min_chars - len(ids)) if len(ids) < self.min_chars else ids

    def _encode(self, texts):
        enc = self.tokenizer(texts, truncation=True, max_length=self.max_len, padding=True,
                             pad_to_multiple_of=8, return_tensors="pt")
        ch = [self._char_ids(t) for t in texts]
        chars = torch.zeros(len(ch), max(len(c) for c in ch), dtype=torch.long)
        for i, c in enumerate(ch):
            chars[i, : len(c)] = torch.tensor(c)
        feats = np.stack([(features(t) - self.feat_mean) / self.feat_std for t in texts])
        batch = {"input_ids": enc["input_ids"], "attention_mask": enc["attention_mask"],
                 "char_ids": chars, "feats": torch.tensor(feats, dtype=torch.float32)}
        return {k: v.to(self.device) for k, v in batch.items()}

    def risk(self, p_smish):
        if p_smish >= self.threshold_high:
            return "High"
        if p_smish >= self.threshold_medium:
            return "Medium"
        return "Low"

    @torch.no_grad()
    def predict_batch(self, texts):
        if not self.is_available():
            raise RuntimeError(f"ScamNet model not loaded: {self._error}")
        norms = [normalize(t) or " " for t in texts]
        x = self._encode(norms)
        use_amp = self.device.type == "cuda"
        logits, gates = [], []
        with self._lock:
            for m in self.models:
                with torch.autocast(device_type=self.device.type, dtype=torch.float16, enabled=use_amp):
                    z, _, g = m(**x)
                logits.append(z.float().cpu().numpy())
                gates.append(g.float().cpu().numpy())
        z = np.mean(logits, axis=0) / self.temperature
        z = z - z.max(axis=1, keepdims=True)
        p = np.exp(z) / np.exp(z).sum(axis=1, keepdims=True)
        g = np.mean(gates, axis=0)
        out = []
        for i, t in enumerate(norms):
            out.append({
                "risk": self.risk(float(p[i, L_SMISH])),
                "class": LABELS[int(p[i].argmax())],
                "probabilities": {LABELS[k]: round(float(p[i, k]), 4) for k in range(3)},
                "indicators": indicators(t),
                "branch_weights": {"text": round(float(g[i, 0]), 3), "chars": round(float(g[i, 1]), 3),
                                   "structure": round(float(g[i, 2]), 3)},
                "normalized_text": t,
                "model_version": self.version(),
            })
        return out

    def predict(self, text):
        return self.predict_batch([text])[0]
