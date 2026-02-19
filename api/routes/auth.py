"""
Authentication endpoints: register, login, refresh token, me, telegram
"""

import hashlib
import hmac
import json
import secrets
import time
import urllib.parse
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
from config.settings import ENABLE_TELEGRAM, TELEGRAM_BOT_TOKEN
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


# ── Telegram Mini App auth ────────────────────────────────────────────────────


class TelegramAuthRequest(BaseModel):
    init_data: str = Field(description="Raw initData string from window.Telegram.WebApp.initData")


def _verify_telegram_init_data(init_data: str, bot_token: str) -> dict:
    """Verify Telegram initData HMAC-SHA256 signature and return parsed fields.

    See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    params = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
    received_hash = params.pop("hash", None)
    if not received_hash:
        raise HTTPException(status_code=401, detail="Missing hash in Telegram initData")

    # Build data-check string: sorted key=value pairs joined by \n
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))

    # secret_key = HMAC-SHA256("WebAppData", bot_token)
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise HTTPException(status_code=401, detail="Invalid Telegram initData signature")

    # Validate auth_date freshness to prevent replay attacks (max 24 hours)
    auth_date = params.get("auth_date")
    if not auth_date or (time.time() - int(auth_date)) > 86400:
        raise HTTPException(status_code=401, detail="Telegram initData has expired")

    return params


@router.post("/telegram", response_model=TokenResponse)
def auth_telegram(req: TelegramAuthRequest, db: Session = Depends(get_db)):
    """Authenticate via Telegram Mini App initData.

    Verifies the cryptographic signature from Telegram, then finds or
    auto-creates a user account linked to the Telegram user ID.
    Returns the same JWT token pair as the regular login endpoint.
    """
    if not ENABLE_TELEGRAM or not TELEGRAM_BOT_TOKEN:
        raise HTTPException(
            status_code=404,
            detail="Telegram authentication is not enabled on this server",
        )

    params = _verify_telegram_init_data(req.init_data, TELEGRAM_BOT_TOKEN)

    # Parse user object from the "user" field
    raw_user = params.get("user")
    if not raw_user:
        raise HTTPException(status_code=400, detail="No user data in Telegram initData")

    try:
        tg_user = json.loads(raw_user)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="Malformed user data in Telegram initData")

    tg_id: int = tg_user.get("id")
    if not tg_id:
        raise HTTPException(status_code=400, detail="Missing Telegram user ID")

    tg_username: str = tg_user.get("username", "")
    tg_first_name: str = tg_user.get("first_name", "")

    # Find existing user by telegram_id
    user = db.query(User).filter(User.telegram_id == tg_id).first()

    if not user:
        # Auto-create a new account linked to this Telegram identity
        username = f"tg_{tg_id}"
        # Ensure username is unique (rare collision with manually registered users)
        if db.query(User).filter(User.username == username).first():
            username = f"tg_{tg_id}_{secrets.token_hex(3)}"

        user = User(
            username=username,
            email=f"{tg_id}@telegram.local",
            hashed_password=hash_password(secrets.token_hex(32)),  # random, unusable password
            role="viewer",
            telegram_id=tg_id,
            telegram_username=tg_username or None,
            telegram_first_name=tg_first_name or None,
        )
        db.add(user)
        db.flush()
        db.refresh(user)
    else:
        # Update Telegram profile fields if changed
        if tg_username and user.telegram_username != tg_username:
            user.telegram_username = tg_username
        if tg_first_name and user.telegram_first_name != tg_first_name:
            user.telegram_first_name = tg_first_name

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    token_data = {"sub": user.username, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )
