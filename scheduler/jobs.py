"""
Job definitions for scheduled spider execution
"""

import logging
import os
import subprocess
import sys
import time as _time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# Per-spider timeout overrides (seconds).  Default is 600 (10 min).
SPIDER_TIMEOUTS = {
    "history_backfill": 1800,  # 30 minutes — 500+ securities
    "tick_trades": 1200,  # 20 minutes
    "shareholders": 1200,  # 20 minutes
    "codal_financial": 1200,  # 20 minutes — paginates full search API
    "codal_financials_detail": 1800,  # 30 minutes — batch fetches Excel HTML
}

# Max retry attempts for failed spiders
MAX_SPIDER_RETRIES = 3

# Spider → cache tags mapping for invalidation
SPIDER_CACHE_TAGS = {
    "market_watch": ["market_watch"],
    "instrument_details": ["instrument_details"],
    "options": ["options"],
    "market_indices": ["market_indices"],
    "etf_nav": ["etf_nav"],
    "market_prices": ["market_prices"],
    "ime_options": ["ime_options"],
    "ime_futures": ["ime_futures"],
    "ime_certificates": ["ime_certificates"],
    "ime_funds": ["ime_funds"],
    "ime_forwards": ["ime_forwards"],
    "ime_physical": ["ime_physical"],
    "codal": ["codal"],
    "codal_financial": ["codal"],
    "codal_financials_detail": ["codal"],
}

# Crypto cache tags (invalidated after fetcher jobs)
CRYPTO_CACHE_TAGS = {
    "crypto_ticker": ["crypto_ticker"],
    "crypto_ohlcv": ["crypto_ohlcv"],
    "crypto_global": ["crypto_global"],
}


def _invalidate_cache_for_spider(spider_name):
    """Invalidate cache entries associated with a spider after it completes."""
    try:
        from api.cache import cache_manager

        tags = SPIDER_CACHE_TAGS.get(spider_name, [])
        for tag in tags:
            cache_manager.invalidate_tag(tag)
    except Exception as e:
        logger.debug(f"Cache invalidation failed for {spider_name}: {e}")


def run_spider(spider_name, max_retries=MAX_SPIDER_RETRIES):
    """
    Execute a spider using Scrapy with retry logic.

    Args:
        spider_name: Name of the spider to run
        max_retries: Maximum retry attempts on failure
    """
    logger.info("=" * 80)
    logger.info(f"Starting scheduled job: {spider_name}")
    logger.info(f"Time: {datetime.now(UTC)}")
    logger.info("=" * 80)

    timeout = SPIDER_TIMEOUTS.get(spider_name, 600)

    for attempt in range(1, max_retries + 1):
        try:
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "scrapy",
                    "crawl",
                    spider_name,
                    "-s",
                    "LOG_LEVEL=INFO",
                ],
                cwd=str(PROJECT_ROOT),
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            if result.returncode == 0:
                logger.info(f"Spider {spider_name} completed successfully")
                _invalidate_cache_for_spider(spider_name)
                return True
            else:
                logger.error(
                    f"Spider {spider_name} failed (attempt {attempt}/{max_retries}) "
                    f"with return code {result.returncode}"
                )
                logger.error(f"Error output: {result.stderr[-500:]}")

        except subprocess.TimeoutExpired:
            logger.error(
                f"Spider {spider_name} timed out after {timeout}s "
                f"(attempt {attempt}/{max_retries})"
            )
        except Exception as e:
            logger.error(
                f"Error running spider {spider_name} (attempt {attempt}/{max_retries}): {e}",
                exc_info=True,
            )

        if attempt < max_retries:
            wait = 2**attempt  # exponential backoff: 2s, 4s
            logger.info(f"Retrying {spider_name} in {wait}s...")
            _time.sleep(wait)

    logger.error(f"Spider {spider_name} failed after {max_retries} attempts")
    return False


def _is_trading_hours():
    """Check if currently within Tehran Stock Exchange trading hours"""
    import pytz

    from config.settings import (
        MARKET_CLOSE_HOUR,
        MARKET_CLOSE_MINUTE,
        MARKET_OPEN_HOUR,
        MARKET_OPEN_MINUTE,
        TIMEZONE,
    )

    tz = pytz.timezone(TIMEZONE)
    now = datetime.now(tz)
    market_open = now.replace(
        hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MINUTE, second=0
    )
    market_close = now.replace(
        hour=MARKET_CLOSE_HOUR, minute=MARKET_CLOSE_MINUTE, second=0
    )
    # Tehran trading days: Saturday=5, Sunday=6, Monday=0, Tuesday=1, Wednesday=2
    # Python weekday: Mon=0..Sun=6; Tehran trading: Sat(5), Sun(6), Mon(0), Tue(1), Wed(2)
    is_trading_day = now.weekday() in (5, 6, 0, 1, 2)
    return is_trading_day and market_open <= now <= market_close


