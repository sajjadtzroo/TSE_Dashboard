"""
services/binance_ingestor.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Real-time crypto price ingestor via Binance WebSocket.

Connects to Binance combined trade streams for all tracked crypto coins,
builds OHLCV candles in-memory, stores tickers + candles in PostgreSQL,
and publishes live prices to Redis pub/sub for WebSocket push to frontend.

Environment variables
---------------------
DATABASE_URL          PostgreSQL connection string (required)
REDIS_URL             Redis URL (default: redis://redis:6379/0)
BINANCE_WS_URL        Binance WS base (default: wss://stream.binance.com:9443)
BINANCE_PUBLISH_SEC   Seconds between Redis publishes (default: 5)
BINANCE_TICKER_SEC    Seconds between DB ticker upserts (default: 10)
BINANCE_CANDLE_SEC    Seconds between candle flushes (default: 60)
"""

import asyncio
import json
import logging
import os
import signal
import sys
import time
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

import asyncpg
import redis.asyncio as aioredis
import websockets

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# ── Config ────────────────────────────────────────────────────────────────────
DATABASE_URL     = os.environ["DATABASE_URL"]
REDIS_URL        = os.environ.get("REDIS_URL", "redis://redis:6379/0")
BINANCE_WS_URL   = os.environ.get("BINANCE_WS_URL", "wss://stream.binance.com:9443")
PUBLISH_INTERVAL  = int(os.environ.get("BINANCE_PUBLISH_SEC", "5"))
TICKER_INTERVAL   = int(os.environ.get("BINANCE_TICKER_SEC", "10"))
CANDLE_INTERVAL   = int(os.environ.get("BINANCE_CANDLE_SEC", "60"))

REDIS_CHANNEL = "tse:live:crypto"

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    handlers=[logging.StreamHandler()],
)
log = logging.getLogger("binance_ingestor")

# ── Candle intervals ─────────────────────────────────────────────────────────
CANDLE_INTERVALS = {
    "1min":  timedelta(minutes=1),
    "5min":  timedelta(minutes=5),
    "1hour": timedelta(hours=1),
}


def _floor_to_bucket(ts: datetime, delta: timedelta) -> datetime:
    """Floor a datetime to the nearest bucket boundary."""
    epoch = datetime(2000, 1, 1, tzinfo=UTC)
    seconds = (ts - epoch).total_seconds()
    bucket_seconds = delta.total_seconds()
    floored = int(seconds // bucket_seconds) * bucket_seconds
    return epoch + timedelta(seconds=floored)


# ── Candle Builder ────────────────────────────────────────────────────────────


class CandleBuilder:
    """Aggregates trades into OHLCV candles by time bucket."""

    def __init__(self):
        self._candles = {}  # (security_id, interval, bucket_time) → {o,h,l,c,v,trades}

    def on_trade(self, security_id: int, price: float, volume: float, ts: datetime):
        for interval, delta in CANDLE_INTERVALS.items():
            bucket = _floor_to_bucket(ts, delta)
            key = (security_id, interval, bucket)
            if key not in self._candles:
                self._candles[key] = {
                    "open": price, "high": price, "low": price,
                    "close": price, "volume": 0.0, "trades": 0,
                }
            c = self._candles[key]
            c["high"] = max(c["high"], price)
            c["low"] = min(c["low"], price)
            c["close"] = price
            c["volume"] += volume
            c["trades"] += 1

    def flush_completed(self, now: datetime) -> list[tuple]:
        """Return and remove candles whose bucket has ended."""
        completed = []
        for key in list(self._candles):
            sec_id, interval, bucket = key
            end_time = bucket + CANDLE_INTERVALS[interval]
            if end_time <= now:
                completed.append((key, self._candles.pop(key)))
        return completed


# ── Symbol Mapping ────────────────────────────────────────────────────────────


async def _load_symbol_map(pool: asyncpg.Pool) -> dict[str, int]:
    """
    Load crypto securities and build {binance_stream: security_id} map.
    Binance streams use lowercase symbol + 'usdt', e.g. 'btcusdt'.
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT security_id, name_en FROM securities "
            "WHERE market_type = 'crypto' AND is_active = true AND name_en IS NOT NULL"
        )
    stream_map = {}
    for row in rows:
        en = row["name_en"].upper()
        # Skip stablecoins (they don't have USDT pairs)
        if en in ("USDT", "USDC", "DAI", "BUSD", "TUSD", "FDUSD", "USDe", "PYUSD", "USD1"):
            continue
        stream = f"{en.lower()}usdt"
        stream_map[stream] = row["security_id"]
    return stream_map


# ── Main Ingestor ─────────────────────────────────────────────────────────────


class BinanceIngestor:
    def __init__(self):
        self._pool: asyncpg.Pool | None = None
        self._redis: aioredis.Redis | None = None
        self._stream_map: dict[str, int] = {}  # btcusdt → security_id
        self._candle_builder = CandleBuilder()
        self._latest_prices: dict[int, dict] = {}  # security_id → {price, volume, ts}
        self._running = True
        self._trade_count = 0

    async def start(self):
        """Initialize DB pool, Redis, load symbols, then run main loop."""
        log.info("Starting Binance ingestor...")

        # Convert postgresql:// to raw for asyncpg
        db_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        db_url = db_url.replace("postgresql+psycopg2://", "postgresql://")
        self._pool = await asyncpg.create_pool(db_url, min_size=2, max_size=5)
        self._redis = aioredis.from_url(REDIS_URL, decode_responses=True)

        self._stream_map = await _load_symbol_map(self._pool)
        log.info(f"Loaded {len(self._stream_map)} crypto symbols for Binance streams")

        if not self._stream_map:
            log.error("No crypto symbols found — exiting")
            return

        # Graceful shutdown
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, self._shutdown)
            except NotImplementedError:
                pass  # Windows

        await self._run_with_reconnect()

    def _shutdown(self):
        log.info("Shutdown signal received")
        self._running = False

    async def _run_with_reconnect(self):
        """Connect to Binance WS with exponential backoff on disconnect."""
        backoff = 1
        while self._running:
            try:
                await self._connect_and_consume()
                backoff = 1  # Reset on clean disconnect
            except (websockets.ConnectionClosed, ConnectionError, OSError) as e:
                log.warning(f"Binance WS disconnected: {e}. Reconnecting in {backoff}s...")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)
            except Exception as e:
                log.error(f"Unexpected error: {e}. Reconnecting in {backoff}s...")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)

    async def _connect_and_consume(self):
        """Connect to Binance combined stream and process messages."""
        streams = [f"{s}@trade" for s in self._stream_map]

        # Binance combined stream URL
        streams_param = "/".join(streams)
        url = f"{BINANCE_WS_URL}/stream?streams={streams_param}"

        log.info(f"Connecting to Binance WS ({len(streams)} streams)...")

        async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
            log.info("Connected to Binance WebSocket")
            self._trade_count = 0

            # Start background tasks for periodic DB writes and Redis publishes
            publish_task = asyncio.create_task(self._periodic_publish())
            ticker_task = asyncio.create_task(self._periodic_ticker_upsert())
            candle_task = asyncio.create_task(self._periodic_candle_flush())

            try:
                async for raw_msg in ws:
                    if not self._running:
                        break
                    self._process_message(raw_msg)
            finally:
                publish_task.cancel()
                ticker_task.cancel()
                candle_task.cancel()
                for t in (publish_task, ticker_task, candle_task):
                    try:
                        await t
                    except asyncio.CancelledError:
                        pass

    def _process_message(self, raw_msg: str):
        """Parse a Binance combined stream message and update state."""
        try:
            msg = json.loads(raw_msg)
            stream = msg.get("stream", "")
            data = msg.get("data", {})

            # stream format: "btcusdt@trade"
            pair = stream.split("@")[0]
            security_id = self._stream_map.get(pair)
            if security_id is None:
                return

            price = float(data.get("p", 0))
            qty = float(data.get("q", 0))
            trade_time_ms = data.get("T", 0)
            ts = datetime.fromtimestamp(trade_time_ms / 1000, tz=UTC)

            if price <= 0:
                return

            # Update latest price
            self._latest_prices[security_id] = {
                "price": price,
                "volume": qty,
                "ts": ts,
                "pair": pair,
            }

            # Feed candle builder
            self._candle_builder.on_trade(security_id, price, qty * price, ts)
            self._trade_count += 1

        except Exception as e:
            log.debug(f"Message parse error: {e}")

    # ── Periodic tasks ────────────────────────────────────────────────────────

    async def _periodic_publish(self):
        """Publish latest prices to Redis pub/sub every PUBLISH_INTERVAL seconds."""
        # Build reverse map: security_id → CMC symbol
        id_to_symbol = {}
        for stream, sec_id in self._stream_map.items():
            symbol = stream.replace("usdt", "").upper()
            id_to_symbol[sec_id] = symbol

        while self._running:
            await asyncio.sleep(PUBLISH_INTERVAL)
            if not self._latest_prices:
                continue
            try:
                tickers = {}
                for sec_id, info in self._latest_prices.items():
                    sym = id_to_symbol.get(sec_id, "?")
                    tickers[sym] = {
                        "price": info["price"],
                        "volume": info.get("volume", 0),
                    }

                payload = json.dumps({
                    "event": "crypto_ticker",
                    "count": len(tickers),
                    "timestamp": datetime.now(UTC).isoformat(),
                    "tickers": tickers,
                }, default=str)

                await self._redis.publish(REDIS_CHANNEL, payload)
                log.debug(f"Published {len(tickers)} prices to Redis ({self._trade_count} trades since connect)")
            except Exception as e:
                log.debug(f"Redis publish error: {e}")

    async def _periodic_ticker_upsert(self):
        """Upsert latest prices into crypto_tickers every TICKER_INTERVAL seconds."""
        while self._running:
            await asyncio.sleep(TICKER_INTERVAL)
            if not self._latest_prices:
                continue
            try:
                now = datetime.now(UTC)
                rows = []
                for sec_id, info in self._latest_prices.items():
                    rows.append((
                        sec_id,
                        now,
                        Decimal(str(info["price"])),
                        None,  # price_change_24h — calculated by API from history
                        None,  # price_change_pct_24h
                        None,  # high_24h
                        None,  # low_24h
                        None,  # volume_24h — will be in candles
                        None,  # turnover_24h
                        None,  # best_bid
                        None,  # best_ask
                        None,  # market_cap_usd
                        None,  # price_toman
                    ))

                async with self._pool.acquire() as conn:
                    await conn.executemany(
                        """
                        INSERT INTO crypto_tickers
                            (security_id, snapshot_time, last_price,
                             price_change_24h, price_change_pct_24h,
                             high_24h, low_24h, volume_24h, turnover_24h,
                             best_bid, best_ask, market_cap_usd, price_toman)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                        """,
                        rows,
                    )
                log.info(f"Upserted {len(rows)} ticker rows")
            except Exception as e:
                log.error(f"Ticker upsert error: {e}")

    async def _periodic_candle_flush(self):
        """Flush completed candles to crypto_ohlcv every CANDLE_INTERVAL seconds."""
        while self._running:
            await asyncio.sleep(CANDLE_INTERVAL)
            now = datetime.now(UTC)
            completed = self._candle_builder.flush_completed(now)
            if not completed:
                continue

            rows = []
            for (sec_id, interval, bucket), candle in completed:
                rows.append((
                    sec_id,
                    interval,
                    bucket,
                    Decimal(str(candle["open"])),
                    Decimal(str(candle["high"])),
                    Decimal(str(candle["low"])),
                    Decimal(str(candle["close"])),
                    Decimal(str(candle["volume"])),
                    Decimal(str(candle["volume"])),  # turnover = volume for USD pairs
                ))

            try:
                async with self._pool.acquire() as conn:
                    await conn.executemany(
                        """
                        INSERT INTO crypto_ohlcv
                            (security_id, interval, open_time, open, high, low, close, volume, turnover)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        ON CONFLICT (security_id, interval, open_time)
                        DO UPDATE SET
                            high = GREATEST(crypto_ohlcv.high, EXCLUDED.high),
                            low = LEAST(crypto_ohlcv.low, EXCLUDED.low),
                            close = EXCLUDED.close,
                            volume = EXCLUDED.volume,
                            turnover = EXCLUDED.turnover
                        """,
                        rows,
                    )
                log.info(f"Flushed {len(rows)} candles to crypto_ohlcv")
            except Exception as e:
                log.error(f"Candle flush error: {e}")

    async def stop(self):
        """Clean shutdown."""
        self._running = False
        # Final candle flush
        now = datetime.now(UTC)
        completed = self._candle_builder.flush_completed(now + timedelta(hours=1))
        if completed:
            log.info(f"Final flush: {len(completed)} candles")

        if self._pool:
            await self._pool.close()
        if self._redis:
            await self._redis.close()
        log.info("Binance ingestor stopped")


# ── Entry point ───────────────────────────────────────────────────────────────


async def main():
    ingestor = BinanceIngestor()
    try:
        await ingestor.start()
    except KeyboardInterrupt:
        pass
    finally:
        await ingestor.stop()


if __name__ == "__main__":
    asyncio.run(main())
