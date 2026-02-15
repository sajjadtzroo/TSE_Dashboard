"""
Job definitions for scheduled spider execution
"""
import subprocess
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent


def run_spider(spider_name):
    """
    Execute a spider using Scrapy

    Args:
        spider_name: Name of the spider to run
    """
    logger.info("="*80)
    logger.info(f"Starting scheduled job: {spider_name}")
    logger.info(f"Time: {datetime.now()}")
    logger.info("="*80)

    try:
        # Run spider using python -m scrapy
        result = subprocess.run(
            ['python', '-m', 'scrapy', 'crawl', spider_name],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )

        if result.returncode == 0:
            logger.info(f"Spider {spider_name} completed successfully")
        else:
            logger.error(f"Spider {spider_name} failed with return code {result.returncode}")
            logger.error(f"Error output: {result.stderr}")

    except subprocess.TimeoutExpired:
        logger.error(f"Spider {spider_name} timed out after 10 minutes")
    except Exception as e:
        logger.error(f"Error running spider {spider_name}: {e}", exc_info=True)


def run_market_watch():
    """Run market watch spider (every 2.5 minutes during trading hours)"""
    import pytz
    from config.settings import (
        TIMEZONE, MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE,
        MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE
    )
    tz = pytz.timezone(TIMEZONE)
    now = datetime.now(tz)
    market_open = now.replace(hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MINUTE, second=0)
    market_close = now.replace(hour=MARKET_CLOSE_HOUR, minute=MARKET_CLOSE_MINUTE, second=0)
    if now.weekday() in (6, 0, 1, 2) and market_open <= now <= market_close:
        run_spider('market_watch')
    else:
        logger.debug("Skipping market_watch: outside trading hours")


def run_instrument_details():
    """Run instrument details spider (daily)"""
    run_spider('instrument_details')


def run_historical_backfill():
    """Run historical prices spider (weekly)"""
    logger.info("Starting historical backfill job")
    run_spider('historical_prices')


def cleanup_old_logs():
    """Clean up old log files (keep last 30 days)"""
    logger.info("Running log cleanup job")
    try:
        import os
        from datetime import timedelta

        logs_dir = PROJECT_ROOT / 'logs'
        cutoff_time = datetime.now() - timedelta(days=30)

        for log_file in logs_dir.glob('*.log*'):
            if log_file.is_file():
                file_time = datetime.fromtimestamp(log_file.stat().st_mtime)
                if file_time < cutoff_time:
                    logger.info(f"Deleting old log file: {log_file.name}")
                    log_file.unlink()

    except Exception as e:
        logger.error(f"Error cleaning up logs: {e}", exc_info=True)


def database_backup():
    """Backup database (daily)"""
    logger.info("Running database backup job")
    try:
        import shutil
        from datetime import datetime

        data_dir = PROJECT_ROOT / 'data'
        backup_dir = data_dir / 'backups'
        backup_dir.mkdir(exist_ok=True)

        db_file = data_dir / 'tsetmc.db'
        if db_file.exists():
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_file = backup_dir / f'tsetmc_backup_{timestamp}.db'

            shutil.copy2(db_file, backup_file)
            logger.info(f"Database backed up to: {backup_file}")

            # Keep only last 7 backups
            backups = sorted(backup_dir.glob('tsetmc_backup_*.db'))
            if len(backups) > 7:
                for old_backup in backups[:-7]:
                    logger.info(f"Deleting old backup: {old_backup.name}")
                    old_backup.unlink()

    except Exception as e:
        logger.error(f"Error backing up database: {e}", exc_info=True)
