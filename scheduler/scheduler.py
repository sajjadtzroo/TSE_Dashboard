"""
APScheduler configuration for TSETMC scraper
Schedules periodic execution of spiders during trading hours
"""

import logging
import signal
import sys
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import pytz
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from config.settings import (
    MARKET_CLOSE_HOUR,
    MARKET_CLOSE_MINUTE,
    MARKET_OPEN_HOUR,
    MARKET_OPEN_MINUTE,
    MARKET_WATCH_INTERVAL,
    SCHEDULER_ENABLED,
    TIMEZONE,
)
from scheduler.jobs import (
    cleanup_old_crypto_tickers,
    cleanup_old_logs,
    cleanup_old_order_books,
    database_backup,
    run_codal,
    run_codal_financial,
    run_codal_financials_detail,
    run_crypto_daily_ohlcv,
    run_crypto_global_metrics,
    run_crypto_ticker,
    run_etf_nav,
    run_historical_backfill,
    run_ime_spiders,
    run_instrument_details,
    run_market_indices,
    run_market_prices,
    run_market_watch,
    run_options,
    run_rag_pipeline,
    run_telegram_dollar,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        RotatingFileHandler("logs/scheduler.log", maxBytes=10 * 1024 * 1024, backupCount=5),
    ],
)
logger = logging.getLogger(__name__)

# Global scheduler instance (for API access)
_scheduler_instance = None


def get_scheduler():
    """Get the global scheduler instance"""
    return _scheduler_instance


