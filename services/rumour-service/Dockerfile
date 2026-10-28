# =============================================================================
# FactLens Rumor Scanner Service
# Build context: the repository root (so services/shared is reachable).
#   docker build -f services/rumour-service/Dockerfile .
# =============================================================================
FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8002

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        ca-certificates \
        libpq-dev \
        libglib2.0-0 \
        libgl1 \
        tesseract-ocr \
        tesseract-ocr-ben \
        tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU-only torch first: BanglaVerify and EasyOCR both run on it, and the CPU
# wheel index keeps the image from pulling the multi-gigabyte CUDA build.
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir torch torchvision \
        --index-url https://download.pytorch.org/whl/cpu

COPY services/shared /app/services/shared
COPY services/rumour-service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY services/rumour-service/src /app/src
# Bangla font for the PDF report (settings.FONTS_DIR = /app/static/fonts)
COPY services/rumour-service/static /app/static

EXPOSE 8002

HEALTHCHECK --interval=20s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8002/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8002"]
