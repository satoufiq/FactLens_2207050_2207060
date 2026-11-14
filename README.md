# FactLens — Digital News & Content Verification and Scam Awareness Platform

*"Check before you trust or share."*

FactLens lets a user submit suspicious content — text, a screenshot, a forwarded
message, or a URL — and receive an evidence-backed assessment with a readable
explanation. Three analysis modules sit behind one shared, OCR-enabled input
layer, Bengali-first with English support.

| Module | Model (trained by the team) | Non-ML signals |
|---|---|---|
| **Rumor / Claim Scanner** | BanglaVerify v2 — `csebuetnlp/banglabert` + [CLS, mean] pooling (PyTorch), Fake / Real; short-text and headline + article modes | Evidence retrieval, polarity-aware claim-evidence matching, source reliability, time-window filtering; verdict: BanglaVerify decides alone at ≥ 80 % confidence (≥ 90 % for claims with আজকে / গতকাল / এই মাসে …); below that the web evidence decides |
| **Scam Alert** | ScamNet-BN — XLM-RoBERTa-large + character CNN + structural features (PyTorch), normal / promo / smish → High / Medium / Low | URL structure and reputation analysis (shown as information; the risk level is the model's alone) |
| **Image Check** | ImageAuth — `google/vit-base-patch16-224`, Authentic / AI-generated | EXIF and C2PA metadata, noise, compression and frequency-domain analysis |

> **Model status.** BanglaVerify and ScamNet-BN are integrated. Their weights live outside git in
> `models/banglaverify/` (~1 GB RAM on CPU) and `models/scamnet/` (~2.3 GB RAM per ensemble member);
> see `.env.example` for `BANGLAVERIFY_*` and `SCAMNET_*`. ImageAuth is not registered yet
> (`models/registry.json`).
> A module without its model runs on its non-ML signals and marks the scan **PARTIAL**, saying
> which model was missing. This is the designed degraded mode.
>
> To check a model inside the running website: `check_banglaverify_website.bat` (Rumor Scanner)
> and `check_scamnet_website.bat` (Scam Alert; close VS Code first, it needs ~4 GB while loading).

---

## How a scan works

```
browser ──POST──▶ API ──writes PENDING──▶ PostgreSQL
                   │                         ▲
                   └──queues──▶ Redis ──▶ Celery worker ──PROCESSING──▶ COMPLETED / PARTIAL
browser ◀──polls GET /scans/{id}─────────────────────────────────────── FAILED / TIMEOUT / AWAITING_INPUT
```

The API returns a scan id immediately; nothing that takes seconds (OCR, search,
inference) runs in a request thread.

| Status | Meaning |
|---|---|
| `PENDING` | Accepted and queued |
| `PROCESSING` | A worker has it |
| `COMPLETED` | Every signal was available |
| `PARTIAL` | Usable verdict, produced without part of the system — the UI says which part |
| `FAILED` | Critical failure; no usable verdict |
| `TIMEOUT` | Over the time budget; **retryable** |
| `AWAITING_INPUT` | OCR could not read the image; the user is asked to type the text |

Every inference — including an unavailable model — writes a `model_runs` row with
the model name and version, so any past verdict can be traced to what produced it.

---

## Architecture

Four FastAPI services share one PostgreSQL database and one Redis, plus a shared
library that holds the provider interfaces, model registry, scan lifecycle and schema.

```
FactLens/
├── services/
│   ├── shared/factlens_common/     # shared by every service
│   │   ├── providers/              #   BaseModelProvider: load / predict / version / is_available
│   │   │   ├── registry.py         #   reads models/registry.json at start
│   │   │   ├── onnx_session.py     #   ONNX Runtime, CPU
│   │   │   ├── image_model.py      #   ImageAuth (loaded on demand, idle release)
│   │   │   └── ocr_provider.py     #   EasyOCR bn+en, Tesseract fallback
│   │   ├── api/ocr_router.py       #   shared OCR input endpoint (review step mandatory)
│   │   ├── schema.py               #   users, scans, scan_results, evidence, scam_indicators,
│   │   │                           #   image_analysis, url_analysis, model_runs
│   │   ├── scanflow.py             #   forward-only lifecycle + degradation accounting
│   │   ├── urlanalysis.py          #   URL inspection shared by rumor and scam
│   │   ├── queue.py / cache.py / ratelimit.py   # Celery, input-hash cache, Redis limits
│   │   └── security.py             #   bcrypt, magic-byte upload validation
│   ├── identity-service/   :8001   # auth (JWT + refresh rotation), profiles
│   ├── rumour-service/     :8002   # Rumor Scanner + worker  (providers/ = BanglaVerify)
│   ├── scam-service/       :8003   # Scam Alert + worker   (providers/ = ScamNet-BN)
│   └── image-service/      :8004   # Image Check + worker  (hourly retention sweep)
├── models/registry.json            # model manifest — the only thing to edit when a model lands
├── training/                       # data prep, fine-tuning, evaluation, ONNX export (not deployed)
├── src/                            # React + Vite + TypeScript frontend
├── docker-compose.yml              # postgres, redis, 4 APIs, 3 workers, nginx gateway
└── nginx.conf                      # gateway + static frontend
```

### Technology

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI, Pydantic v2, SQLAlchemy |
| Async processing | Celery, Redis as broker and result backend |
| Database | PostgreSQL (SQLite fallback for local development only) |
| Cache | Redis — input-hash verdict cache and rate limiting |
| Model serving | PyTorch on CPU (BanglaVerify, ScamNet-BN); ONNX Runtime for ImageAuth |
| Model training | PyTorch, Hugging Face Transformers (Kaggle / Colab, never on the server) |
| OCR | EasyOCR (bn + en), Tesseract fallback |
| Image processing | Pillow, NumPy, OpenCV |
| Evidence search | DuckDuckGo (`ddgs`) behind the search service |

---

## Running it

### Docker (full stack)

Needs Docker Desktop (Compose 2.24 or newer) with **at least 8 GB of memory** assigned to it.
The rumour worker holds BanglaVerify (~1 GB per process) and the scam worker ScamNet-BN (~2.3 GB).
The model folders `models/banglaverify/` and `models/scamnet/` must be in place; they are mounted
read-only, never copied into an image.

```bash
cp .env.example .env        # optional: every value has a development default; change the secrets
docker compose up --build   # the first build downloads PyTorch and takes a while
```

Open `http://localhost`. Each service reports its state at `/api/v1/health/<identity|rumour|scam|image>`,
including which models are registered and whether the queue is async. The APIs are also published on
`127.0.0.1:8001`–`8004` (Swagger at `/docs`) and PostgreSQL on `127.0.0.1:5433`. Stop the Windows
`.bat` stack first, because it uses the same ports; change them in `.env` if needed.

| Container | Role |
|---|---|
| `factlens-postgres`, `factlens-redis` | database; Celery broker, cache, rate limits |
| `identity-service` | auth and profiles |
| `rumour-service` + `rumour-worker` | Rumor Scanner API; BanglaVerify + evidence pipeline |
| `scam-service` + `scam-worker` | Scam Alert API; ScamNet-BN |
| `image-service` + `image-worker` | Image Check API; forensics + hourly retention sweep |
| `api-gateway` | nginx: the built frontend and the reverse proxy to the four APIs |

Useful commands: `docker compose ps` (health of every container), `docker compose logs -f rumour-worker`,
`docker compose down` (stop; data is kept in named volumes), `docker compose down -v` (also delete the data).
On a machine with less memory, set `RUMOUR_WORKER_CONCURRENCY=1` in `.env`.

### Windows, without Docker

```bat
setup_backend.bat           REM once: installs every service + factlens_common
run_all.bat                 REM 4 APIs, workers if Redis is up, and the Vite frontend
```

- Frontend: `http://localhost:5173`
- API docs: `http://127.0.0.1:8001/docs` … `:8004/docs`

PostgreSQL is optional locally (services fall back to SQLite and say so in `/health`).
Redis is optional too: without it Celery runs in eager mode and scans execute
inline. The lifecycle is the same either way.

EasyOCR downloads its weights (~100 MB) on first use. Until then, or offline, OCR
falls back to Tesseract and reports which engine actually read the image.

---

## Adding a trained model

```bash
cd training
python evaluate.py      --model artifacts/banglaverify --test … --external … --output artifacts/banglaverify/evaluation.json
python export_onnx.py   --model artifacts/banglaverify --output ../models/banglaverify
python register_model.py --name BanglaVerify --version 1.0.0 \
       --artifact banglaverify/model.onnx --tokenizer banglaverify \
       --evaluation artifacts/banglaverify/evaluation.json
```

`register_model.py` refuses a model whose external-set Macro F1 falls more than
the declared margin (`acceptance_policy` in `models/registry.json`, currently 0.10)
below its in-distribution score. Then restart the workers.

BanglaVerify and ScamNet-BN are served as the PyTorch checkpoints their notebooks
saved, not as ONNX. To replace one, copy the new folder (config JSON, `.pt` weights,
tokenizer) over `models/banglaverify/` or `models/scamnet/` and restart; thresholds and
temperatures are read from the config, never hard-coded. Re-check on an external set
with `py services/rumour-service/scripts/evaluate_external.py --csv <file> --register`
or `evaluate_scamnet.bat`.

---

## Acknowledgements

Developed at Khulna University of Engineering & Technology (KUET).
Base architectures: `csebuetnlp/banglabert`, `microsoft/mdeberta-v3-base`, `google/vit-base-patch16-224`.
