"""
KuCoin + Wallex data fetcher for the crypto dashboard.
Fetches real-time tickers, OHLCV candles, and global metrics,
converts USD prices to Toman via Wallex USDT/IRR rate,
and stores everything in PostgreSQL.
"""

import json
import logging
import time
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import httpx
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from config.settings import (
    CRYPTO_TICKER_RETENTION_HOURS,
    KUCOIN_BASE_URL,
    WALLEX_BASE_URL,
)
from database.models import (
    CryptoGlobalMetrics,
    CryptoOHLCV,
    CryptoTicker,
    Security,
)

logger = logging.getLogger(__name__)

# Top 30 tracked crypto symbols (base coin names)
TRACKED_SYMBOLS = [
    "BTC",
    "ETH",
    "BNB",
    "SOL",
    "XRP",
    "ADA",
    "DOGE",
    "AVAX",
    "DOT",
    "MATIC",
    "LINK",
    "SHIB",
    "UNI",
    "LTC",
    "ATOM",
    "XLM",
    "NEAR",
    "FIL",
    "APT",
    "ARB",
    "OP",
    "IMX",
    "INJ",
    "SUI",
    "SEI",
    "TIA",
    "RENDER",
    "FET",
    "WLD",
    "PEPE",
]

# Redis pub/sub channel for live crypto updates
REDIS_CHANNEL_CRYPTO = "tse:live:crypto"

# CoinGecko and Fear & Greed API endpoints
COINGECKO_GLOBAL_URL = "https://api.coingecko.com/api/v3/global"
FEAR_GREED_URL = "https://api.alternative.me/fng/"


# ---------------------------------------------------------------------------
# KuCoin Client
# ---------------------------------------------------------------------------


