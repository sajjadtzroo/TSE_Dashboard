"""
Backfill tick trades for the past 7 trading days.

Runs the tick_trades Scrapy spider for each of the last N trading days
(Sat=5, Sun=6, Mon=0, Tue=1, Wed=2 in Python weekday).

Usage:
    docker exec main-app-1 python scripts/backfill_tick_7days.py
    docker exec main-app-1 python scripts/backfill_tick_7days.py --days 3
"""
import argparse
import subprocess
import sys
from datetime import date, timedelta

import jdatetime

TRADING_WEEKDAYS = {5, 6, 0, 1, 2}  # Sat, Sun, Mon, Tue, Wed


def past_trading_days(n: int) -> list[date]:
    """Return the last n Gregorian trading days (excluding today)."""
    days = []
    d = date.today() - timedelta(days=1)
    while len(days) < n:
        if d.weekday() in TRADING_WEEKDAYS:
            days.append(d)
        d -= timedelta(days=1)
    return days


def to_shamsi(d: date) -> str:
    """Convert Gregorian date to Shamsi YYYYMMDD string."""
    jd = jdatetime.date.fromgregorian(date=d)
    return f"{jd.year:04d}{jd.month:02d}{jd.day:02d}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=7, help="Number of past trading days to backfill")
    args = parser.parse_args()

    trading_days = past_trading_days(args.days)
    print(f"Backfilling tick trades for {len(trading_days)} trading days:")

    for greg_date in trading_days:
        shamsi = to_shamsi(greg_date)
        print(f"\n{'='*60}")
        print(f"  Date: {greg_date}  (Shamsi: {shamsi[:4]}/{shamsi[4:6]}/{shamsi[6:]})")
        print(f"{'='*60}")

        result = subprocess.run(
            ["python", "-m", "scrapy", "crawl", "tick_trades", "-a", f"date={shamsi}"],
            cwd="/app",
            capture_output=False,
        )
        if result.returncode != 0:
            print(f"  WARNING: spider exited with code {result.returncode}", file=sys.stderr)

    print("\nBackfill complete.")


if __name__ == "__main__":
    main()
