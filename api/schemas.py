"""
Pydantic schemas for API request/response validation
"""
import datetime as _dt

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List


class SecuritySchema(BaseModel):
    """Security/Instrument schema"""
    ins_code: Optional[int] = None
    symbol: str = Field(max_length=50)
    name_fa: Optional[str] = Field(default=None, max_length=200)
    name_en: Optional[str] = Field(default=None, max_length=200)
    isin: Optional[str] = Field(default=None, max_length=20)
    type: Optional[str] = Field(default=None, max_length=10)
    market_type: str = Field(default='tse', max_length=20)
    sector_name_fa: Optional[str] = Field(default=None, max_length=100)
    sector_name_en: Optional[str] = Field(default=None, max_length=100)
    base_volume: Optional[int] = Field(default=None, ge=0)
    total_shares: Optional[int] = Field(default=None, ge=0)
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
    volume: Optional[int] = Field(default=None, ge=0)
    value: Optional[int] = Field(default=None, ge=0)
    trades: Optional[int] = Field(default=None, ge=0)
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
    market_cap: Optional[int] = Field(default=None, ge=0)
    nav: Optional[float] = None
    estimated_eps: Optional[float] = None
    real_buy_count: Optional[int] = Field(default=None, ge=0)
    real_buy_volume: Optional[int] = Field(default=None, ge=0)
    real_sell_count: Optional[int] = Field(default=None, ge=0)
    real_sell_volume: Optional[int] = Field(default=None, ge=0)
    legal_buy_count: Optional[int] = Field(default=None, ge=0)
    legal_buy_volume: Optional[int] = Field(default=None, ge=0)
    legal_sell_count: Optional[int] = Field(default=None, ge=0)
    legal_sell_volume: Optional[int] = Field(default=None, ge=0)

    model_config = ConfigDict(from_attributes=True)


class MarketOverviewSchema(BaseModel):
    """Market overview - combines security and latest OHLCV"""
    ins_code: Optional[int] = None
    symbol: str = Field(max_length=50)
    name_fa: Optional[str] = Field(default=None, max_length=200)
    sector_name_fa: Optional[str] = Field(default=None, max_length=100)
    date: Optional[_dt.date] = None
    close: float
    last: Optional[float] = None
    close_change: float
    close_change_pct: float
    volume: int = Field(ge=0)
    value: int = Field(ge=0)
    trades: int = Field(ge=0)
    low: float
    high: float
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    market_cap: Optional[int] = Field(default=None, ge=0)


class ClientTypeSchema(BaseModel):
    """Market overview with client type data"""
    ins_code: Optional[int] = None
    symbol: str = Field(max_length=50)
    name_fa: Optional[str] = Field(default=None, max_length=200)
    sector_name_fa: Optional[str] = Field(default=None, max_length=100)
    date: Optional[_dt.date] = None
    close: float
    last: Optional[float] = None
    close_change: float
    close_change_pct: float
    volume: int = Field(ge=0)
    value: int = Field(ge=0)
    trades: int = Field(ge=0)
    low: float
    high: float
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    market_cap: Optional[int] = Field(default=None, ge=0)
    real_buy_count: Optional[int] = Field(default=None, ge=0)
    real_buy_volume: Optional[int] = Field(default=None, ge=0)
    real_sell_count: Optional[int] = Field(default=None, ge=0)
    real_sell_volume: Optional[int] = Field(default=None, ge=0)
    legal_buy_count: Optional[int] = Field(default=None, ge=0)
    legal_buy_volume: Optional[int] = Field(default=None, ge=0)
    legal_sell_count: Optional[int] = Field(default=None, ge=0)
    legal_sell_volume: Optional[int] = Field(default=None, ge=0)


