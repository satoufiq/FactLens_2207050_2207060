# FactLens — model training

This directory is version-controlled with the application but **excluded from
the deployment image**. It is part of the project deliverable and no part of
the running system: the server loads exported ONNX artifacts only.

> Proposal, "Training environment": training runs on a Kaggle or Colab T4 GPU
> session. Nothing about training happens on the application server. This
> separation is what allows the deployment target to be a modest VPS.

## The three models

| Model | Task | Base architecture | Serves |
|---|---|---|---|
| `BanglaVerify` | Binary — Fake / Real | `csebuetnlp/banglabert` | Rumor Scanner |
| `ScamNet-BN` | Three-class — Legitimate / Suspicious / Scam | `microsoft/mdeberta-v3-base` | Scam Alert |
| `ImageAuth` | Binary — Authentic / AI-generated, plus a manipulation head | `google/vit-base-patch16-224` | Image Check |

## Pipeline

```
prepare_data.py  →  train_*.py  →  evaluate.py  →  export_onnx.py  →  register_model.py
   splits +          fine-tune      in-dist +       ONNX + tokenizer    writes
   leakage audit                    external                            models/registry.json
```

Each step writes its output where the next one expects it, so the whole run is
reproducible from a clean checkout:

```bash
cd training
pip install -r requirements.txt

# 1. Prepare data: cleaning, dedup, leakage audit, stratified 80/10/10 split
python prepare_data.py --dataset banfakenews --input data/raw/banfakenews.csv \
                       --output data/processed/banglaverify

# 2. Fine-tune (GPU session)
python train_banglaverify.py --data data/processed/banglaverify \
                             --output artifacts/banglaverify

# 3. Evaluate on the in-distribution test split AND the external set
python evaluate.py --model artifacts/banglaverify \
                   --test data/processed/banglaverify/test.csv \
                   --external data/processed/banglaverify/external.csv \
                   --output artifacts/banglaverify/evaluation.json

# 4. Export to ONNX (this is what the server actually loads)
python export_onnx.py --model artifacts/banglaverify \
                      --output ../models/banglaverify

# 5. Register — fails if the acceptance gate is not met
python register_model.py --name BanglaVerify --version 1.0.0 \
                         --artifact banglaverify/model.onnx \
                         --tokenizer banglaverify \
                         --evaluation artifacts/banglaverify/evaluation.json
```

After step 5, restart the services (or `POST /api/v1/admin/registry/reload`).
The provider picks the model up with no code change — that is the whole point
of the provider interface.

## The acceptance gate

`register_model.py` refuses to register a model whose **external-set Macro F1
falls more than `max_external_macro_f1_drop` below its in-distribution score**.
The margin is declared in `models/registry.json` under `acceptance_policy`
(currently `0.10`).

> Proposal, "Evaluation protocol": a model that scores 95% in-distribution and
> 60% externally is overfitted to its corpus and is not shipped, regardless of
> how good the first number looks.

Override it only with `--force`, and only when you can defend the exception in
the report.

## Data preparation is not optional

`prepare_data.py` implements the seven steps from the proposal in order, and
the one that matters most is the **leakage audit**. BanFakeNews-2.0 and the
newer Mendeley releases overlap; near-duplicate articles across the train and
test split inflate every number you will report. The script fails loudly rather
than quietly producing a 0.97 that means nothing.

Punctuation is preserved: it carries stylistic signal relevant to fake news.

## Known data cautions

- **BanFakeNews-2.0** is imbalanced (far more authentic than fake), so training
  uses class-weighted cross-entropy. Record the actual ratio you measure — do
  not quote a number from the dataset card without checking it.
- **BanglaPhish-2026** is synthetic. A model trained on it alone learns the
  generator's phrasing, not how real scams are written. The team-collected
  Bangla SMS/Messenger validation set is mandatory, not a nice-to-have.
- **ImageAuth** must hold out an entire generator family. A detector trained on
  one family often scores above 95% in-distribution and near chance on a
  generator it has never seen; the user-facing confidence is derived from the
  out-of-distribution figure.

## Layout

```
training/
├── README.md
├── requirements.txt
├── common/
│   ├── text_cleaning.py      normalization shared by both text models
│   ├── splitting.py          dedup, leakage audit, stratified split
│   └── metrics.py            accuracy, macro F1, per-class, calibration
├── prepare_data.py
├── train_banglaverify.py
├── train_scamnet.py
├── train_imageauth.py
├── evaluate.py
├── export_onnx.py
└── register_model.py
```
