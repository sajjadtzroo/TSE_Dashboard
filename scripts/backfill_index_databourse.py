"""
Backfill historical market index data from databourse.ir.

Scrapes the embedded dataArray from each index page on databourse.ir,
converts Jalali dates to Gregorian, computes day-over-day changes, and
upserts into the market_indices table.

Covers all 14 indices including those not available from TSETMC
(OTC indices, price indices, etc.).

Usage:
    python scripts/backfill_index_databourse.py                 # all indices
    python scripts/backfill_index_databourse.py --indices 9 11  # specific IDs
    python scripts/backfill_index_databourse.py --dry-run       # fetch only
"""

import argparse
import json
import logging
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import jdatetime
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
# databourse.ir page ID → db_name (must match names already stored by the
# BrsApi daily scraper and the TSETMC backfill script).
INDICES = {
    1:  "شاخص کل",
    2:  "شاخص کل (هم وزن)",
    3:  "شاخص 50 شرکت فعالتر",
    4:  "شاخص 30 شرکت بزرگ",
    5:  "شاخص آزاد شناور",
    6:  "شاخص بازار اول",
    7:  "شاخص بازار دوم",
    8:  "شاخص صنعت",
    9:  "شاخص قیمت (هم وزن)",
    10: "شاخص قیمت 50 شرکت",
    11: "شاخص قیمت (وزنی-ارزشی)",
    12: "شاخص کل فرابورس",
    13: "بازار اول فرابورس",
    14: "بازار دوم فرابورس",
}

DATABOURSE_URL = "https://databourse.ir/indices/{page_id}"

# Regex to extract the dataArray JSON from the embedded <script> tag.
# The array is assigned inside a window.addEventListener('load', ...) block.
DATA_ARRAY_RE = re.compile(
    r"dataArray\s*=\s*(\[.*?\])\s*;",
    re.DOTALL,
)


# ── Fetcher / parser ─────────────────────────────────────────────────────────
def fetch_index_page(page_id: int) -> list[dict]:
    """Fetch an index page from databourse.ir and extract the dataArray.

    Returns a list of dicts sorted by date ascending:
        [{ "date": datetime.date, "index_value": float }, ...]
    """
    url = DATABOURSE_URL.format(page_id=page_id)
    resp = requests.get(url, timeout=30, headers={
        "User-Agent": "Mozilla/5.0 (TSE-Dashboard backfill)",
    })
    resp.raise_for_status()

    match = DATA_ARRAY_RE.search(resp.text)
    if not match:
        raise ValueError(f"Could not find dataArray in page {page_id}")

    raw_json = match.group(1)
    data = json.loads(raw_json)

    records = []
    for entry in data:
        jalali_str = entry.get("date", "")
        value = entry.get("value")
        if not jalali_str or value is None:
            continue

        # Parse Jalali date → Gregorian
        try:
            parts = jalali_str.split("-")
            jy, jm, jd = int(parts[0]), int(parts[1]), int(parts[2])
            greg_date = jdatetime.date(jy, jm, jd).togregorian()
        except (ValueError, IndexError):
            continue

        records.append({
            "date": greg_date,
            "index_value": round(float(value), 2),
        })

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
            "created_at": now,
        }
        for rec in records
    ]

    if not rows:
        return 0

    BATCH = 500
    total = 0
    for start in range(0, len(rows), BATCH):
        batch = rows[start : start + BATCH]
        stmt = insert(MarketIndex.__table__).values(batch)

        # Only update index_value and computed change fields.
        # Never overwrite live-data fields (market_value, trades, value,
        # state, time, min_value, max_value, volume) with NULL.
        update_cols = {
            "index_value": stmt.excluded.index_value,
            "index_change": stmt.excluded.index_change,
            "index_change_pct": stmt.excluded.index_change_pct,
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
        description="Backfill historical market index data from databourse.ir"
    )
    parser.add_argument(
        "--indices",
        nargs="+",
        type=int,
        choices=list(INDICES.keys()),
        default=list(INDICES.keys()),
        help="Page IDs to backfill (1-14, default: all)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and parse only — do not write to DB",
    )
    args = parser.parse_args()

    logger.info("Starting databourse.ir index history backfill")
    logger.info(
        "Indices: %s",
        ", ".join(f"{pid} ({INDICES[pid]})" for pid in args.indices),
    )

    db = get_db_manager(DATABASE_URL) if not args.dry_run else None

    for page_id in args.indices:
        db_name = INDICES[page_id]
        logger.info("Fetching page %d (%s) …", page_id, db_name)

        try:
            records = fetch_index_page(page_id)
        except Exception:
            logger.exception("Failed to fetch page %d — skipping", page_id)
            continue

        if not records:
            logger.warning("No data returned for page %d (%s)", page_id, db_name)
            continue

        records = compute_changes(records)
        logger.info(
            "  %s: %d records  (%s → %s)",
            db_name,
            len(records),
            records[0]["date"],
            records[-1]["date"],
        )

        if args.dry_run:
            logger.info("  [dry-run] skipping DB write")
        else:
            with db.get_session() as session:
                count = upsert_records(session, db_name, records)
                logger.info("  Upserted %d rows for %s", count, db_name)

        # Be polite
        time.sleep(1)

    logger.info("Backfill complete")


if __name__ == "__main__":
    main()
