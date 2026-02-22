"""
services/tick_ingestor.py
~~~~~~~~~~~~~~~~~~~~~~~~~
Real-time tick data ingestor for TSE market data.

Polls BrsAPI Transaction endpoint every TICK_POLL_INTERVAL seconds during
market hours (Sat-Wed 09:00-12:30 Tehran), batch-inserts new ticks into the
TimescaleDB tick_trades hypertable, then publishes a summary to Redis so
WebSocket clients get live updates.

Prometheus metrics are exposed at :9091/metrics.

Environment variables
---------------------
DATABASE_URL          PostgreSQL connection string (required)
BRSAPI_KEY            BrsAPI key (required)
REDIS_URL             Redis URL (default: redis://redis:6379/0)
HTTP_PROXY            SOCKS5 or HTTP proxy for BrsAPI (optional)
                      e.g. socks5h://gost:1080
TICK_POLL_INTERVAL    Seconds between polls (default: 15)
TICK_CONCURRENCY      Max concurrent BrsAPI requests (default: 50)
TICK_METRICS_PORT     Prometheus metrics port (default: 9091)
TIMEZONE              Timezone string (default: Asia/Tehran)
"""

import asyncio
import json
import logging
import os
import signal
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path

import asyncpg
import pytz

# ── Prometheus metrics ────────────────────────────────────────────────────────
from prometheus_client import Counter, Gauge, Histogram, start_http_server

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# ── Config ────────────────────────────────────────────────────────────────────
DATABASE_URL    = os.environ["DATABASE_URL"]
BRSAPI_KEY      = os.environ.get("BRSAPI_KEY", "")
REDIS_URL       = os.environ.get("REDIS_URL", "redis://redis:6379/0")
HTTP_PROXY      = os.environ.get("HTTP_PROXY") or os.environ.get("HTTPS_PROXY")
POLL_INTERVAL   = int(os.environ.get("TICK_POLL_INTERVAL", "15"))
CONCURRENCY     = int(os.environ.get("TICK_CONCURRENCY", "50"))
METRICS_PORT    = int(os.environ.get("TICK_METRICS_PORT", "9091"))
TZ_NAME         = os.environ.get("TIMEZONE", "Asia/Tehran")

BRSAPI_BASE = "https://BrsApi.ir/Api/Tsetmc/Transaction.php"

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    handlers=[logging.StreamHandler()],
)
log = logging.getLogger("tick_ingestor")

# ── Prometheus metrics ────────────────────────────────────────────────────────
ticks_ingested_total = Counter(
    "tick_ingestor_ticks_ingested_total",
    "Total tick rows written to tick_trades",
)
poll_duration_seconds = Histogram(
    "tick_ingestor_poll_duration_seconds",
    "Wall-clock time for one full poll cycle",
    buckets=[1, 2, 5, 10, 15, 20, 30, 60],
)
symbols_active = Gauge(
    "tick_ingestor_symbols_active",
    "Number of symbols being polled this cycle",
)
last_tick_age_seconds = Gauge(
    "tick_ingestor_last_tick_age_seconds",
    "Seconds since the most recent tick was received from BrsAPI",
)
api_errors_total = Counter(
    "tick_ingestor_api_errors_total",
    "BrsAPI fetch/parse errors",
    ["reason"],
)
db_insert_errors_total = Counter(
    "tick_ingestor_db_insert_errors_total",
    "Database insert errors",
)

# ── Helpers ───────────────────────────────────────────────────────────────────

TZ = pytz.timezone(TZ_NAME)
MARKET_OPEN  = (9,  0)
MARKET_CLOSE = (12, 30)
# Sat=5, Sun=6, Mon=0, Tue=1, Wed=2  — market days in Python weekday()
MARKET_DAYS  = {5, 6, 0, 1, 2}


def _now_tehran() -> datetime:
    return datetime.now(TZ)


def _is_market_open() -> bool:
    now = _now_tehran()
    if now.weekday() not in MARKET_DAYS:
        return False
    t = (now.hour, now.minute)
    return MARKET_OPEN <= t <= MARKET_CLOSE


def _parse_tick_time(row_time: str, trade_date: date) -> datetime:
    """Convert BrsAPI hEven string (HHMMSS or HHMM) to TIMESTAMPTZ."""
    s = str(row_time).zfill(6) if row_time else "090000"
    try:
        h, m, sec = int(s[:2]), int(s[2:4]), int(s[4:6])
    except (ValueError, IndexError):
        h, m, sec = 9, 0, 0
    naive = datetime(trade_date.year, trade_date.month, trade_date.day, h, m, sec)
    return TZ.localize(naive)


def _to_int(v) -> int | None:
    try:
        return int(v) if v is not None else None
    except (ValueError, TypeError):
        return None


def _to_float(v) -> float | None:
    try:
        return float(str(v).replace(",", "")) if v is not None else None
    except (ValueError, TypeError):
        return None


# ── Database helpers ──────────────────────────────────────────────────────────

async def _build_asyncpg_dsn(url: str) -> str:
    """Convert SQLAlchemy-style postgresql:// URL to asyncpg-compatible DSN."""
    return url.replace("postgresql+asyncpg://", "postgresql://") \
              .replace("postgresql+psycopg2://", "postgresql://")


async def _load_symbols(pool: asyncpg.Pool) -> dict[str, int]:
    """Return {symbol: security_id} for all active TSE securities."""
    rows = await pool.fetch("""
        SELECT symbol, security_id
        FROM   securities
        WHERE  is_active = TRUE
          AND  market_type = 'tse'
          AND  ins_code IS NOT NULL
    """)
    return {r["symbol"]: r["security_id"] for r in rows}


# ── BrsAPI fetcher ────────────────────────────────────────────────────────────

async def _fetch_ticks(
    session,
    symbol: str,
    semaphore: asyncio.Semaphore,
    trade_date: date,
) -> list[dict]:
    """Fetch and parse tick trades for one symbol. Returns list of row dicts."""
    url = f"{BRSAPI_BASE}?key={BRSAPI_KEY}&l18={symbol}"
    async with semaphore:
        try:
            async with session.get(url, timeout=20) as resp:
                if resp.status != 200:
                    api_errors_total.labels(reason="http_error").inc()
                    return []
                text = await resp.text()
        except Exception as exc:
            api_errors_total.labels(reason="network").inc()
            log.debug(f"Network error for {symbol}: {exc}")
            return []

    try:
        raw = json.loads(text)
    except json.JSONDecodeError:
        api_errors_total.labels(reason="json").inc()
        return []

    if isinstance(raw, dict):
        if not raw.get("successful"):
            api_errors_total.labels(reason="unsuccessful").inc()
            return []
        data = raw.get("data", [])
    elif isinstance(raw, list):
        data = raw
    else:
        api_errors_total.labels(reason="unexpected_format").inc()
        return []

    results = []
    ins_code = None
    if data:
        ins_code = _to_int(data[0].get("id") or data[0].get("ins_code"))

    for idx, rec in enumerate(data):
        row_num = _to_int(rec.get("nTran") or rec.get("row")) or (idx + 1)
        time_str = rec.get("hEven") or rec.get("time") or ""
        price = _to_float(rec.get("qTotTran5J") or rec.get("price") or rec.get("pl"))
        volume = _to_int(rec.get("qTitTran") or rec.get("volume") or rec.get("tvol"))
        canceled = bool(rec.get("canceled", False))

        if price is None or volume is None:
            continue

        results.append({
            "row_num":   row_num,
            "time_str":  time_str,
            "price":     price,
            "volume":    volume,
            "canceled":  canceled,
            "ins_code":  ins_code,
        })

    return results


# ── Core poll loop ────────────────────────────────────────────────────────────

