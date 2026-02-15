"""
Pydantic schemas for API request/response validation
"""
import datetime as _dt

from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class SecuritySchema(BaseModel):
    """Security/Instrument schema"""
    ins_code: int
    symbol: str
    name_fa: Optional[str] = None
    name_en: Optional[str] = None
    isin: Optional[str] = None
    type: Optional[str] = None
    sector_name_fa: Optional[str] = None
    sector_name_en: Optional[str] = None
    base_volume: Optional[int] = None
    total_shares: Optional[int] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class DailyOHLCVSchema(BaseModel):
    """Daily OHLCV data schema"""
    security_id: int
    date: _dt.date
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    last: Optional[float] = None
    volume: Optional[int] = None
    value: Optional[int] = None
    trades: Optional[int] = None
    adj_close: Optional[float] = None
    price_yesterday: Optional[float] = None
    close_change: Optional[float] = None
    close_change_pct: Optional[float] = None
    last_change: Optional[float] = None
    last_change_pct: Optional[float] = None
    threshold_min: Optional[float] = None
    threshold_max: Optional[float] = None
    eps: Optional[float] = None
    pe_ratio: Optional[float] = None
    market_cap: Optional[int] = None
    nav: Optional[float] = None
    estimated_eps: Optional[float] = None
    real_buy_count: Optional[int] = None
    real_buy_volume: Optional[int] = None
    real_sell_count: Optional[int] = None
    real_sell_volume: Optional[int] = None
    legal_buy_count: Optional[int] = None
    legal_buy_volume: Optional[int] = None
    legal_sell_count: Optional[int] = None
    legal_sell_volume: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class MarketOverviewSchema(BaseModel):
    """Market overview - combines security and latest OHLCV"""
    ins_code: int
    symbol: str
    name_fa: Optional[str] = None
    sector_name_fa: Optional[str] = None
    date: Optional[_dt.date] = None
    close: float
    last: Optional[float] = None
    close_change: float
    close_change_pct: float
    volume: int
    value: int
    trades: int
    low: float
    high: float
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    market_cap: Optional[int] = None


class OrderBookLevelSchema(BaseModel):
    bid_price: Optional[float] = None
    bid_vol: Optional[int] = None
    bid_count: Optional[int] = None
    ask_price: Optional[float] = None
    ask_vol: Optional[int] = None
    ask_count: Optional[int] = None


class OrderBookSchema(BaseModel):
    """Order book snapshot"""
    snapshot_time: _dt.datetime
    levels: List[OrderBookLevelSchema]


class StockDetailSchema(BaseModel):
    """Detailed stock information"""
    security: SecuritySchema
    latest_ohlcv: Optional[DailyOHLCVSchema] = None

    model_config = ConfigDict(from_attributes=True)


class OptionSchema(BaseModel):
    """Options contract schema"""
    id: int
    ins_code: int
    isin: Optional[str] = None
    symbol: str
    name_fa: Optional[str] = None
    option_type: str
    underlying: Optional[str] = None
    strike_price: Optional[float] = None
    expiry_date: Optional[str] = None
    date: _dt.date
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    last: Optional[float] = None
    yesterday: Optional[float] = None
    close_change: Optional[float] = None
    volume: Optional[int] = None
    value: Optional[int] = None
    trades: Optional[int] = None
    threshold_min: Optional[float] = None
    threshold_max: Optional[float] = None
    base_volume: Optional[int] = None
    bid_price_1: Optional[float] = None
    bid_vol_1: Optional[int] = None
    bid_count_1: Optional[int] = None
    ask_price_1: Optional[float] = None
    ask_vol_1: Optional[int] = None
    ask_count_1: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
