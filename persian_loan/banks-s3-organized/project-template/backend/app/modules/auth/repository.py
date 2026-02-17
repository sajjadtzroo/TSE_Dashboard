"""
Authentication Repository
Handles database operations for users and refresh tokens.
"""

from datetime import datetime
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logger import get_logger
from app.modules.auth.models import RefreshToken, User

logger = get_logger(__name__)


class AuthRepository:
    """Repository for authentication-related database operations."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users_collection = db.users
        self.refresh_tokens_collection = db.refresh_tokens

    async def create_user(self, user: User) -> User:
        """
        Create a new user in the database.

        Args:
            user: User object to create

        Returns:
            Created user with ID
        """
        user_dict = user.model_dump(by_alias=True, exclude={"id"})
        result = await self.users_collection.insert_one(user_dict)
        user.id = str(result.inserted_id)
        logger.info(f"User created: {user.username} (ID: {user.id})")
        return user

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """
        Get a user by username.

        Args:
            username: Username to search for

        Returns:
            User if found, None otherwise
        """
        user_dict = await self.users_collection.find_one({"username": username})
        if user_dict:
            user_dict["_id"] = str(user_dict["_id"])
            return User(**user_dict)
        return None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get a user by email.

        Args:
            email: Email to search for

        Returns:
            User if found, None otherwise
        """
        user_dict = await self.users_collection.find_one({"email": email})
        if user_dict:
            user_dict["_id"] = str(user_dict["_id"])
            return User(**user_dict)
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """
        Get a user by ID.

        Args:
            user_id: User ID to search for

        Returns:
            User if found, None otherwise
        """
        try:
            user_dict = await self.users_collection.find_one(
                {"_id": ObjectId(user_id)}
            )
            if user_dict:
                user_dict["_id"] = str(user_dict["_id"])
                return User(**user_dict)
        except Exception as e:
            logger.error(f"Error fetching user by ID {user_id}: {e}")
        return None

    async def update_user(self, user_id: str, update_data: dict) -> bool:
        """
        Update a user's data.

        Args:
            user_id: User ID to update
            update_data: Dictionary of fields to update

        Returns:
            True if updated, False otherwise
        """
        update_data["updated_at"] = datetime.utcnow()
        result = await self.users_collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": update_data}
        )
        return result.modified_count > 0

    async def save_refresh_token(self, refresh_token: RefreshToken) -> RefreshToken:
        """
        Save a refresh token to the database.

        Args:
            refresh_token: RefreshToken object to save

        Returns:
            Saved refresh token with ID
        """
        token_dict = refresh_token.model_dump(by_alias=True, exclude={"id"})
        result = await self.refresh_tokens_collection.insert_one(token_dict)
        refresh_token.id = str(result.inserted_id)
        return refresh_token

    async def get_refresh_token(self, token: str) -> Optional[RefreshToken]:
        """
        Get a refresh token by token string.

        Args:
            token: Hashed token string

        Returns:
            RefreshToken if found, None otherwise
        """
        token_dict = await self.refresh_tokens_collection.find_one({"token": token})
        if token_dict:
            token_dict["_id"] = str(token_dict["_id"])
            return RefreshToken(**token_dict)
        return None

    async def revoke_refresh_token(self, token: str) -> bool:
        """
        Revoke a refresh token.

        Args:
            token: Token string to revoke

        Returns:
            True if revoked, False otherwise
        """
        result = await self.refresh_tokens_collection.update_one(
            {"token": token}, {"$set": {"is_revoked": True}}
        )
        return result.modified_count > 0

    async def revoke_all_user_tokens(self, user_id: str) -> int:
        """
        Revoke all refresh tokens for a user.

        Args:
            user_id: User ID

        Returns:
            Number of tokens revoked
        """
        result = await self.refresh_tokens_collection.update_many(
            {"user_id": user_id, "is_revoked": False},
            {"$set": {"is_revoked": True}},
        )
        return result.modified_count

    async def delete_expired_tokens(self) -> int:
        """
        Delete expired refresh tokens from the database.

        Returns:
            Number of tokens deleted
        """
        result = await self.refresh_tokens_collection.delete_many(
            {"expires_at": {"$lt": datetime.utcnow()}}
        )
        logger.info(f"Deleted {result.deleted_count} expired refresh tokens")
        return result.deleted_count

    async def ensure_indexes(self):
        """Create database indexes for performance."""
        # User indexes
        await self.users_collection.create_index("username", unique=True)
        await self.users_collection.create_index("email", unique=True)

        # Refresh token indexes
        await self.refresh_tokens_collection.create_index("token")
        await self.refresh_tokens_collection.create_index("user_id")
        await self.refresh_tokens_collection.create_index("expires_at")

        logger.info("Authentication indexes created")
