"""
APScheduler configuration for TSETMC scraper
Schedules periodic execution of spiders during trading hours
"""

import logging
import signal
import sys
from datetime import datetime
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
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("logs/scheduler.log")],
)
logger = logging.getLogger(__name__)

# Global scheduler instance (for API access)
_scheduler_instance = None


def get_scheduler():
    """Get the global scheduler instance"""
    return _scheduler_instance


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

        # ── Real-time jobs (run during trading hours) ──

        # 1. Market Watch - Every 2.5 minutes (trading hours checked in job)
        interval_seconds = int(MARKET_WATCH_INTERVAL * 60)
        self.scheduler.add_job(
            run_market_watch,
            trigger=IntervalTrigger(seconds=interval_seconds, timezone=self.timezone),
            id="market_watch",
            name="Market Watch (Real-time Prices)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info(f"  Scheduled: Market Watch - Every {MARKET_WATCH_INTERVAL} min")

        # 2. Options - Every 5 minutes during trading hours
        self.scheduler.add_job(
            run_options,
            trigger=IntervalTrigger(minutes=5, timezone=self.timezone),
            id="options",
            name="Options (TSE Contracts)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: Options - Every 5 min (trading hours)")

        # 3. Market Indices - Every 5 minutes during trading hours
        self.scheduler.add_job(
            run_market_indices,
            trigger=IntervalTrigger(minutes=5, timezone=self.timezone),
            id="market_indices",
            name="Market Indices",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: Market Indices - Every 5 min (trading hours)")

        # 4. ETF NAV - Every 5 minutes during trading hours
        self.scheduler.add_job(
            run_etf_nav,
            trigger=IntervalTrigger(minutes=5, timezone=self.timezone),
            id="etf_nav",
            name="ETF NAV",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: ETF NAV - Every 5 min (trading hours)")

        # ── Daily jobs ──

        # 5. Instrument Details - Daily at 15:00 (after market close)
        self.scheduler.add_job(
            run_instrument_details,
            trigger=CronTrigger(
                day_of_week="sat,sun,mon,tue,wed",
                hour=15,
                minute=0,
                timezone=self.timezone,
            ),
            id="instrument_details",
            name="Instrument Details (Company Metadata)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: Instrument Details - Daily at 15:00 (Sat-Wed)")

        # 6. Market Prices (gold/currency/crypto) - Twice daily
        self.scheduler.add_job(
            run_market_prices,
            trigger=CronTrigger(hour="10,18", minute=0, timezone=self.timezone),
            id="market_prices",
            name="Market Prices (Gold/Currency/Crypto)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: Market Prices - Daily at 10:00 & 18:00")

        # 7. Codal Announcements - Twice daily
        self.scheduler.add_job(
            run_codal,
            trigger=CronTrigger(hour="13,20", minute=0, timezone=self.timezone),
            id="codal",
            name="Codal Announcements",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: Codal - Daily at 13:00 & 20:00")

        # 7b. Codal Financial Statements Search - Daily at 13:30 & 20:30
        self.scheduler.add_job(
            run_codal_financial,
            trigger=CronTrigger(hour="13,20", minute=30, timezone=self.timezone),
            id="codal_financial",
            name="Codal Financial Statements Search",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: Codal Financial Search - Daily at 13:30 & 20:30")

        # 7c. Codal Financial Detail (Excel parse) - Daily at 14:30
        #     Runs after codal_financial has populated unprocessed announcements.
        #     RAG pipeline at 21:00 will then embed any new PDFs.
        self.scheduler.add_job(
            run_codal_financials_detail,
            trigger=CronTrigger(hour=14, minute=30, timezone=self.timezone),
            id="codal_financials_detail",
            name="Codal Financial Detail (Excel Parse)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: Codal Financial Detail - Daily at 14:30")

        # 8. IME Spiders (all 6) - Daily at 16:00
        self.scheduler.add_job(
            run_ime_spiders,
            trigger=CronTrigger(
                day_of_week="sat,sun,mon,tue,wed",
                hour=16,
                minute=0,
                timezone=self.timezone,
            ),
            id="ime_spiders",
            name="IME Spiders (Options/Futures/Certificates/Funds/Forwards/Physical)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: IME Spiders - Daily at 16:00 (Sat-Wed)")

        # 9. RAG Pipeline - Daily at 21:00 (after Codal spider at 13:00/20:00)
        self.scheduler.add_job(
            run_rag_pipeline,
            trigger=CronTrigger(hour=21, minute=0, timezone=self.timezone),
            id="rag_pipeline",
            name="RAG Pipeline (PDF Download/Embed)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: RAG Pipeline - Daily at 21:00")

        # ── Crypto jobs (behind ENABLE_CRYPTO flag) ──

        from config.settings import ENABLE_CRYPTO

        if ENABLE_CRYPTO:
            from config.settings import CRYPTO_TICKER_INTERVAL

            # Crypto Ticker - Every 5min (300s), 24/7
            self.scheduler.add_job(
                run_crypto_ticker,
                trigger=IntervalTrigger(
                    seconds=CRYPTO_TICKER_INTERVAL, timezone=self.timezone
                ),
                id="crypto_ticker",
                name="Crypto Ticker (CMC, 24/7)",
                replace_existing=True,
                max_instances=1,
            )
            logger.info(
                f"  Scheduled: Crypto Ticker - Every {CRYPTO_TICKER_INTERVAL}s (24/7)"
            )

            # Crypto Daily OHLCV - Daily at 00:15 UTC
            self.scheduler.add_job(
                run_crypto_daily_ohlcv,
                trigger=CronTrigger(hour=0, minute=15, timezone="UTC"),
                id="crypto_daily_ohlcv",
                name="Crypto Daily OHLCV (from tickers)",
                replace_existing=True,
                max_instances=1,
            )
            logger.info("  Scheduled: Crypto OHLCV - Daily at 00:15 UTC")

            # Crypto Global Metrics - Twice daily at 06:00 & 18:00 UTC
            self.scheduler.add_job(
                run_crypto_global_metrics,
                trigger=CronTrigger(hour="6,18", minute=0, timezone="UTC"),
                id="crypto_global_metrics",
                name="Crypto Global Metrics (2x/day)",
                replace_existing=True,
                max_instances=1,
            )
            logger.info("  Scheduled: Crypto Global Metrics - 06:00 & 18:00 UTC")

            # Crypto Ticker Cleanup - Daily at 03:00 Tehran
            self.scheduler.add_job(
                cleanup_old_crypto_tickers,
                trigger=CronTrigger(hour=3, minute=0, timezone=self.timezone),
                id="crypto_ticker_cleanup",
                name="Crypto Ticker Cleanup (48h retention)",
                replace_existing=True,
                max_instances=1,
            )
            logger.info("  Scheduled: Crypto Ticker Cleanup - Daily at 03:00")
        else:
            logger.info("  Skipped: Crypto jobs (ENABLE_CRYPTO=false)")

        # ── Weekly jobs ──

        # 10. Historical Backfill - Weekly on Saturday at 02:00
        self.scheduler.add_job(
            run_historical_backfill,
            trigger=CronTrigger(
                day_of_week="sat", hour=2, minute=0, timezone=self.timezone
            ),
            id="historical_backfill",
            name="Historical Backfill (Weekly)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: Historical Backfill - Weekly on Saturday at 02:00")

        # ── Maintenance jobs ──

        # 10. Database Backup - Daily at 01:00
        self.scheduler.add_job(
            database_backup,
            trigger=CronTrigger(hour=1, minute=0, timezone=self.timezone),
            id="database_backup",
            name="Database Backup (Daily)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: Database Backup - Daily at 01:00")

        # 12. Order Book Cleanup - Daily at 02:30
        self.scheduler.add_job(
            cleanup_old_order_books,
            trigger=CronTrigger(hour=2, minute=30, timezone=self.timezone),
            id="cleanup_order_books",
            name="Order Book Cleanup (Daily, 7-day retention)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: Order Book Cleanup - Daily at 02:30")

        # 13. Log Cleanup - Weekly on Friday at 03:00
        self.scheduler.add_job(
            cleanup_old_logs,
            trigger=CronTrigger(
                day_of_week="fri", hour=3, minute=0, timezone=self.timezone
            ),
            id="log_cleanup",
            name="Log Cleanup (Weekly)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info("  Scheduled: Log Cleanup - Weekly on Friday at 03:00")

        logger.info("=" * 80)
        logger.info(
            f"All {len(self.scheduler.get_jobs())} jobs scheduled successfully!"
        )
        logger.info("=" * 80)

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

    def job_listener(self, event):
        """Listen to job execution events"""
        if event.exception:
            logger.error(f"Job {event.job_id} failed with exception: {event.exception}")
        else:
            logger.info(f"Job {event.job_id} executed successfully")

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

    logger.info("Scheduler is running. Press Ctrl+C to exit.\n")
    try:
        scheduler.scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("\nShutting down scheduler...")
        scheduler.scheduler.shutdown()
        logger.info("Scheduler stopped.")


if __name__ == "__main__":
    main()
