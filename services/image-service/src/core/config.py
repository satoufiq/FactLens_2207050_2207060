import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings:
    PROJECT_NAME: str = "FactLens Image Check Service"
    VERSION: str = "3.0.0"
    API_V1_PREFIX: str = "/api/v1"
    SERVICE_NAME: str = "image-service"
    QUEUE_NAME: str = "image"
    PORT: int = int(os.environ.get("PORT", "8004"))

    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg2://factlens_admin:factlens_secure_password_2026"
        "@localhost:5432/factlens_db",
    )
    FALLBACK_SQLITE_URL: str = f"sqlite:///{BASE_DIR / 'factlens_image.db'}"

    JWT_SECRET: str = os.environ.get(
        "JWT_SECRET", "factlens-enterprise-sha-jwt-secret-key-2026-production"
    )
    JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")

    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    RATE_LIMIT_PER_USER: int = int(os.environ.get("IMAGE_RATE_LIMIT_USER", "40"))
    RATE_LIMIT_PER_IP: int = int(os.environ.get("IMAGE_RATE_LIMIT_IP", "20"))
    RATE_LIMIT_WINDOW_S: int = int(os.environ.get("RATE_LIMIT_WINDOW_S", "3600"))

    TIME_LIMIT_S: int = int(os.environ.get("IMAGE_TIME_LIMIT_S", "90"))

    # Storage outside anything the web layer serves.
    UPLOAD_DIR: Path = Path(
        os.environ.get("IMAGE_UPLOAD_DIR", str(BASE_DIR / "var" / "uploads"))
    )
    RETENTION_HOURS: int = int(os.environ.get("IMAGE_RETENTION_HOURS", "24"))
    MAX_UPLOAD_BYTES: int = int(
        os.environ.get("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024))
    )


settings = Settings()
