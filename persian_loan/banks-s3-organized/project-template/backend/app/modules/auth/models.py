"""
Authentication Data Models
Defines User and RefreshToken database schemas.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    """User role enumeration."""

    ADMIN = "admin"
    USER = "user"


class User(BaseModel):
    """User model for database."""

    id: Optional[str] = Field(None, alias="_id")
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    hashed_password: str
    role: UserRole = UserRole.USER
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "username": "john_doe",
                "email": "john@example.com",
                "role": "user",
                "is_active": True,
            }
        }


class RefreshToken(BaseModel):
    """Refresh token model for database."""

    id: Optional[str] = Field(None, alias="_id")
    token: str = Field(..., description="Hashed refresh token")
    user_id: str = Field(..., description="User ID this token belongs to")
    expires_at: datetime = Field(..., description="Token expiration time")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_revoked: bool = False

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "expires_at": "2024-03-15T10:00:00Z",
                "is_revoked": False,
            }
        }
