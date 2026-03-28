"""
Job definitions for scheduled spider execution
"""

import gzip
import logging
import os
import shutil
import subprocess
import sys
import time as _time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

from config.spiders import CRYPTO_CACHE_TAGS, SPIDER_CACHE_TAGS, SPIDER_TIMEOUTS

logger = logging.getLogger(__name__)

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# Max retry attempts for failed spiders
MAX_SPIDER_RETRIES = 3

# Spiders that run too frequently to back up after every run.
# All other spiders trigger a compressed snapshot after success.
NO_SNAPSHOT_SPIDERS = {"market_watch", "telegram_dollar", "estjt_gold"}

# How many per-spider snapshots to keep on disk
SNAPSHOT_RETENTION = 30


def _find_pg_dump() -> str:
    """Return the path to pg_dump, searching common Windows install locations if not in PATH."""
    import shutil

    # Check PATH first
    found = shutil.which("pg_dump")
    if found:
        return found

    # Windows: check all PostgreSQL versions under Program Files
    import glob as _glob

    patterns = [
        r"C:\Program Files\PostgreSQL\*\bin\pg_dump.exe",
        r"C:\Program Files (x86)\PostgreSQL\*\bin\pg_dump.exe",
    ]
    candidates = []
    for pat in patterns:
        candidates.extend(_glob.glob(pat))
    if candidates:
        # Pick highest version (sort lexicographically — works for 10+)
        return sorted(candidates)[-1]

    raise FileNotFoundError(
        "pg_dump not found in PATH or standard PostgreSQL install locations. "
        "Add PostgreSQL bin directory to PATH."
    )


def _invalidate_cache(tags: list[str]):
    """Invalidate cache entries for the given tags."""
    try:
        from api.cache import cache_manager

        for tag in tags:
            cache_manager.invalidate_tag(tag)
    except Exception as e:
        logger.debug(f"Cache invalidation failed for {tags}: {e}")


