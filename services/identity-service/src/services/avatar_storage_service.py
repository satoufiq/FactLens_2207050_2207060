import os
import uuid
from pathlib import Path
from PIL import Image
from fastapi import UploadFile, HTTPException, status
from ..core.config import settings

class AvatarStorageService:
    def __init__(self, upload_dir: Path = settings.AVATAR_UPLOAD_DIR):
        self.upload_dir = upload_dir
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_avatar(self, file: UploadFile, user_id: str) -> str:
        # Check Content-Type
        if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image format ({file.content_type}). Allowed: JPEG, PNG, WebP."
            )

        # Read content and verify size
        content = await file.read()
        if len(content) > settings.MAX_AVATAR_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Avatar image exceeds maximum permitted size of 5 MB."
            )

        # Process and optimize with Pillow to strip malicious EXIF/payloads
        try:
            import io
            image = Image.open(io.BytesIO(content))
            image.verify()  # Ensure valid image stream

            # Reopen for transformation
            image = Image.open(io.BytesIO(content))
            image = image.convert("RGB")
            image.thumbnail((512, 512), Image.Resampling.LANCZOS)

            filename = f"avatar_{user_id}_{uuid.uuid4().hex[:8]}.webp"
            filepath = self.upload_dir / filename
            image.save(filepath, "WEBP", quality=88, optimize=True)

            return f"/media/avatars/{filename}"
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or corrupted image file: {str(e)}"
            )

    def delete_avatar(self, avatar_url: str) -> None:
        if not avatar_url or not avatar_url.startswith("/media/avatars/"):
            return
        filename = avatar_url.split("/")[-1]
        filepath = self.upload_dir / filename
        if filepath.exists() and filepath.is_file():
            try:
                filepath.unlink()
            except OSError:
                pass

