"""
Backfill historical stock price data from databourse.ir.

For each active TSE security with insufficient OHLCV history, scrapes the
embedded data_history and data_adjust from the databourse.ir symbol page,
converts Jalali dates to Gregorian, computes day-over-day changes, and
upserts into the daily_ohlcv table.

databourse.ir provides ~450 days of close-price and adjusted-close data.
Since full OHLCV is not available from this source, open/high/low are set
equal to close (common approximation for charting).

Usage:
    python scripts/backfill_stock_databourse.py                     # all gaps
    python scripts/backfill_stock_databourse.py --symbols شبندر فولاد  # specific
    python scripts/backfill_stock_databourse.py --threshold 30      # min records
    python scripts/backfill_stock_databourse.py --check-only        # report only
    python scripts/backfill_stock_databourse.py --dry-run            # no DB write
"""

import argparse
import json
import logging
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import jdatetime
import requests
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert

# ── Project bootstrap ────────────────────────────────────────────────────────
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from config.settings import DATABASE_URL  # noqa: E402
from database.connection import get_db_manager  # noqa: E402
from database.models import DailyOHLCV, Security  # noqa: E402

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────
DATABOURSE_SYMBOL_URL = "https://databourse.ir/symbol/{symbol}"
HEADERS = {"User-Agent": "Mozilla/5.0 (TSE-Dashboard stock backfill)"}
REQUEST_TIMEOUT = 25

# Regex patterns for embedded data
DATA_HISTORY_RE = re.compile(
    r"data_history\s*=\s*(\[.*?\])\s*;", re.DOTALL
)
DATA_ADJUST_RE = re.compile(
    r"data_adjust\s*=\s*(\[.*?\])\s*;", re.DOTALL
)


# ── Fetcher / parser ─────────────────────────────────────────────────────────
def fetch_stock_history(symbol: str) -> list[dict] | None:
    """Fetch close-price history from databourse.ir for a single stock.

    Returns a list of dicts sorted by date ascending:
        [{ "date": datetime.date, "close": float, "adj_close": float | None }, ...]
    Returns None on network/parse errors.
    """
    encoded = quote(symbol, safe="")
    url = DATABOURSE_SYMBOL_URL.format(symbol=encoded)

    try:
        resp = requests.get(url, timeout=REQUEST_TIMEOUT, headers=HEADERS)
        resp.raise_for_status()
    except requests.RequestException as e:
        logger.warning("  %s: HTTP error — %s", symbol, e)
        return None

    # Extract data_history
    match_hist = DATA_HISTORY_RE.search(resp.text)
    if not match_hist:
        logger.debug("  %s: no data_history found on page", symbol)
        return None

    try:
        raw_history = json.loads(match_hist.group(1))
    except json.JSONDecodeError:
        logger.warning("  %s: invalid JSON in data_history", symbol)
        return None

    # Extract data_adjust (optional)
    adj_map = {}
    match_adj = DATA_ADJUST_RE.search(resp.text)
    if match_adj:
        try:
            raw_adj = json.loads(match_adj.group(1))
            for entry in raw_adj:
                adj_map[entry.get("date", "")] = entry.get("value")
        except json.JSONDecodeError:
            pass

    # Build records
    records = []
    for entry in raw_history:
        jalali_str = entry.get("date", "")
        value = entry.get("value")
        if not jalali_str or value is None:
            continue

        try:
            parts = jalali_str.split("-")
            jy, jm, jd = int(parts[0]), int(parts[1]), int(parts[2])
            greg_date = jdatetime.date(jy, jm, jd).togregorian()
        except (ValueError, IndexError):
            continue

        close_price = float(value)

        adj_val = adj_map.get(jalali_str)
        adj_close = float(adj_val) if adj_val is not None else None

        records.append({
            "date": greg_date,
            "close": close_price,
            "adj_close": adj_close,
        })

    records.sort(key=lambda r: r["date"])
    return records


def compute_changes(records: list[dict]) -> list[dict]:
    """Add close_change and close_change_pct from consecutive closes."""
    for i, rec in enumerate(records):
        if i == 0 or records[i - 1]["close"] == 0:
            rec["close_change"] = None
            rec["close_change_pct"] = None
        else:
            prev = records[i - 1]["close"]
            change = rec["close"] - prev
            rec["close_change"] = round(change, 2)
            rec["close_change_pct"] = round(change / prev * 100, 4)
    return records


# ── DB helpers ───────────────────────────────────────────────────────────────
def get_stocks_needing_backfill(session, threshold: int, target_symbols=None):
    """Return list of (security_id, symbol) for stocks with < threshold records."""
    # Subquery: count OHLCV per security
    counts = (
        session.query(
            DailyOHLCV.security_id,
            func.count().label("cnt"),
        )
        .group_by(DailyOHLCV.security_id)
        .subquery()
    )

    query = (
        session.query(Security.security_id, Security.symbol)
        .outerjoin(counts, Security.security_id == counts.c.security_id)
        .filter(
            Security.is_active == True,
            Security.market_type.in_(["tse", "otc"]),
        )
        .filter(
            (counts.c.cnt == None) | (counts.c.cnt < threshold)
        )
        .order_by(Security.symbol)
    )

    if target_symbols:
        query = query.filter(Security.symbol.in_(target_symbols))

    return query.all()


