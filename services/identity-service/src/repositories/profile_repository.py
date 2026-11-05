from typing import Optional
from sqlalchemy.orm import Session
from ..domain.models import UserProfile

class ProfileRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_user_id(self, user_id: str) -> Optional[UserProfile]:
        return self.db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

    def create(self, profile: UserProfile) -> UserProfile:
        self.db.add(profile)
        self.db.flush()
        return profile

    def update(self, profile: UserProfile) -> UserProfile:
        self.db.flush()
        return profile

