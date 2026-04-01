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
TICKER_INTERVAL   = int(os.environ.get("BINANCE_TICKER_SEC", "10"))

REDIS_CHANNEL = "tse:live:crypto"

# ── Sentry ────────────────────────────────────────────────────────────────────
if os.environ.get("SENTRY_DSN"):
    import sentry_sdk
    sentry_sdk.init(
        dsn=os.environ["SENTRY_DSN"],
        environment=os.environ.get("SENTRY_ENVIRONMENT", "development"),
    )

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


def _truncate_to_interval(ts: datetime, seconds: int) -> datetime:
    """Truncate a datetime to the start of the interval bucket."""
    epoch = ts.timestamp()
    return datetime.fromtimestamp(epoch - (epoch % seconds), tz=UTC)


class Candle:
    """In-memory OHLCV candle accumulator."""
    __slots__ = ('open', 'high', 'low', 'close', 'volume', 'turnover', 'count')

    def __init__(self, price: float, qty: float, quote_vol: float):
        self.open = price
        self.high = price
        self.low = price
        self.close = price
        self.volume = qty
        self.turnover = quote_vol
        self.count = 1

    def update(self, price: float, qty: float, quote_vol: float):
        self.high = max(self.high, price)
        self.low = min(self.low, price)
        self.close = price
        self.volume += qty
        self.turnover += quote_vol
        self.count += 1


