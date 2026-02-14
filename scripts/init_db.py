"""
Database initialization script
Creates all database tables and optionally populates with seed data
"""
import sys
import os
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from config.settings import DATABASE_URL, LOGS_DIR
from database.connection import get_db_manager, reset_db_manager
from database.schema import print_schema

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOGS_DIR / 'init_db.log')
    ]
)
logger = logging.getLogger(__name__)


def init_database(drop_existing=False):
    """
    Initialize database with all tables

    Args:
        drop_existing: If True, drop existing tables before creating new ones
    """
    logger.info("="*80)
    logger.info("TSETMC Database Initialization")
    logger.info("="*80)

    try:
        # Get database manager
        db_manager = get_db_manager(DATABASE_URL)

        # Drop existing tables if requested
        if drop_existing:
            response = input("\n⚠️  WARNING: This will delete all existing data. Continue? (yes/no): ")
            if response.lower() == 'yes':
                logger.warning("Dropping existing tables...")
                db_manager.drop_tables()
            else:
                logger.info("Operation cancelled by user")
                return

        # Create tables
        logger.info(f"Creating tables in database: {DATABASE_URL}")
        db_manager.create_tables()

        # Print schema
        logger.info("\nDatabase schema created successfully!")
        print_schema()

        # Verify tables
        logger.info("Verifying table creation...")
        with db_manager.get_session() as session:
            # Try a simple query to verify connectivity
            from database.models import Company
            count = session.query(Company).count()
            logger.info(f"✓ Database initialized successfully! (Companies table: {count} records)")

        logger.info("\n" + "="*80)
        logger.info("Database initialization completed!")
        logger.info("="*80)
        logger.info("\nNext steps:")
        logger.info("1. Run: python -m scrapy crawl market_watch")
        logger.info("2. Or start scheduler: python scheduler/scheduler.py")
        logger.info("="*80 + "\n")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}", exc_info=True)
        sys.exit(1)


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Initialize TSETMC database')
    parser.add_argument(
        '--drop',
        action='store_true',
        help='Drop existing tables before creating new ones (WARNING: deletes all data)'
    )
    args = parser.parse_args()

    init_database(drop_existing=args.drop)


if __name__ == '__main__':
    main()