def run_market_watch():
    """Run market watch spider (every 2.5 minutes during trading hours)"""
    if _is_trading_hours():
        run_spider("market_watch")
    else:
        logger.debug("Skipping market_watch: outside trading hours")


def run_instrument_details():
    """Run instrument details spider (daily after market close)"""
    run_spider("instrument_details")


def run_historical_backfill():
    """Run historical backfill spider (weekly) - uses BrsApi History.php"""
    logger.info("Starting historical backfill job")
    run_spider("history_backfill")


def run_options():
    """Run options spider (daily during market hours)"""
    if _is_trading_hours():
        run_spider("options")
    else:
        logger.debug("Skipping options: outside trading hours")


def run_market_indices():
    """Run market indices spider (daily during market hours)"""
    if _is_trading_hours():
        run_spider("market_indices")
    else:
        logger.debug("Skipping market_indices: outside trading hours")


def run_etf_nav():
    """Run ETF NAV spider (daily during market hours)"""
    if _is_trading_hours():
        run_spider("etf_nav")
    else:
        logger.debug("Skipping etf_nav: outside trading hours")


def run_market_prices():
    """Run market prices spider (gold/currency/crypto - runs all day)"""
    run_spider("market_prices")


def run_codal():
    """Run Codal announcements spider (daily)"""
    run_spider("codal")


def run_codal_financial():
    """Run Codal financial statements search spider (discovers announcements with Excel)"""
    run_spider("codal_financial")


def run_codal_financials_detail():
    """Run Codal financial detail spider (fetches Excel HTML, parses financial data)"""
    run_spider("codal_financials_detail")


def run_ime_spiders():
    """Run all 6 IME spiders in parallel using a thread pool"""
    spiders = [
        "ime_options",
        "ime_futures",
        "ime_certificates",
        "ime_funds",
        "ime_forwards",
        "ime_physical",
    ]
    logger.info(f"Starting {len(spiders)} IME spiders in parallel")
    with ThreadPoolExecutor(max_workers=len(spiders)) as executor:
        futures = {executor.submit(run_spider, s): s for s in spiders}
        for future in as_completed(futures):
            name = futures[future]
            try:
                success = future.result()
                if not success:
                    logger.error(f"IME spider {name} failed after retries")
            except Exception as e:
                logger.error(f"IME spider {name} raised: {e}", exc_info=True)
    logger.info("All IME spiders finished")


def run_rag_pipeline():
    """Run RAG pipeline: download, extract, chunk, embed new Codal PDFs"""
    logger.info("Starting RAG pipeline job")
    try:
        from config.settings import DATABASE_URL
        from database.connection import get_db_manager
        from rag.pipeline import process_new_documents

        mgr = get_db_manager(DATABASE_URL)
        with mgr.get_session() as session:
            stats = process_new_documents(session)
            logger.info(f"RAG pipeline completed: {stats}")
    except Exception as e:
        logger.error(f"RAG pipeline failed: {e}", exc_info=True)


def cleanup_old_logs():
    """Clean up old log files (keep last 30 days)"""
    logger.info("Running log cleanup job")
    try:
        from datetime import timedelta

        logs_dir = PROJECT_ROOT / "logs"
        cutoff_time = datetime.now(UTC) - timedelta(days=30)

        for log_file in logs_dir.glob("*.log*"):
            if log_file.is_file():
                file_time = datetime.fromtimestamp(log_file.stat().st_mtime, tz=UTC)
                if file_time < cutoff_time:
                    logger.info(f"Deleting old log file: {log_file.name}")
                    log_file.unlink()

    except Exception as e:
        logger.error(f"Error cleaning up logs: {e}", exc_info=True)


def cleanup_old_order_books():
    """Delete order book snapshots older than 7 days."""
    logger.info("Running order book cleanup job")
    try:
        from datetime import timedelta

        from config.settings import DATABASE_URL
        from database.connection import get_db_manager
        from database.models import OrderBook

        cutoff = datetime.now(UTC) - timedelta(days=7)
        mgr = get_db_manager(DATABASE_URL)
        session = mgr.get_scoped_session()
        try:
            deleted = (
                session.query(OrderBook)
                .filter(OrderBook.snapshot_time < cutoff)
                .delete(synchronize_session=False)
            )
            session.commit()
            logger.info(f"Deleted {deleted} old order book snapshots")
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Order book cleanup failed: {e}", exc_info=True)


