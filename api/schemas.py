"""
Pydantic schemas for API request/response validation
"""
import datetime as _dt

from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class SecuritySchema(BaseModel):
    """Security/Instrument schema"""
    ins_code: Optional[int] = None
    symbol: str
    name_fa: Optional[str] = None
    name_en: Optional[str] = None
    isin: Optional[str] = None
    type: Optional[str] = None
    market_type: str = 'tse'
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
    ins_code: Optional[int] = None
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


class ClientTypeSchema(BaseModel):
    """Market overview with client type data"""
    ins_code: Optional[int] = None
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
    real_buy_count: Optional[int] = None
    real_buy_volume: Optional[int] = None
    real_sell_count: Optional[int] = None
    real_sell_volume: Optional[int] = None
    legal_buy_count: Optional[int] = None
    legal_buy_volume: Optional[int] = None
    legal_sell_count: Optional[int] = None
    legal_sell_volume: Optional[int] = None


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


class IMEOptionSchema(BaseModel):
    """IME commodity option schema"""
    id: int
    date: _dt.date
    date_shamsi: Optional[str] = None
    contract_category: Optional[str] = None
    contract_category_sub: Optional[str] = None
    commodity: Optional[str] = None
    option_type: str
    price_strike: Optional[int] = None
    level_strike: Optional[int] = None
    contract_id: Optional[int] = None
    contract_code: str
    contract_description: Optional[str] = None
    contract_size: Optional[int] = None
    date_end: Optional[str] = None
    day_remain: Optional[int] = None
    margin_initial: Optional[int] = None
    margin_required: Optional[int] = None
    interest_open: Optional[int] = None
    interest_open_change: Optional[int] = None
    interest_open_change_pct: Optional[float] = None
    settlement_price: Optional[int] = None
    open: Optional[int] = None
    high: Optional[int] = None
    low: Optional[int] = None
    last: Optional[int] = None
    last_change: Optional[int] = None
    last_change_pct: Optional[float] = None
    trades: Optional[int] = None
    volume: Optional[int] = None
    value: Optional[int] = None
    bid_price_1: Optional[int] = None
    bid_vol_1: Optional[int] = None
    ask_price_1: Optional[int] = None
    ask_vol_1: Optional[int] = None
    bid_price_2: Optional[int] = None
    bid_vol_2: Optional[int] = None
    ask_price_2: Optional[int] = None
    ask_vol_2: Optional[int] = None
    bid_price_3: Optional[int] = None
    bid_vol_3: Optional[int] = None
    ask_price_3: Optional[int] = None
    ask_vol_3: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class IMEFutureSchema(BaseModel):
    """IME commodity futures schema"""
    id: int
    date: _dt.date
    date_shamsi: Optional[str] = None
    contract_code: str
    contract_description: Optional[str] = None
    contract_size: Optional[int] = None
    contract_size_unit: Optional[str] = None
    date_end: Optional[str] = None
    day_remain: Optional[int] = None
    margin_initial: Optional[int] = None
    margin_maintenance: Optional[int] = None
    interest_open: Optional[int] = None
    interest_open_change: Optional[int] = None
    interest_open_change_pct: Optional[float] = None
    settlement_price: Optional[int] = None
    open: Optional[int] = None
    high: Optional[int] = None
    low: Optional[int] = None
    last: Optional[int] = None
    last_change: Optional[int] = None
    last_change_pct: Optional[float] = None
    instant_settlement: Optional[float] = None
    trades: Optional[int] = None
    volume: Optional[int] = None
    value: Optional[int] = None
    real_buy_count: Optional[int] = None
    legal_buy_count: Optional[int] = None
    real_sell_count: Optional[int] = None
    legal_sell_count: Optional[int] = None
    bid_price_1: Optional[int] = None
    bid_vol_1: Optional[int] = None
    ask_price_1: Optional[int] = None
    ask_vol_1: Optional[int] = None
    bid_price_2: Optional[int] = None
    bid_vol_2: Optional[int] = None
    ask_price_2: Optional[int] = None
    ask_vol_2: Optional[int] = None
    bid_price_3: Optional[int] = None
    bid_vol_3: Optional[int] = None
    ask_price_3: Optional[int] = None
    ask_vol_3: Optional[int] = None

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


# ─── NEW SCHEMAS ──────────────────────────────────────────────────────────────


