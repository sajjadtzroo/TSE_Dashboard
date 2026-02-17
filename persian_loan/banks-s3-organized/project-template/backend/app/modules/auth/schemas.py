"""
Authentication Schemas
Request and response models for authentication endpoints.

Uses Pydantic v2 field_validator (replaces deprecated @validator).
"""

from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.modules.auth.models import UserRole


class UserCreate(BaseModel):
    """Schema for user registration."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "username": "john_doe",
                    "email": "john@example.com",
                    "password": "SecurePass123",
                    "role": "user",
                }
            ]
        }
    )

    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Username (letters, digits, underscores only)",
    )
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="Password (min 8 chars, requires upper, lower, digit)",
    )
    role: Optional[UserRole] = Field(
        UserRole.USER, description="User role (defaults to 'user')"
    )

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        """Validate username contains only alphanumeric characters and underscores."""
        if not v.replace("_", "").isalnum():
            raise ValueError(
                "Username must contain only letters, numbers, and underscores"
            )
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password strength requirements."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError(
                "Password must contain at least one uppercase letter"
            )
        if not any(c.islower() for c in v):
            raise ValueError(
                "Password must contain at least one lowercase letter"
            )
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    """Schema for user login."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "username": "john_doe",
                    "password": "SecurePass123",
                }
            ]
        }
    )

    username: str = Field(..., min_length=3, description="Username")
    password: str = Field(..., min_length=8, description="Password")


class Token(BaseModel):
    """Schema for JWT token response."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "bearer",
                    "expires_in": 900,
                }
            ]
        }
    )

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(
        ..., gt=0, description="Access token expiration time in seconds"
    )


class TokenRefresh(BaseModel):
    """Schema for token refresh request."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                }
            ]
        }
    )

    refresh_token: str = Field(
        ..., min_length=1, description="Refresh token"
    )


class UserResponse(BaseModel):
    """Schema for user response."""

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "_id": "507f1f77bcf86cd799439011",
                    "username": "john_doe",
                    "email": "john@example.com",
                    "role": "user",
                    "is_active": True,
                    "created_at": "2024-01-01T00:00:00Z",
                }
            ]
        },
    )

    id: str = Field(..., alias="_id")
    username: str = Field(..., min_length=3)
    email: EmailStr
    role: UserRole
    is_active: bool = Field(..., description="Whether the user account is active")
    created_at: str = Field(..., description="Account creation timestamp (ISO 8601)")


class TokenPayload(BaseModel):
    """Schema for JWT token payload (internal use)."""

    sub: str = Field(..., description="Subject (user ID)")
    username: str = Field(..., min_length=1, description="Username")
    role: str = Field(..., min_length=1, description="User role")
    exp: int = Field(..., gt=0, description="Expiration time (Unix epoch)")
    type: str = Field(
        ...,
        description="Token type (access or refresh)",
        pattern="^(access|refresh)$",
    )
