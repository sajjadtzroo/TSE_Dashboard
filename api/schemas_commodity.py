"""
Pydantic response schemas for commodity endpoints.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class CommodityPriceSchema(BaseModel):
    symbol: str
    name: str
    name_fa: str
    category: str
    unit: str
    price: float
    change: Optional[float] = None
    change_pct: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    open: Optional[float] = None
    prev_close: Optional[float] = None
    volume: Optional[float] = None
    snapshot_time: Optional[datetime] = None


class CommodityOHLCVSchema(BaseModel):
    date: str
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: Optional[float] = None


class CommodityMoversSchema(BaseModel):
    gainers: list[CommodityPriceSchema]
    losers: list[CommodityPriceSchema]
