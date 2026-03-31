"""
services/binance_ingestor.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Real-time crypto trade ingestor via Binance WebSocket.

Connects to Binance combined trade streams for all tracked crypto coins,
inserts raw trades into the crypto_trades TimescaleDB hypertable, and
publishes live prices to Redis pub/sub for WebSocket push to frontend.

OHLCV candles (1min, 5min) are handled automatically by TimescaleDB
continuous aggregates — no in-memory candle building needed.

Environment variables
---------------------
DATABASE_URL          PostgreSQL connection string (required)
REDIS_URL             Redis URL (default: redis://redis:6379/0)
BINANCE_WS_URL        Binance WS base (default: wss://stream.binance.com:9443)
BINANCE_PUBLISH_SEC   Seconds between Redis publishes (default: 5)
BINANCE_FLUSH_SEC     Seconds between DB trade batch inserts (default: 1)
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
FLUSH_INTERVAL    = int(os.environ.get("BINANCE_FLUSH_SEC", "1"))

REDIS_CHANNEL = "tse:live:crypto"

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    handlers=[logging.StreamHandler()],
)
log = logging.getLogger("binance_ingestor")


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
        self._latest_prices: dict[int, dict] = {}  # security_id → {price, volume, ts}
        self._trade_buffer: list[tuple] = []  # pending trades to flush
        self._buffer_lock = asyncio.Lock()
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
            flush_task = asyncio.create_task(self._periodic_flush())

            try:
                async for raw_msg in ws:
                    if not self._running:
                        break
                    await self._process_message(raw_msg)
            finally:
                publish_task.cancel()
                flush_task.cancel()
                for t in (publish_task, flush_task):
                    try:
                        await t
                    except asyncio.CancelledError:
                        pass

    async def _process_message(self, raw_msg: str):
        """Parse a Binance combined stream message and buffer the trade."""
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
            is_buyer_maker = data.get("m", False)
            trade_id = data.get("t")

            if price <= 0:
                return

            # Update latest price for Redis publish
            self._latest_prices[security_id] = {
                "price": price,
                "volume": qty,
                "ts": ts,
                "pair": pair,
            }

            # Buffer trade for batch insert
            trade_row = (
                ts,
                security_id,
                Decimal(str(price)),
                Decimal(str(qty)),
                Decimal(str(price * qty)),  # quote_volume
                is_buyer_maker,
                trade_id,
            )
            async with self._buffer_lock:
                self._trade_buffer.append(trade_row)

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

    async def _periodic_flush(self):
        """Batch insert buffered trades into crypto_trades every FLUSH_INTERVAL seconds."""
        while self._running:
            await asyncio.sleep(FLUSH_INTERVAL)

            # Swap buffer under lock
            async with self._buffer_lock:
                if not self._trade_buffer:
                    continue
                batch = self._trade_buffer[:]
                self._trade_buffer.clear()

            try:
                async with self._pool.acquire() as conn:
                    await conn.executemany(
                        """
                        INSERT INTO crypto_trades
                            (trade_time, security_id, price, quantity,
                             quote_volume, is_buyer_maker, binance_trade_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        """,
                        batch,
                    )
                log.info(f"Flushed {len(batch)} trades to crypto_trades")
            except Exception as e:
                log.error(f"Trade flush error: {e}")
                # Re-queue failed batch
                async with self._buffer_lock:
                    self._trade_buffer = batch + self._trade_buffer

    async def stop(self):
        """Clean shutdown — flush remaining buffered trades."""
        self._running = False

        async with self._buffer_lock:
            remaining = self._trade_buffer[:]
            self._trade_buffer.clear()

        if remaining and self._pool:
            try:
                async with self._pool.acquire() as conn:
                    await conn.executemany(
                        """
                        INSERT INTO crypto_trades
                            (trade_time, security_id, price, quantity,
                             quote_volume, is_buyer_maker, binance_trade_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        """,
                        remaining,
                    )
                log.info(f"Final flush: {len(remaining)} trades")
            except Exception as e:
                log.error(f"Final flush error: {e}")

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
