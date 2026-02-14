"""
Pydantic schemas for API request/response validation
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class CompanySchema(BaseModel):
    """Company/Instrument schema"""
    ins_code: int
    symbol: str
    name_fa: Optional[str] = None
    name_en: Optional[str] = None
    isin: Optional[str] = None
    sector_name_fa: Optional[str] = None
    sector_name_en: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class DailyPriceSchema(BaseModel):
    """Daily price data schema"""
    ins_code: int
    d_even: int
    date: Optional[str] = None  # Formatted date
    price_first: Optional[float] = None
    price_last: Optional[float] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    price_yesterday: Optional[float] = None
    price_change: Optional[float] = None
    price_change_percent: Optional[float] = None
    q_tot_tran_5j: Optional[int] = None
    q_tot_cap: Optional[int] = None
    z_tot_tran: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class FinancialIndicatorSchema(BaseModel):
    """Financial indicators schema"""
    ins_code: int
    d_even: int
    market_cap: Optional[int] = None
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    estimated_eps: Optional[float] = None
    min_week: Optional[float] = None
    max_week: Optional[float] = None
    min_year: Optional[float] = None
    max_year: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class ClientTypeSchema(BaseModel):
    """Client type data schema"""
    ins_code: int
    d_even: int
    real_buyer_count: Optional[int] = None
    real_buyer_volume: Optional[int] = None
    real_seller_count: Optional[int] = None
    real_seller_volume: Optional[int] = None
    legal_buyer_count: Optional[int] = None
    legal_buyer_volume: Optional[int] = None
    legal_seller_count: Optional[int] = None
    legal_seller_volume: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class MarketOverviewSchema(BaseModel):
    """Market overview schema - combines company and latest price"""
    ins_code: int
    symbol: str
    name_fa: Optional[str] = None
    sector_name_fa: Optional[str] = None
    date: Optional[str] = None  # Formatted date
    price_last: float
    price_change: float
    price_change_percent: float
    q_tot_tran_5j: int
    q_tot_cap: int
    z_tot_tran: int
    price_min: float
    price_max: float
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    market_cap: Optional[int] = None


class StockDetailSchema(BaseModel):
    """Detailed stock information"""
    company: CompanySchema
    latest_price: Optional[DailyPriceSchema] = None
    financial_indicator: Optional[FinancialIndicatorSchema] = None
    client_type: Optional[ClientTypeSchema] = None

    model_config = ConfigDict(from_attributes=True)


class ScraperStatusSchema(BaseModel):
    """Scraper status schema"""
    spider_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    items_scraped: int
    items_dropped: int
    errors_count: int
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