def _build_job_defs(tz):
    """Build the list of all scheduled job definitions.

    Each entry is a dict with: id, name, func, trigger, and optional enabled flag.
    """
    from config.settings import CRYPTO_TICKER_INTERVAL, ENABLE_CRYPTO

    interval_seconds = int(MARKET_WATCH_INTERVAL * 60)

    jobs = [
        # ── Dollar rate (24/7 — dollar market doesn't follow TSE hours) ──
        {
            "id": "telegram_dollar",
            "name": "Dollar Rate (Telegram Feed)",
            "func": run_telegram_dollar,
            "trigger": IntervalTrigger(seconds=60, timezone=tz),
            "log": "Dollar Rate - Every 60 s (24/7)",
        },
        # ── Real-time jobs (run during trading hours) ──
        {
            "id": "market_watch",
            "name": "Market Watch (Real-time Prices)",
            "func": run_market_watch,
            "trigger": IntervalTrigger(seconds=interval_seconds, timezone=tz),
            "log": f"Market Watch - Every {MARKET_WATCH_INTERVAL} min",
        },
        {
            "id": "options",
            "name": "Options (TSE Contracts)",
            "func": run_options,
            "trigger": IntervalTrigger(minutes=5, timezone=tz),
            "log": "Options - Every 5 min (trading hours)",
        },
        {
            "id": "market_indices",
            "name": "Market Indices",
            "func": run_market_indices,
            "trigger": IntervalTrigger(minutes=5, timezone=tz),
            "log": "Market Indices - Every 5 min (trading hours)",
        },
        {
            "id": "etf_nav",
            "name": "ETF NAV",
            "func": run_etf_nav,
            "trigger": IntervalTrigger(minutes=5, timezone=tz),
            "log": "ETF NAV - Every 5 min (trading hours)",
        },
        # ── Daily jobs ──
        {
            "id": "instrument_details",
            "name": "Instrument Details (Company Metadata)",
            "func": run_instrument_details,
            "trigger": CronTrigger(
                day_of_week="sat,sun,mon,tue,wed", hour=15, minute=0, timezone=tz
            ),
            "log": "Instrument Details - Daily at 15:00 (Sat-Wed)",
        },
        {
            "id": "market_prices",
            "name": "Market Prices (Gold/Currency/Crypto)",
            "func": run_market_prices,
            "trigger": CronTrigger(hour="10,18", minute=0, timezone=tz),
            "log": "Market Prices - Daily at 10:00 & 18:00",
        },
        {
            "id": "codal",
            "name": "Codal Announcements",
            "func": run_codal,
            "trigger": CronTrigger(hour="13,20", minute=0, timezone=tz),
            "log": "Codal - Daily at 13:00 & 20:00",
        },
        {
            "id": "codal_financial",
            "name": "Codal Financial Statements Search",
            "func": run_codal_financial,
            "trigger": CronTrigger(hour="13,20", minute=30, timezone=tz),
            "log": "Codal Financial Search - Daily at 13:30 & 20:30",
        },
        {
            "id": "codal_financials_detail",
            "name": "Codal Financial Detail (Excel Parse)",
            "func": run_codal_financials_detail,
            "trigger": CronTrigger(hour="14,22", minute=30, timezone=tz),
            "log": "Codal Financial Detail - Daily at 14:30 & 22:30",
        },
        {
            "id": "ime_spiders",
            "name": "IME Spiders (Options/Futures/Certificates/Funds/Forwards/Physical)",
            "func": run_ime_spiders,
            "trigger": CronTrigger(
                day_of_week="sat,sun,mon,tue,wed", hour=16, minute=0, timezone=tz
            ),
            "log": "IME Spiders - Daily at 16:00 (Sat-Wed)",
        },
        {
            "id": "rag_pipeline",
            "name": "RAG Pipeline (PDF Download/Embed)",
            "func": run_rag_pipeline,
            "trigger": CronTrigger(hour="14,21", minute=0, timezone=tz),
            "log": "RAG Pipeline - Daily at 14:00 & 21:00",
        },
        # ── Crypto jobs (behind ENABLE_CRYPTO flag) ──
        {
            "id": "crypto_ticker",
            "name": "Crypto Ticker (CMC, 24/7)",
            "func": run_crypto_ticker,
            "trigger": IntervalTrigger(seconds=CRYPTO_TICKER_INTERVAL, timezone=tz),
            "log": f"Crypto Ticker - Every {CRYPTO_TICKER_INTERVAL}s (24/7)",
            "enabled": ENABLE_CRYPTO,
        },
        {
            "id": "crypto_daily_ohlcv",
            "name": "Crypto Daily OHLCV (from tickers)",
            "func": run_crypto_daily_ohlcv,
            "trigger": CronTrigger(hour=0, minute=15, timezone="UTC"),
            "log": "Crypto OHLCV - Daily at 00:15 UTC",
            "enabled": ENABLE_CRYPTO,
        },
        {
            "id": "crypto_global_metrics",
            "name": "Crypto Global Metrics (2x/day)",
            "func": run_crypto_global_metrics,
            "trigger": CronTrigger(hour="6,18", minute=0, timezone="UTC"),
            "log": "Crypto Global Metrics - 06:00 & 18:00 UTC",
            "enabled": ENABLE_CRYPTO,
        },
        {
            "id": "crypto_ticker_cleanup",
            "name": "Crypto Ticker Cleanup (48h retention)",
            "func": cleanup_old_crypto_tickers,
            "trigger": CronTrigger(hour=3, minute=0, timezone=tz),
            "log": "Crypto Ticker Cleanup - Daily at 03:00",
            "enabled": ENABLE_CRYPTO,
        },
        # ── Weekly jobs ──
        {
            "id": "historical_backfill",
            "name": "Historical Backfill (Weekly)",
            "func": run_historical_backfill,
            "trigger": CronTrigger(
                day_of_week="sat", hour=2, minute=0, timezone=tz
            ),
            "log": "Historical Backfill - Weekly on Saturday at 02:00",
        },
        # ── Maintenance jobs ──
        {
            "id": "database_backup",
            "name": "Database Backup (Daily)",
            "func": database_backup,
            "trigger": CronTrigger(hour=1, minute=0, timezone=tz),
            "log": "Database Backup - Daily at 01:00",
        },
        {
            "id": "cleanup_order_books",
            "name": "Order Book Cleanup (Daily, 7-day retention)",
            "func": cleanup_old_order_books,
            "trigger": CronTrigger(hour=2, minute=30, timezone=tz),
            "log": "Order Book Cleanup - Daily at 02:30",
        },
        {
            "id": "log_cleanup",
            "name": "Log Cleanup (Weekly)",
            "func": cleanup_old_logs,
            "trigger": CronTrigger(
                day_of_week="fri", hour=3, minute=0, timezone=tz
            ),
            "log": "Log Cleanup - Weekly on Friday at 03:00",
        },
    ]
    return jobs


