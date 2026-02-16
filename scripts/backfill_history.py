"""
Script to backfill historical data for all instruments
"""
import sys
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from database.connection import get_db_manager
from database.models import Security
from config.settings import DATABASE_URL
import subprocess

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_all_symbols():
    """Get all active instrument symbols from database"""
    db_manager = get_db_manager(DATABASE_URL)

    with db_manager.get_session() as session:
        securities = session.query(Security).filter(
            Security.is_active == True,
            Security.symbol.isnot(None),
        ).all()
        return [s.symbol for s in securities]


def backfill_history(batch_size=100):
    """
    Backfill historical data for all instruments in batches

    Args:
        batch_size: Number of instruments per batch
    """
    logger.info("="*80)
    logger.info("Starting historical data backfill")
    logger.info("="*80)

    # Get all instruments
    symbols = get_all_symbols()
    logger.info(f"Found {len(symbols)} active instruments")

    if not symbols:
        logger.warning("No instruments found in database. Run instrument_details spider first.")
        return

    # Process in batches
    total_batches = (len(symbols) + batch_size - 1) // batch_size

    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i+batch_size]
        batch_num = (i // batch_size) + 1

        logger.info(f"\nProcessing batch {batch_num}/{total_batches} ({len(batch)} instruments)")

        # Convert batch to comma-separated string
        symbols_str = ','.join(batch)

        # Run spider with batch
        cmd = [
            'python', '-m', 'scrapy', 'crawl', 'history_backfill',
            '-a', f'symbols={symbols_str}'
        ]

        subprocess.run(cmd, cwd=str(project_root))

    logger.info("="*80)
    logger.info("Historical backfill completed!")
    logger.info("="*80)


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Backfill historical price data')
    parser.add_argument(
        '--batch-size',
        type=int,
        default=100,
        help='Number of instruments per batch (default: 100)'
    )

    args = parser.parse_args()

    backfill_history(batch_size=args.batch_size)


if __name__ == '__main__':
    main()
