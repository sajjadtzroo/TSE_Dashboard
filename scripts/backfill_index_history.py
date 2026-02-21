"""
Backfill historical market index data from TSETMC.

Fetches daily OHLCV data from the TSETMC chart endpoint and upserts it
into the market_indices table.  Computes index_change / index_change_pct
from consecutive close values.

Usage:
    python scripts/backfill_index_history.py                 # all indices
    python scripts/backfill_index_history.py --indices TEDPIX EQUAL_WEIGHT
    python scripts/backfill_index_history.py --dry-run       # fetch only, no DB writes
"""

import argparse
import logging
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path

import requests
from sqlalchemy.dialects.postgresql import insert

# ── Project bootstrap ────────────────────────────────────────────────────────
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from config.settings import DATABASE_URL  # noqa: E402
from database.connection import get_db_manager  # noqa: E402
from database.models import MarketIndex  # noqa: E402

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)

# ── Index catalogue ──────────────────────────────────────────────────────────
# ins_code values taken from TSETMC URLs.
INDICES = {
    "TEDPIX": {
        "ins_code": "32097828799138957",
        "db_name": "شاخص کل",
    },
    "EQUAL_WEIGHT": {
        "ins_code": "67130298613737946",
        "db_name": "شاخص کل (هم وزن)",
    },
    "INDUSTRY": {
        "ins_code": "43754960038275285",
        "db_name": "شاخص صنعت",
    },
    "TOP50": {
        "ins_code": "46342955726788357",
        "db_name": "شاخص 50 شرکت فعالتر",
    },
    "TOP30": {
        "ins_code": "10523825119011581",
        "db_name": "شاخص 30 شرکت بزرگ",
    },
    "FREE_FLOAT": {
        "ins_code": "49579049405614711",
        "db_name": "شاخص آزاد شناور",
    },
    "MARKET1": {
        "ins_code": "62752761908615603",
        "db_name": "شاخص بازار اول",
    },
    "MARKET2": {
        "ins_code": "71704845530629737",
        "db_name": "شاخص بازار دوم",
    },
}

TSETMC_CHART_URL = (
    "https://members.tsetmc.com/tsev2/chart/data/IndexFinancial.aspx"
)


# ── Fetcher / parser ─────────────────────────────────────────────────────────
def fetch_index_history(ins_code: str) -> list[dict]:
    """Fetch and parse historical index data from TSETMC.

    Returns a list of dicts sorted by date ascending, each containing:
        date, index_value (close), min_value, max_value, volume
    """
    url = f"{TSETMC_CHART_URL}?i={ins_code}&t=ph"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()

    text = resp.text.strip()
    if not text:
        return []

    records = []
    for entry in text.split(";"):
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split(",")
        if len(parts) < 6:
            continue

        try:
            dt = datetime.strptime(parts[0], "%Y%m%d").date()
            high = float(parts[1])
            low = float(parts[2])
            _open = float(parts[3])
            close = float(parts[4])
            volume = int(float(parts[5]))
        except (ValueError, IndexError):
            continue

        records.append(
            {
                "date": dt,
                "index_value": close,
                "min_value": low,
                "max_value": high,
                "volume": volume,
            }
        )

    # Sort ascending so we can compute day-over-day change
    records.sort(key=lambda r: r["date"])
    return records


def compute_changes(records: list[dict]) -> list[dict]:
    """Add index_change and index_change_pct from consecutive closes."""
    for i, rec in enumerate(records):
        if i == 0 or records[i - 1]["index_value"] == 0:
            rec["index_change"] = None
            rec["index_change_pct"] = None
        else:
            prev = records[i - 1]["index_value"]
            change = rec["index_value"] - prev
            rec["index_change"] = round(change, 2)
            rec["index_change_pct"] = round(change / prev * 100, 4)
    return records


# ── DB upsert ────────────────────────────────────────────────────────────────
def upsert_records(session, db_name: str, records: list[dict]) -> int:
    """Upsert records into market_indices.  Returns rows affected."""
    now = datetime.now(timezone.utc)
    rows = [
        {
            "date": rec["date"],
            "name": db_name,
            "index_value": rec["index_value"],
            "index_change": rec.get("index_change"),
            "index_change_pct": rec.get("index_change_pct"),
            "min_value": rec.get("min_value"),
            "max_value": rec.get("max_value"),
            "volume": rec.get("volume"),
            "created_at": now,
        }
        for rec in records
    ]

    if not rows:
        return 0

    # Process in batches to avoid overly large statements
    BATCH = 500
    total = 0
    for start in range(0, len(rows), BATCH):
        batch = rows[start : start + BATCH]
        stmt = insert(MarketIndex.__table__).values(batch)

        # Only update columns we have data for; never overwrite live-data
        # fields (market_value, trades, value, state, time) with NULL.
        update_cols = {
            "index_value": stmt.excluded.index_value,
            "index_change": stmt.excluded.index_change,
            "index_change_pct": stmt.excluded.index_change_pct,
            "min_value": stmt.excluded.min_value,
            "max_value": stmt.excluded.max_value,
            "volume": stmt.excluded.volume,
        }
        stmt = stmt.on_conflict_do_update(
            constraint="uq_market_indices_name_date",
            set_=update_cols,
        )
        session.execute(stmt)
        total += len(batch)

    return total


# ── CLI ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Backfill historical market index data from TSETMC"
    )
    parser.add_argument(
        "--indices",
        nargs="+",
        choices=list(INDICES.keys()),
        default=list(INDICES.keys()),
        help="Indices to backfill (default: all)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and parse only — do not write to DB",
    )
    args = parser.parse_args()

    logger.info("Starting index history backfill")
    logger.info("Indices: %s", ", ".join(args.indices))

    db = get_db_manager(DATABASE_URL) if not args.dry_run else None

    for key in args.indices:
        info = INDICES[key]
        logger.info("Fetching %s (ins_code=%s) …", key, info["ins_code"])

        try:
            records = fetch_index_history(info["ins_code"])
        except Exception:
            logger.exception("Failed to fetch %s — skipping", key)
            continue

        if not records:
            logger.warning("No data returned for %s", key)
            continue

        records = compute_changes(records)
        logger.info(
            "  %s: %d records  (%s → %s)",
            key,
            len(records),
            records[0]["date"],
            records[-1]["date"],
        )

        if args.dry_run:
            logger.info("  [dry-run] skipping DB write")
        else:
            with db.get_session() as session:
                count = upsert_records(session, info["db_name"], records)
                logger.info("  Upserted %d rows for %s", count, info["db_name"])

        # Be polite to TSETMC
        time.sleep(1)

    logger.info("Backfill complete")


if __name__ == "__main__":
    main()
