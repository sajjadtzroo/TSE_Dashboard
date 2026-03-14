"""
services/dollar_ingestor.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~
Real-time USD/IRR rate ingestor using Telethon (MTProto).

Subscribes to new messages in a Telegram channel (default: dollar_tehran3bze)
and inserts parsed rates into the currency_rates TimescaleDB hypertable the
instant they are posted — no polling, no lag, no ban risk.

First-time setup (run once on your local machine to generate a session string):
    python services/dollar_ingestor.py --auth

This will prompt for your phone number and the code Telegram sends you, then
print a SESSION STRING. Set TELEGRAM_SESSION in .env to that value. The Docker
service then uses StringSession — no interactive login ever needed again.

Environment variables
---------------------
TELEGRAM_API_ID      Integer app ID from my.telegram.org (required)
TELEGRAM_API_HASH    App hash from my.telegram.org (required)
TELEGRAM_SESSION     StringSession string from --auth flow (required in Docker)
TELEGRAM_CHANNEL     Channel username without @ (default: dollar_tehran3bze)
TELEGRAM_BACKFILL    Number of recent messages to backfill on startup (default: 50)
DATABASE_URL         PostgreSQL connection string (required)
REDIS_URL            Redis URL for live pub/sub (default: redis://redis:6379/0)
"""

import asyncio
import json
import logging
import os
import re
import sys
from datetime import UTC, datetime
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Load .env when running locally (no-op inside Docker where env is injected)
try:
    from dotenv import load_dotenv
    load_dotenv(project_root / ".env")
except ImportError:
    pass

# ── Config ────────────────────────────────────────────────────────────────────
TELEGRAM_API_ID   = int(os.environ.get("TELEGRAM_API_ID", "0"))
TELEGRAM_API_HASH = os.environ.get("TELEGRAM_API_HASH", "")
TELEGRAM_SESSION  = os.environ.get("TELEGRAM_SESSION", "")
TELEGRAM_CHANNEL  = os.environ.get("TELEGRAM_CHANNEL", "dollar_tehran3bze")
TELEGRAM_BACKFILL = int(os.environ.get("TELEGRAM_BACKFILL", "50"))
DATABASE_URL      = os.environ.get("DATABASE_URL", "")
REDIS_URL         = os.environ.get("REDIS_URL", "redis://redis:6379/0")

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
log = logging.getLogger("dollar_ingestor")

# ── Parsing helpers (mirrors telegram_dollar spider) ─────────────────────────
_TATWEEL_RE = re.compile(r"\u0640+")
_PRICE_RE   = re.compile(r"[\d,٠-٩۰-۹]+")

_SPOT_KW    = "نقد"
_FORWARD_KW = "فردا"
_BUY_KW     = "خرید"
_SELL_KW    = "فروش"
_TRADED_KW  = "معامله"

_PERSIAN_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")


def _to_english(text: str) -> str:
    return text.translate(_PERSIAN_DIGITS)


def _normalize(text: str) -> str:
    return _TATWEEL_RE.sub("", text)


def _classify(text: str):
    """Return (rate_type, side) or (None, None) if not a dollar rate message."""
    t = _normalize(text)
    if _SPOT_KW in t:
        rate_type = "spot"
    elif _FORWARD_KW in t:
        rate_type = "forward"
    else:
        return None, None

    if _BUY_KW in t:
        side = "buy"
    elif _SELL_KW in t:
        side = "sell"
    elif _TRADED_KW in t:
        side = "traded"
    else:
        return None, None

    return rate_type, side


def _extract_price(text: str):
    candidates = _PRICE_RE.findall(_to_english(text))
    numbers = []
    for c in candidates:
        try:
            numbers.append(int(c.replace(",", "")))
        except ValueError:
            pass
    if not numbers:
        return None
    val = max(numbers)
    return val if val > 10_000 else None


def _parse_message(msg_id: int, text: str, posted_at: datetime, channel: str, security_id: int):
    """Parse a Telegram message into a currency_rates row dict, or None."""
    rate_type, side = _classify(text)
    if rate_type is None:
        return None
    price = _extract_price(text)
    if price is None:
        return None
    return {
        "security_id": security_id,
        "msg_id":    msg_id,
        "channel":   channel,
        "rate_type": rate_type,
        "side":      side,
        "price":     price,
        "raw_text":  text[:500],
        "posted_at": posted_at.astimezone(UTC).replace(tzinfo=UTC),
        "scraped_at": datetime.now(UTC),
    }


# ── Database (asyncpg) ────────────────────────────────────────────────────────

async def _get_db_pool():
    import asyncpg
    # asyncpg doesn't accept ?sslmode=... style params — strip them
    url = DATABASE_URL.split("?")[0]
    return await asyncpg.create_pool(url, min_size=1, max_size=3)


async def _upsert(pool, rows: list[dict]):
    """INSERT ... ON CONFLICT DO NOTHING — safe to call with duplicates."""
    if not rows:
        return 0
    async with pool.acquire() as conn:
        result = await conn.executemany(
            """
            INSERT INTO currency_rates
                (security_id, posted_at, msg_id, channel, rate_type, side, price, raw_text, scraped_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT ON CONSTRAINT pk_currency_rates DO NOTHING
            """,
            [
                (
                    r["security_id"], r["posted_at"], r["msg_id"], r["channel"],
                    r["rate_type"], r["side"], r["price"],
                    r["raw_text"], r["scraped_at"],
                )
                for r in rows
            ],
        )
    return len(rows)


async def _get_last_msg_id(pool, channel: str) -> int:
    async with pool.acquire() as conn:
        val = await conn.fetchval(
            "SELECT MAX(msg_id) FROM currency_rates WHERE channel = $1", channel
        )
    return val or 0


