"""
Shared FastAPI dependencies
"""
from sqlalchemy.orm import Session
from database.connection import get_db_manager
from config.settings import DATABASE_URL

# Database manager (initialized once at module load)
db_manager = get_db_manager(DATABASE_URL)


def get_db():
    """Dependency to get database session"""
    with db_manager.get_session() as session:
        yield session
