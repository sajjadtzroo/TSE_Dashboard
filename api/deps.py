"""
Shared FastAPI dependencies (sync and async database sessions)
"""
from sqlalchemy.orm import Session
from database.connection import get_db_manager
from config.settings import DATABASE_URL

# Database manager (initialized once at module load)
db_manager = get_db_manager(DATABASE_URL)


def get_db():
    """Dependency to get sync database session"""
    with db_manager.get_session() as session:
        yield session


async def get_async_db():
    """Dependency to get async database session (for async route handlers)"""
    from database.connection import get_async_db_manager
    mgr = await get_async_db_manager(DATABASE_URL)
    async with mgr.get_session() as session:
        yield session