class OrderBookLevelSchema(BaseModel):
    bid_price: Optional[float] = None
    bid_vol: Optional[int] = Field(default=None, ge=0)
    bid_count: Optional[int] = Field(default=None, ge=0)
    ask_price: Optional[float] = None
    ask_vol: Optional[int] = Field(default=None, ge=0)
    ask_count: Optional[int] = Field(default=None, ge=0)


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
    date_shamsi: Optional[str] = Field(default=None, max_length=20)
    contract_category: Optional[str] = Field(default=None, max_length=200)
    contract_category_sub: Optional[str] = Field(default=None, max_length=50)
    commodity: Optional[str] = Field(default=None, max_length=20)
    option_type: str = Field(max_length=4)
    price_strike: Optional[int] = None
    level_strike: Optional[int] = None
    contract_id: Optional[int] = None
    contract_code: str = Field(max_length=50)
    contract_description: Optional[str] = Field(default=None, max_length=500)
    contract_size: Optional[int] = Field(default=None, ge=0)
    date_end: Optional[str] = Field(default=None, max_length=20)
    day_remain: Optional[int] = None
    margin_initial: Optional[int] = Field(default=None, ge=0)
    margin_required: Optional[int] = Field(default=None, ge=0)
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
    trades: Optional[int] = Field(default=None, ge=0)
    volume: Optional[int] = Field(default=None, ge=0)
    value: Optional[int] = Field(default=None, ge=0)
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
    date_shamsi: Optional[str] = Field(default=None, max_length=20)
    contract_code: str = Field(max_length=50)
    contract_description: Optional[str] = Field(default=None, max_length=500)
    contract_size: Optional[int] = Field(default=None, ge=0)
    contract_size_unit: Optional[str] = Field(default=None, max_length=50)
    date_end: Optional[str] = Field(default=None, max_length=20)
    day_remain: Optional[int] = None
    margin_initial: Optional[int] = Field(default=None, ge=0)
    margin_maintenance: Optional[int] = Field(default=None, ge=0)
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
    trades: Optional[int] = Field(default=None, ge=0)
    volume: Optional[int] = Field(default=None, ge=0)
    value: Optional[int] = Field(default=None, ge=0)
    real_buy_count: Optional[int] = Field(default=None, ge=0)
    legal_buy_count: Optional[int] = Field(default=None, ge=0)
    real_sell_count: Optional[int] = Field(default=None, ge=0)
    legal_sell_count: Optional[int] = Field(default=None, ge=0)
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
    isin: Optional[str] = Field(default=None, max_length=20)
    symbol: str = Field(max_length=50)
    name_fa: Optional[str] = Field(default=None, max_length=200)
    option_type: str = Field(max_length=4)
    underlying: Optional[str] = Field(default=None, max_length=100)
    strike_price: Optional[float] = None
    expiry_date: Optional[str] = Field(default=None, max_length=20)
    date: _dt.date
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    last: Optional[float] = None
    yesterday: Optional[float] = None
    close_change: Optional[float] = None
    volume: Optional[int] = Field(default=None, ge=0)
    value: Optional[int] = Field(default=None, ge=0)
    trades: Optional[int] = Field(default=None, ge=0)
    threshold_min: Optional[float] = None
    threshold_max: Optional[float] = None
    base_volume: Optional[int] = Field(default=None, ge=0)
    bid_price_1: Optional[float] = None
    bid_vol_1: Optional[int] = None
    bid_count_1: Optional[int] = None
    ask_price_1: Optional[float] = None
    ask_vol_1: Optional[int] = None
    ask_count_1: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# ─── Market Schemas ──────────────────────────────────────────────────────────


class MarketIndexSchema(BaseModel):
    id: int
    date: _dt.date
    time: Optional[str] = Field(default=None, max_length=10)
    name: str = Field(max_length=200)
    index_value: Optional[float] = None
    index_change: Optional[float] = None
    index_change_pct: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    market_value: Optional[float] = None
    trades: Optional[int] = Field(default=None, ge=0)
    volume: Optional[int] = Field(default=None, ge=0)
    value: Optional[float] = None
    state: Optional[str] = Field(default=None, max_length=50)

    model_config = ConfigDict(from_attributes=True)


class ETFNavSchema(BaseModel):
    id: int
    security_id: int
    date: _dt.date
    time: Optional[str] = Field(default=None, max_length=10)
    symbol: Optional[str] = Field(default=None, max_length=50)
    name_fa: Optional[str] = Field(default=None, max_length=200)
    nav_issuance: Optional[float] = None
    nav_redemption: Optional[float] = None
    last_price: Optional[float] = None
    bubble_pct: Optional[float] = None
    fund_type: Optional[str] = Field(default=None, max_length=50)

    model_config = ConfigDict(from_attributes=True)


