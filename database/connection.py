"""
Database connection management
Handles SQLAlchemy engine and session creation for PostgreSQL.
Supports both sync (Scrapy pipelines, current routes) and async (FastAPI async routes).
"""

import logging
import time
from contextlib import asynccontextmanager, contextmanager

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import scoped_session, sessionmaker

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages database connections and sessions"""

    def __init__(self, database_url):
        self.database_url = database_url
        self.engine = None
        self.SessionFactory = None
        self.Session = None

    def initialize(self):
        """Initialize database engine and session factory"""
        logger.info(f"Initializing database connection: {self._safe_url()}")

        self.engine = create_engine(
            self.database_url,
            pool_size=30,
            max_overflow=50,
            pool_pre_ping=True,
            pool_recycle=3600,
            pool_timeout=10,
            echo=False,
        )

        self.SessionFactory = sessionmaker(bind=self.engine)
        self.Session = scoped_session(self.SessionFactory)
        logger.info("Database connection initialized successfully")

    def create_tables(self):
        """Create all database tables"""
        from database.models import Base

        logger.info("Creating database tables...")
        Base.metadata.create_all(self.engine)
        logger.info("Database tables created successfully")

    def drop_tables(self):
        """Drop all database tables (use with caution!)"""
        from database.models import Base

        logger.warning("Dropping all database tables...")
        Base.metadata.drop_all(self.engine)
        logger.info("Database tables dropped")

    @contextmanager
    def get_session(self, max_retries: int = 3):
        """Context manager for database sessions with retry on initial connection.

        Retries only apply when *establishing* the connection (ping).
        Once the session is yielded, errors propagate immediately.
        """
        session = None
        for attempt in range(1, max_retries + 1):
            session = self.SessionFactory()
            try:
                # Test connectivity before yielding
                session.connection()
                break
            except OperationalError as e:
                session.close()
                if attempt < max_retries:
                    wait = 2 ** (attempt - 1)  # 1s, 2s
                    logger.warning(
                        f"Database connection error (attempt {attempt}/{max_retries}), "
                        f"retrying in {wait}s: {e}"
                    )
                    time.sleep(wait)
                else:
                    logger.error(
                        f"Database connection failed after {max_retries} attempts: {e}"
                    )
                    raise

        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_scoped_session(self):
        """Get a scoped session for use in Scrapy pipelines"""
        return self.Session()

    def close(self):
        """Close all database connections"""
        if self.Session:
            self.Session.remove()
        if self.engine:
            self.engine.dispose()
        logger.info("Database connections closed")

    def _safe_url(self):
        """Return database URL with password masked"""
        if "@" in self.database_url:
            parts = self.database_url.split("@")
            auth_parts = parts[0].split(":")
            if len(auth_parts) > 2:
                masked = ":".join(auth_parts[:-1]) + ":****@" + parts[1]
                return masked
        return self.database_url

    def __repr__(self):
        return f"<DatabaseManager(url={self._safe_url()})>"


# Global database manager instance (singleton pattern)
_db_manager = None


def get_db_manager(database_url=None):
    """Get or create global database manager instance"""
    global _db_manager

    if _db_manager is None:
        if database_url is None:
            raise ValueError("database_url is required for first initialization")
        _db_manager = DatabaseManager(database_url)
        _db_manager.initialize()

    return _db_manager


def reset_db_manager():
    """Reset global database manager (useful for testing)"""
    global _db_manager
    if _db_manager:
        _db_manager.close()
    _db_manager = None


# ── Async Database Manager ────────────────────────────────────────────────────


class AsyncDatabaseManager:
    """Async database manager using asyncpg for non-blocking I/O in FastAPI."""

    def __init__(self, database_url: str):
        # Convert postgresql:// to postgresql+asyncpg://
        if database_url.startswith("postgresql://"):
            self.database_url = database_url.replace(
                "postgresql://", "postgresql+asyncpg://", 1
            )
        else:
            self.database_url = database_url
        self.engine = None
        self.SessionFactory = None

    async def initialize(self, max_retries: int = 3):
        """Initialize async engine and session factory with retry on transient errors."""
        import asyncio

        from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

        logger.info("Initializing async database connection")

        last_exc = None
        for attempt in range(1, max_retries + 1):
            try:
                self.engine = create_async_engine(
                    self.database_url,
                    pool_size=20,
                    max_overflow=40,
                    pool_pre_ping=True,
                    pool_recycle=3600,
                    pool_timeout=10,
                    echo=False,
                )
                # Verify connectivity before returning
                async with self.engine.connect():
                    pass
                break
            except Exception as e:
                last_exc = e
                if self.engine:
                    await self.engine.dispose()
                    self.engine = None
                if attempt < max_retries:
                    wait = 2 ** (attempt - 1)  # 1s, 2s
                    logger.warning(
                        f"Async database connection error (attempt {attempt}/{max_retries}), "
                        f"retrying in {wait}s: {e}"
                    )
                    await asyncio.sleep(wait)
                else:
                    logger.error(
                        f"Async database connection failed after {max_retries} attempts: {e}"
                    )
                    raise last_exc

        self.SessionFactory = async_sessionmaker(
            bind=self.engine,
            expire_on_commit=False,
        )
        logger.info("Async database connection initialized")

    @asynccontextmanager
    async def get_session(self):
        """Async context manager for database sessions."""
        session = self.SessionFactory()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def close(self):
        """Close async engine."""
        if self.engine:
            await self.engine.dispose()
            logger.info("Async database connections closed")


# Global async database manager
_async_db_manager: AsyncDatabaseManager | None = None


async def get_async_db_manager(database_url: str | None = None) -> AsyncDatabaseManager:
    """Get or create the global async database manager."""
    global _async_db_manager
    if _async_db_manager is None:
        if database_url is None:
            raise ValueError("database_url required for first async initialization")
        _async_db_manager = AsyncDatabaseManager(database_url)
        await _async_db_manager.initialize()
    return _async_db_manager
