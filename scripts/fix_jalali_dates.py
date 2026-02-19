"""
scripts/fix_jalali_dates.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~
One-time migration: convert daily_ohlcv rows where date.year < 1800
(stored as Jalali-as-Gregorian, e.g. 1404-11-28) into real Gregorian dates
(e.g. 2026-02-17).

If the Gregorian equivalent already exists for that (security_id, date),
the Jalali row is deleted (the Gregorian row wins — it has fresh market data).

Usage:
    python scripts/fix_jalali_dates.py
    python scripts/fix_jalali_dates.py --dry-run
"""

import argparse
import sys
from pathlib import Path

import jdatetime
import psycopg2

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from config.settings import DATABASE_URL


def run(dry_run: bool = False):
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute(
        "SELECT id, security_id, date FROM daily_ohlcv WHERE date < '1800-01-01' ORDER BY security_id, date"
    )
    rows = cur.fetchall()
    total = len(rows)
    print(f"Found {total:,} Jalali-dated rows to migrate")

    if total == 0:
        print("Nothing to do.")
        conn.close()
        return

    converted = 0
    deleted = 0
    errors = 0

    for i, (row_id, security_id, j_date) in enumerate(rows, 1):
        if i % 10000 == 0:
            print(f"  {i:,}/{total:,} processed…")
        try:
            # Interpret stored date as Jalali and convert to Gregorian
            g_date = jdatetime.date(j_date.year, j_date.month, j_date.day).togregorian()

            # Check for an existing Gregorian row for this (security_id, date)
            cur.execute(
                "SELECT id FROM daily_ohlcv WHERE security_id = %s AND date = %s AND id != %s",
                (security_id, g_date, row_id),
            )
            conflict = cur.fetchone()

            if conflict:
                # Gregorian row already exists — delete the Jalali duplicate
                if not dry_run:
                    cur.execute("DELETE FROM daily_ohlcv WHERE id = %s", (row_id,))
                deleted += 1
            else:
                # Safe to update
                if not dry_run:
                    cur.execute(
                        "UPDATE daily_ohlcv SET date = %s WHERE id = %s",
                        (g_date, row_id),
                    )
                converted += 1

        except Exception as e:
            print(f"  ERROR id={row_id} date={j_date}: {e}")
            errors += 1

    if not dry_run:
        conn.commit()
        print(f"\nDone. Converted: {converted:,}  |  Deleted duplicates: {deleted:,}  |  Errors: {errors}")
    else:
        conn.rollback()
        print(f"\nDry-run. Would convert: {converted:,}  |  Would delete duplicates: {deleted:,}  |  Errors: {errors}")

    conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
