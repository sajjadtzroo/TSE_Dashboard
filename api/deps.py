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

    Fail-closed: if API_SECRET_KEY is not configured, every request is
    rejected with 503. Previously this returned silently, which let a
    misconfigured prod deploy strip auth from any endpoint protected only
    by this dependency.
    """
    if not API_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail="API key authentication is not configured on this server",
        )
    if not api_key or not hmac.compare_digest(api_key, API_SECRET_KEY):
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
