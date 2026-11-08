import os

import numpy as np
import pytest

from src.providers.scam_model_provider import FEATURE_NAMES, ScamModelProvider, features, normalize

MODEL_DIR = os.environ.get("SCAMNET_MODEL_DIR", "models/scamnet")

NORMALIZATION_CASES = [
    ('অভিনন্দন! আপনি ৫০,০০০ টাকা জিতেছেন। ৫০০ টাকা পাঠান: www.pr1ze-claim.xyz/win',
     'অভিনন্দন! আপনি [MONEY] জিতেছেন। [MONEY] পাঠান: [URL]'),
    ('Apnar bKash account block hoye jabe. Ekhoni OTP 4821 pathan 01712345678 number e.',
     'Apnar bKash account block hoye jabe. Ekhoni OTP [CODE] pathan [PHONE] number e.'),
    ('Your bКash ассount is suspended. Verify now: bit.ly/bk-verify',
     'Your bKash account is suspended. Verify now: [URL]'),
    ('30GB internet mattro 299 takay! Dial *121*3# ba call +8801812-345678',
     '30GB internet mattro [MONEY] ! Dial *121*3# ba call [PHONE]'),
    ('TrxID 9JK2LM3N4P সফল। 30GB প্যাক। bKash অ্যাপ।',
     'TrxID [CODE] সফল। 30GB প্যাক। bKash অ্যাপ।'),
    ('cl\u200bick h\u200dere to v\u2060erify',
     'click here to verify'),
]


@pytest.mark.parametrize("raw, expected", NORMALIZATION_CASES)
def test_normalize_matches_training(raw, expected):
    assert normalize(raw) == expected


def test_feature_vector_shape():
    v = features(normalize("Apnar bKash account block hobe"))
    assert v.shape == (len(FEATURE_NAMES),)
    assert np.isfinite(v).all()


def test_missing_model_reports_unavailable(tmp_path):
    p = ScamModelProvider(str(tmp_path))
    assert p.load() is False
    assert p.is_available() is False
    assert p.last_error()
    with pytest.raises(RuntimeError):
        p.predict("hello")


@pytest.mark.skipif(not os.path.exists(os.path.join(MODEL_DIR, "scamnet_config.json")),
                    reason="trained ScamNet files not present")
def test_trained_model_on_known_messages():
    p = ScamModelProvider(MODEL_DIR, max_models=1)
    assert p.load(), p.last_error()
    scam = p.predict("Apnar bKash account block hoye jabe. Ekhoni OTP 4821 pathan 01712345678 number e.")
    assert scam["class"] == "smish"
    assert scam["risk"] in ("High", "Medium")
    assert "finance" in scam["indicators"] and "phone" in scam["indicators"]
    normal = p.predict("আজ সন্ধ্যা ৭টায় বিভাগীয় সভা অনুষ্ঠিত হবে। সবাইকে উপস্থিত থাকার অনুরোধ করা হলো।")
    assert normal["risk"] == "Low"
    promo = p.predict("Grameenphone: 30GB internet mattro 299 takay! Offer cholbe 30 November porjonto. Dial *121*3#")
    assert promo["class"] == "promo" and promo["risk"] == "Low"
