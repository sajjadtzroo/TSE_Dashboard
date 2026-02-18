"""
Pydantic response schemas for crypto API endpoints.
"""

import datetime as _dt

from pydantic import BaseModel, ConfigDict, Field

# ─── Crypto Ticker ──────────────────────────────────────────────────────────


class CryptoTickerSchema(BaseModel):
    """Real-time crypto ticker snapshot"""

    symbol: str = Field(max_length=50)
    name_fa: str | None = Field(default=None, max_length=200)
    name_en: str | None = Field(default=None, max_length=200)
    last_price: float
    price_change_24h: float | None = None
    price_change_pct_24h: float | None = None
    high_24h: float | None = None
    low_24h: float | None = None
    volume_24h: float | None = None
    turnover_24h: float | None = None
    best_bid: float | None = None
    best_ask: float | None = None
    market_cap_usd: float | None = None
    price_toman: float | None = None
    snapshot_time: _dt.datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Crypto OHLCV ──────────────────────────────────────────────────────────


class CryptoOHLCVSchema(BaseModel):
    """Multi-resolution candle data for crypto assets"""

    security_id: int
    interval: str = Field(max_length=10)
    open_time: _dt.datetime
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: float | None = None
    turnover: float | None = None

    model_config = ConfigDict(from_attributes=True)


# ─── Crypto Detail ──────────────────────────────────────────────────────────


class CryptoDetailSchema(CryptoTickerSchema):
    """Extended ticker with 24h sparkline"""

    sparkline_24h: list[float] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ─── Crypto Global Stats ──────────────────────────────────────────────────


class CryptoGlobalStatsSchema(BaseModel):
    """Daily crypto market-level stats (market cap, dominance, fear/greed)"""

    date: _dt.date
    total_market_cap_usd: float | None = None
    total_volume_24h_usd: float | None = None
    btc_dominance_pct: float | None = None
    eth_dominance_pct: float | None = None
    active_coins: float | None = None
    fear_greed_value: float | None = None
    fear_greed_label: str | None = Field(default=None, max_length=20)

    model_config = ConfigDict(from_attributes=True)


# ─── Crypto Movers ─────────────────────────────────────────────────────────


class CryptoMoversSchema(BaseModel):

    """Top gainers and losers by 24h price change percentage"""

    gainers: list[CryptoTickerSchema] = Field(default_factory=list)
    losers: list[CryptoTickerSchema] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ─── Crypto Momentum / Trend ─────────────────────────────────────────────


class CryptoMomentumItem(BaseModel):
    """RSI(14) + 7d/30d momentum signal for a single crypto coin."""

    symbol: str
    name_fa: str | None = None
    rsi: float | None = None         # RSI(14), None if < 15 candles
    change_7d: float | None = None   # % change over last 7 days
    change_30d: float | None = None  # % change over last 30 days
    change_24h: float | None = None  # from latest CryptoTicker
    signal: str = "neutral"          # "overbought" | "oversold" | "neutral"

    model_config = ConfigDict(from_attributes=True)
