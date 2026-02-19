"""
Shared FastAPI dependencies (sync and async database sessions)
"""

import hmac
import logging

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from config.settings import API_SECRET_KEY, DATABASE_URL
from database.connection import get_db_manager

logger = logging.getLogger(__name__)

# Database manager (initialized once at module load)
db_manager = get_db_manager(DATABASE_URL)

# API key auth scheme (optional header)
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def get_db():
    """Dependency to get sync database session"""
    with db_manager.get_session() as session:
        yield session


def require_api_key(api_key: str = Security(_api_key_header)):
    """Dependency that enforces API key auth on sensitive endpoints.

    If API_SECRET_KEY is not configured (empty), all requests are allowed
    (dev mode).  In production, set API_SECRET_KEY in .env.
    """
    if not API_SECRET_KEY:
        # Auth not configured — allow (dev mode)
        return
    if not api_key or not hmac.compare_digest(api_key, API_SECRET_KEY):
        raise HTTPException(status_code=403, detail="Invalid or missing API key")


async def get_async_db():
    """Dependency to get async database session (for async route handlers)"""
    from database.connection import get_async_db_manager

    mgr = await get_async_db_manager(DATABASE_URL)
    async with mgr.get_session() as session:
        yield session
