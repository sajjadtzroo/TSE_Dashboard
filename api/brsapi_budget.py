"""
Daily request-budget guard for BrsAPI calls.

A single Redis counter keyed by the Tehran-local date is shared by every
BrsAPI caller (Scrapy spiders + tick_ingestor). Each caller pre-increments
before the HTTP request; if the increment puts us over the daily limit, the
request is dropped. Pre-incrementing trades a small over-count at the edge
(when the cap is hit under concurrency) for race-safety against under-count.

Limit: ``BRSAPI_DAILY_LIMIT`` env (default 10000).

Fail-open on Redis errors — better to risk a brief over-quota window than to
halt the entire scraping pipeline when Redis blips. The error is logged
loudly so the operator notices.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta

import pytz

logger = logging.getLogger(__name__)

DAILY_LIMIT = int(os.getenv("BRSAPI_DAILY_LIMIT", "10000"))
TZ = pytz.timezone(os.getenv("TIMEZONE", "Asia/Tehran"))
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Log once when crossing each percent of the daily limit.
WARN_THRESHOLDS = (80, 95)


def _today_str() -> str:
    return datetime.now(TZ).strftime("%Y%m%d")


def _today_key() -> str:
    return f"brsapi:budget:{_today_str()}"


def _warn_flag_key(pct: int) -> str:
    return f"brsapi:budget:warned:{pct}:{_today_str()}"


def _seconds_until_midnight() -> int:
    """Seconds from now to next Tehran midnight, plus 1h grace."""
    now = datetime.now(TZ)
    midnight = (now + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return int((midnight - now).total_seconds()) + 3600


# ── Sync API (Scrapy middleware) ──────────────────────────────────────────────

_sync_client = None


def _get_sync_client():
    global _sync_client
    if _sync_client is None:
        import redis

        _sync_client = redis.from_url(
            REDIS_URL, decode_responses=True, socket_timeout=2
        )
    return _sync_client


def consume_sync(n: int = 1) -> tuple[bool, int, int]:
    """Reserve ``n`` requests against today's budget atomically.

    Returns ``(allowed, used_after, limit)``. When ``allowed`` is False the
    counter has still been incremented; the caller drops the request and the
    over-count is bounded by the number of in-flight requests.
    """
    try:
        r = _get_sync_client()
        key = _today_key()
        used = r.incrby(key, n)
        if used <= n:
            r.expire(key, _seconds_until_midnight())
        if used > DAILY_LIMIT:
            return False, used, DAILY_LIMIT
        _maybe_warn_sync(r, used)
        return True, used, DAILY_LIMIT
    except Exception as exc:
        logger.error("BrsAPI budget guard: Redis unreachable, failing open: %s", exc)
        return True, 0, DAILY_LIMIT


def peek_sync() -> tuple[int, int]:
    try:
        r = _get_sync_client()
        used = int(r.get(_today_key()) or 0)
        return used, DAILY_LIMIT
    except Exception:
        return 0, DAILY_LIMIT


def _maybe_warn_sync(r, used: int) -> None:
    for pct in WARN_THRESHOLDS:
        if used >= DAILY_LIMIT * pct / 100:
            try:
                if r.set(_warn_flag_key(pct), "1", nx=True, ex=86400 * 2):
                    logger.warning(
                        "BrsAPI daily budget at %d%% (%d/%d)",
                        pct,
                        used,
                        DAILY_LIMIT,
                    )
            except Exception:
                pass


# ── Async API (tick_ingestor) ─────────────────────────────────────────────────

_async_client = None


async def _get_async_client():
    global _async_client
    if _async_client is None:
        import redis.asyncio as aioredis

        _async_client = aioredis.from_url(
            REDIS_URL, decode_responses=True, socket_timeout=2
        )
    return _async_client


async def consume_async(n: int = 1) -> tuple[bool, int, int]:
    try:
        r = await _get_async_client()
        key = _today_key()
        used = await r.incrby(key, n)
        if used <= n:
            await r.expire(key, _seconds_until_midnight())
        if used > DAILY_LIMIT:
            return False, used, DAILY_LIMIT
        await _maybe_warn_async(r, used)
        return True, used, DAILY_LIMIT
    except Exception as exc:
        logger.error("BrsAPI budget guard: Redis unreachable, failing open: %s", exc)
        return True, 0, DAILY_LIMIT


async def peek_async() -> tuple[int, int]:
    try:
        r = await _get_async_client()
        used = int(await r.get(_today_key()) or 0)
        return used, DAILY_LIMIT
    except Exception:
        return 0, DAILY_LIMIT


async def _maybe_warn_async(r, used: int) -> None:
    for pct in WARN_THRESHOLDS:
        if used >= DAILY_LIMIT * pct / 100:
            try:
                if await r.set(_warn_flag_key(pct), "1", nx=True, ex=86400 * 2):
                    logger.warning(
                        "BrsAPI daily budget at %d%% (%d/%d)",
                        pct,
                        used,
                        DAILY_LIMIT,
                    )
            except Exception:
                pass
