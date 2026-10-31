import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings:
    PROJECT_NAME: str = "FactLens Identity & Profile Service"
    VERSION: str = "2.4.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # One database holds all persistent data (proposal: "Database Design").
    # IDENTITY_DATABASE_URL is still honoured so an existing deployment can
    # point at its old database during a migration.
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        os.environ.get(
            "IDENTITY_DATABASE_URL",
            "postgresql+psycopg2://factlens_admin:factlens_secure_password_2026"
            "@localhost:5432/factlens_db",
        ),
    )
    
    # Fallback to local SQLite when PostgreSQL is offline in development
    FALLBACK_SQLITE_URL: str = f"sqlite:///{BASE_DIR / 'factlens_identity.db'}"

    # JWT Authentication Parameters
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "factlens-enterprise-sha-jwt-secret-key-2026-production")
    JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # Media / Avatar Storage
    MEDIA_DIR: Path = BASE_DIR / "media"
    AVATAR_UPLOAD_DIR: Path = BASE_DIR / "media" / "avatars"
    MAX_AVATAR_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_TYPES: tuple = ("image/jpeg", "image/png", "image/webp")

settings = Settings()
settings.AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