class MarketPriceSchema(BaseModel):
    id: int
    security_id: int
    date: _dt.date
    time: Optional[str] = Field(default=None, max_length=10)
    symbol: Optional[str] = Field(default=None, max_length=50)
    name_fa: Optional[str] = Field(default=None, max_length=200)
    market_type: Optional[str] = Field(default=None, max_length=20)
    price: Optional[float] = None
    price_toman: Optional[float] = None
    change_value: Optional[float] = None
    change_pct: Optional[float] = None
    unit: Optional[str] = Field(default=None, max_length=20)
    market_cap: Optional[float] = None
    icon_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IMECertificateSchema(BaseModel):
    id: int
    date: _dt.date
    date_shamsi: Optional[str] = Field(default=None, max_length=20)
    cert_type: int
    commodity: Optional[str] = Field(default=None, max_length=100)
    contract_code: str = Field(max_length=50)
    contract_description: Optional[str] = Field(default=None, max_length=500)
    contract_size: Optional[int] = Field(default=None, ge=0)
    contract_size_unit: Optional[str] = Field(default=None, max_length=50)
    isin: Optional[str] = Field(default=None, max_length=20)
    symbol: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, max_length=200)
    settlement_price: Optional[int] = None
    open: Optional[int] = None
    high: Optional[int] = None
    low: Optional[int] = None
    last: Optional[int] = None
    last_change: Optional[int] = None
    last_change_pct: Optional[float] = None
    close: Optional[int] = None
    trades: Optional[int] = Field(default=None, ge=0)
    volume: Optional[int] = Field(default=None, ge=0)
    value: Optional[int] = Field(default=None, ge=0)
    bid_price_1: Optional[int] = None
    bid_vol_1: Optional[int] = None
    ask_price_1: Optional[int] = None
    ask_vol_1: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class IMEFundSchema(BaseModel):
    id: int
    date: _dt.date
    date_shamsi: Optional[str] = Field(default=None, max_length=20)
    isin: str = Field(max_length=20)
    symbol: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, max_length=200)
    settlement_price: Optional[int] = None
    open: Optional[int] = None
    high: Optional[int] = None
    low: Optional[int] = None
    last: Optional[int] = None
    last_change: Optional[int] = None
    last_change_pct: Optional[float] = None
    close: Optional[int] = None
    trades: Optional[int] = Field(default=None, ge=0)
    volume: Optional[int] = Field(default=None, ge=0)
    value: Optional[int] = Field(default=None, ge=0)
    bid_price_1: Optional[int] = None
    bid_vol_1: Optional[int] = None
    ask_price_1: Optional[int] = None
    ask_vol_1: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class IMEForwardSchema(BaseModel):
    id: int
    date: _dt.date
    date_shamsi: Optional[str] = Field(default=None, max_length=20)
    isin: str = Field(max_length=20)
    symbol: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, max_length=200)
    settlement_price: Optional[int] = None
    open: Optional[int] = None
    high: Optional[int] = None
    low: Optional[int] = None
    last: Optional[int] = None
    last_change: Optional[int] = None
    last_change_pct: Optional[float] = None
    close: Optional[int] = None
    trades: Optional[int] = Field(default=None, ge=0)
    volume: Optional[int] = Field(default=None, ge=0)
    value: Optional[int] = Field(default=None, ge=0)
    bid_price_1: Optional[int] = None
    bid_vol_1: Optional[int] = None
    ask_price_1: Optional[int] = None
    ask_vol_1: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class IMEPhysicalTradeSchema(BaseModel):
    id: int
    date_trade: _dt.date
    date_trade_shamsi: Optional[str] = Field(default=None, max_length=20)
    symbol: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, max_length=300)
    code_offer: str = Field(max_length=50)
    market_hall: Optional[str] = Field(default=None, max_length=100)
    producer: Optional[str] = Field(default=None, max_length=300)
    supplier: Optional[str] = Field(default=None, max_length=300)
    broker: Optional[str] = Field(default=None, max_length=300)
    contract_type: Optional[str] = Field(default=None, max_length=100)
    settlement_type: Optional[str] = Field(default=None, max_length=100)
    price_base_offer: Optional[int] = Field(default=None, ge=0)
    price_min: Optional[int] = Field(default=None, ge=0)
    price_max: Optional[int] = Field(default=None, ge=0)
    price_last: Optional[int] = Field(default=None, ge=0)
    volume_offer: Optional[int] = Field(default=None, ge=0)
    volume_contract: Optional[int] = Field(default=None, ge=0)
    demand: Optional[int] = Field(default=None, ge=0)
    value: Optional[int] = Field(default=None, ge=0)
    unit: Optional[str] = Field(default=None, max_length=50)

    model_config = ConfigDict(from_attributes=True)


