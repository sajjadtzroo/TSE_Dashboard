"""
Backfill historical USD/IRR end-of-day summaries from Telegram channel.

Iterates ALL messages in the channel (oldest first), detects the EOD summary
format, parses OHLC data, and upserts into the dollar_eod table.

Safe to re-run — uses ON CONFLICT DO NOTHING.

Usage:
    python scripts/backfill_dollar_eod.py
    python scripts/backfill_dollar_eod.py --limit 1000   # only last N messages
    python scripts/backfill_dollar_eod.py --dry-run      # parse only, no DB writes
"""

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

try:
    from dotenv import load_dotenv
    load_dotenv(project_root / ".env")
except ImportError:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
log = logging.getLogger("backfill_dollar_eod")

TELEGRAM_API_ID   = int(os.environ.get("TELEGRAM_API_ID", "0"))
TELEGRAM_API_HASH = os.environ.get("TELEGRAM_API_HASH", "")
TELEGRAM_SESSION  = os.environ.get("TELEGRAM_SESSION", "")
TELEGRAM_CHANNEL  = os.environ.get("TELEGRAM_CHANNEL", "dollar_tehran3bze")
DATABASE_URL      = os.environ.get("DATABASE_URL", "")


async def main(limit: int | None, dry_run: bool):
    from telethon import TelegramClient
    from telethon.sessions import StringSession

    # Parser lives next to dollar_ingestor
    from services.dollar_eod_parser import is_eod_message, parse_eod

    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH or not TELEGRAM_SESSION:
        log.error("TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION must all be set.")
        sys.exit(1)

    # ── DB pool ───────────────────────────────────────────────────────────────
    pool = None
    usd_security_id = None
    if not dry_run:
        if not DATABASE_URL:
            log.error("DATABASE_URL must be set for DB writes.")
            sys.exit(1)
        import asyncpg
        pool = await asyncpg.create_pool(DATABASE_URL.split("?")[0], min_size=1, max_size=3)
        usd_security_id = await pool.fetchval(
            "SELECT security_id FROM securities WHERE symbol='USD' AND market_type='currency' LIMIT 1"
        )
        if not usd_security_id:
            log.error("USD not found in securities — run migration 018 first.")
            sys.exit(1)
        log.info(f"USD security_id: {usd_security_id}")

    # ── Telegram client ───────────────────────────────────────────────────────
    client = TelegramClient(StringSession(TELEGRAM_SESSION), TELEGRAM_API_ID, TELEGRAM_API_HASH)
    await client.start()
    log.info(f"Connected as: {(await client.get_me()).username}")

    # ── Iterate messages ──────────────────────────────────────────────────────
    log.info(f"Iterating messages from @{TELEGRAM_CHANNEL} (limit={limit or 'all'})…")

    found = 0
    inserted = 0
    skipped = 0
    total = 0

    async for msg in client.iter_messages(TELEGRAM_CHANNEL, limit=limit, reverse=False):
        total += 1
        if total % 500 == 0:
            log.info(f"  …scanned {total} messages, found {found} EOD summaries so far")

        if not msg.text:
            continue

        if not is_eod_message(msg.text):
            continue

        parsed = parse_eod(msg.text)
        if not parsed:
            log.debug(f"  EOD marker found but parse failed — msg_id={msg.id}")
            continue

        found += 1
        rt = parsed['rate_type'] or 'unknown'
        log.info(
            f"  [{parsed['trade_date']}] {rt:8}  "
            f"O={parsed['open'] or 0:,}  H={parsed['high'] or 0:,}  "
            f"L={parsed['low'] or 0:,}  C={parsed['close'] or 0:,}  "
            f"msg_id={msg.id}"
        )

        if dry_run:
            continue

        # Upsert — ON CONFLICT DO NOTHING (idempotent)
        result = await pool.execute(
            """
            INSERT INTO dollar_eod
                (security_id, trade_date, rate_type, open, high, low, close,
                 msg_id, channel, posted_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (security_id, trade_date, rate_type) DO NOTHING
            """,
            usd_security_id,
            parsed["trade_date"],
            parsed["rate_type"],
            parsed["open"],
            parsed["high"],
            parsed["low"],
            parsed["close"],
            msg.id,
            TELEGRAM_CHANNEL,
            msg.date,
        )
        if result == "INSERT 0 1":
            inserted += 1
        else:
            skipped += 1

    await client.disconnect()
    if pool:
        await pool.close()

    log.info("=" * 60)
    log.info(f"  Scanned  : {total:,} messages")
    log.info(f"  EOD found: {found}")
    if not dry_run:
        log.info(f"  Inserted : {inserted}")
        log.info(f"  Skipped  : {skipped} (already in DB)")
    log.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None,
                        help="Max messages to scan (default: all history)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Parse only, no DB writes")
    args = parser.parse_args()
    asyncio.run(main(limit=args.limit, dry_run=args.dry_run))
