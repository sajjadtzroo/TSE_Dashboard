"""
scripts/codal_backfill_watcher.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Runs codal_financial spider in a loop, automatically restarting from the
current oldest date in the DB whenever the server drops the connection.
Stops when the oldest date in codal_announcements reaches DONE_DATE.

Usage:
    python scripts/codal_backfill_watcher.py
    python scripts/codal_backfill_watcher.py --from-date 1395/01/01 --done-date 1395/01/01
"""

import argparse
import logging
import subprocess
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from config.settings import DATABASE_URL

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("codal_watcher")

DONE_DATE = "1395/01/01"       # stop when DB oldest <= this date
LOG_FILE = str(ROOT / "logs" / "codal_historical.log")


def get_oldest_date() -> str | None:
    """Return MIN(date_publish) from codal_announcements as 'YYYY/MM/DD' string."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT MIN(date_publish) FROM codal_announcements;")
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            return str(row[0])  # already 'YYYY/MM/DD' from Jalali storage
    except Exception as e:
        log.error(f"DB query failed: {e}")
    return None


def date_to_jalali_str(d: str) -> str:
    """Return d as-is — already stored as Jalali string."""
    return d


def subtract_one_day(jalali_str: str) -> str:
    """
    Subtract one day from a Jalali date string (YYYY/MM/DD).
    Converts via simple integer arithmetic on the Jalali representation.
    Works by treating the date as a sortable string and delegating to jdatetime if available,
    otherwise using a naive subtraction on the day component with month/year rollback.
    """
    try:
        import jdatetime
        y, m, d = map(int, jalali_str.split("/"))
        jd = jdatetime.date(y, m, d)
        prev = jd - timedelta(days=1)
        return f"{prev.year:04d}/{prev.month:02d}/{prev.day:02d}"
    except ImportError:
        pass

    # Fallback: rough arithmetic (handles most cases)
    y, m, d = map(int, jalali_str.split("/"))
    # Jalali month lengths (non-leap year)
    month_days = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29]
    d -= 1
    if d == 0:
        m -= 1
        if m == 0:
            m = 12
            y -= 1
        d = month_days[m]
    return f"{y:04d}/{m:02d}/{d:02d}"


def run_spider(from_date: str, to_date: str) -> bool:
    """Run spider for given range. Returns True if exited cleanly (even with ConnectionLost)."""
    log.info(f"Starting spider: {from_date} → {to_date}")
    cmd = [
        sys.executable, "-m", "scrapy", "crawl", "codal_financial",
        "-a", f"from_date={from_date}",
        "-a", f"to_date={to_date}",
        "-s", "LOG_LEVEL=INFO",
        "-s", f"LOG_FILE={LOG_FILE}",
    ]
    try:
        result = subprocess.run(cmd, cwd=str(ROOT), timeout=None)
        return result.returncode == 0
    except Exception as e:
        log.error(f"Spider error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-date", default="1395/01/01", help="Earliest Jalali date to fetch")
    parser.add_argument("--done-date", default=DONE_DATE, help="Stop when DB oldest reaches this date")
    args = parser.parse_args()

    from_date = args.from_date
    done_date = args.done_date

    log.info("=" * 60)
    log.info(f"Codal backfill watcher started")
    log.info(f"  Target range : {from_date} → current DB oldest")
    log.info(f"  Done when    : DB oldest <= {done_date}")
    log.info("=" * 60)

    run_number = 0
    while True:
        run_number += 1

        # Get current oldest date to use as to_date
        oldest = get_oldest_date()
        if oldest is None:
            log.warning("Could not read oldest date from DB — using full range")
            to_date = "1403/01/18"
        else:
            log.info(f"Current DB oldest: {oldest}")
            # Check if we're done
            if oldest <= done_date:
                log.info(f"Oldest date {oldest} <= done_date {done_date}. Backfill complete!")
                break
            # Use one day before current oldest as to_date
            to_date = subtract_one_day(oldest)

        log.info(f"Run #{run_number}: fetching {from_date} → {to_date}")
        run_spider(from_date, to_date)

        # Brief pause before checking / restarting
        newest_oldest = get_oldest_date()
        log.info(f"After run #{run_number}: DB oldest = {newest_oldest}")

        if newest_oldest and newest_oldest <= done_date:
            log.info("Backfill complete!")
            break

        if newest_oldest == oldest:
            log.warning("No progress made — waiting 30s before retry")
            time.sleep(30)
        else:
            log.info("Progress made — restarting immediately")
            time.sleep(2)

    log.info("Watcher done.")


if __name__ == "__main__":
    main()
