import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
REPO_ROOT = BASE_DIR.parent.parent


def _default_scamnet_dir() -> str:
    """
    `models/scamnet` relative to the repository root, which is where the weights
    are extracted locally. Docker sets SCAMNET_MODEL_DIR=/models/scamnet (the
    read-only mount) explicitly.
    """
    return str(REPO_ROOT / "models" / "scamnet")


def _cuda_available() -> bool:
    # Checked lazily and defensively: settings must import even where torch is
    # missing, so the service can start and report the model as unavailable.
    try:
        import torch

        return bool(torch.cuda.is_available())
    except Exception:  # noqa: BLE001
        return False


def _int_env(name: str, default: int) -> int:
    raw = os.environ.get(name)
    return int(raw) if raw not in (None, "") else default


class Settings:
    PROJECT_NAME: str = "FactLens Scam Alert Service"
    VERSION: str = "3.0.0"
    API_V1_PREFIX: str = "/api/v1"
    SERVICE_NAME: str = "scam-service"
    QUEUE_NAME: str = "scam"
    PORT: int = int(os.environ.get("PORT", "8003"))

    # One database for all persistent data (proposal: "Database Design").
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg2://factlens_admin:factlens_secure_password_2026"
        "@localhost:5432/factlens_db",
    )
    FALLBACK_SQLITE_URL: str = f"sqlite:///{BASE_DIR / 'factlens_scam.db'}"

    JWT_SECRET: str = os.environ.get(
        "JWT_SECRET", "factlens-enterprise-sha-jwt-secret-key-2026-production"
    )
    JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")

    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # Rate limits: each scan triggers model inference and URL lookups.
    RATE_LIMIT_PER_USER: int = int(os.environ.get("SCAM_RATE_LIMIT_USER", "60"))
    RATE_LIMIT_PER_IP: int = int(os.environ.get("SCAM_RATE_LIMIT_IP", "30"))
    RATE_LIMIT_WINDOW_S: int = int(os.environ.get("RATE_LIMIT_WINDOW_S", "3600"))

    # Wall-clock budget; over it the scan becomes TIMEOUT, which is retryable.
    TIME_LIMIT_S: int = int(os.environ.get("SCAM_TIME_LIMIT_S", "60"))

    MAX_MESSAGE_CHARS: int = int(os.environ.get("SCAM_MAX_MESSAGE_CHARS", "20000"))

    # -- ScamNet-BN --------------------------------------------------------
    # Thresholds, temperature and labels are NOT settings: they come only from
    # scamnet_config.json beside the weights, so they can never drift from the
    # model they were tuned for.
    SCAMNET_MODEL_DIR: str = os.environ.get("SCAMNET_MODEL_DIR") or _default_scamnet_dir()
    SCAMNET_DEVICE: str = os.environ.get("SCAMNET_DEVICE") or (
        "cuda" if _cuda_available() else "cpu"
    )
    # Each ensemble member is ~2.3 GB of RAM on CPU; one member keeps a CPU
    # prediction well under the timeout. On GPU the full 3-seed ensemble fits.
    SCAMNET_MAX_MODELS: int = _int_env(
        "SCAMNET_MAX_MODELS", 3 if SCAMNET_DEVICE.startswith("cuda") else 1
    )
    SCAMNET_TIMEOUT_SECONDS: float = float(os.environ.get("SCAMNET_TIMEOUT_SECONDS") or 10)
    # Optional cap on torch CPU threads; empty means torch's default.
    SCAMNET_NUM_THREADS: int = _int_env("SCAMNET_NUM_THREADS", 0)


settings = Settings()
