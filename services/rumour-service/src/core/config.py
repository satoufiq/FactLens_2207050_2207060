import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings:
    PROJECT_NAME: str = "FactLens Rumor Scanner Service"
    VERSION: str = "3.0.0"
    API_V1_PREFIX: str = "/api/v1"
    SERVICE_NAME: str = "rumour-service"
    QUEUE_NAME: str = "rumor"
    PORT: int = int(os.environ.get("PORT", "8002"))

    # One database for all persistent data (proposal: "Database Design").
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg2://factlens_admin:factlens_secure_password_2026"
        "@localhost:5432/factlens_db",
    )
    FALLBACK_SQLITE_URL: str = f"sqlite:///{BASE_DIR / 'factlens_rumour.db'}"

    JWT_SECRET: str = os.environ.get(
        "JWT_SECRET", "factlens-enterprise-sha-jwt-secret-key-2026-production"
    )
    JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")

    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # Each scan triggers model inference and external search, so both are limited.
    RATE_LIMIT_PER_USER: int = int(os.environ.get("RUMOR_RATE_LIMIT_USER", "40"))
    RATE_LIMIT_PER_IP: int = int(os.environ.get("RUMOR_RATE_LIMIT_IP", "20"))
    RATE_LIMIT_WINDOW_S: int = int(os.environ.get("RATE_LIMIT_WINDOW_S", "3600"))

    # Wall-clock budget; over it the scan becomes TIMEOUT, which is retryable.
    TIME_LIMIT_S: int = int(os.environ.get("RUMOR_TIME_LIMIT_S", "120"))

    # Evidence search budget inside that total.
    SEARCH_TIMEOUT_S: int = int(os.environ.get("SEARCH_TIMEOUT_S", "25"))
    MAX_EVIDENCE_ITEMS: int = int(os.environ.get("MAX_EVIDENCE_ITEMS", "6"))

    MAX_CLAIM_CHARS: int = int(os.environ.get("RUMOR_MAX_CLAIM_CHARS", "20000"))

    # -- BanglaVerify v2 ---------------------------------------------------
    # Temperatures, thresholds and the short/full split come only from
    # banglaverify_v2_config.json beside the weights.
    BANGLAVERIFY_MODEL_DIR: str = os.environ.get("BANGLAVERIFY_MODEL_DIR") or str(
        BASE_DIR.parent.parent / "models" / "banglaverify"
    )
    BANGLAVERIFY_DEVICE: str = os.environ.get("BANGLAVERIFY_DEVICE") or "cpu"
    BANGLAVERIFY_TIMEOUT_SECONDS: float = float(os.environ.get("BANGLAVERIFY_TIMEOUT_SECONDS") or 10)
    BANGLAVERIFY_NUM_THREADS: int = int(os.environ.get("BANGLAVERIFY_NUM_THREADS") or 0)

    # Static assets for the PDF dossier.
    STATIC_DIR: Path = BASE_DIR / "static"
    FONTS_DIR: Path = BASE_DIR / "static" / "fonts"


settings = Settings()
settings.FONTS_DIR.mkdir(parents=True, exist_ok=True)
