"""
Database connection management
Handles SQLAlchemy engine and session creation for PostgreSQL
"""
import logging
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session

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
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            echo=False
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
    def get_session(self):
        """Context manager for database sessions"""
        # Use SessionFactory directly to avoid scoped_session concurrency issues
        session = self.SessionFactory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
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
        if '@' in self.database_url:
            parts = self.database_url.split('@')
            auth_parts = parts[0].split(':')
            if len(auth_parts) > 2:
                masked = ':'.join(auth_parts[:-1]) + ':****@' + parts[1]
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
