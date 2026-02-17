"""
Authentication Dependencies
FastAPI dependencies for protecting routes with authentication.
"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import database
from app.modules.auth.jwt import decode_token, is_token_expired, verify_token_type
from app.modules.auth.models import User, UserRole
from app.modules.auth.repository import AuthRepository

# HTTP Bearer token security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(database.get_db),
) -> User:
    """
    Get the current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token from request header
        db: Database connection

    Returns:
        User object if authenticated

    Raises:
        HTTPException: If token is invalid, expired, or user not found
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Decode token
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    # Verify token type
    if not verify_token_type(payload, "access"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if token is expired
    if is_token_expired(payload):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    repository = AuthRepository(db)
    user = await repository.get_user_by_id(payload.sub)

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get the current active user.

    Args:
        current_user: User from get_current_user dependency

    Returns:
        User if active

    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    return current_user


def require_role(required_role: UserRole):
    """
    Create a dependency that requires a specific user role.

    Args:
        required_role: The role required to access the endpoint

    Returns:
        Dependency function
    """

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        """
        Check if user has the required role.

        Args:
            current_user: User from get_current_user dependency

        Returns:
            User if authorized

        Raises:
            HTTPException: If user doesn't have required role
        """
        if current_user.role != required_role and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role.value}",
            )
        return current_user

    return role_checker


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that requires admin role.

    Args:
        current_user: User from get_current_user dependency

    Returns:
        User if admin

    Raises:
        HTTPException: If user is not admin
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: AsyncIOMotorDatabase = Depends(database.get_db),
) -> Optional[User]:
    """
    Get the current user if authenticated, None otherwise.
    Useful for endpoints that work with or without authentication.

    Args:
        credentials: Optional HTTP Bearer token
        db: Database connection

    Returns:
        User if authenticated, None otherwise
    """
    if credentials is None:
        return None

    try:
        token = credentials.credentials
        payload = decode_token(token)

        if payload is None or is_token_expired(payload):
            return None

        if not verify_token_type(payload, "access"):
            return None

        repository = AuthRepository(db)
        user = await repository.get_user_by_id(payload.sub)

        if user is None or not user.is_active:
            return None

        return user
    except Exception:
        return None
