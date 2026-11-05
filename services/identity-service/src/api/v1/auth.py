from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...domain.models import User
from ...schemas.auth import UserRegisterRequest, UserLoginRequest, RefreshTokenRequest, UserResponse, TokenResponse
from ...services.auth_service import AuthService
from ..deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Accounts"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account with SHA-256 salted encryption."""
    service = AuthService(db)
    return service.register(req)

@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate email and password against stored salt and SHA hash."""
    service = AuthService(db)
    return service.login(req)

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Rotate and refresh an existing authenticated JWT session."""
    service = AuthService(db)
    return service.refresh(req.refresh_token)

@router.post("/logout")
def logout(
    req: RefreshTokenRequest = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke user refresh tokens and terminate session."""
    service = AuthService(db)
    service.logout(
        refresh_token_str=req.refresh_token if req else None,
        user_id=str(current_user.id)
    )
    return {"message": "Successfully logged out and session revoked."}

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Inspect current authenticated user credentials and roles."""
    full_name = current_user.profile.full_name if current_user.profile else "Verified User"
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )

