"""
Per-user daily LLM call budget for chat / RAG endpoints.

Mirrors the BrsAPI daily budget guard, but keyed by (user_id, day) and
charged per *request* (not per token). Each chat / RAG call counts once
against the user's daily allowance, regardless of how many tool rounds
or how many tokens the underlying agent loop consumes.

Per-role limits (override via env):
  - viewer  → LLM_DAILY_LIMIT_VIEWER  (default 100 calls/day)
  - trader  → LLM_DAILY_LIMIT_TRADER  (default 500 calls/day)
  - admin   → LLM_DAILY_LIMIT_ADMIN   (default 0 → unlimited)

A flat per-call cap doesn't price-discriminate cheap vs expensive
endpoints (a 1-round /api/rag/chat costs as much budget as a 14-round
/api/rag/financial-analysis), but it does the main job of preventing
runaway cost amplification from a single compromised account or a
prompt-engineered loop. Token-level accounting is a follow-up; the
agent layer doesn't surface aggregate token counts cleanly today.

Reset: midnight Tehran-local. TTL is set to next-midnight + 1h grace.

Fail-open on Redis errors so a Redis blip doesn't deny legitimate
chat traffic. Logs loud errors for operator visibility.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta

import pytz

logger = logging.getLogger(__name__)

DAILY_LIMITS = {
    "viewer": int(os.getenv("LLM_DAILY_LIMIT_VIEWER", "100")),
    "trader": int(os.getenv("LLM_DAILY_LIMIT_TRADER", "500")),
    "admin": int(os.getenv("LLM_DAILY_LIMIT_ADMIN", "0")),  # 0 = unlimited
}
TZ = pytz.timezone(os.getenv("TIMEZONE", "Asia/Tehran"))
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
WARN_THRESHOLDS = (80, 95)


def limit_for(role: str) -> int:
    """Return the daily limit for a role (0 = unlimited)."""
    return DAILY_LIMITS.get(role, DAILY_LIMITS["viewer"])


def _today_str() -> str:
    return datetime.now(TZ).strftime("%Y%m%d")


def _key(user_id: int) -> str:
    return f"llm:budget:{user_id}:{_today_str()}"


def _warn_flag_key(user_id: int, pct: int) -> str:
    return f"llm:budget:warned:{user_id}:{pct}:{_today_str()}"


def _seconds_until_midnight() -> int:
    now = datetime.now(TZ)
    midnight = (now + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return int((midnight - now).total_seconds()) + 3600


_async_client = None


async def _client():
    global _async_client
    if _async_client is None:
        import redis.asyncio as aioredis

        _async_client = aioredis.from_url(
            REDIS_URL, decode_responses=True, socket_timeout=2
        )
    return _async_client


async def consume_async(user_id: int, role: str, n: int = 1) -> tuple[bool, int, int]:
    """Reserve ``n`` calls against today's budget for ``user_id``.

    Returns ``(allowed, used_after, limit)``. When ``limit == 0`` the role
    is unlimited and ``allowed`` is always True.
    """
    limit = limit_for(role)
    if limit <= 0:
        return True, 0, 0
    try:
        r = await _client()
        key = _key(user_id)
        used = await r.incrby(key, n)
        if used <= n:
            await r.expire(key, _seconds_until_midnight())
        if used > limit:
            return False, used, limit
        await _maybe_warn(r, user_id, used, limit)
        return True, used, limit
    except Exception as exc:
        logger.error(
            "LLM budget guard: Redis unreachable, failing open for user=%s: %s",
            user_id,
            exc,
        )
        return True, 0, limit


async def peek_async(user_id: int, role: str) -> tuple[int, int]:
    """Return ``(used, limit)`` without incrementing. ``limit == 0`` = unlimited."""
    limit = limit_for(role)
    if limit <= 0:
        return 0, 0
    try:
        r = await _client()
        used = int(await r.get(_key(user_id)) or 0)
        return used, limit
    except Exception:
        return 0, limit


async def refund_async(user_id: int, role: str, n: int = 1) -> None:
    """Decrement the counter when a reserved call did not actually run.

    Used when the LLM call fails before consuming any upstream cost.
    Safe to call even when the role is unlimited or Redis is down.
    """
    limit = limit_for(role)
    if limit <= 0:
        return
    try:
        r = await _client()
        await r.decrby(_key(user_id), n)
    except Exception:
        pass


async def _maybe_warn(r, user_id: int, used: int, limit: int) -> None:
    for pct in WARN_THRESHOLDS:
        if used >= limit * pct / 100:
            try:
                if await r.set(_warn_flag_key(user_id, pct), "1", nx=True, ex=86400 * 2):
                    logger.warning(
                        "LLM daily budget at %d%% for user=%s (%d/%d)",
                        pct,
                        user_id,
                        used,
                        limit,
                    )
            except Exception:
                pass


# ── FastAPI dependency ────────────────────────────────────────────────────────

from fastapi import Depends, HTTPException

from api.auth import get_current_user


async def consume_llm_call(user=Depends(get_current_user)):
    """FastAPI dependency: charge 1 call against the user's daily LLM budget.

    Raises HTTPException(429) when the daily allowance is exhausted; otherwise
    returns the authenticated user object. Drop-in replacement for
    ``Depends(get_current_user)`` on chat/RAG endpoints.
    """
    allowed, used, limit = await consume_async(user.id, user.role)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Daily LLM call budget exhausted ({used}/{limit}). "
                "Resets at midnight Tehran."
            ),
        )
    return user