# ── Redis pub/sub ─────────────────────────────────────────────────────────────

async def _publish_redis(redis, row: dict):
    """Publish latest rate to Redis so WebSocket clients can get live updates."""
    try:
        payload = json.dumps({
            "type":      "dollar_rate",
            "rate_type": row["rate_type"],
            "side":      row["side"],
            "price":     row["price"],
            "posted_at": row["posted_at"].isoformat(),
            "channel":   row["channel"],
        })
        await redis.publish("currency_rates", payload)
    except Exception as e:
        log.warning(f"Redis publish failed: {e}")


# ── Main ingestor ─────────────────────────────────────────────────────────────

async def run():
    from telethon import TelegramClient, events
    from telethon.sessions import StringSession

    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
        log.error("TELEGRAM_API_ID and TELEGRAM_API_HASH must be set. Run --auth to generate a session.")
        sys.exit(1)

    log.info("=" * 70)
    log.info("  Dollar Ingestor (Telethon) starting")
    log.info(f"  Channel  : @{TELEGRAM_CHANNEL}")
    log.info(f"  Backfill : {TELEGRAM_BACKFILL} messages")
    log.info("=" * 70)

    # DB pool
    pool = await _get_db_pool()
    log.info("DB pool ready")

    # Resolve USD security_id
    usd_security_id = await pool.fetchval(
        "SELECT security_id FROM securities WHERE symbol = 'USD' AND market_type = 'currency' LIMIT 1"
    )
    if not usd_security_id:
        log.error("USD not found in securities table — run alembic migration 018 first")
        sys.exit(1)
    log.info(f"USD security_id: {usd_security_id}")

    # Redis (optional — non-fatal if unavailable)
    redis = None
    try:
        import aioredis
        redis = await aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        log.info("Redis ready")
    except Exception as e:
        log.warning(f"Redis unavailable — live pub/sub disabled: {e}")

    session = StringSession(TELEGRAM_SESSION) if TELEGRAM_SESSION else StringSession()
    client = TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH)

    await client.start()
    log.info(f"Telegram connected — signed in as: {await client.get_me()}")

    # ── Backfill recent messages missed while service was down ────────────────
    last_id = await _get_last_msg_id(pool, TELEGRAM_CHANNEL)
    log.info(f"Last stored msg_id: {last_id} — backfilling up to {TELEGRAM_BACKFILL} messages")

    backfill_rows = []
    async for msg in client.iter_messages(TELEGRAM_CHANNEL, limit=TELEGRAM_BACKFILL):
        if msg.id <= last_id:
            break
        if not msg.text:
            continue
        row = _parse_message(msg.id, msg.text, msg.date, TELEGRAM_CHANNEL, usd_security_id)
        if row:
            backfill_rows.append(row)

    if backfill_rows:
        count = await _upsert(pool, backfill_rows)
        log.info(f"Backfill complete — inserted {count} rows")
    else:
        log.info("Backfill complete — no new messages")

    # ── Real-time event handler ───────────────────────────────────────────────
    from services.dollar_eod_parser import is_eod_message, parse_eod

    inserted_total = 0
    eod_total = 0

    @client.on(events.NewMessage(chats=TELEGRAM_CHANNEL))
    async def handler(event):
        nonlocal inserted_total, eod_total
        msg = event.message
        if not msg.text:
            return

        # ── EOD summary (end-of-day OHLC) ────────────────────────────────────
        if is_eod_message(msg.text):
            parsed = parse_eod(msg.text)
            if parsed:
                await pool.execute(
                    """
                    INSERT INTO dollar_eod
                        (security_id, trade_date, rate_type, open, high, low, close,
                         msg_id, channel, posted_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (security_id, trade_date, rate_type) DO NOTHING
                    """,
                    usd_security_id, parsed["trade_date"], parsed["rate_type"],
                    parsed["open"], parsed["high"], parsed["low"], parsed["close"],
                    msg.id, TELEGRAM_CHANNEL, msg.date,
                )
                eod_total += 1
                log.info(
                    f"[EOD|{parsed['rate_type']:8}] "
                    f"{parsed['trade_date']}  "
                    f"O={parsed['open']:,}  H={parsed['high']:,}  "
                    f"L={parsed['low']:,}  C={parsed['close']:,}"
                )
            return  # EOD messages are not regular rate ticks

        # ── Regular rate tick ─────────────────────────────────────────────────
        row = _parse_message(msg.id, msg.text, msg.date, TELEGRAM_CHANNEL, usd_security_id)
        if row is None:
            return

        await _upsert(pool, [row])
        inserted_total += 1
        log.info(
            f"[{row['rate_type']:7}|{row['side']:6}] "
            f"price={row['price']:,}  msg_id={msg.id}  "
            f"total_inserted={inserted_total}"
        )

        if redis:
            await _publish_redis(redis, row)

    log.info("Listening for new messages... (Ctrl+C to stop)")
    await client.run_until_disconnected()


# ── Auth helper (run once locally to generate session string) ─────────────────

async def auth():
    from telethon import TelegramClient
    from telethon.sessions import StringSession

    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
        print("ERROR: Set TELEGRAM_API_ID and TELEGRAM_API_HASH first.")
        sys.exit(1)

    print("Starting Telegram auth flow...")
    client = TelegramClient(StringSession(), TELEGRAM_API_ID, TELEGRAM_API_HASH)
    await client.start()

    session_str = client.session.save()
    await client.disconnect()

    print("\n" + "=" * 70)
    print("  AUTH COMPLETE — copy the string below into your .env:")
    print("=" * 70)
    print(f"\nTELEGRAM_SESSION={session_str}\n")
    print("=" * 70)


if __name__ == "__main__":
    if "--auth" in sys.argv:
        asyncio.run(auth())
    else:
        asyncio.run(run())