def _invalidate_crypto_cache(tag_key):
    """Invalidate crypto cache entries after a fetcher job completes."""
    try:
        from api.cache import cache_manager

        tags = CRYPTO_CACHE_TAGS.get(tag_key, [])
        for tag in tags:
            cache_manager.invalidate_tag(tag)
    except Exception as e:
        logger.debug(f"Crypto cache invalidation failed for {tag_key}: {e}")


def run_crypto_ticker():
    """Fetch real-time crypto ticker data (runs 24/7, every 60s)."""
    logger.info("Running crypto ticker fetch")
    try:
        from config.settings import DATABASE_URL
        from database.connection import get_db_manager
        from scheduler.crypto_fetcher import fetch_and_store_tickers

        mgr = get_db_manager(DATABASE_URL)
        with mgr.get_session() as session:
            fetch_and_store_tickers(session)
        _invalidate_crypto_cache("crypto_ticker")
        logger.info("Crypto ticker fetch completed")
    except Exception as e:
        logger.error(f"Crypto ticker fetch failed: {e}", exc_info=True)


def run_crypto_daily_ohlcv():
    """Generate daily OHLCV candles from ticker snapshots (daily at 00:15 UTC)."""
    logger.info("Running crypto daily OHLCV generation")
    try:
        from config.settings import DATABASE_URL
        from database.connection import get_db_manager
        from scheduler.crypto_fetcher import generate_daily_ohlcv_from_tickers

        mgr = get_db_manager(DATABASE_URL)
        with mgr.get_session() as session:
            generate_daily_ohlcv_from_tickers(session)
        _invalidate_crypto_cache("crypto_ohlcv")
        logger.info("Crypto daily OHLCV generation completed")
    except Exception as e:
        logger.error(f"Crypto daily OHLCV failed: {e}", exc_info=True)


def run_crypto_global_metrics():
    """Fetch global crypto metrics (market cap, dominance, fear/greed)."""
    logger.info("Running crypto global metrics fetch")
    try:
        from config.settings import DATABASE_URL
        from database.connection import get_db_manager
        from scheduler.crypto_fetcher import fetch_and_store_global_metrics

        mgr = get_db_manager(DATABASE_URL)
        with mgr.get_session() as session:
            fetch_and_store_global_metrics(session)
        _invalidate_crypto_cache("crypto_global")
        logger.info("Crypto global metrics completed")
    except Exception as e:
        logger.error(f"Crypto global metrics failed: {e}", exc_info=True)


def cleanup_old_crypto_tickers():
    """Delete crypto ticker snapshots older than retention period."""
    logger.info("Running crypto ticker cleanup")
    try:
        from config.settings import CRYPTO_TICKER_RETENTION_HOURS, DATABASE_URL
        from database.connection import get_db_manager
        from scheduler.crypto_fetcher import cleanup_old_tickers

        mgr = get_db_manager(DATABASE_URL)
        with mgr.get_session() as session:
            cleanup_old_tickers(session, CRYPTO_TICKER_RETENTION_HOURS)
        logger.info("Crypto ticker cleanup completed")
    except Exception as e:
        logger.error(f"Crypto ticker cleanup failed: {e}", exc_info=True)


def database_backup():
    """Backup PostgreSQL database (daily) using pg_dump"""
    logger.info("Running database backup job")
    try:
        from config.settings import DATABASE_URL

        data_dir = PROJECT_ROOT / "data"
        backup_dir = data_dir / "backups"
        backup_dir.mkdir(exist_ok=True)

        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"tsetmc_backup_{timestamp}.sql"

        # Parse DATABASE_URL and pass password via PGPASSWORD env var
        parsed_url = urlparse(DATABASE_URL)
        env = os.environ.copy()
        if parsed_url.password:
            env["PGPASSWORD"] = parsed_url.password
        pg_args = ["pg_dump"]
        if parsed_url.hostname:
            pg_args.extend(["-h", parsed_url.hostname])
        if parsed_url.port:
            pg_args.extend(["-p", str(parsed_url.port)])
        if parsed_url.username:
            pg_args.extend(["-U", parsed_url.username])
        db_name = parsed_url.path.lstrip("/")
        if db_name:
            pg_args.extend(["-d", db_name])
        pg_args.extend(["-f", str(backup_file)])

        result = subprocess.run(
            pg_args,
            capture_output=True,
            text=True,
            timeout=300,
            env=env,
        )

        if result.returncode == 0:
            logger.info(f"Database backed up to: {backup_file}")
        else:
            logger.error(f"pg_dump failed: {result.stderr}")

        # Keep only last 7 backups
        backups = sorted(backup_dir.glob("tsetmc_backup_*.sql"))
        if len(backups) > 7:
            for old_backup in backups[:-7]:
                logger.info(f"Deleting old backup: {old_backup.name}")
                old_backup.unlink()

    except Exception as e:
        logger.error(f"Error backing up database: {e}", exc_info=True)
