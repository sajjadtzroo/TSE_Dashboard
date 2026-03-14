"""
JWT authentication and role-based access control.
Provides token creation/validation, password hashing, and FastAPI dependencies.
"""

import logging
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from api.deps import get_db
from config.settings import JWT_ALGORITHM, JWT_EXPIRATION_MINUTES, JWT_SECRET_KEY

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token scheme
bearer_scheme = HTTPBearer(auto_error=False)

# Role hierarchy: admin > trader > viewer
ROLE_HIERARCHY = {"admin": 3, "trader": 2, "viewer": 1}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


REFRESH_TOKEN_EXPIRY_DAYS = 7


def _create_token(data: dict, token_type: str, expires_delta: timedelta) -> str:
    """Create a signed JWT token with the given type and expiry."""
    to_encode = data.copy()
    to_encode.update({"exp": datetime.now(UTC) + expires_delta, "type": token_type})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    return _create_token(
        data, "access", expires_delta or timedelta(minutes=JWT_EXPIRATION_MINUTES)
    )


def create_refresh_token(data: dict) -> str:
    """Create a long-lived refresh token."""
    return _create_token(data, "refresh", timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS))


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


def _get_user_from_token(token: str, db: Session):
    """Extract user from JWT token (access tokens only)."""
    payload = decode_token(token)
    if payload.get("type") == "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh tokens cannot be used for authentication",
        )
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    from database.models import User

    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


# ── FastAPI Dependencies ─────────────────────────────────────────────────────


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """Optional auth: returns user if token provided, None otherwise."""
    if credentials is None:
        return None
    return _get_user_from_token(credentials.credentials, db)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """Required auth: returns user or raises 401."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _get_user_from_token(credentials.credentials, db)


async def authenticate_ws(websocket, token: str) -> dict | None:
    """Validate a JWT token for WebSocket endpoints.

    Returns the decoded payload on success.  On failure, closes the
    websocket with code 4001 and returns ``None``.
    """
    if not token:
        await websocket.close(code=4001, reason="Authentication required")
        return None
    try:
        return decode_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return None


def require_role(minimum_role: str):
    """Dependency factory: require minimum role level."""
    min_level = ROLE_HIERARCHY.get(minimum_role, 0)

    def _check(user=Depends(get_current_user)):
        user_level = ROLE_HIERARCHY.get(user.role, 0)
        if user_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires '{minimum_role}' role or higher",
            )
        return user

    return _check
