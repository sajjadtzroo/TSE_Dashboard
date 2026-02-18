"""
Database initialization script
Creates all database tables in PostgreSQL
"""

import logging
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from config.settings import DATABASE_URL, LOGS_DIR
from database.connection import get_db_manager
from database.schema import print_schema

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler(LOGS_DIR / "init_db.log")],
)
logger = logging.getLogger(__name__)


def init_database(drop_existing=False):
    """Initialize database with all tables"""
    logger.info("=" * 80)
    logger.info("TSETMC Database Initialization (PostgreSQL)")
    logger.info("=" * 80)

    try:
        db_manager = get_db_manager(DATABASE_URL)

        if drop_existing:
            response = input(
                "\nWARNING: This will delete all existing data. Continue? (yes/no): "
            )
            if response.lower() == "yes":
                logger.warning("Dropping existing tables...")
                db_manager.drop_tables()
            else:
                logger.info("Operation cancelled by user")
                return

        logger.info(
            f"Creating tables in database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}"
        )
        db_manager.create_tables()

        logger.info("\nDatabase schema created successfully!")
        print_schema()

        logger.info("Verifying table creation...")
        with db_manager.get_session() as session:
            from database.models import Security

            count = session.query(Security).count()
            logger.info(
                f"Database initialized successfully! (Securities table: {count} records)"
            )

        logger.info("\n" + "=" * 80)
        logger.info("Database initialization completed!")
        logger.info("=" * 80)
        logger.info("\nNext steps:")
        logger.info("1. Run: python -m scrapy crawl instrument_details")
        logger.info("2. Run: python -m scrapy crawl market_watch")
        logger.info("3. Run: python -m scrapy crawl history_backfill")
        logger.info("=" * 80 + "\n")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}", exc_info=True)
        sys.exit(1)


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Initialize TSETMC PostgreSQL database"
    )
    parser.add_argument(
        "--drop",
        action="store_true",
        help="Drop existing tables before creating new ones (WARNING: deletes all data)",
    )
    args = parser.parse_args()

    init_database(drop_existing=args.drop)


if __name__ == "__main__":
    main()
