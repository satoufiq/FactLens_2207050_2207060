from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserRegisterRequest(BaseModel):
    email: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$', description="User email address")
    password: str = Field(..., min_length=6, description="Plain text password (hashed via PBKDF2-SHA256)")
    full_name: str = Field(..., min_length=2, description="User full display name")
    role: Optional[str] = Field("ROLE_ANALYST", description="Requested role (ROLE_ANALYST, ROLE_VERIFIER)")

class UserLoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Plain text password to authenticate")

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="JWT refresh token")

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