class KuCoinClient:
    """Synchronous HTTP client for the KuCoin public REST API."""

    def __init__(self, base_url: str = KUCOIN_BASE_URL, timeout: float = 15.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _get(self, path: str, params: dict | None = None) -> dict:
        """Execute a GET request and return the parsed JSON response."""
        url = f"{self.base_url}{path}"
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        if data.get("code") != "200000":
            raise RuntimeError(
                f"KuCoin API error on {path}: code={data.get('code')}, msg={data.get('msg')}"
            )
        return data.get("data", {})

    def fetch_all_tickers(self) -> list[dict]:
        """
        GET /api/v1/market/allTickers
        Returns ticker data filtered to the tracked 30 symbols.
        Each symbol is formatted as "<COIN>-USDT".
        """
        tracked_pairs = {f"{s}-USDT" for s in TRACKED_SYMBOLS}
        data = self._get("/api/v1/market/allTickers")
        tickers = data.get("ticker", [])
        return [t for t in tickers if t.get("symbol") in tracked_pairs]

    def fetch_klines(
        self,
        symbol: str,
        interval: str = "1day",
        start_at: int | None = None,
        end_at: int | None = None,
    ) -> list[list[str]]:
        """
        GET /api/v1/market/candles
        Returns list of candles: [time, open, close, high, low, volume, turnover]
        """
        params: dict = {"type": interval, "symbol": symbol}
        if start_at is not None:
            params["startAt"] = start_at
        if end_at is not None:
            params["endAt"] = end_at
        return self._get("/api/v1/market/candles", params=params)

    def fetch_orderbook(self, symbol: str, depth: int = 20) -> dict:
        """
        GET /api/v1/market/orderbook/level2_20
        Returns bids/asks for the given symbol.
        """
        return self._get(
            "/api/v1/market/orderbook/level2_20", params={"symbol": symbol}
        )

    def fetch_trades(self, symbol: str) -> list[dict]:
        """
        GET /api/v1/market/histories
        Returns recent trade history for the given symbol.
        """
        return self._get("/api/v1/market/histories", params={"symbol": symbol})


# ---------------------------------------------------------------------------
# Wallex Client
# ---------------------------------------------------------------------------


class WallexClient:
    """
    Synchronous HTTP client for the Wallex public API.
    Provides USDT/IRR conversion rate with a 60-second in-memory cache.
    """

    def __init__(self, base_url: str = WALLEX_BASE_URL, timeout: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._cached_rate: Decimal | None = None
        self._cache_ts: float = 0.0
        self._cache_ttl: float = 60.0  # seconds

    def fetch_usdt_irr_rate(self) -> Decimal:
        """
        GET /v1/markets
        Extracts the last price for the USDTTMN pair and returns it as Decimal.
        Uses a 60-second in-memory cache to avoid excessive API calls.
        """
        now = time.monotonic()
        if self._cached_rate is not None and (now - self._cache_ts) < self._cache_ttl:
            return self._cached_rate

        url = f"{self.base_url}/v1/markets"
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url)
            resp.raise_for_status()
            data = resp.json()

        # Wallex response: {"result": {"symbols": {"USDTTMN": {"stats": {"lastPrice": "..."}}}}}
        symbols = data.get("result", {}).get("symbols", {})
        usdt_tmn = symbols.get("USDTTMN", {})
        stats = usdt_tmn.get("stats", {})
        last_price = stats.get("lastPrice")

        if last_price is None:
            raise RuntimeError("Could not extract USDTTMN last price from Wallex API")

        rate = Decimal(str(last_price))
        self._cached_rate = rate
        self._cache_ts = now
        logger.debug(f"Wallex USDT/IRR rate: {rate}")
        return rate


# ---------------------------------------------------------------------------
# Module-level client instances
# ---------------------------------------------------------------------------

_kucoin = KuCoinClient()
_wallex = WallexClient()


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def _get_crypto_security_map(session) -> dict[str, int]:
    """
    Query the securities table and return a mapping of
    {symbol: security_id} for all rows with market_type='crypto'.
    """
    stmt = select(Security.symbol, Security.security_id).where(
        Security.market_type == "crypto",
        Security.is_active.is_(True),
    )
    rows = session.execute(stmt).all()
    return {row.symbol: row.security_id for row in rows}


# ---------------------------------------------------------------------------
# Core data-fetching and storage functions
# ---------------------------------------------------------------------------


def fetch_and_store_tickers(session) -> int:
    """
    Fetch all 30 tracked tickers from KuCoin, compute Toman prices
    via the Wallex USDT/IRR rate, and bulk-insert CryptoTicker rows.

    Returns the number of ticker rows inserted.
    """
    security_map = _get_crypto_security_map(session)
    if not security_map:
        logger.warning("No crypto securities found in database; skipping ticker fetch")
        return 0

    tickers = _kucoin.fetch_all_tickers()
    if not tickers:
        logger.warning("KuCoin returned no tickers")
        return 0

    try:
        usdt_irr = _wallex.fetch_usdt_irr_rate()
    except Exception as e:
        logger.error(f"Failed to fetch Wallex USDT/IRR rate: {e}")
        usdt_irr = None

    now = datetime.now(UTC)
    rows = []

    for t in tickers:
        kucoin_symbol = t.get("symbol", "")  # e.g. "BTC-USDT"
        base_symbol = kucoin_symbol.split("-")[0]  # e.g. "BTC"

        security_id = security_map.get(base_symbol)
        if security_id is None:
            continue

        last_price = Decimal(str(t.get("last", 0)))
        buy = t.get("buy")
        sell = t.get("sell")
        change_price = t.get("changePrice")
        change_rate = t.get("changeRate")
        high = t.get("high")
        low = t.get("low")
        vol = t.get("vol")
        vol_value = t.get("volValue")

        price_toman = None
        if usdt_irr is not None and last_price:
            price_toman = last_price * usdt_irr

        rows.append(
            {
                "security_id": security_id,
                "snapshot_time": now,
                "last_price": last_price,
                "price_change_24h": (
                    Decimal(str(change_price)) if change_price else None
                ),
                "price_change_pct_24h": (
                    Decimal(str(float(change_rate) * 100)) if change_rate else None
                ),
                "high_24h": Decimal(str(high)) if high else None,
                "low_24h": Decimal(str(low)) if low else None,
                "volume_24h": Decimal(str(vol)) if vol else None,
                "turnover_24h": Decimal(str(vol_value)) if vol_value else None,
                "best_bid": Decimal(str(buy)) if buy else None,
                "best_ask": Decimal(str(sell)) if sell else None,
                "market_cap_usd": None,  # Not available from KuCoin allTickers
                "price_toman": price_toman,
            }
        )

    if not rows:
        logger.warning("No matching crypto securities for KuCoin tickers")
        return 0

    # Bulk insert
    session.execute(CryptoTicker.__table__.insert(), rows)
    session.flush()

    logger.info(f"Inserted {len(rows)} crypto ticker snapshots")

    # Publish live update via Redis pub/sub
    _publish_crypto_update(
        {
            "event": "crypto_ticker",
            "count": len(rows),
            "timestamp": now.isoformat(),
            "usdt_irr": str(usdt_irr) if usdt_irr else None,
        }
    )

    return len(rows)


def fetch_and_store_daily_ohlcv(session) -> int:
    """
    Incremental backfill of daily OHLCV candles from KuCoin.
    For each tracked crypto:
      1. Check the latest existing candle in the database.
      2. Fetch only newer candles from KuCoin.
      3. Upsert via INSERT ... ON CONFLICT DO UPDATE.

    Returns the total number of rows upserted.
    """
    security_map = _get_crypto_security_map(session)
    if not security_map:
        logger.warning("No crypto securities found; skipping daily OHLCV fetch")
        return 0

    total_upserted = 0
    interval = "1day"

    for base_symbol, security_id in security_map.items():
        kucoin_symbol = f"{base_symbol}-USDT"

        # Determine start time: latest existing candle or 365 days ago
        latest_stmt = select(func.max(CryptoOHLCV.open_time)).where(
            CryptoOHLCV.security_id == security_id,
            CryptoOHLCV.interval == interval,
        )
        latest_time = session.execute(latest_stmt).scalar()

        if latest_time is not None:
            # Fetch from the day after the latest candle
            start_at = int(latest_time.timestamp()) + 1
        else:
            # Initial backfill: 365 days
            start_at = int((datetime.now(UTC) - timedelta(days=365)).timestamp())

        end_at = int(datetime.now(UTC).timestamp())

        try:
            candles = _kucoin.fetch_klines(
                symbol=kucoin_symbol,
                interval=interval,
                start_at=start_at,
                end_at=end_at,
            )
        except Exception as e:
            logger.error(f"Failed to fetch klines for {kucoin_symbol}: {e}")
            continue

        if not candles:
            continue

        # KuCoin candle format: [time, open, close, high, low, volume, turnover]
        rows = []
        for candle in candles:
            open_time = datetime.fromtimestamp(int(candle[0]), tz=UTC)
            rows.append(
                {
                    "security_id": security_id,
                    "interval": interval,
                    "open_time": open_time,
                    "open": Decimal(str(candle[1])),
                    "close": Decimal(str(candle[2])),
                    "high": Decimal(str(candle[3])),
                    "low": Decimal(str(candle[4])),
                    "volume": Decimal(str(candle[5])),
                    "turnover": Decimal(str(candle[6])),
                }
            )

        if not rows:
            continue

        # Upsert: INSERT ... ON CONFLICT (security_id, interval, open_time) DO UPDATE
        stmt = insert(CryptoOHLCV).values(rows)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_crypto_ohlcv_sec_interval_time",
            set_={
                "open": stmt.excluded.open,
                "high": stmt.excluded.high,
                "low": stmt.excluded.low,
                "close": stmt.excluded.close,
                "volume": stmt.excluded.volume,
                "turnover": stmt.excluded.turnover,
            },
        )
        session.execute(stmt)
        session.flush()
        total_upserted += len(rows)
        logger.debug(f"Upserted {len(rows)} daily candles for {kucoin_symbol}")

    logger.info(f"Daily OHLCV backfill complete: {total_upserted} rows upserted")
    return total_upserted


