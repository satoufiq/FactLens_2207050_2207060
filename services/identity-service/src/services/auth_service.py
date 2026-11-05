import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..domain.models import User, UserProfile, RefreshToken
from ..repositories.user_repository import UserRepository
from ..repositories.profile_repository import ProfileRepository
from ..repositories.token_repository import TokenRepository
from ..core.unit_of_work import IdentityUnitOfWork
from ..schemas.auth import UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse
from ..core.security import hash_password, verify_password
from ..core.jwt import create_access_token, create_refresh_token, decode_token
from ..core.config import settings

logger = logging.getLogger("factlens.identity.auth")

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.profile_repo = ProfileRepository(db)
        self.token_repo = TokenRepository(db)

    def register(self, req: UserRegisterRequest) -> TokenResponse:
        email = req.email.strip().lower()
        if self.user_repo.get_by_email(email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists."
            )

        # bcrypt embeds its own salt and cost in the digest, so no separate
        # salt column is written for new accounts.
        password_hash = hash_password(req.password)

        # Restrict requested role to non-admin roles on registration
        role = req.role if req.role in ("ROLE_ANALYST", "ROLE_VERIFIER") else "ROLE_ANALYST"

        user = User(
            name=req.full_name.strip(),
            email=email,
            password_hash=password_hash,
            salt="",
            role=role,
            is_active=True
        )

        profile = UserProfile(
            user_id=user.id,
            full_name=req.full_name.strip(),
            organization="FactLens Verification Network",
            preferences={"theme": "dark", "language": "bn", "notifications": True}
        )

        with IdentityUnitOfWork(self.db) as uow:
            uow.users.create(user)
            profile.user_id = user.id
            uow.profiles.create(profile)
            # Automatic commit via Unit of Work

        self.db.refresh(user)
        return self._generate_token_response(user, profile.full_name)

    def login(self, req: UserLoginRequest) -> TokenResponse:
        email = req.email.strip().lower()
        user = self.user_repo.get_by_email(email)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password credentials."
            )

        is_valid, needs_rehash = verify_password(
            req.password, user.password_hash, user.salt or ""
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password credentials."
            )

        # Transparent upgrade: a row that verified under the legacy PBKDF2
        # scheme (or a bcrypt cost below current policy) is rehashed here,
        # while the plaintext is in hand. The user notices nothing.
        if needs_rehash:
            try:
                user.password_hash = hash_password(req.password)
                user.salt = ""
                self.db.commit()
                logger.info("Upgraded password hash to bcrypt for user %s", user.id)
            except Exception as exc:  # noqa: BLE001
                # A failed upgrade must never fail the login.
                self.db.rollback()
                logger.warning("Password rehash failed for user %s: %s", user.id, exc)

        profile = self.profile_repo.get_by_user_id(user.id)
        display_name = profile.full_name if profile else "Verified User"

        return self._generate_token_response(user, display_name)

    def refresh(self, refresh_token_str: str) -> TokenResponse:
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token."
            )

        token_hash = hashlib.sha256(refresh_token_str.encode()).hexdigest()
        token_record = self.token_repo.get_valid_token(token_hash)
        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired or been revoked."
            )

        # Revoke old refresh token (Token Rotation)
        self.token_repo.revoke_token(token_hash)

        user = self.user_repo.get_by_id(token_record.user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive or not found."
            )

        profile = self.profile_repo.get_by_user_id(user.id)
        display_name = profile.full_name if profile else "Verified User"

        return self._generate_token_response(user, display_name)

    def logout(self, refresh_token_str: str = None, user_id: str = None) -> None:
        if refresh_token_str:
            token_hash = hashlib.sha256(refresh_token_str.encode()).hexdigest()
            self.token_repo.revoke_token(token_hash)
        elif user_id:
            self.token_repo.revoke_all_for_user(user_id)
        self.db.commit()

    def _generate_token_response(self, user: User, full_name: str) -> TokenResponse:
        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "name": full_name
        }
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        # Persist refresh token hash
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        self.token_repo.create(RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            revoked=False
        ))
        self.db.commit()

        user_response = UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user_response
        )

