"""
Shared FastAPI dependencies
"""
import logging

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session

from database.connection import get_db_manager
from config.settings import DATABASE_URL, API_SECRET_KEY

logger = logging.getLogger(__name__)

# Database manager (initialized once at module load)
db_manager = get_db_manager(DATABASE_URL)

# API key auth scheme (optional header)
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def get_db():
    """Dependency to get database session"""
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
    if not api_key or api_key != API_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
