"""
APScheduler configuration for TSETMC scraper
Schedules periodic execution of spiders during trading hours
"""
import logging
import signal
import sys
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
import pytz

from config.settings import (
    TIMEZONE, SCHEDULER_ENABLED,
    MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE,
    MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE,
    MARKET_WATCH_INTERVAL, INSTRUMENT_DETAILS_INTERVAL
)
from scheduler.jobs import (
    run_market_watch, run_instrument_details, run_historical_backfill,
    cleanup_old_logs, database_backup
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/scheduler.log')
    ]
)
logger = logging.getLogger(__name__)


class TSETMCScheduler:
    """Scheduler for TSETMC scraper jobs"""

    def __init__(self):
        """Initialize scheduler"""
        self.timezone = pytz.timezone(TIMEZONE)
        self.scheduler = BlockingScheduler(timezone=self.timezone)
        self.scheduler.add_listener(self.job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

    def setup_jobs(self):
        """Configure all scheduled jobs"""
        logger.info("="*80)
        logger.info("Setting up TSETMC Scheduler")
        logger.info(f"Timezone: {TIMEZONE}")
        logger.info(f"Trading hours: {MARKET_OPEN_HOUR:02d}:{MARKET_OPEN_MINUTE:02d} - "
                   f"{MARKET_CLOSE_HOUR:02d}:{MARKET_CLOSE_MINUTE:02d}")
        logger.info("="*80)

        # 1. Market Watch - Every 2 minutes during trading hours (Sun-Wed, 09:00-12:30)
        # Tehran Stock Exchange trading hours: 09:00-12:30, Sunday-Wednesday
        self.scheduler.add_job(
            run_market_watch,
            trigger=CronTrigger(
                day_of_week='sun-wed',  # Iranian work week
                hour=f'{MARKET_OPEN_HOUR}-{MARKET_CLOSE_HOUR}',
                minute=f'*/{MARKET_WATCH_INTERVAL}',
                timezone=self.timezone
            ),
            id='market_watch',
            name='Market Watch (Real-time Prices)',
            replace_existing=True,
            max_instances=1
        )
        logger.info(f"✓ Scheduled: Market Watch - Every {MARKET_WATCH_INTERVAL} min "
                   f"(Sun-Wed, {MARKET_OPEN_HOUR:02d}:{MARKET_OPEN_MINUTE:02d}-"
                   f"{MARKET_CLOSE_HOUR:02d}:{MARKET_CLOSE_MINUTE:02d})")

        # 2. Instrument Details - Daily at 15:00 (after market close)
        self.scheduler.add_job(
            run_instrument_details,
            trigger=CronTrigger(
                day_of_week='sun-wed',
                hour=15,
                minute=0,
                timezone=self.timezone
            ),
            id='instrument_details',
            name='Instrument Details (Company Metadata)',
            replace_existing=True,
            max_instances=1
        )
        logger.info("✓ Scheduled: Instrument Details - Daily at 15:00 (Sun-Wed)")

        # 3. Historical Backfill - Weekly on Sunday at 02:00
        self.scheduler.add_job(
            run_historical_backfill,
            trigger=CronTrigger(
                day_of_week='sun',
                hour=2,
                minute=0,
                timezone=self.timezone
            ),
            id='historical_backfill',
            name='Historical Backfill (Weekly)',
            replace_existing=True,
            max_instances=1
        )
        logger.info("✓ Scheduled: Historical Backfill - Weekly on Sunday at 02:00")

        # 4. Database Backup - Daily at 01:00
        self.scheduler.add_job(
            database_backup,
            trigger=CronTrigger(
                hour=1,
                minute=0,
                timezone=self.timezone
            ),
            id='database_backup',
            name='Database Backup (Daily)',
            replace_existing=True,
            max_instances=1
        )
        logger.info("✓ Scheduled: Database Backup - Daily at 01:00")

        # 5. Log Cleanup - Weekly on Saturday at 03:00
        self.scheduler.add_job(
            cleanup_old_logs,
            trigger=CronTrigger(
                day_of_week='sat',
                hour=3,
                minute=0,
                timezone=self.timezone
            ),
            id='log_cleanup',
            name='Log Cleanup (Weekly)',
            replace_existing=True,
            max_instances=1
        )
        logger.info("✓ Scheduled: Log Cleanup - Weekly on Saturday at 03:00")

        logger.info("="*80)
        logger.info("All jobs scheduled successfully!")
        logger.info("="*80)

    def job_listener(self, event):
        """Listen to job execution events"""
        if event.exception:
            logger.error(f"Job {event.job_id} failed with exception: {event.exception}")
        else:
            logger.info(f"Job {event.job_id} executed successfully")

    def print_jobs(self):
        """Print all scheduled jobs"""
        logger.info("\n" + "="*80)
        logger.info("Scheduled Jobs:")
        logger.info("="*80)
        jobs = self.scheduler.get_jobs()
        for job in jobs:
            logger.info(f"\n{job.name} ({job.id})")
            logger.info(f"  Next run: {job.next_run_time}")
            logger.info(f"  Trigger: {job.trigger}")
        logger.info("="*80 + "\n")

    def start(self):
        """Start the scheduler"""
        if not SCHEDULER_ENABLED:
            logger.warning("Scheduler is disabled in configuration")
            return

        logger.info("\n" + "="*80)
        logger.info("Starting TSETMC Scheduler")
        logger.info(f"Current time: {datetime.now(self.timezone)}")
        logger.info("="*80 + "\n")

        self.print_jobs()

        logger.info("Scheduler is running. Press Ctrl+C to exit.\n")

        try:
            self.scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            logger.info("\nShutting down scheduler...")
            self.scheduler.shutdown()
            logger.info("Scheduler stopped.")

    def shutdown(self, signum=None, frame=None):
        """Gracefully shutdown scheduler"""
        logger.info("Received shutdown signal")
        self.scheduler.shutdown()
        sys.exit(0)


def main():
    """Main entry point"""
    # Create scheduler instance
    scheduler = TSETMCScheduler()

    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, scheduler.shutdown)
    signal.signal(signal.SIGTERM, scheduler.shutdown)

    # Setup and start
    scheduler.setup_jobs()
    scheduler.start()


if __name__ == '__main__':
    main()