class TSETMCScheduler:
    """Scheduler for TSETMC scraper jobs"""

    def __init__(self, blocking=True):
        """Initialize scheduler"""
        global _scheduler_instance
        self.timezone = pytz.timezone(TIMEZONE)
        # Use BackgroundScheduler so it doesn't block the FastAPI event loop
        self.scheduler = BackgroundScheduler(timezone=self.timezone)
        self.scheduler.add_listener(
            self.job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR
        )
        _scheduler_instance = self

    def setup_jobs(self):
        """Configure all scheduled jobs"""
        logger.info("=" * 80)
        logger.info("Setting up TSETMC Scheduler")
        logger.info(f"Timezone: {TIMEZONE}")
        logger.info(
            f"Trading hours: {MARKET_OPEN_HOUR:02d}:{MARKET_OPEN_MINUTE:02d} - "
            f"{MARKET_CLOSE_HOUR:02d}:{MARKET_CLOSE_MINUTE:02d}"
        )
        logger.info("=" * 80)

        skipped_crypto = False
        for job_def in _build_job_defs(self.timezone):
            if not job_def.get("enabled", True):
                skipped_crypto = True
                continue

            self.scheduler.add_job(
                job_def["func"],
                trigger=job_def["trigger"],
                id=job_def["id"],
                name=job_def["name"],
                replace_existing=True,
                max_instances=1,
            )
            logger.info(f"  Scheduled: {job_def['log']}")

        if skipped_crypto:
            logger.info("  Skipped: Crypto jobs (ENABLE_CRYPTO=false)")

        logger.info("=" * 80)
        logger.info(
            f"All {len(self.scheduler.get_jobs())} jobs scheduled successfully!"
        )
        logger.info("=" * 80)
        self._publish_status()

    def get_status(self):
        """Return scheduler status as dict (for API)"""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append(
                {
                    "id": job.id,
                    "name": job.name,
                    "next_run": str(job.next_run_time) if job.next_run_time else None,
                    "trigger": str(job.trigger),
                }
            )
        return {
            "running": self.scheduler.running,
            "timezone": str(self.timezone),
            "job_count": len(jobs),
            "jobs": jobs,
        }

    def _publish_status(self):
        """Write current status to Redis so the API container can read it."""
        try:
            import json
            import redis as _redis
            from config.settings import REDIS_URL
            r = _redis.Redis.from_url(REDIS_URL, socket_connect_timeout=2)
            # Use live jobs if scheduler is running, else fall back to job definitions
            if self.scheduler.running:
                jobs = []
                for job in self.scheduler.get_jobs():
                    try:
                        jobs.append({
                            "id": job.id,
                            "name": job.name,
                            "next_run": str(job.next_run_time) if job.next_run_time else None,
                            "trigger": str(job.trigger),
                        })
                    except Exception:
                        pass
            else:
                jobs = [
                    {"id": d["id"], "name": d["name"], "next_run": None, "trigger": str(d["trigger"])}
                    for d in _build_job_defs(self.timezone)
                    if d.get("enabled", True)
                ]
            status = {
                "running": self.scheduler.running,
                "timezone": str(self.timezone),
                "job_count": len(jobs),
                "jobs": jobs,
            }
            r.set("scheduler:status", json.dumps(status), ex=3600)
            logger.info(f"Published scheduler status to Redis: {len(jobs)} jobs")
        except Exception as e:
            logger.warning(f"Failed to publish scheduler status to Redis: {e}")

    def job_listener(self, event):
        """Listen to job execution events and touch heartbeat file"""
        if event.exception:
            logger.error(f"Job {event.job_id} failed with exception: {event.exception}")
        else:
            logger.info(f"Job {event.job_id} executed successfully")
        # Touch heartbeat file for Docker health check
        try:
            Path("logs/scheduler.heartbeat").touch()
        except OSError:
            pass
        self._publish_status()

    def start(self):
        """Start the scheduler"""
        if not SCHEDULER_ENABLED:
            logger.warning("Scheduler is disabled in configuration")
            return

        logger.info("Starting TSETMC Scheduler")
        logger.info(f"Current time: {datetime.now(self.timezone)}")

        self.scheduler.start()
        logger.info("Scheduler is running.")

    def shutdown(self, signum=None, frame=None):
        """Gracefully shutdown scheduler"""
        logger.info("Received shutdown signal")
        if self.scheduler.running:
            self.scheduler.shutdown()
        if signum:
            sys.exit(0)


def main():
    """Main entry point (standalone mode)"""
    from apscheduler.schedulers.blocking import BlockingScheduler

    scheduler = TSETMCScheduler()
    # Replace with blocking scheduler for standalone mode
    scheduler.scheduler = BlockingScheduler(timezone=scheduler.timezone)
    scheduler.scheduler.add_listener(
        scheduler.job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR
    )

    signal.signal(signal.SIGINT, scheduler.shutdown)
    signal.signal(signal.SIGTERM, scheduler.shutdown)

    scheduler.setup_jobs()

    # Touch initial heartbeat for Docker health check
    try:
        Path("logs/scheduler.heartbeat").touch()
    except OSError:
        pass

    logger.info("Scheduler is running. Press Ctrl+C to exit.\n")
    try:
        scheduler.scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("\nShutting down scheduler...")
        scheduler.scheduler.shutdown()
        logger.info("Scheduler stopped.")


if __name__ == "__main__":
    main()
