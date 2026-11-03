from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class UserProfileResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = ""
    location: Optional[str] = "Bangladesh"
    bio: Optional[str] = ""
    avatar_url: Optional[str] = ""
    organization: Optional[str] = "FactLens Verification Network"
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=1000)
    organization: Optional[str] = Field(None, max_length=255)
    preferences: Optional[Dict[str, Any]] = None

class AvatarResponse(BaseModel):
    avatar_url: str
    message: str

