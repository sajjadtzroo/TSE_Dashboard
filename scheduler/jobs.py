"""
Job definitions for scheduled spider execution
"""
import subprocess
import sys
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
    logger.info("=" * 80)
    logger.info(f"Starting scheduled job: {spider_name}")
    logger.info(f"Time: {datetime.now()}")
    logger.info("=" * 80)

    try:
        result = subprocess.run(
            [sys.executable, '-m', 'scrapy', 'crawl', spider_name, '-s', 'LOG_LEVEL=INFO'],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )

        if result.returncode == 0:
            logger.info(f"Spider {spider_name} completed successfully")
        else:
            logger.error(f"Spider {spider_name} failed with return code {result.returncode}")
            logger.error(f"Error output: {result.stderr[-500:]}")

    except subprocess.TimeoutExpired:
        logger.error(f"Spider {spider_name} timed out after 10 minutes")
    except Exception as e:
        logger.error(f"Error running spider {spider_name}: {e}", exc_info=True)


def _is_trading_hours():
    """Check if currently within Tehran Stock Exchange trading hours"""
    import pytz
    from config.settings import (
        TIMEZONE, MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE,
        MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE
    )
    tz = pytz.timezone(TIMEZONE)
    now = datetime.now(tz)
    market_open = now.replace(hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MINUTE, second=0)
    market_close = now.replace(hour=MARKET_CLOSE_HOUR, minute=MARKET_CLOSE_MINUTE, second=0)
    # Tehran trading days: Saturday=5, Sunday=6, Monday=0, Tuesday=1, Wednesday=2
    # Python weekday: Mon=0..Sun=6; Tehran trading: Sat(5), Sun(6), Mon(0), Tue(1), Wed(2)
    is_trading_day = now.weekday() in (5, 6, 0, 1, 2)
    return is_trading_day and market_open <= now <= market_close


def run_market_watch():
    """Run market watch spider (every 2.5 minutes during trading hours)"""
    if _is_trading_hours():
        run_spider('market_watch')
    else:
        logger.debug("Skipping market_watch: outside trading hours")


def run_instrument_details():
    """Run instrument details spider (daily after market close)"""
    run_spider('instrument_details')


def run_historical_backfill():
    """Run historical backfill spider (weekly) - uses BrsApi History.php"""
    logger.info("Starting historical backfill job")
    run_spider('history_backfill')


def run_options():
    """Run options spider (daily during market hours)"""
    if _is_trading_hours():
        run_spider('options')
    else:
        logger.debug("Skipping options: outside trading hours")


def run_market_indices():
    """Run market indices spider (daily during market hours)"""
    if _is_trading_hours():
        run_spider('market_indices')
    else:
        logger.debug("Skipping market_indices: outside trading hours")


def run_etf_nav():
    """Run ETF NAV spider (daily during market hours)"""
    if _is_trading_hours():
        run_spider('etf_nav')
    else:
        logger.debug("Skipping etf_nav: outside trading hours")


def run_market_prices():
    """Run market prices spider (gold/currency/crypto - runs all day)"""
    run_spider('market_prices')


def run_codal():
    """Run Codal announcements spider (daily)"""
    run_spider('codal')


def run_ime_spiders():
    """Run all IME spiders in sequence"""
    for spider in ['ime_options', 'ime_futures', 'ime_certificates',
                    'ime_funds', 'ime_forwards', 'ime_physical']:
        run_spider(spider)


def cleanup_old_logs():
    """Clean up old log files (keep last 30 days)"""
    logger.info("Running log cleanup job")
    try:
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
    """Backup PostgreSQL database (daily) using pg_dump"""
    logger.info("Running database backup job")
    try:
        from config.settings import DATABASE_URL

        data_dir = PROJECT_ROOT / 'data'
        backup_dir = data_dir / 'backups'
        backup_dir.mkdir(exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = backup_dir / f'tsetmc_backup_{timestamp}.sql'

        result = subprocess.run(
            ['pg_dump', DATABASE_URL, '-f', str(backup_file)],
            capture_output=True, text=True, timeout=300
        )

        if result.returncode == 0:
            logger.info(f"Database backed up to: {backup_file}")
        else:
            logger.error(f"pg_dump failed: {result.stderr}")

        # Keep only last 7 backups
        backups = sorted(backup_dir.glob('tsetmc_backup_*.sql'))
        if len(backups) > 7:
            for old_backup in backups[:-7]:
                logger.info(f"Deleting old backup: {old_backup.name}")
                old_backup.unlink()

    except Exception as e:
        logger.error(f"Error backing up database: {e}", exc_info=True)