class ShareholderSchema(BaseModel):
    id: int
    security_id: int
    date: _dt.date
    shareholder_id: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, max_length=500)
    volume: Optional[int] = Field(default=None, ge=0)
    percent: Optional[float] = Field(default=None, ge=0, le=100)
    change: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CodalAnnouncementSchema(BaseModel):
    id: int
    security_id: Optional[int] = None
    symbol: Optional[str] = Field(default=None, max_length=50)
    company_name: Optional[str] = Field(default=None, max_length=300)
    title: Optional[str] = Field(default=None, max_length=1000)
    code: str = Field(max_length=50)
    category: Optional[int] = None
    date_title: Optional[str] = Field(default=None, max_length=50)
    date_send: Optional[str] = Field(default=None, max_length=20)
    time_send: Optional[str] = Field(default=None, max_length=10)
    date_publish: Optional[str] = Field(default=None, max_length=20)
    time_publish: Optional[str] = Field(default=None, max_length=10)
    link: Optional[str] = None
    link_pdf: Optional[str] = None
    link_excel: Optional[str] = None
    link_attachment: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FinancialStatementSchema(BaseModel):
    id: int
    codal_announcement_id: Optional[int] = None
    security_id: Optional[int] = None
    symbol: str = Field(max_length=50)
    company_name: Optional[str] = Field(default=None, max_length=300)
    statement_type: str = Field(max_length=30)
    period_end_date: _dt.date
    period_end_jalali: str = Field(max_length=12)
    fiscal_year_end: Optional[_dt.date] = None
    fiscal_year_end_jalali: Optional[str] = Field(default=None, max_length=12)
    is_audited: bool = False
    is_consolidated: bool = False
    period_months: Optional[int] = None
    revenue: Optional[int] = None
    cost_of_revenue: Optional[int] = None
    gross_profit: Optional[int] = None
    operating_income: Optional[int] = None
    net_income: Optional[int] = None
    total_assets: Optional[int] = None
    total_liabilities: Optional[int] = None
    total_equity: Optional[int] = None
    eps: Optional[float] = None
    line_items: Optional[dict] = None
    created_at: Optional[_dt.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TickTradeSchema(BaseModel):
    id: int
    security_id: int
    date: _dt.date
    row_num: int = Field(ge=0)
    time: Optional[str] = Field(default=None, max_length=10)
    price: Optional[float] = None
    volume: Optional[int] = Field(default=None, ge=0)
    canceled: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)


# ─── RAG SCHEMAS ─────────────────────────────────────────────────────────────


class RAGSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)
    symbol: Optional[str] = Field(default=None, max_length=50)


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
    message: str = Field(min_length=1, max_length=5000)
    symbol: Optional[str] = Field(default=None, max_length=50)
    top_k: int = Field(default=5, ge=1, le=20)


class RAGChatResponse(BaseModel):
    answer: str
    sources: List[RAGSearchSource]


class RAGStatusResponse(BaseModel):
    total_documents: int = Field(default=0, ge=0)
    pending: int = Field(default=0, ge=0)
    downloading: int = Field(default=0, ge=0)
    downloaded: int = Field(default=0, ge=0)
    extracting: int = Field(default=0, ge=0)
    extracted: int = Field(default=0, ge=0)
    embedding: int = Field(default=0, ge=0)
    embedded: int = Field(default=0, ge=0)
    failed: int = Field(default=0, ge=0)
    total_chunks: int = Field(default=0, ge=0)
    chunks_with_embedding: int = Field(default=0, ge=0)


class RAGProcessResponse(BaseModel):
    status: str
    message: str


class RAGUploadResponse(BaseModel):
    document_id: int
    title: str
    status: str
    message: str


class RAGDocumentSchema(BaseModel):
    id: int
    title: Optional[str] = None
    symbol: Optional[str] = None
    status: str
    page_count: Optional[int] = Field(default=None, ge=0)
    created_at: _dt.datetime
    source: str

    model_config = ConfigDict(from_attributes=True)


# ─── CHAT SCHEMAS ─────────────────────────────────────────────────────────────


class ChatMessage(BaseModel):
    role: str = Field(max_length=20)
    content: Optional[str] = None


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(min_length=1)
    model: Optional[str] = Field(default=None, max_length=100)
    symbol: Optional[str] = Field(default=None, max_length=50)
    top_k: int = Field(default=5, ge=1, le=20)


class ChatResponse(BaseModel):
    answer: str
    sources: List[RAGSearchSource] = []
    tools_used: List[str] = []
    model: str


class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str


class ModelsResponse(BaseModel):
    models: List[ModelInfo]
    default: str