class MarketIndexSchema(BaseModel):
    id: int
    date: _dt.date
    time: Optional[str] = None
    name: str
    index_value: Optional[float] = None
    index_change: Optional[float] = None
    index_change_pct: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    market_value: Optional[float] = None
    trades: Optional[int] = None
    volume: Optional[int] = None
    value: Optional[float] = None
    state: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ETFNavSchema(BaseModel):
    id: int
    security_id: int
    date: _dt.date
    time: Optional[str] = None
    symbol: Optional[str] = None
    name_fa: Optional[str] = None
    nav_issuance: Optional[float] = None
    nav_redemption: Optional[float] = None
    last_price: Optional[float] = None
    bubble_pct: Optional[float] = None
    fund_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MarketPriceSchema(BaseModel):
    id: int
    security_id: int
    date: _dt.date
    time: Optional[str] = None
    symbol: Optional[str] = None
    name_fa: Optional[str] = None
    market_type: Optional[str] = None
    price: Optional[float] = None
    price_toman: Optional[float] = None
    change_value: Optional[float] = None
    change_pct: Optional[float] = None
    unit: Optional[str] = None
    market_cap: Optional[float] = None
    icon_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IMECertificateSchema(BaseModel):
    id: int
    date: _dt.date
    date_shamsi: Optional[str] = None
    cert_type: int
    commodity: Optional[str] = None
    contract_code: str
    contract_description: Optional[str] = None
    contract_size: Optional[int] = None
    contract_size_unit: Optional[str] = None
    isin: Optional[str] = None
    symbol: Optional[str] = None
    name: Optional[str] = None
    settlement_price: Optional[int] = None
    open: Optional[int] = None
    high: Optional[int] = None
    low: Optional[int] = None
    last: Optional[int] = None
    last_change: Optional[int] = None
    last_change_pct: Optional[float] = None
    close: Optional[int] = None
    trades: Optional[int] = None
    volume: Optional[int] = None
    value: Optional[int] = None
    bid_price_1: Optional[int] = None
    bid_vol_1: Optional[int] = None
    ask_price_1: Optional[int] = None
    ask_vol_1: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class IMEFundSchema(BaseModel):
    id: int
    date: _dt.date
    date_shamsi: Optional[str] = None
    isin: str
    symbol: Optional[str] = None
    name: Optional[str] = None
    settlement_price: Optional[int] = None
    open: Optional[int] = None
    high: Optional[int] = None
    low: Optional[int] = None
    last: Optional[int] = None
    last_change: Optional[int] = None
    last_change_pct: Optional[float] = None
    close: Optional[int] = None
    trades: Optional[int] = None
    volume: Optional[int] = None
    value: Optional[int] = None
    bid_price_1: Optional[int] = None
    bid_vol_1: Optional[int] = None
    ask_price_1: Optional[int] = None
    ask_vol_1: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class IMEForwardSchema(BaseModel):
    id: int
    date: _dt.date
    date_shamsi: Optional[str] = None
    isin: str
    symbol: Optional[str] = None
    name: Optional[str] = None
    settlement_price: Optional[int] = None
    open: Optional[int] = None
    high: Optional[int] = None
    low: Optional[int] = None
    last: Optional[int] = None
    last_change: Optional[int] = None
    last_change_pct: Optional[float] = None
    close: Optional[int] = None
    trades: Optional[int] = None
    volume: Optional[int] = None
    value: Optional[int] = None
    bid_price_1: Optional[int] = None
    bid_vol_1: Optional[int] = None
    ask_price_1: Optional[int] = None
    ask_vol_1: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class IMEPhysicalTradeSchema(BaseModel):
    id: int
    date_trade: _dt.date
    date_trade_shamsi: Optional[str] = None
    symbol: Optional[str] = None
    name: Optional[str] = None
    code_offer: str
    market_hall: Optional[str] = None
    producer: Optional[str] = None
    supplier: Optional[str] = None
    broker: Optional[str] = None
    contract_type: Optional[str] = None
    settlement_type: Optional[str] = None
    price_base_offer: Optional[int] = None
    price_min: Optional[int] = None
    price_max: Optional[int] = None
    price_last: Optional[int] = None
    volume_offer: Optional[int] = None
    volume_contract: Optional[int] = None
    demand: Optional[int] = None
    value: Optional[int] = None
    unit: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ShareholderSchema(BaseModel):
    id: int
    security_id: int
    date: _dt.date
    shareholder_id: Optional[str] = None
    name: Optional[str] = None
    volume: Optional[int] = None
    percent: Optional[float] = None
    change: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CodalAnnouncementSchema(BaseModel):
    id: int
    security_id: Optional[int] = None
    symbol: Optional[str] = None
    company_name: Optional[str] = None
    title: Optional[str] = None
    code: str
    category: Optional[int] = None
    date_title: Optional[str] = None
    date_send: Optional[str] = None
    time_send: Optional[str] = None
    date_publish: Optional[str] = None
    time_publish: Optional[str] = None
    link: Optional[str] = None
    link_pdf: Optional[str] = None
    link_excel: Optional[str] = None
    link_attachment: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TickTradeSchema(BaseModel):
    id: int
    security_id: int
    date: _dt.date
    row_num: int
    time: Optional[str] = None
    price: Optional[float] = None
    volume: Optional[int] = None
    canceled: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)


# ─── RAG SCHEMAS ─────────────────────────────────────────────────────────────


class RAGSearchRequest(BaseModel):
    query: str
    top_k: int = 5
    symbol: Optional[str] = None


class RAGSearchSource(BaseModel):
    title: Optional[str] = None
    symbol: Optional[str] = None
    page_numbers: Optional[str] = None
    similarity: float = 0
    source_url: Optional[str] = None
    content_preview: Optional[str] = None


class RAGSearchResult(BaseModel):
    chunk_id: int
    content: str
    page_numbers: Optional[str] = None
    chunk_index: int = 0
    document_id: int
    title: Optional[str] = None
    symbol: Optional[str] = None
    source_url: Optional[str] = None
    similarity: float = 0


class RAGSearchResponse(BaseModel):
    query: str
    results: List[RAGSearchResult]


class RAGChatRequest(BaseModel):
    message: str
    symbol: Optional[str] = None
    top_k: int = 5


class RAGChatResponse(BaseModel):
    answer: str
    sources: List[RAGSearchSource]


class RAGStatusResponse(BaseModel):
    total_documents: int = 0
    pending: int = 0
    downloading: int = 0
    downloaded: int = 0
    extracting: int = 0
    extracted: int = 0
    embedding: int = 0
    embedded: int = 0
    failed: int = 0
    total_chunks: int = 0
    chunks_with_embedding: int = 0


class RAGProcessResponse(BaseModel):
    status: str
    message: str
