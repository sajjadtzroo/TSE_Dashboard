"""
MongoDB Database Connection
"""

import asyncio
from typing import AsyncGenerator

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)


class Database:
    """Database connection manager."""

    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

    async def connect(self, max_retries: int = 5, retry_delay: int = 5) -> None:
        """Connect to MongoDB with retry logic.

        Args:
            max_retries: Maximum number of connection attempts
            retry_delay: Initial delay between retries in seconds (exponential backoff)
        """
        logger.info(f"Connecting to MongoDB: {settings.database_name}")

        for attempt in range(1, max_retries + 1):
            try:
                self.client = AsyncIOMotorClient(
                    settings.mongodb_url,
                    serverSelectionTimeoutMS=5000,  # 5 seconds timeout
                )
                self.db = self.client[settings.database_name]

                # Test connection
                await self.client.admin.command("ping")
                logger.success(f"Connected to MongoDB: {settings.database_name}")
                return

            except Exception as e:
                if attempt < max_retries:
                    # Exponential backoff
                    wait_time = retry_delay * (2 ** (attempt - 1))
                    logger.warning(
                        f"MongoDB connection attempt {attempt}/{max_retries} failed: {e}. "
                        f"Retrying in {wait_time} seconds..."
                    )
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(
                        f"Failed to connect to MongoDB after {max_retries} attempts: {e}"
                    )
                    raise RuntimeError(
                        f"Failed to connect to MongoDB after {max_retries} attempts"
                    )

    async def disconnect(self) -> None:
        """Disconnect from MongoDB."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

    def get_db(self) -> AsyncIOMotorDatabase:
        """Get database instance with health check."""
        if self.db is None:
            raise RuntimeError(
                "Database not initialized. Call connect() first."
            )
        return self.db


# Global database instance
database = Database()


async def get_database() -> AsyncIOMotorDatabase:
    """Dependency to get database."""
    return database.get_db()


async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """Async generator for database dependency."""
    yield database.get_db()
