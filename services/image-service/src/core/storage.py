"""Process-wide image store."""

from factlens_common.providers import get_registry  # noqa: F401  (warms the registry)

from ..services.image_storage import ImageStore
from .config import settings

image_store = ImageStore(
    root=settings.UPLOAD_DIR, retention_hours=settings.RETENTION_HOURS
)