class TickIngestor:
    def __init__(self):
        self._pool: asyncpg.Pool | None = None
        self._redis = None
        self._symbols: dict[str, int] = {}       # symbol → security_id
        self._seen: set[tuple[int, date, int]] = set()  # (sec_id, date, row_num)
        self._seen_date: date | None = None      # which day the seen-set covers
        self._last_tick_at: float = time.monotonic()
        self._poll_count: int = 0
        self._running = True

    async def setup(self):
        dsn = await _build_asyncpg_dsn(DATABASE_URL)
        self._pool = await asyncpg.create_pool(dsn, min_size=2, max_size=8)
        log.info("DB pool ready")

        import redis.asyncio as aioredis
        self._redis = aioredis.from_url(REDIS_URL, decode_responses=True)
        log.info("Redis client ready")

        self._symbols = await _load_symbols(self._pool)
        log.info(f"Loaded {len(self._symbols)} active symbols")

    async def teardown(self):
        if self._pool:
            await self._pool.close()
        if self._redis:
            await self._redis.aclose()

    def _reset_seen_if_new_day(self, today: date):
        if self._seen_date != today:
            self._seen.clear()
            self._seen_date = today
            log.info(f"New trading day {today} — cleared dedup cache")

    async def _insert_ticks(self, rows: list[tuple]) -> int:
        """Bulk-insert tick rows using asyncpg executemany with ON CONFLICT DO NOTHING."""
        if not rows:
            return 0
        sql = """
            INSERT INTO tick_trades
                (security_id, date, row_num, time, price, volume, canceled, tick_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (security_id, date, row_num, tick_time) DO NOTHING
        """
        try:
            async with self._pool.acquire() as conn:
                await conn.executemany(sql, rows)
            return len(rows)
        except Exception as exc:
            db_insert_errors_total.inc()
            log.error(f"DB insert error: {exc}")
            return 0

    async def _publish_redis(self, summary: dict):
        """Publish tick summary to Redis pub/sub for WebSocket clients."""
        try:
            await self._redis.publish(
                "tse:live:ticks",
                json.dumps(summary, default=str),
            )
        except Exception as exc:
            log.debug(f"Redis publish error: {exc}")

    async def poll_once(self):
        """One full poll cycle: fetch all symbols, insert new ticks."""
        today = _now_tehran().date()
        self._reset_seen_if_new_day(today)

        # Refresh symbol list every 60 polls (~15 min)
        self._poll_count += 1
        if self._poll_count % 60 == 0:
            self._symbols = await _load_symbols(self._pool)
            log.info(f"Refreshed symbol list: {len(self._symbols)} symbols")

        symbols_active.set(len(self._symbols))
        semaphore = asyncio.Semaphore(CONCURRENCY)

        # Build aiohttp session with optional SOCKS5 proxy
        connector_kwargs = {}
        proxy_url = None
        if HTTP_PROXY:
            from aiohttp_socks import ProxyConnector
            connector_kwargs["connector"] = ProxyConnector.from_url(HTTP_PROXY)
            proxy_url = HTTP_PROXY

        import aiohttp
        async with aiohttp.ClientSession(**connector_kwargs) as session:
            tasks = [
                _fetch_ticks(session, sym, semaphore, today)
                for sym in self._symbols
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        # Collect new ticks
        new_rows: list[tuple] = []
        per_symbol_counts: dict[str, int] = {}

        for sym, result in zip(self._symbols.keys(), results):
            if isinstance(result, Exception):
                api_errors_total.labels(reason="gather_exception").inc()
                continue
            sec_id = self._symbols[sym]
            count = 0
            for rec in result:
                key = (sec_id, today, rec["row_num"])
                if key in self._seen:
                    continue
                self._seen.add(key)
                tick_time = _parse_tick_time(rec["time_str"], today)
                new_rows.append((
                    sec_id,
                    today,
                    rec["row_num"],
                    rec["time_str"],
                    rec["price"],
                    rec["volume"],
                    rec["canceled"],
                    tick_time,
                ))
                count += 1
            if count:
                per_symbol_counts[sym] = count

        # Insert and update metrics
        inserted = await self._insert_ticks(new_rows)
        if inserted:
            ticks_ingested_total.inc(inserted)
            self._last_tick_at = time.monotonic()
            log.info(
                f"Inserted {inserted} new ticks across "
                f"{len(per_symbol_counts)} symbols"
            )
            await self._publish_redis({
                "event": "ticks",
                "date": today.isoformat(),
                "new_ticks": inserted,
                "symbols": per_symbol_counts,
                "ts": datetime.now(TZ).isoformat(),
            })

        last_tick_age_seconds.set(time.monotonic() - self._last_tick_at)

    async def run(self):
        log.info("=" * 70)
        log.info("Tick Ingestor starting")
        log.info(f"  Poll interval : {POLL_INTERVAL}s")
        log.info(f"  Concurrency   : {CONCURRENCY} symbols at once")
        log.info(f"  Proxy         : {HTTP_PROXY or 'none (direct)'}")
        log.info(f"  Metrics port  : {METRICS_PORT}")
        log.info("=" * 70)

        await self.setup()

        while self._running:
            if _is_market_open():
                with poll_duration_seconds.time():
                    try:
                        await self.poll_once()
                    except Exception as exc:
                        log.error(f"Unexpected error in poll_once: {exc}", exc_info=True)
                sleep_for = POLL_INTERVAL
            else:
                now = _now_tehran()
                # Sleep until next minute boundary to avoid busy-wait
                sleep_for = 60 - now.second
                if self._poll_count % 10 == 0:
                    log.debug(
                        f"Market closed ({now.strftime('%A %H:%M')}) — "
                        f"sleeping {sleep_for}s"
                    )

            await asyncio.sleep(sleep_for)

        await self.teardown()
        log.info("Tick Ingestor stopped cleanly")


# ── Entry point ───────────────────────────────────────────────────────────────

async def _main():
    ingestor = TickIngestor()

    loop = asyncio.get_running_loop()

    def _stop(sig):
        log.info(f"Received signal {sig.name} — shutting down")
        ingestor._running = False

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _stop, sig)

    await ingestor.run()


if __name__ == "__main__":
    # Start Prometheus HTTP server on a separate thread
    start_http_server(METRICS_PORT)
    log.info(f"Prometheus metrics available at :{METRICS_PORT}/metrics")

    asyncio.run(_main())