def spider_snapshot(spider_name: str) -> None:
    """
    Create a compressed pg_dump snapshot tagged with the spider name and timestamp.
    Stored in data/backups/snapshots/ as <spider>_<YYYYMMDD_HHMMSS>.sql.gz.
    Keeps the last SNAPSHOT_RETENTION files per spider.
    """
    try:
        from config.settings import DATABASE_URL

        snapshot_dir = PROJECT_ROOT / "data" / "backups" / "snapshots"
        snapshot_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        sql_file = snapshot_dir / f"{spider_name}_{timestamp}.sql"
        gz_file = snapshot_dir / f"{spider_name}_{timestamp}.sql.gz"

        parsed_url = urlparse(DATABASE_URL)
        env = os.environ.copy()
        if parsed_url.password:
            from urllib.parse import unquote
            env["PGPASSWORD"] = unquote(parsed_url.password)

        pg_args = [_find_pg_dump()]
        if parsed_url.hostname:
            pg_args.extend(["-h", parsed_url.hostname])
        if parsed_url.port:
            pg_args.extend(["-p", str(parsed_url.port)])
        if parsed_url.username:
            pg_args.extend(["-U", parsed_url.username])
        db_name = parsed_url.path.lstrip("/")
        if db_name:
            pg_args.extend(["-d", db_name])
        pg_args.extend(["-f", str(sql_file)])

        result = subprocess.run(
            pg_args,
            capture_output=True,
            text=True,
            timeout=300,
            env=env,
        )

        if result.returncode != 0:
            logger.error(f"Snapshot pg_dump failed for {spider_name}: {result.stderr}")
            sql_file.unlink(missing_ok=True)
            return

        # Compress in-place
        with sql_file.open("rb") as f_in, gzip.open(gz_file, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
        sql_file.unlink()

        logger.info(f"Snapshot saved: {gz_file.name} ({gz_file.stat().st_size // 1024} KB)")

        # Rotate: keep only the last SNAPSHOT_RETENTION snapshots for this spider
        existing = sorted(snapshot_dir.glob(f"{spider_name}_*.sql.gz"))
        for old in existing[:-SNAPSHOT_RETENTION]:
            old.unlink()
            logger.debug(f"Rotated old snapshot: {old.name}")

    except Exception as e:
        logger.error(f"spider_snapshot failed for {spider_name}: {e}", exc_info=True)


def run_spider(spider_name, max_retries=MAX_SPIDER_RETRIES, spider_args=None):
    """
    Execute a spider using Scrapy with retry logic.

    Args:
        spider_name: Name of the spider to run
        max_retries: Maximum retry attempts on failure
        spider_args: Optional dict of spider arguments passed as -a key=value
    """
    logger.info("=" * 80)
    logger.info(f"Starting scheduled job: {spider_name}")
    logger.info(f"Time: {datetime.now(UTC)}")
    logger.info("=" * 80)

    timeout = SPIDER_TIMEOUTS.get(spider_name, 600)

    for attempt in range(1, max_retries + 1):
        try:
            cmd = [
                    sys.executable,
                    "-m",
                    "scrapy",
                    "crawl",
                    spider_name,
                    "-s",
                    "LOG_LEVEL=INFO",
                ]
            if spider_args:
                for k, v in spider_args.items():
                    cmd.extend(["-a", f"{k}={v}"])
            result = subprocess.run(
                cmd,
                cwd=str(PROJECT_ROOT),
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            if result.returncode == 0:
                logger.info(f"Spider {spider_name} completed successfully")
                _invalidate_cache(SPIDER_CACHE_TAGS.get(spider_name, []))
                if spider_name not in NO_SNAPSHOT_SPIDERS:
                    spider_snapshot(spider_name)
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


# ── Spider job factories ──────────────────────────────────────────────────────


def _make_spider_job(spider_name, check_trading_hours=False, spider_args=None):
    """Create a job function that runs a spider, optionally checking trading hours."""

    def job():
        if check_trading_hours and not _is_trading_hours():
            logger.debug(f"Skipping {spider_name}: outside trading hours")
            return
        run_spider(spider_name, spider_args=spider_args)

    job.__name__ = f"run_{spider_name}"
    job.__doc__ = f"Run {spider_name} spider"
    return job


run_market_watch = _make_spider_job("market_watch", check_trading_hours=True)
run_telegram_dollar = _make_spider_job("telegram_dollar")  # 24/7 — dollar trades outside TSE hours
run_estjt_gold = _make_spider_job("estjt_gold")             # 24/7 — gold/coin prices from estjt.ir
run_options = _make_spider_job("options", check_trading_hours=True)
run_market_indices = _make_spider_job("market_indices", check_trading_hours=True)
run_etf_nav = _make_spider_job("etf_nav", check_trading_hours=True)
run_instrument_details = _make_spider_job("instrument_details")
run_market_prices = _make_spider_job("market_prices")
run_codal = _make_spider_job("codal")
run_codal_financial = _make_spider_job("codal_financial")
run_codal_financials_detail = _make_spider_job("codal_financials_detail", spider_args={"batch_size": "2000"})


def run_historical_backfill():
    """Run historical backfill spider (weekly) - uses BrsApi History.php"""
    logger.info("Starting historical backfill job")
    run_spider("history_backfill")


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


# ── Crypto job factories ──────────────────────────────────────────────────────


def _make_crypto_job(fetch_fn_path: str, cache_tag: str, label: str):
    """Create a job function that runs a crypto fetcher and invalidates its cache tag."""

    def job():
        logger.info(f"Running {label}")
        try:
            from config.settings import DATABASE_URL
            from database.connection import get_db_manager

            # Import the fetch function dynamically from scheduler.crypto_fetcher
            import importlib
            mod = importlib.import_module("scheduler.crypto_fetcher")
            fetch_fn = getattr(mod, fetch_fn_path)

            mgr = get_db_manager(DATABASE_URL)
            with mgr.get_session() as session:
                fetch_fn(session)
            _invalidate_cache(CRYPTO_CACHE_TAGS.get(cache_tag, []))
            logger.info(f"{label} completed")
        except Exception as e:
            logger.error(f"{label} failed: {e}", exc_info=True)

    job.__name__ = f"run_{cache_tag}"
    job.__doc__ = label
    return job


run_crypto_ticker = _make_crypto_job(
    "fetch_and_store_tickers", "crypto_ticker", "crypto ticker fetch"
)
run_crypto_daily_ohlcv = _make_crypto_job(
    "generate_daily_ohlcv_from_tickers", "crypto_ohlcv", "crypto daily OHLCV generation"
)
run_crypto_global_metrics = _make_crypto_job(
    "fetch_and_store_global_metrics", "crypto_global", "crypto global metrics fetch"
)


# ── Commodity job factories ──────────────────────────────────────────────────


def _make_commodity_job(fetch_fn_path: str, cache_tag: str, label: str):
    """Create a job function that runs a commodity fetcher and invalidates its cache tag."""

    def job():
        logger.info(f"Running {label}")
        try:
            from config.settings import DATABASE_URL
            from config.spiders import COMMODITY_CACHE_TAGS
            from database.connection import get_db_manager

            import importlib
            mod = importlib.import_module("scheduler.commodity_fetcher")
            fetch_fn = getattr(mod, fetch_fn_path)

            mgr = get_db_manager(DATABASE_URL)
            with mgr.get_session() as session:
                fetch_fn(session)
            _invalidate_cache(COMMODITY_CACHE_TAGS.get(cache_tag, []))
            logger.info(f"{label} completed")
        except Exception as e:
            logger.error(f"{label} failed: {e}", exc_info=True)

    job.__name__ = f"run_commodity_{cache_tag}"
    job.__doc__ = label
    return job


run_commodity_prices = _make_commodity_job(
    "fetch_and_store_prices", "commodity_prices", "commodity price fetch"
)
run_commodity_history = _make_commodity_job(
    "fetch_and_store_history", "commodity_history", "commodity OHLCV history fetch"
)


def cleanup_old_commodity_prices():
    """Delete old commodity price snapshots (keep last 48h)."""
    logger.info("Running commodity price cleanup")
    try:
        from config.settings import DATABASE_URL
        from database.connection import get_db_manager

        from scheduler.commodity_fetcher import cleanup_old_prices

        mgr = get_db_manager(DATABASE_URL)
        with mgr.get_session() as session:
            cleanup_old_prices(session)
    except Exception as e:
        logger.error(f"Commodity price cleanup failed: {e}", exc_info=True)


# ── News job factories ───────────────────────────────────────────────────────


def _make_news_job(fetch_fn_name: str, cache_tag: str, label: str):
    """Create a job function that runs a news fetcher and invalidates its cache tag."""

    def job():
        logger.info(f"Running {label}")
        try:
            from config.settings import DATABASE_URL
            from config.spiders import NEWS_CACHE_TAGS
            from database.connection import get_db_manager

            import importlib
            mod = importlib.import_module("services.news_fetchers")
            fetch_fn = getattr(mod, fetch_fn_name)

            mgr = get_db_manager(DATABASE_URL)
            with mgr.get_session() as session:
                fetch_fn(session)
            _invalidate_cache(NEWS_CACHE_TAGS.get(cache_tag, []))
            logger.info(f"{label} completed")
        except Exception as e:
            logger.error(f"{label} failed: {e}", exc_info=True)

    job.__name__ = f"run_news_{cache_tag}"
    job.__doc__ = label
    return job


run_news_rss = _make_news_job(
    "fetch_rss_feeds", "news_rss", "news RSS feed fetch"
)
run_news_cryptopanic = _make_news_job(
    "fetch_cryptopanic_news", "news_cryptopanic", "news CryptoPanic fetch"
)
run_news_newsapi = _make_news_job(
    "fetch_newsapi_headlines", "news_newsapi", "news NewsAPI fetch"
)
run_news_enrich = _make_news_job(
    "enrich_pending_articles", "news_enrich", "news AI enrichment"
)


# ── Maintenance jobs ──────────────────────────────────────────────────────────


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
            from urllib.parse import unquote
            env["PGPASSWORD"] = unquote(parsed_url.password)
        pg_args = [_find_pg_dump()]
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