def get_existing_dates(session, security_id: int) -> set:
    """Return set of dates already in daily_ohlcv for this security."""
    rows = (
        session.query(DailyOHLCV.date)
        .filter(DailyOHLCV.security_id == security_id)
        .all()
    )
    return {r[0] for r in rows}


def upsert_records(session, security_id: int, records: list[dict]) -> int:
    """Upsert records into daily_ohlcv. Returns rows affected."""
    now = datetime.now(timezone.utc)
    rows = []
    for rec in records:
        close = rec["close"]
        rows.append({
            "security_id": security_id,
            "date": rec["date"],
            "open": close,
            "high": close,
            "low": close,
            "close": close,
            "last": close,
            "adj_close": rec.get("adj_close") or close,
            "close_change": rec.get("close_change"),
            "close_change_pct": rec.get("close_change_pct"),
            "created_at": now,
        })

    if not rows:
        return 0

    BATCH = 500
    total = 0
    for start in range(0, len(rows), BATCH):
        batch = rows[start: start + BATCH]
        stmt = insert(DailyOHLCV.__table__).values(batch)

        # Only update price fields — never overwrite richer data
        # (volume, trades, real/legal client type) with NULL.
        update_cols = {
            "close": stmt.excluded.close,
            "adj_close": stmt.excluded.adj_close,
            "close_change": stmt.excluded.close_change,
            "close_change_pct": stmt.excluded.close_change_pct,
        }
        stmt = stmt.on_conflict_do_update(
            constraint="uq_daily_ohlcv_sec_date",
            set_=update_cols,
        )
        session.execute(stmt)
        total += len(batch)

    return total


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Backfill stock history from databourse.ir"
    )
    parser.add_argument(
        "--symbols", nargs="+",
        help="Specific symbols to backfill (default: all with gaps)",
    )
    parser.add_argument(
        "--threshold", type=int, default=30,
        help="Minimum OHLCV records to consider a stock 'covered' (default: 30)",
    )
    parser.add_argument(
        "--check-only", action="store_true",
        help="Only report which stocks need backfill, don't fetch/write",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Fetch and parse only — do not write to DB",
    )
    parser.add_argument(
        "--delay", type=float, default=1.0,
        help="Seconds between requests (default: 1.0)",
    )
    args = parser.parse_args()

    db = get_db_manager(DATABASE_URL)

    # Step 1: Find stocks needing backfill
    logger.info("Checking for stocks with < %d OHLCV records...", args.threshold)
    with db.get_session() as session:
        gaps = get_stocks_needing_backfill(
            session, args.threshold, args.symbols
        )

    logger.info("Found %d stocks needing backfill", len(gaps))

    if args.check_only:
        for sec_id, symbol in gaps:
            print(f"  {symbol} (security_id={sec_id})")
        return

    if not gaps:
        logger.info("All stocks have sufficient history. Nothing to do.")
        return

    # Step 2: Backfill each stock
    total_stocks = 0
    total_new_records = 0
    total_skipped_stocks = 0
    errors = []

    for idx, (sec_id, symbol) in enumerate(gaps, 1):
        logger.info(
            "[%d/%d] %s (security_id=%d) …",
            idx, len(gaps), symbol, sec_id,
        )

        records = fetch_stock_history(symbol)
        if records is None or len(records) == 0:
            logger.warning("  %s: no data from databourse.ir", symbol)
            total_skipped_stocks += 1
            errors.append(symbol)
            time.sleep(args.delay)
            continue

        # Filter out dates we already have
        with db.get_session() as session:
            existing = get_existing_dates(session, sec_id)

        new_records = [r for r in records if r["date"] not in existing]

        if not new_records:
            logger.info("  %s: all %d records already exist", symbol, len(records))
            time.sleep(args.delay * 0.3)
            continue

        new_records = compute_changes(new_records)

        logger.info(
            "  %s: %d total, %d new (%s → %s)",
            symbol, len(records), len(new_records),
            new_records[0]["date"], new_records[-1]["date"],
        )

        if args.dry_run:
            logger.info("  [dry-run] skipping DB write")
        else:
            with db.get_session() as session:
                count = upsert_records(session, sec_id, new_records)
                logger.info("  Upserted %d rows for %s", count, symbol)

        total_stocks += 1
        total_new_records += len(new_records)
        time.sleep(args.delay)

    # Summary
    logger.info("=" * 70)
    logger.info("Backfill complete!")
    logger.info("  Stocks processed: %d", total_stocks)
    logger.info("  New records inserted: %d", total_new_records)
    logger.info("  Skipped (no data): %d", total_skipped_stocks)
    if errors:
        logger.info("  Failed symbols: %s", ", ".join(errors[:20]))
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