def fetch_and_store_global_metrics(session) -> dict:
    """
    Fetch global crypto market metrics from CoinGecko (/api/v3/global)
    and the Fear & Greed index from alternative.me, then upsert into
    the CryptoGlobalMetrics table (one row per day).

    Returns a dict summarizing the fetched data.
    """
    result = {}
    today = date.today()

    # ── CoinGecko global data ──
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(COINGECKO_GLOBAL_URL)
            resp.raise_for_status()
            cg_data = resp.json().get("data", {})

        result["total_market_cap_usd"] = cg_data.get("total_market_cap", {}).get("usd")
        result["total_volume_24h_usd"] = cg_data.get("total_volume", {}).get("usd")
        result["btc_dominance_pct"] = cg_data.get("market_cap_percentage", {}).get(
            "btc"
        )
        result["eth_dominance_pct"] = cg_data.get("market_cap_percentage", {}).get(
            "eth"
        )
        result["active_coins"] = cg_data.get("active_cryptocurrencies")
    except Exception as e:
        logger.error(f"Failed to fetch CoinGecko global metrics: {e}")

    # ── Fear & Greed Index ──
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(FEAR_GREED_URL, params={"limit": 1})
            resp.raise_for_status()
            fg_data = resp.json().get("data", [])

        if fg_data:
            result["fear_greed_value"] = int(fg_data[0].get("value", 0))
            result["fear_greed_label"] = fg_data[0].get("value_classification", "")
    except Exception as e:
        logger.error(f"Failed to fetch Fear & Greed index: {e}")

    if not result:
        logger.warning("No global metrics fetched; skipping upsert")
        return result

    # ── Upsert into CryptoGlobalMetrics ──
    row = {"date": today}
    if result.get("total_market_cap_usd") is not None:
        row["total_market_cap_usd"] = Decimal(str(result["total_market_cap_usd"]))
    if result.get("total_volume_24h_usd") is not None:
        row["total_volume_24h_usd"] = Decimal(str(result["total_volume_24h_usd"]))
    if result.get("btc_dominance_pct") is not None:
        row["btc_dominance_pct"] = Decimal(str(round(result["btc_dominance_pct"], 2)))
    if result.get("eth_dominance_pct") is not None:
        row["eth_dominance_pct"] = Decimal(str(round(result["eth_dominance_pct"], 2)))
    if result.get("active_coins") is not None:
        row["active_coins"] = result["active_coins"]
    if result.get("fear_greed_value") is not None:
        row["fear_greed_value"] = result["fear_greed_value"]
    if result.get("fear_greed_label") is not None:
        row["fear_greed_label"] = result["fear_greed_label"]

    stmt = insert(CryptoGlobalMetrics).values(row)
    update_cols = {k: v for k, v in row.items() if k != "date"}
    stmt = stmt.on_conflict_do_update(
        index_elements=["date"],
        set_=update_cols,
    )
    session.execute(stmt)
    session.flush()

    logger.info(f"Upserted global crypto metrics for {today}")
    return result


def cleanup_old_tickers(
    session, retention_hours: int = CRYPTO_TICKER_RETENTION_HOURS
) -> int:
    """
    Delete CryptoTicker rows older than `retention_hours`.
    Returns the number of rows deleted.
    """
    cutoff = datetime.now(UTC) - timedelta(hours=retention_hours)
    deleted = (
        session.query(CryptoTicker)
        .filter(CryptoTicker.snapshot_time < cutoff)
        .delete(synchronize_session=False)
    )
    session.flush()
    logger.info(
        f"Deleted {deleted} old crypto ticker snapshots (retention={retention_hours}h)"
    )
    return deleted


def _publish_crypto_update(data: dict) -> None:
    """
    Publish a crypto data update to Redis pub/sub on the
    `tse:live:crypto` channel.  Follows the same pattern as
    api/routes/ws.py publish_market_update().
    """
    try:
        from api.cache import cache_manager

        if cache_manager.available:
            cache_manager._client.publish(
                REDIS_CHANNEL_CRYPTO,
                json.dumps(data, default=str),
            )
    except Exception as e:
        logger.debug(f"Redis publish error (crypto): {e}")
