"""
Backfill historical crypto OHLCV data from Binance public klines API.

For each tracked crypto coin (except stablecoins), fetches all available
daily candles from Binance going back to the coin's listing date and upserts
into the crypto_ohlcv table.

No API key required — Binance klines are publicly accessible.
Rate limit: 1200 requests/min weight; we stay well under with a 0.3s delay.

Usage:
    python scripts/backfill_crypto_ohlcv_binance.py              # all coins
    python scripts/backfill_crypto_ohlcv_binance.py --symbols BTC ETH SOL
    python scripts/backfill_crypto_ohlcv_binance.py --dry-run    # no DB writes
    python scripts/backfill_crypto_ohlcv_binance.py --from 2020-01-01
"""

import argparse
import logging
import sys
import time
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import requests
from sqlalchemy.dialects.postgresql import insert

# ── Project bootstrap ────────────────────────────────────────────────────────
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from config.settings import DATABASE_URL  # noqa: E402
from database.connection import get_db_manager  # noqa: E402
from database.models import CryptoOHLCV, Security  # noqa: E402

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)

# ── Binance config ───────────────────────────────────────────────────────────
BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines"
INTERVAL = "1d"
BATCH_SIZE = 1000          # max candles per Binance request
REQUEST_DELAY = 0.35       # seconds between requests — stays under rate limit
REQUEST_TIMEOUT = 20

# CMC symbol → Binance trading pair (USDT quoted)
# USDT is a stablecoin — skip it (no meaningful OHLCV vs itself)
CMC_TO_BINANCE: dict[str, str] = {
    "BTC":  "BTCUSDT",
    "ETH":  "ETHUSDT",
    "XRP":  "XRPUSDT",
    "BNB":  "BNBUSDT",
    "SOL":  "SOLUSDT",
    "TRX":  "TRXUSDT",
    "DOGE": "DOGEUSDT",
    "BCH":  "BCHUSDT",
    "ADA":  "ADAUSDT",
    "LINK": "LINKUSDT",
    "XLM":  "XLMUSDT",
    "LTC":  "LTCUSDT",
    "AVAX": "AVAXUSDT",
    "SHIB": "SHIBUSDT",
    "TON":  "TONUSDT",
}

# Farsi DB symbol for each CMC symbol (mirrors config/crypto_symbols.py)
CMC_TO_FA: dict[str, str] = {
    "BTC":  "بیت‌کوین",
    "ETH":  "اتریوم",
    "XRP":  "ریپل",
    "BNB":  "بایننس کوین",
    "SOL":  "سولانا",
    "TRX":  "ترون",
    "DOGE": "دوج‌کوین",
    "BCH":  "بیت‌کوین کش",
    "ADA":  "کاردانو",
    "LINK": "چین‌لینک",
    "XLM":  "استلار",
    "LTC":  "لایت‌کوین",
    "AVAX": "آوالانچ",
    "SHIB": "شیبا اینو",
    "TON":  "تون‌کوین",
}


# ── Binance fetcher ───────────────────────────────────────────────────────────

