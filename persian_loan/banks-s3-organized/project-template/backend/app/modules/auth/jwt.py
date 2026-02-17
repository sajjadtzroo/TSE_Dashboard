"""
JWT Token Management
Handles creation and validation of JWT access and refresh tokens.
"""

from datetime import datetime, timedelta
from typing import Dict, Optional

from jose import JWTError, jwt

from app.core.config import settings
from app.modules.auth.schemas import TokenPayload


def create_access_token(user_id: str, username: str, role: str) -> tuple[str, int]:
    """
    Create a JWT access token.

    Args:
        user_id: User ID
        username: Username
        role: User role

    Returns:
        Tuple of (token, expires_in_seconds)
    """
    expires_delta = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    expire = datetime.utcnow() + expires_delta

    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": expire,
        "type": "access",
    }

    token = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token, int(expires_delta.total_seconds())


def create_refresh_token(user_id: str, username: str, role: str) -> str:
    """
    Create a JWT refresh token.

    Args:
        user_id: User ID
        username: Username
        role: User role

    Returns:
        JWT refresh token
    """
    expires_delta = timedelta(days=settings.jwt_refresh_token_expire_days)
    expire = datetime.utcnow() + expires_delta

    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": expire,
        "type": "refresh",
    }

    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[TokenPayload]:
    """
    Decode and validate a JWT token.

    Args:
        token: JWT token to decode

    Returns:
        TokenPayload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
        return TokenPayload(**payload)
    except JWTError:
        return None


def verify_token_type(payload: TokenPayload, expected_type: str) -> bool:
    """
    Verify that a token payload has the expected type.

    Args:
        payload: Decoded token payload
        expected_type: Expected token type ("access" or "refresh")

    Returns:
        True if token type matches, False otherwise
    """
    return payload.type == expected_type


def is_token_expired(payload: TokenPayload) -> bool:
    """
    Check if a token is expired.

    Args:
        payload: Decoded token payload

    Returns:
        True if expired, False otherwise
    """
    return datetime.utcnow().timestamp() > payload.exp
