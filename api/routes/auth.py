"""
Authentication endpoints: register, login, refresh token, me
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from api.deps import get_db
from database.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime | None = None


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account (default role: viewer)"""
    existing = (
        db.query(User)
        .filter((User.username == req.username) | (User.email == req.email))
        .first()
    )
    if existing:
        if existing.username == req.username:
            raise HTTPException(status_code=409, detail="Username already exists")
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
        role="viewer",
    )
    db.add(user)
    db.flush()
    db.refresh(user)
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate and receive JWT tokens"""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    token_data = {"sub": user.username, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(req: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a refresh token for new access + refresh tokens"""
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    username = payload.get("sub")
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    token_data = {"sub": user.username, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get("/me", response_model=UserResponse)
def get_me(user=Depends(get_current_user)):
    """Get current authenticated user info"""
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.patch("/me", response_model=UserResponse)
def update_me(
    req: PasswordChangeRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change current user's password"""
    if not verify_password(req.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="رمز عبور فعلی اشتباه است")

    user.hashed_password = hash_password(req.new_password)
    db.flush()
    db.refresh(user)
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )
