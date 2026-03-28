"""
services/news_ingestor.py
~~~~~~~~~~~~~~~~~~~~~~~~~
Real-time news ingestor using Telethon (MTProto).

Subscribes to new messages in multiple Telegram news channels (configured via
TELEGRAM_NEWS_CHANNELS env var, comma-separated) and inserts parsed articles
into the news_articles table.

Each incoming message is published to Redis channel ``tse:live:news`` so
WebSocket clients receive live news updates.

Environment variables
---------------------
TELEGRAM_API_ID         Integer app ID from my.telegram.org (required)
TELEGRAM_API_HASH       App hash from my.telegram.org (required)
TELEGRAM_SESSION        StringSession string from --auth flow (required in Docker)
TELEGRAM_NEWS_CHANNELS  Comma-separated channel usernames (default: taborseiran,baborsenews)
DATABASE_URL            PostgreSQL connection string (required)
REDIS_URL               Redis URL for live pub/sub (default: redis://redis:6379/0)
"""

import asyncio
import json
import logging
import os
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

# -- Config --------------------------------------------------------------------
TELEGRAM_API_ID   = int(os.environ.get("TELEGRAM_API_ID", "0"))
TELEGRAM_API_HASH = os.environ.get("TELEGRAM_API_HASH", "")
TELEGRAM_SESSION  = os.environ.get("TELEGRAM_SESSION", "")
TELEGRAM_NEWS_CHANNELS = os.environ.get("TELEGRAM_NEWS_CHANNELS", "taborseiran,baborsenews")
DATABASE_URL      = os.environ.get("DATABASE_URL", "")
REDIS_URL         = os.environ.get("REDIS_URL", "redis://redis:6379/0")

# -- Logging -------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
log = logging.getLogger("news_ingestor")


# -- Database (asyncpg) -------------------------------------------------------

async def _get_db_pool():
    import asyncpg
    # asyncpg doesn't accept ?sslmode=... style params -- strip them
    url = DATABASE_URL.split("?")[0]
    return await asyncpg.create_pool(url, min_size=1, max_size=3)


async def _insert_article(pool, article: dict) -> bool:
    """INSERT ... ON CONFLICT (url) DO NOTHING -- safe to call with duplicates.

    Returns True if a row was actually inserted, False on duplicate.
    """
    async with pool.acquire() as conn:
        try:
            result = await conn.execute(
                """
                INSERT INTO news_articles
                    (source, source_type, title, body, url, published_at,
                     fetched_at, language, category, tags, related_symbols)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (url) DO NOTHING
                """,
                article["source"],
                article["source_type"],
                article["title"],
                article["body"],
                article["url"],
                article["published_at"],
                article["fetched_at"],
                article["language"],
                article.get("category"),
                json.dumps(article.get("tags", [])),
                json.dumps(article.get("related_symbols", [])),
            )
            return result == "INSERT 0 1"
        except Exception as e:
            # Handle unique constraint or any other DB error gracefully
            log.warning(f"DB insert failed (duplicate or error): {e}")
            return False


# -- Redis pub/sub -------------------------------------------------------------

async def _publish_redis(redis, article: dict):
    """Publish new article to Redis so WebSocket clients get live updates."""
    try:
        payload = json.dumps({
            "type":         "news_article",
            "source":       article["source"],
            "source_type":  article["source_type"],
            "title":        article["title"],
            "published_at": article["published_at"].isoformat(),
            "category":     article.get("category"),
        })
        await redis.publish("tse:live:news", payload)
    except Exception as e:
        log.warning(f"Redis publish failed: {e}")


# -- Message parsing -----------------------------------------------------------

def _parse_news_message(msg, channel_title: str) -> dict | None:
    """Parse a Telegram message into a news_articles row dict, or None."""
    if not msg.text:
        return None

    text = msg.text.strip()
    if not text:
        return None

    # First line = title, full text = body
    lines = text.split("\n", 1)
    title = lines[0].strip()
    body = text

    if not title:
        return None

    # Build a pseudo-URL from channel + msg_id for uniqueness
    channel_username = getattr(msg.chat, "username", None) or str(msg.chat_id)
    url = f"https://t.me/{channel_username}/{msg.id}"

    return {
        "source":          channel_title,
        "source_type":     "telegram",
        "title":           title[:500],
        "body":            body[:5000],
        "url":             url,
        "published_at":    msg.date.astimezone(UTC).replace(tzinfo=UTC),
        "fetched_at":      datetime.now(UTC),
        "language":        "fa",
        "category":        None,
        "tags":            [],
        "related_symbols": [],
    }


# -- Main ingestor ------------------------------------------------------------

async def run():
    from telethon import TelegramClient, events
    from telethon.sessions import StringSession

    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
        log.error("TELEGRAM_API_ID and TELEGRAM_API_HASH must be set.")
        sys.exit(1)

    channels = [ch.strip() for ch in TELEGRAM_NEWS_CHANNELS.split(",") if ch.strip()]
    if not channels:
        log.error("TELEGRAM_NEWS_CHANNELS is empty -- nothing to subscribe to.")
        sys.exit(1)

    log.info("=" * 70)
    log.info("  News Ingestor (Telethon) starting")
    log.info(f"  Channels : {', '.join(f'@{c}' for c in channels)}")
    log.info("=" * 70)

    # DB pool
    pool = await _get_db_pool()
    log.info("DB pool ready")

    # Redis (optional -- non-fatal if unavailable)
    redis = None
    try:
        import aioredis
        redis = await aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        log.info("Redis ready")
    except Exception as e:
        log.warning(f"Redis unavailable -- live pub/sub disabled: {e}")

    session = StringSession(TELEGRAM_SESSION) if TELEGRAM_SESSION else StringSession()
    client = TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH)

    await client.start()
    log.info(f"Telegram connected -- signed in as: {await client.get_me()}")

    # Resolve channel entities and build a {channel_id: title} map
    channel_entities = []
    channel_titles = {}
    for ch in channels:
        try:
            entity = await client.get_entity(ch)
            channel_entities.append(entity)
            channel_titles[entity.id] = getattr(entity, "title", ch)
            log.info(f"  Resolved @{ch} -> {channel_titles[entity.id]}")
        except Exception as e:
            log.error(f"  Failed to resolve @{ch}: {e}")

    if not channel_entities:
        log.error("No channels resolved -- exiting.")
        sys.exit(1)

    # -- Real-time event handler -----------------------------------------------
    inserted_total = 0

    @client.on(events.NewMessage(chats=channel_entities))
    async def handler(event):
        nonlocal inserted_total
        msg = event.message
        chat_id = event.chat_id
        channel_title = channel_titles.get(chat_id, str(chat_id))

        article = _parse_news_message(msg, channel_title)
        if article is None:
            return

        inserted = await _insert_article(pool, article)
        if inserted:
            inserted_total += 1
            log.info(
                f"[{channel_title}] {article['title'][:60]}  "
                f"total_inserted={inserted_total}"
            )
            if redis:
                await _publish_redis(redis, article)
        else:
            log.debug(f"[{channel_title}] Duplicate skipped: msg_id={msg.id}")

    log.info("Listening for new messages... (Ctrl+C to stop)")
    await client.run_until_disconnected()


if __name__ == "__main__":
    asyncio.run(run())
