"""
Authentication Service
Business logic for authentication operations.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logger import get_logger
from app.modules.auth.jwt import create_access_token, create_refresh_token, decode_token
from app.modules.auth.models import RefreshToken, User, UserRole
from app.modules.auth.password import hash_password, verify_password
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import Token, UserCreate, UserLogin

logger = get_logger(__name__)


class AuthService:
    """Service for authentication business logic."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.repository = AuthRepository(db)

    async def register(self, user_data: UserCreate) -> User:
        """
        Register a new user.

        Args:
            user_data: User registration data

        Returns:
            Created user

        Raises:
            HTTPException: If username or email already exists
        """
        # Check if username exists
        existing_user = await self.repository.get_user_by_username(user_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )

        # Check if email exists
        existing_email = await self.repository.get_user_by_email(user_data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Create user
        user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hash_password(user_data.password),
            role=user_data.role or UserRole.USER,
            is_active=True,
        )

        created_user = await self.repository.create_user(user)
        logger.info(f"User registered: {created_user.username}")
        return created_user

    async def login(self, login_data: UserLogin) -> Token:
        """
        Authenticate user and generate tokens.

        Args:
            login_data: User login credentials

        Returns:
            JWT tokens (access and refresh)

        Raises:
            HTTPException: If credentials are invalid
        """
        # Get user
        user = await self.repository.get_user_by_username(login_data.username)
        if not user:
            logger.warning(f"Login attempt for non-existent user: {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )

        # Verify password
        if not verify_password(login_data.password, user.hashed_password):
            logger.warning(f"Failed login attempt for user: {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )

        # Check if user is active
        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        # Generate tokens
        access_token, expires_in = create_access_token(
            user_id=user.id,
            username=user.username,
            role=user.role.value,
        )

        refresh_token_str = create_refresh_token(
            user_id=user.id,
            username=user.username,
            role=user.role.value,
        )

        # Store refresh token in database (hashed)
        refresh_token = RefreshToken(
            token=hash_password(refresh_token_str),
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        await self.repository.save_refresh_token(refresh_token)

        logger.info(f"User logged in: {user.username}")

        return Token(
            access_token=access_token,
            refresh_token=refresh_token_str,
            token_type="bearer",
            expires_in=expires_in,
        )

    async def refresh(self, refresh_token_str: str) -> Token:
        """
        Refresh access token using refresh token.

        Args:
            refresh_token_str: Refresh token string

        Returns:
            New JWT tokens

        Raises:
            HTTPException: If refresh token is invalid or expired
        """
        # Decode refresh token
        payload = decode_token(refresh_token_str)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        # Verify token type
        if payload.type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        # Get user
        user = await self.repository.get_user_by_id(payload.sub)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        # Check if token is in database and not revoked
        hashed_token = hash_password(refresh_token_str)
        stored_token = await self.repository.get_refresh_token(hashed_token)

        if not stored_token or stored_token.is_revoked:
            logger.warning(f"Attempt to use revoked refresh token for user: {user.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked",
            )

        if stored_token.expires_at < datetime.utcnow():
            logger.warning(f"Attempt to use expired refresh token for user: {user.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired",
            )

        # Revoke old refresh token
        await self.repository.revoke_refresh_token(hashed_token)

        # Generate new tokens
        access_token, expires_in = create_access_token(
            user_id=user.id,
            username=user.username,
            role=user.role.value,
        )

        new_refresh_token_str = create_refresh_token(
            user_id=user.id,
            username=user.username,
            role=user.role.value,
        )

        # Store new refresh token
        new_refresh_token = RefreshToken(
            token=hash_password(new_refresh_token_str),
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        await self.repository.save_refresh_token(new_refresh_token)

        logger.info(f"Tokens refreshed for user: {user.username}")

        return Token(
            access_token=access_token,
            refresh_token=new_refresh_token_str,
            token_type="bearer",
            expires_in=expires_in,
        )

    async def logout(self, user_id: str) -> bool:
        """
        Logout user by revoking all refresh tokens.

        Args:
            user_id: User ID

        Returns:
            True if successful
        """
        count = await self.repository.revoke_all_user_tokens(user_id)
        logger.info(f"User logged out: {user_id} ({count} tokens revoked)")
        return True

    async def get_user_profile(self, user_id: str) -> Optional[User]:
        """
        Get user profile by ID.

        Args:
            user_id: User ID

        Returns:
            User if found, None otherwise
        """
        return await self.repository.get_user_by_id(user_id)

    async def cleanup_expired_tokens(self) -> int:
        """
        Clean up expired refresh tokens.

        Returns:
            Number of tokens deleted
        """
        return await self.repository.delete_expired_tokens()