def fetch_klines(binance_symbol: str, start_ms: int, end_ms: int) -> list[list]:
    """
    Fetch one batch of daily klines from Binance.

    Binance kline columns:
        [0]  open_time (ms)
        [1]  open
        [2]  high
        [3]  low
        [4]  close
        [5]  volume (base asset)
        [6]  close_time (ms)
        [7]  quote_asset_volume (turnover in USDT)
        ...
    """
    params = {
        "symbol":    binance_symbol,
        "interval":  INTERVAL,
        "startTime": start_ms,
        "endTime":   end_ms,
        "limit":     BATCH_SIZE,
    }
    resp = requests.get(BINANCE_KLINES_URL, params=params, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def fetch_all_klines(binance_symbol: str, since_ms: int) -> list[list]:
    """
    Page through Binance klines from `since_ms` up to now,
    collecting BATCH_SIZE candles per request.
    """
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    all_candles: list[list] = []
    cursor = since_ms

    while cursor < now_ms:
        batch = fetch_klines(binance_symbol, cursor, now_ms)
        if not batch:
            break
        all_candles.extend(batch)
        # Move cursor past the last candle's open_time
        last_open_ms = batch[-1][0]
        cursor = last_open_ms + 86_400_000  # +1 day in ms
        logger.debug("  fetched %d candles, cursor=%s", len(batch), _ms_to_dt(last_open_ms))
        if len(batch) < BATCH_SIZE:
            break  # last page
        time.sleep(REQUEST_DELAY)

    return all_candles


def _ms_to_dt(ms: int) -> datetime:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_security_map(session) -> dict[str, int]:
    """Return {fa_symbol: security_id} for active crypto securities."""
    rows = (
        session.query(Security.symbol, Security.security_id)
        .filter(Security.market_type == "crypto", Security.is_active.is_(True))
        .all()
    )
    return {r.symbol: r.security_id for r in rows}


def upsert_candles(session, security_id: int, candles: list[list], dry_run: bool) -> int:
    """
    Bulk-upsert Binance kline rows into crypto_ohlcv.
    ON CONFLICT DO NOTHING — preserves any existing data.
    Returns number of rows inserted.
    """
    rows = []
    for c in candles:
        open_time = _ms_to_dt(c[0])
        rows.append({
            "security_id": security_id,
            "interval":    "1day",
            "open_time":   open_time,
            "open":        Decimal(c[1]),
            "high":        Decimal(c[2]),
            "low":         Decimal(c[3]),
            "close":       Decimal(c[4]),
            "volume":      Decimal(c[5]),
            "turnover":    Decimal(c[7]),  # quote asset volume = USDT turnover
        })

    if not rows:
        return 0

    if dry_run:
        logger.info("    [dry-run] would insert %d rows", len(rows))
        return len(rows)

    stmt = insert(CryptoOHLCV).values(rows)
    stmt = stmt.on_conflict_do_nothing(
        constraint="uq_crypto_ohlcv_sec_interval_time"
    )
    session.execute(stmt)
    session.commit()
    return len(rows)


# ── Main ──────────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(description="Backfill crypto OHLCV from Binance")
    parser.add_argument(
        "--symbols", nargs="+", metavar="CMC_SYMBOL",
        help="CMC symbols to backfill (e.g. BTC ETH SOL). Default: all tracked coins.",
    )
    parser.add_argument(
        "--from", dest="since", metavar="YYYY-MM-DD", default="2017-01-01",
        help="Start date for backfill (default: 2017-01-01).",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Fetch data but do not write to the database.",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    since_dt = datetime.strptime(args.since, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    since_ms = int(since_dt.timestamp() * 1000)

    target_symbols = args.symbols or list(CMC_TO_BINANCE.keys())
    invalid = [s for s in target_symbols if s not in CMC_TO_BINANCE]
    if invalid:
        logger.error("Unknown symbols: %s. Valid: %s", invalid, list(CMC_TO_BINANCE.keys()))
        sys.exit(1)

    logger.info("Starting crypto OHLCV backfill from %s", args.since)
    logger.info("Coins: %s", target_symbols)
    if args.dry_run:
        logger.info("DRY RUN — no data will be written")

    db_manager = get_db_manager(DATABASE_URL)
    total_inserted = 0

    with db_manager.get_session() as session:
        security_map = get_security_map(session)

        for cmc_symbol in target_symbols:
            fa_symbol = CMC_TO_FA[cmc_symbol]
            binance_symbol = CMC_TO_BINANCE[cmc_symbol]
            security_id = security_map.get(fa_symbol)

            if security_id is None:
                logger.warning("%-6s  not found in DB (fa='%s') — skipping", cmc_symbol, fa_symbol)
                continue

            logger.info("%-6s  fetching %s from Binance...", cmc_symbol, binance_symbol)
            try:
                candles = fetch_all_klines(binance_symbol, since_ms)
            except requests.RequestException as e:
                logger.error("%-6s  Binance request failed: %s", cmc_symbol, e)
                continue

            if not candles:
                logger.warning("%-6s  no candles returned", cmc_symbol)
                continue

            first_dt = _ms_to_dt(candles[0][0]).date()
            last_dt  = _ms_to_dt(candles[-1][0]).date()
            logger.info("%-6s  %d candles  [%s → %s]", cmc_symbol, len(candles), first_dt, last_dt)

            inserted = upsert_candles(session, security_id, candles, args.dry_run)
            total_inserted += inserted
            logger.info("%-6s  upserted %d rows", cmc_symbol, inserted)

            time.sleep(REQUEST_DELAY)

    logger.info("Done. Total rows upserted: %d", total_inserted)


if __name__ == "__main__":
    main()
