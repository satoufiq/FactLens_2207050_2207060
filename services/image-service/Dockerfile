# =============================================================================
# FactLens Image Check Service
# Build context: the repository root (so services/shared is reachable).
#   docker build -f services/image-service/Dockerfile .
# =============================================================================
FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8004

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        ca-certificates \
        libpq-dev \
        libglib2.0-0 \
        libgl1 \
        liblcms2-2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY services/shared /app/services/shared
COPY services/image-service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY services/image-service/src /app/src

# Upload store lives on a volume, outside anything the web layer serves.
RUN mkdir -p /app/var/uploads && chmod 700 /app/var/uploads
ENV IMAGE_UPLOAD_DIR=/app/var/uploads

EXPOSE 8004

HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8004/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8004"]
