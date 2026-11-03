from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...domain.models import User
from ...schemas.profile import UserProfileResponse, UserProfileUpdateRequest, AvatarResponse
from ...services.profile_service import ProfileService
from ..deps import get_current_user

router = APIRouter(prefix="/profile", tags=["User Profile Management"])

@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full profile information for the authenticated user."""
    service = ProfileService(db)
    return service.get_profile(str(current_user.id))

@router.patch("/me", response_model=UserProfileResponse)
def update_my_profile(
    req: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update editable profile fields (name, phone, location, bio, preferences)."""
    service = ProfileService(db)
    return service.update_profile(str(current_user.id), req)

@router.put("/me/avatar", response_model=AvatarResponse)
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and optimize a profile picture (JPEG, PNG, WebP up to 5MB)."""
    service = ProfileService(db)
    return await service.update_avatar(str(current_user.id), avatar)

@router.delete("/me/avatar", response_model=AvatarResponse)
def remove_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove user avatar image and reset to default."""
    service = ProfileService(db)
    return service.delete_avatar(str(current_user.id))

