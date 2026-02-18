"""
Migrate existing SQLite data to PostgreSQL with new schema.

Reads from: data/tsetmc.db (old SQLite with 7 tables)
Writes to:  PostgreSQL (new 4-table schema via DATABASE_URL)

Tables mapped:
  companies         -> securities
  daily_prices      -> daily_ohlcv (OHLCV columns)
  financial_indicators -> daily_ohlcv (fundamentals columns, merged)
  client_type       -> daily_ohlcv (client type columns, merged)

Order book and intraday data are not migrated (fresh start).
"""

import logging
import sqlite3
import sys
from datetime import UTC, date, datetime
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.dialects.postgresql import insert

from config.settings import DATA_DIR, DATABASE_URL
from database.connection import get_db_manager
from database.models import DailyOHLCV, Security

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

SQLITE_PATH = DATA_DIR / "tsetmc.db"


def d_even_to_date(d_even):
    """Convert YYYYMMDD int to date object."""
    s = str(d_even)
    if len(s) == 8:
        return date(int(s[:4]), int(s[4:6]), int(s[6:8]))
    return None


def migrate():
    if not SQLITE_PATH.exists():
        logger.error(f"SQLite database not found at {SQLITE_PATH}")
        sys.exit(1)

    logger.info(f"Reading from SQLite: {SQLITE_PATH}")
    logger.info(
        f"Writing to PostgreSQL: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}"
    )

    # Connect to SQLite
    sqlite_conn = sqlite3.connect(str(SQLITE_PATH))
    sqlite_conn.row_factory = sqlite3.Row

    # Connect to PostgreSQL and create tables
    db_manager = get_db_manager(DATABASE_URL)
    db_manager.create_tables()
    session = db_manager.get_scoped_session()

    now = datetime.now(UTC)

    # ---- 1. Migrate companies -> securities ----
    logger.info("Migrating companies -> securities...")
    cursor = sqlite_conn.execute("SELECT * FROM companies")
    companies = cursor.fetchall()
    logger.info(f"  Found {len(companies)} companies in SQLite")

    ins_code_to_sec_id = {}

    if companies:
        rows = []
        for c in companies:
            rows.append(
                {
                    "ins_code": c["ins_code"],
                    "symbol": c["symbol"] or str(c["ins_code"]),
                    "name_fa": c["name_fa"],
                    "name_en": c["name_en"],
                    "isin": c["isin"],
                    "sector_name_fa": c["sector_name_fa"],
                    "sector_name_en": c["sector_name_en"],
                    "is_active": bool(c["is_active"]),
                    "created_at": now,
                    "updated_at": now,
                }
            )

        stmt = insert(Security.__table__).values(rows)
        update_cols = {
            col.name: stmt.excluded[col.name]
            for col in Security.__table__.columns
            if col.name not in ("security_id", "ins_code", "created_at")
        }
        stmt = stmt.on_conflict_do_update(index_elements=["ins_code"], set_=update_cols)
        session.execute(stmt)
        session.commit()

        # Build mapping
        for ins_code, sec_id in session.query(
            Security.ins_code, Security.security_id
        ).all():
            ins_code_to_sec_id[ins_code] = sec_id

        logger.info(f"  Migrated {len(rows)} securities")

    # ---- 2. Migrate daily_prices -> daily_ohlcv ----
    logger.info("Migrating daily_prices -> daily_ohlcv...")
    cursor = sqlite_conn.execute("SELECT * FROM daily_prices")
    prices = cursor.fetchall()
    logger.info(f"  Found {len(prices)} daily price records")

    if prices:
        batch = []
        skipped = 0
        for p in prices:
            sec_id = ins_code_to_sec_id.get(p["ins_code"])
            if not sec_id:
                skipped += 1
                continue
            d = d_even_to_date(p["d_even"])
            if not d:
                skipped += 1
                continue
            batch.append(
                {
                    "security_id": sec_id,
                    "date": d,
                    "open": p["price_first"],
                    "high": p["price_max"],
                    "low": p["price_min"],
                    "close": p["price_last"],
                    "volume": p["q_tot_tran_5j"],
                    "value": p["q_tot_cap"],
                    "trades": p["z_tot_tran"],
                    "adj_close": p["adj_close"],
                    "price_yesterday": p["price_yesterday"],
                    "close_change": p["price_change"],
                    "close_change_pct": p["price_change_percent"],
                    "created_at": now,
                    "updated_at": now,
                }
            )

            if len(batch) >= 1000:
                _upsert_ohlcv(session, batch)
                batch = []

        if batch:
            _upsert_ohlcv(session, batch)

        logger.info(
            f"  Migrated {len(prices) - skipped} price records (skipped {skipped})"
        )

    # ---- 3. Merge financial_indicators into daily_ohlcv ----
    logger.info("Merging financial_indicators -> daily_ohlcv...")
    cursor = sqlite_conn.execute("SELECT * FROM financial_indicators")
    financials = cursor.fetchall()
    logger.info(f"  Found {len(financials)} financial records")

    if financials:
        batch = []
        skipped = 0
        for f in financials:
            sec_id = ins_code_to_sec_id.get(f["ins_code"])
            if not sec_id:
                skipped += 1
                continue
            d = d_even_to_date(f["d_even"])
            if not d:
                skipped += 1
                continue
            batch.append(
                {
                    "security_id": sec_id,
                    "date": d,
                    "eps": f["eps"],
                    "estimated_eps": f["estimated_eps"],
                    "pe_ratio": f["pe_ratio"],
                    "market_cap": f["market_cap"],
                    "nav": f["nav"],
                    "threshold_min": f["price_threshold_min"],
                    "threshold_max": f["price_threshold_max"],
                    "created_at": now,
                    "updated_at": now,
                }
            )

            if len(batch) >= 1000:
                _upsert_ohlcv_financials(session, batch)
                batch = []

        if batch:
            _upsert_ohlcv_financials(session, batch)

        logger.info(f"  Merged {len(financials) - skipped} financial records")

    # ---- 4. Merge client_type into daily_ohlcv ----
    logger.info("Merging client_type -> daily_ohlcv...")
    cursor = sqlite_conn.execute("SELECT * FROM client_type")
    clients = cursor.fetchall()
    logger.info(f"  Found {len(clients)} client type records")

    if clients:
        batch = []
        skipped = 0
        for c in clients:
            sec_id = ins_code_to_sec_id.get(c["ins_code"])
            if not sec_id:
                skipped += 1
                continue
            d = d_even_to_date(c["d_even"])
            if not d:
                skipped += 1
                continue
            batch.append(
                {
                    "security_id": sec_id,
                    "date": d,
                    "real_buy_count": c["real_buyer_count"],
                    "real_buy_volume": c["real_buyer_volume"],
                    "real_sell_count": c["real_seller_count"],
                    "real_sell_volume": c["real_seller_volume"],
                    "legal_buy_count": c["legal_buyer_count"],
                    "legal_buy_volume": c["legal_buyer_volume"],
                    "legal_sell_count": c["legal_seller_count"],
                    "legal_sell_volume": c["legal_seller_volume"],
                    "created_at": now,
                    "updated_at": now,
                }
            )

            if len(batch) >= 1000:
                _upsert_ohlcv_clients(session, batch)
                batch = []

        if batch:
            _upsert_ohlcv_clients(session, batch)

        logger.info(f"  Merged {len(clients) - skipped} client type records")

    session.commit()
    session.close()
    sqlite_conn.close()

    logger.info("=" * 80)
    logger.info("Migration completed successfully!")
    logger.info("=" * 80)


