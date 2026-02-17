"""
MongoDB Database Connection
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings
from app.logger import get_logger

logger = get_logger(__name__)

# Global database client
client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_db():
    """Connect to MongoDB."""
    global client, db

    logger.info(f"Connecting to MongoDB: {settings.database_name}")

    try:
        client = AsyncIOMotorClient(settings.mongodb_url)
        db = client[settings.database_name]

        # Test connection
        await client.admin.command("ping")
        logger.success(f"Successfully connected to MongoDB: {settings.database_name}")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_db():
    """Close MongoDB connection."""
    global client

    if client:
        client.close()
        logger.info("MongoDB connection closed")


def get_database() -> AsyncIOMotorDatabase:
    """Get database instance."""
    return db


# Collection helpers
def get_banks_collection():
    """Get banks collection."""
    logger.debug("Accessing banks collection")
    return db["banks"]


def get_loans_collection():
    """Get loans collection."""
    logger.debug("Accessing loans collection")
    return db["loans"]


def get_analytics_collection():
    """Get analytics collection."""
    logger.debug("Accessing analytics collection")
    return db["analytics"]