CANDLE_FLUSH_SEC = int(os.environ.get("BINANCE_CANDLE_FLUSH_SEC", "60"))


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
        # In-memory candle building: {(security_id, bucket_ts): Candle}
        self._candles_1min: dict[tuple[int, datetime], Candle] = {}
        self._candles_lock = asyncio.Lock()

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
            ticker_task = asyncio.create_task(self._periodic_ticker_upsert())
            candle_task = asyncio.create_task(self._periodic_candle_flush())

            try:
                async for raw_msg in ws:
                    if not self._running:
                        break
                    await self._process_message(raw_msg)
            finally:
                publish_task.cancel()
                flush_task.cancel()
                ticker_task.cancel()
                candle_task.cancel()
                for t in (publish_task, flush_task, ticker_task, candle_task):
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

            quote_vol = price * qty

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
                Decimal(str(quote_vol)),
                is_buyer_maker,
                trade_id,
            )
            async with self._buffer_lock:
                self._trade_buffer.append(trade_row)

            # Update 1-minute candle
            bucket = _truncate_to_interval(ts, 60)
            key = (security_id, bucket)
            async with self._candles_lock:
                candle = self._candles_1min.get(key)
                if candle:
                    candle.update(price, qty, quote_vol)
                else:
                    self._candles_1min[key] = Candle(price, qty, quote_vol)

            self._trade_count += 1

        except Exception as e:
            log.debug(f"Message parse error: {e}")

    # ── Periodic tasks ────────────────────────────────────────────────────────

    async def _periodic_publish(self):
        """Publish latest prices + live candle to Redis pub/sub every PUBLISH_INTERVAL seconds."""
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
                now = datetime.now(UTC)
                current_1min = _truncate_to_interval(now, 60)

                tickers = {}
                async with self._candles_lock:
                    for sec_id, info in self._latest_prices.items():
                        sym = id_to_symbol.get(sec_id, "?")
                        entry = {
                            "price": info["price"],
                            "volume": info.get("volume", 0),
                        }
                        # Attach current live candle if it exists
                        candle = self._candles_1min.get((sec_id, current_1min))
                        if candle:
                            entry["candle"] = {
                                "t": current_1min.isoformat(),
                                "o": candle.open,
                                "h": candle.high,
                                "l": candle.low,
                                "c": candle.close,
                                "v": candle.volume,
                            }
                        tickers[sym] = entry

                payload = json.dumps({
                    "event": "crypto_ticker",
                    "count": len(tickers),
                    "timestamp": now.isoformat(),
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
                        ON CONFLICT DO NOTHING
                        """,
                        batch,
                    )
                log.info(f"Flushed {len(batch)} trades to crypto_trades")
            except Exception as e:
                log.error(f"Trade flush error: {e}")
                # Re-queue failed batch
                async with self._buffer_lock:
                    self._trade_buffer = batch + self._trade_buffer

    async def _load_cmc_baseline(self):
        """Load two things per security:
        1. The most recent CMC snapshot for market_cap and volume_24h
        2. The ticker price from ~24h ago for accurate 24h change calculation
        """
        baseline = {}
        try:
            async with self._pool.acquire() as conn:
                # Latest CMC row per security (for market_cap, volume)
                cmc_rows = await conn.fetch("""
                    SELECT DISTINCT ON (security_id)
                        security_id, market_cap_usd, volume_24h
                    FROM crypto_tickers
                    WHERE market_cap_usd IS NOT NULL
                    ORDER BY security_id, snapshot_time DESC
                """)
                for r in cmc_rows:
                    baseline[r["security_id"]] = {
                        "market_cap_usd": r["market_cap_usd"],
                        "volume_24h": r["volume_24h"],
                        "price_24h_ago": None,
                    }

                # Price from ~24h ago for accurate change calculation.
                # Look in a wide window and pick the closest to 24h ago.
                # Falls back to CMC's own pct if no row exists in that window.
                price_rows = await conn.fetch("""
                    SELECT DISTINCT ON (security_id)
                        security_id, last_price
                    FROM crypto_tickers
                    WHERE snapshot_time BETWEEN NOW() - INTERVAL '26 hours'
                                            AND NOW() - INTERVAL '22 hours'
                      AND last_price IS NOT NULL
                    ORDER BY security_id,
                             ABS(EXTRACT(EPOCH FROM (snapshot_time - (NOW() - INTERVAL '24 hours'))))
                """)
                for r in price_rows:
                    if r["security_id"] in baseline:
                        baseline[r["security_id"]]["price_24h_ago"] = float(r["last_price"])
                    else:
                        baseline[r["security_id"]] = {
                            "market_cap_usd": None,
                            "volume_24h": None,
                            "price_24h_ago": float(r["last_price"]),
                        }

                # Fallback: for securities without a 24h-ago row, derive from
                # CMC's own price_change_pct_24h on the latest CMC snapshot
                fallback_rows = await conn.fetch("""
                    SELECT DISTINCT ON (security_id)
                        security_id, last_price, price_change_pct_24h
                    FROM crypto_tickers
                    WHERE market_cap_usd IS NOT NULL
                      AND price_change_pct_24h IS NOT NULL
                    ORDER BY security_id, snapshot_time DESC
                """)
                fallback_count = 0
                for r in fallback_rows:
                    sid = r["security_id"]
                    if sid in baseline and baseline[sid]["price_24h_ago"] is not None:
                        continue  # Already have a real 24h-ago price
                    cmc_price = float(r["last_price"]) if r["last_price"] else None
                    cmc_pct = float(r["price_change_pct_24h"])
                    if cmc_price and cmc_pct != -100:
                        derived = cmc_price / (1 + cmc_pct / 100)
                        if sid in baseline:
                            baseline[sid]["price_24h_ago"] = derived
                        else:
                            baseline[sid] = {
                                "market_cap_usd": None,
                                "volume_24h": None,
                                "price_24h_ago": derived,
                            }
                        fallback_count += 1

                has_24h = sum(1 for b in baseline.values() if b["price_24h_ago"])
            log.info(f"Loaded CMC baseline for {len(baseline)} securities "
                     f"({has_24h} with 24h ref, {fallback_count} from CMC fallback)")
        except Exception as e:
            log.error(f"Failed to load CMC baseline: {e}")
        return baseline

    async def _periodic_ticker_upsert(self):
        """Upsert latest prices into crypto_tickers every TICKER_INTERVAL seconds.

        This keeps the crypto_tickers table (used by /api/crypto/market) up to
        date with live Binance prices instead of relying on periodic CMC fetches.
        Carries forward market_cap and volume from the last CMC snapshot, and
        computes price_change_24h from the CMC reference price.
        """
        # Load CMC baseline once at start (refresh every hour)
        baseline = await self._load_cmc_baseline()
        baseline_age = time.monotonic()

        while self._running:
            await asyncio.sleep(TICKER_INTERVAL)
            if not self._latest_prices:
                continue

            # Refresh baseline hourly
            if time.monotonic() - baseline_age > 3600:
                baseline = await self._load_cmc_baseline()
                baseline_age = time.monotonic()

            try:
                now = datetime.now(UTC)
                rows = []
                for sec_id, info in self._latest_prices.items():
                    price = Decimal(str(info["price"]))
                    bl = baseline.get(sec_id, {})

                    # Compute 24h change from CMC reference price
                    ref_price = bl.get("price_24h_ago")
                    change_24h = None
                    change_pct_24h = None
                    if ref_price and ref_price > 0:
                        change_24h = price - Decimal(str(ref_price))
                        change_pct_24h = (change_24h / Decimal(str(ref_price))) * 100

                    rows.append((
                        sec_id,
                        now,
                        price,
                        change_24h,
                        change_pct_24h,
                        bl.get("volume_24h"),
                        bl.get("market_cap_usd"),
                    ))
                if not rows:
                    continue
                async with self._pool.acquire() as conn:
                    await conn.executemany(
                        """
                        INSERT INTO crypto_tickers
                            (security_id, snapshot_time, last_price,
                             price_change_24h, price_change_pct_24h,
                             volume_24h, market_cap_usd)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        """,
                        rows,
                    )
                log.info(f"Upserted {len(rows)} ticker rows")
            except Exception as e:
                log.error(f"Ticker upsert error: {e}")

    async def _periodic_candle_flush(self):
        """Flush completed 1min candles to crypto_ohlcv every CANDLE_FLUSH_SEC,
        then aggregate into 5min and 1hour candles."""
        while self._running:
            await asyncio.sleep(CANDLE_FLUSH_SEC)
            try:
                now = datetime.now(UTC)
                current_bucket = _truncate_to_interval(now, 60)

                # Extract completed candles (all except the current open bucket)
                async with self._candles_lock:
                    completed = {
                        k: v for k, v in self._candles_1min.items()
                        if k[1] < current_bucket
                    }
                    for k in completed:
                        del self._candles_1min[k]

                if not completed:
                    continue

                # Build rows for all intervals
                rows_1min = []
                # Collect for higher-interval aggregation: {(sec_id, bucket): [candles]}
                buckets_5min = {}
                buckets_1hour = {}

                for (sec_id, bucket_ts), candle in completed.items():
                    rows_1min.append((
                        sec_id, '1min', bucket_ts,
                        Decimal(str(candle.open)), Decimal(str(candle.high)),
                        Decimal(str(candle.low)), Decimal(str(candle.close)),
                        Decimal(str(candle.volume)), Decimal(str(candle.turnover)),
                    ))

                    # Group into 5min buckets
                    b5 = _truncate_to_interval(bucket_ts, 300)
                    buckets_5min.setdefault((sec_id, b5), []).append(candle)

                    # Group into 1hour buckets
                    b60 = _truncate_to_interval(bucket_ts, 3600)
                    buckets_1hour.setdefault((sec_id, b60), []).append(candle)

                # Build 5min rows
                rows_5min = []
                for (sec_id, bucket_ts), candles in buckets_5min.items():
                    rows_5min.append((
                        sec_id, '5min', bucket_ts,
                        Decimal(str(candles[0].open)),
                        Decimal(str(max(c.high for c in candles))),
                        Decimal(str(min(c.low for c in candles))),
                        Decimal(str(candles[-1].close)),
                        Decimal(str(sum(c.volume for c in candles))),
                        Decimal(str(sum(c.turnover for c in candles))),
                    ))

                # Build 1hour rows
                rows_1hour = []
                for (sec_id, bucket_ts), candles in buckets_1hour.items():
                    rows_1hour.append((
                        sec_id, '1hour', bucket_ts,
                        Decimal(str(candles[0].open)),
                        Decimal(str(max(c.high for c in candles))),
                        Decimal(str(min(c.low for c in candles))),
                        Decimal(str(candles[-1].close)),
                        Decimal(str(sum(c.volume for c in candles))),
                        Decimal(str(sum(c.turnover for c in candles))),
                    ))

                all_rows = rows_1min + rows_5min + rows_1hour

                async with self._pool.acquire() as conn:
                    await conn.executemany(
                        """
                        INSERT INTO crypto_ohlcv
                            (security_id, interval, open_time, open, high, low, close, volume, turnover)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        ON CONFLICT ON CONSTRAINT uq_crypto_ohlcv_sec_interval_time
                        DO UPDATE SET
                            open = EXCLUDED.open,
                            high = GREATEST(crypto_ohlcv.high, EXCLUDED.high),
                            low  = LEAST(crypto_ohlcv.low, EXCLUDED.low),
                            close = EXCLUDED.close,
                            volume = EXCLUDED.volume,
                            turnover = EXCLUDED.turnover
                        """,
                        all_rows,
                    )

                log.info(
                    f"Flushed {len(rows_1min)} 1min + {len(rows_5min)} 5min "
                    f"+ {len(rows_1hour)} 1hour candles to crypto_ohlcv"
                )
            except Exception as e:
                log.error(f"Candle flush error: {e}")

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
