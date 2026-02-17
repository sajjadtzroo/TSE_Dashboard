"""
Core module - Application configuration and setup
"""

from app.core.cache import cache_manager, get_cache
from app.core.config import settings
from app.core.database import get_database, get_db
from app.core.logger import get_logger

__all__ = ["settings", "get_database", "get_db", "get_logger", "cache_manager", "get_cache"]