def _upsert_ohlcv(session, rows):
    stmt = insert(DailyOHLCV.__table__).values(rows)
    update_cols = {
        col: stmt.excluded[col]
        for col in [
            "open",
            "high",
            "low",
            "close",
            "volume",
            "value",
            "trades",
            "adj_close",
            "price_yesterday",
            "close_change",
            "close_change_pct",
            "updated_at",
        ]
    }
    stmt = stmt.on_conflict_do_update(
        constraint="uq_daily_ohlcv_sec_date", set_=update_cols
    )
    session.execute(stmt)
    session.commit()


def _upsert_ohlcv_financials(session, rows):
    stmt = insert(DailyOHLCV.__table__).values(rows)
    update_cols = {
        col: stmt.excluded[col]
        for col in [
            "eps",
            "estimated_eps",
            "pe_ratio",
            "market_cap",
            "nav",
            "threshold_min",
            "threshold_max",
            "updated_at",
        ]
    }
    stmt = stmt.on_conflict_do_update(
        constraint="uq_daily_ohlcv_sec_date", set_=update_cols
    )
    session.execute(stmt)
    session.commit()


def _upsert_ohlcv_clients(session, rows):
    stmt = insert(DailyOHLCV.__table__).values(rows)
    update_cols = {
        col: stmt.excluded[col]
        for col in [
            "real_buy_count",
            "real_buy_volume",
            "real_sell_count",
            "real_sell_volume",
            "legal_buy_count",
            "legal_buy_volume",
            "legal_sell_count",
            "legal_sell_volume",
            "updated_at",
        ]
    }
    stmt = stmt.on_conflict_do_update(
        constraint="uq_daily_ohlcv_sec_date", set_=update_cols
    )
    session.execute(stmt)
    session.commit()


if __name__ == "__main__":
    migrate()
