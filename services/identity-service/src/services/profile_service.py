from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from fastapi import HTTPException, status, UploadFile
from ..domain.models import User, UserProfile
from ..repositories.user_repository import UserRepository
from ..repositories.profile_repository import ProfileRepository
from ..schemas.profile import UserProfileResponse, UserProfileUpdateRequest, AvatarResponse
from .avatar_storage_service import AvatarStorageService

class ProfileService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.profile_repo = ProfileRepository(db)
        self.avatar_storage = AvatarStorageService()

    def get_profile(self, user_id: str) -> UserProfileResponse:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        profile = self.profile_repo.get_by_user_id(user_id)
        if not profile:
            # Auto-create empty profile if not found
            profile = UserProfile(
                user_id=user.id,
                full_name="FactLens Analyst",
                preferences={"theme": "dark", "language": "bn"}
            )
            self.profile_repo.create(profile)
            self.db.commit()
            self.db.refresh(profile)

        return self._to_response(user, profile)

    def update_profile(self, user_id: str, req: UserProfileUpdateRequest) -> UserProfileResponse:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        profile = self.profile_repo.get_by_user_id(user_id)
        if not profile:
            profile = UserProfile(user_id=user.id, full_name=user.email.split("@")[0])
            self.profile_repo.create(profile)

        # Update permitted fields only (roles and admin flags cannot be edited here)
        if req.full_name is not None and req.full_name.strip():
            profile.full_name = req.full_name.strip()
        if req.phone is not None:
            profile.phone = req.phone.strip()
        if req.location is not None:
            profile.location = req.location.strip()
        if req.bio is not None:
            profile.bio = req.bio.strip()
        if req.organization is not None:
            profile.organization = req.organization.strip()
        if req.preferences is not None:
            existing = dict(profile.preferences or {})
            existing.update(req.preferences)
            profile.preferences = existing
            flag_modified(profile, "preferences")

        self.db.commit()
        self.db.refresh(profile)
        return self._to_response(user, profile)

    async def update_avatar(self, user_id: str, file: UploadFile) -> AvatarResponse:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        profile = self.profile_repo.get_by_user_id(user_id)
        if not profile:
            profile = UserProfile(user_id=user.id, full_name="FactLens Analyst")
            self.profile_repo.create(profile)

        # Delete existing avatar file if custom
        if profile.avatar_url:
            self.avatar_storage.delete_avatar(profile.avatar_url)

        # Save new avatar
        new_avatar_url = await self.avatar_storage.save_avatar(file, user_id)
        profile.avatar_url = new_avatar_url
        self.db.commit()

        return AvatarResponse(
            avatar_url=new_avatar_url,
            message="Profile avatar updated successfully."
        )

    def delete_avatar(self, user_id: str) -> AvatarResponse:
        profile = self.profile_repo.get_by_user_id(user_id)
        if profile and profile.avatar_url:
            self.avatar_storage.delete_avatar(profile.avatar_url)
            profile.avatar_url = ""
            self.db.commit()

        return AvatarResponse(
            avatar_url="",
            message="Profile avatar removed successfully."
        )

    def _to_response(self, user: User, profile: UserProfile) -> UserProfileResponse:
        return UserProfileResponse(
            id=str(profile.id),
            user_id=str(user.id),
            email=user.email,
            full_name=profile.full_name,
            role=user.role,
            phone=profile.phone or "",
            location=profile.location or "Bangladesh",
            bio=profile.bio or "",
            avatar_url=profile.avatar_url or "",
            organization=profile.organization or "FactLens Verification Network",
            preferences=profile.preferences or {},
            created_at=profile.created_at,
            updated_at=profile.updated_at
        )
