"""
Pydantic schemas for API request/response validation
"""

import datetime as _dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SecuritySchema(BaseModel):
    """Security/Instrument schema"""

    ins_code: int | None = None
    symbol: str = Field(max_length=50)
    name_fa: str | None = Field(default=None, max_length=200)
    name_en: str | None = Field(default=None, max_length=200)
    isin: str | None = Field(default=None, max_length=20)
    type: str | None = Field(default=None, max_length=10)
    market_type: str = Field(default="tse", max_length=20)
    sector_name_fa: str | None = Field(default=None, max_length=100)
    sector_name_en: str | None = Field(default=None, max_length=100)
    base_volume: int | None = Field(default=None, ge=0)
    total_shares: int | None = Field(default=None, ge=0)
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class DailyOHLCVSchema(BaseModel):
    """Daily OHLCV data schema"""

    security_id: int
    date: _dt.date
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    last: float | None = None
    volume: int | None = Field(default=None, ge=0)
    value: int | None = Field(default=None, ge=0)
    trades: int | None = Field(default=None, ge=0)
    adj_close: float | None = None
    price_yesterday: float | None = None
    close_change: float | None = None
    close_change_pct: float | None = None
    last_change: float | None = None
    last_change_pct: float | None = None
    threshold_min: float | None = None
    threshold_max: float | None = None
    eps: float | None = None
    pe_ratio: float | None = None
    market_cap: int | None = Field(default=None, ge=0)
    nav: float | None = None
    estimated_eps: float | None = None
    real_buy_count: int | None = Field(default=None, ge=0)
    real_buy_volume: int | None = Field(default=None, ge=0)
    real_sell_count: int | None = Field(default=None, ge=0)
    real_sell_volume: int | None = Field(default=None, ge=0)
    legal_buy_count: int | None = Field(default=None, ge=0)
    legal_buy_volume: int | None = Field(default=None, ge=0)
    legal_sell_count: int | None = Field(default=None, ge=0)
    legal_sell_volume: int | None = Field(default=None, ge=0)

    model_config = ConfigDict(from_attributes=True)


class MarketOverviewSchema(BaseModel):
    """Market overview - combines security and latest OHLCV"""

    ins_code: int | None = None
    symbol: str = Field(max_length=50)
    name_fa: str | None = Field(default=None, max_length=200)
    sector_name_fa: str | None = Field(default=None, max_length=100)
    date: _dt.date | None = None
    close: float | None = None
    last: float | None = None
    close_change: float | None = None
    close_change_pct: float | None = None
    volume: int = Field(ge=0)
    value: int = Field(ge=0)
    trades: int = Field(ge=0)
    low: float | None = None
    high: float | None = None
    pe_ratio: float | None = None
    eps: float | None = None
    market_cap: int | None = Field(default=None, ge=0)


class ClientTypeSchema(BaseModel):
    """Market overview with client type data"""

    ins_code: int | None = None
    symbol: str = Field(max_length=50)
    name_fa: str | None = Field(default=None, max_length=200)
    sector_name_fa: str | None = Field(default=None, max_length=100)
    date: _dt.date | None = None
    close: float | None = None
    last: float | None = None
    close_change: float | None = None
    close_change_pct: float | None = None
    volume: int = Field(ge=0)
    value: int = Field(ge=0)
    trades: int = Field(ge=0)
    low: float | None = None
    high: float | None = None
    pe_ratio: float | None = None
    eps: float | None = None
    market_cap: int | None = Field(default=None, ge=0)
    real_buy_count: int | None = Field(default=None, ge=0)
    real_buy_volume: int | None = Field(default=None, ge=0)
    real_sell_count: int | None = Field(default=None, ge=0)
    real_sell_volume: int | None = Field(default=None, ge=0)
    legal_buy_count: int | None = Field(default=None, ge=0)
    legal_buy_volume: int | None = Field(default=None, ge=0)
    legal_sell_count: int | None = Field(default=None, ge=0)
    legal_sell_volume: int | None = Field(default=None, ge=0)


class OrderBookLevelSchema(BaseModel):
    bid_price: float | None = None
    bid_vol: int | None = Field(default=None, ge=0)
    bid_count: int | None = Field(default=None, ge=0)
    ask_price: float | None = None
    ask_vol: int | None = Field(default=None, ge=0)
    ask_count: int | None = Field(default=None, ge=0)


class OrderBookSchema(BaseModel):
    """Order book snapshot"""

    snapshot_time: _dt.datetime
    levels: list[OrderBookLevelSchema]


class StockDetailSchema(BaseModel):
    """Detailed stock information"""

    security: SecuritySchema
    latest_ohlcv: DailyOHLCVSchema | None = None

    model_config = ConfigDict(from_attributes=True)


class IMEOptionSchema(BaseModel):
    """IME commodity option schema"""

    id: int
    date: _dt.date
    date_shamsi: str | None = Field(default=None, max_length=20)
    contract_category: str | None = Field(default=None, max_length=200)
    contract_category_sub: str | None = Field(default=None, max_length=50)
    commodity: str | None = Field(default=None, max_length=20)
    option_type: str = Field(max_length=4)
    price_strike: int | None = None
    level_strike: int | None = None
    contract_id: int | None = None
    contract_code: str = Field(max_length=50)
    contract_description: str | None = Field(default=None, max_length=500)
    contract_size: int | None = Field(default=None, ge=0)
    date_end: str | None = Field(default=None, max_length=20)
    day_remain: int | None = None
    margin_initial: int | None = Field(default=None, ge=0)
    margin_required: int | None = Field(default=None, ge=0)
    interest_open: int | None = None
    interest_open_change: int | None = None
    interest_open_change_pct: float | None = None
    settlement_price: int | None = None
    open: int | None = None
    high: int | None = None
    low: int | None = None
    last: int | None = None
    last_change: int | None = None
    last_change_pct: float | None = None
    trades: int | None = Field(default=None, ge=0)
    volume: int | None = Field(default=None, ge=0)
    value: int | None = Field(default=None, ge=0)
    bid_price_1: int | None = None
    bid_vol_1: int | None = None
    ask_price_1: int | None = None
    ask_vol_1: int | None = None
    bid_price_2: int | None = None
    bid_vol_2: int | None = None
    ask_price_2: int | None = None
    ask_vol_2: int | None = None
    bid_price_3: int | None = None
    bid_vol_3: int | None = None
    ask_price_3: int | None = None
    ask_vol_3: int | None = None

    model_config = ConfigDict(from_attributes=True)


class IMEFutureSchema(BaseModel):
    """IME commodity futures schema"""

    id: int
    date: _dt.date
    date_shamsi: str | None = Field(default=None, max_length=20)
    contract_code: str = Field(max_length=50)
    contract_description: str | None = Field(default=None, max_length=500)
    contract_size: int | None = Field(default=None, ge=0)
    contract_size_unit: str | None = Field(default=None, max_length=50)
    date_end: str | None = Field(default=None, max_length=20)
    day_remain: int | None = None
    margin_initial: int | None = Field(default=None, ge=0)
    margin_maintenance: int | None = Field(default=None, ge=0)
    interest_open: int | None = None
    interest_open_change: int | None = None
    interest_open_change_pct: float | None = None
    settlement_price: int | None = None
    open: int | None = None
    high: int | None = None
    low: int | None = None
    last: int | None = None
    last_change: int | None = None
    last_change_pct: float | None = None
    instant_settlement: float | None = None
    trades: int | None = Field(default=None, ge=0)
    volume: int | None = Field(default=None, ge=0)
    value: int | None = Field(default=None, ge=0)
    real_buy_count: int | None = Field(default=None, ge=0)
    legal_buy_count: int | None = Field(default=None, ge=0)
    real_sell_count: int | None = Field(default=None, ge=0)
    legal_sell_count: int | None = Field(default=None, ge=0)
    bid_price_1: int | None = None
    bid_vol_1: int | None = None
    ask_price_1: int | None = None
    ask_vol_1: int | None = None
    bid_price_2: int | None = None
    bid_vol_2: int | None = None
    ask_price_2: int | None = None
    ask_vol_2: int | None = None
    bid_price_3: int | None = None
    bid_vol_3: int | None = None
    ask_price_3: int | None = None
    ask_vol_3: int | None = None

    model_config = ConfigDict(from_attributes=True)


class OptionSchema(BaseModel):
    """Options contract schema"""

    id: int
    ins_code: int
    isin: str | None = Field(default=None, max_length=20)
    symbol: str = Field(max_length=50)
    name_fa: str | None = Field(default=None, max_length=200)
    option_type: str = Field(max_length=4)
    underlying: str | None = Field(default=None, max_length=100)
    strike_price: float | None = None
    expiry_date: str | None = Field(default=None, max_length=20)
    date: _dt.date
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    last: float | None = None
    yesterday: float | None = None
    close_change: float | None = None
    volume: int | None = Field(default=None, ge=0)
    value: int | None = Field(default=None, ge=0)
    trades: int | None = Field(default=None, ge=0)
    threshold_min: float | None = None
    threshold_max: float | None = None
    base_volume: int | None = Field(default=None, ge=0)
    bid_price_1: float | None = None
    bid_vol_1: int | None = None
    bid_count_1: int | None = None
    ask_price_1: float | None = None
    ask_vol_1: int | None = None
    ask_count_1: int | None = None

    model_config = ConfigDict(from_attributes=True)


# ─── Market Schemas ──────────────────────────────────────────────────────────


class MarketIndexSchema(BaseModel):
    id: int
    date: _dt.date
    time: str | None = Field(default=None, max_length=10)
    name: str = Field(max_length=200)
    index_value: float | None = None
    index_change: float | None = None
    index_change_pct: float | None = None
    min_value: float | None = None
    max_value: float | None = None
    market_value: float | None = None
    trades: int | None = Field(default=None, ge=0)
    volume: int | None = Field(default=None, ge=0)
    value: float | None = None
    state: str | None = Field(default=None, max_length=50)

    model_config = ConfigDict(from_attributes=True)


class ETFNavSchema(BaseModel):
    id: int
    security_id: int
    date: _dt.date
    time: str | None = Field(default=None, max_length=10)
    symbol: str | None = Field(default=None, max_length=50)
    name_fa: str | None = Field(default=None, max_length=200)
    nav_issuance: float | None = None
    nav_redemption: float | None = None
    last_price: float | None = None
    bubble_pct: float | None = None
    fund_type: str | None = Field(default=None, max_length=50)

    model_config = ConfigDict(from_attributes=True)


class MarketPriceSchema(BaseModel):
    id: int
    security_id: int
    date: _dt.date
    time: str | None = Field(default=None, max_length=10)
    symbol: str | None = Field(default=None, max_length=50)
    name_fa: str | None = Field(default=None, max_length=200)
    market_type: str | None = Field(default=None, max_length=20)
    price: float | None = None
    price_toman: float | None = None
    change_value: float | None = None
    change_pct: float | None = None
    unit: str | None = Field(default=None, max_length=20)
    market_cap: float | None = None
    icon_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class IMECertificateSchema(BaseModel):
    id: int
    date: _dt.date
    date_shamsi: str | None = Field(default=None, max_length=20)
    cert_type: int
    commodity: str | None = Field(default=None, max_length=100)
    contract_code: str = Field(max_length=50)
    contract_description: str | None = Field(default=None, max_length=500)
    contract_size: int | None = Field(default=None, ge=0)
    contract_size_unit: str | None = Field(default=None, max_length=50)
    isin: str | None = Field(default=None, max_length=20)
    symbol: str | None = Field(default=None, max_length=50)
    name: str | None = Field(default=None, max_length=200)
    settlement_price: int | None = None
    open: int | None = None
    high: int | None = None
    low: int | None = None
    last: int | None = None
    last_change: int | None = None
    last_change_pct: float | None = None
    close: int | None = None
    trades: int | None = Field(default=None, ge=0)
    volume: int | None = Field(default=None, ge=0)
    value: int | None = Field(default=None, ge=0)
    bid_price_1: int | None = None
    bid_vol_1: int | None = None
    ask_price_1: int | None = None
    ask_vol_1: int | None = None

    model_config = ConfigDict(from_attributes=True)


class IMEFundSchema(BaseModel):
    id: int
    date: _dt.date
    date_shamsi: str | None = Field(default=None, max_length=20)
    isin: str = Field(max_length=20)
    symbol: str | None = Field(default=None, max_length=50)
    name: str | None = Field(default=None, max_length=200)
    settlement_price: int | None = None
    open: int | None = None
    high: int | None = None
    low: int | None = None
    last: int | None = None
    last_change: int | None = None
    last_change_pct: float | None = None
    close: int | None = None
    trades: int | None = Field(default=None, ge=0)
    volume: int | None = Field(default=None, ge=0)
    value: int | None = Field(default=None, ge=0)
    bid_price_1: int | None = None
    bid_vol_1: int | None = None
    ask_price_1: int | None = None
    ask_vol_1: int | None = None

    model_config = ConfigDict(from_attributes=True)


class IMEForwardSchema(BaseModel):
    id: int
    date: _dt.date
    date_shamsi: str | None = Field(default=None, max_length=20)
    isin: str = Field(max_length=20)
    symbol: str | None = Field(default=None, max_length=50)
    name: str | None = Field(default=None, max_length=200)
    settlement_price: int | None = None
    open: int | None = None
    high: int | None = None
    low: int | None = None
    last: int | None = None
    last_change: int | None = None
    last_change_pct: float | None = None
    close: int | None = None
    trades: int | None = Field(default=None, ge=0)
    volume: int | None = Field(default=None, ge=0)
    value: int | None = Field(default=None, ge=0)
    bid_price_1: int | None = None
    bid_vol_1: int | None = None
    ask_price_1: int | None = None
    ask_vol_1: int | None = None

    model_config = ConfigDict(from_attributes=True)


class IMEPhysicalTradeSchema(BaseModel):
    id: int
    date_trade: _dt.date
    date_trade_shamsi: str | None = Field(default=None, max_length=20)
    symbol: str | None = Field(default=None, max_length=50)
    name: str | None = Field(default=None, max_length=300)
    code_offer: str = Field(max_length=50)
    market_hall: str | None = Field(default=None, max_length=100)
    producer: str | None = Field(default=None, max_length=300)
    supplier: str | None = Field(default=None, max_length=300)
    broker: str | None = Field(default=None, max_length=300)
    contract_type: str | None = Field(default=None, max_length=100)
    settlement_type: str | None = Field(default=None, max_length=100)
    price_base_offer: int | None = Field(default=None, ge=0)
    price_min: int | None = Field(default=None, ge=0)
    price_max: int | None = Field(default=None, ge=0)
    price_last: int | None = Field(default=None, ge=0)
    volume_offer: int | None = Field(default=None, ge=0)
    volume_contract: int | None = Field(default=None, ge=0)
    demand: int | None = Field(default=None, ge=0)
    value: int | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=50)

    model_config = ConfigDict(from_attributes=True)


class ShareholderSchema(BaseModel):
    id: int
    security_id: int
    date: _dt.date
    shareholder_id: str | None = Field(default=None, max_length=50)
    name: str | None = Field(default=None, max_length=500)
    volume: int | None = Field(default=None, ge=0)
    percent: float | None = Field(default=None, ge=0, le=100)
    change: int | None = None

    model_config = ConfigDict(from_attributes=True)


class CodalAnnouncementSchema(BaseModel):
    id: int
    security_id: int | None = None
    symbol: str | None = Field(default=None, max_length=50)
    company_name: str | None = Field(default=None, max_length=300)
    title: str | None = Field(default=None, max_length=1000)
    code: str = Field(max_length=50)
    category: int | None = None
    date_title: str | None = Field(default=None, max_length=50)
    date_send: str | None = Field(default=None, max_length=20)
    time_send: str | None = Field(default=None, max_length=10)
    date_publish: str | None = Field(default=None, max_length=20)
    time_publish: str | None = Field(default=None, max_length=10)
    link: str | None = None
    link_pdf: str | None = None
    link_excel: str | None = None
    link_attachment: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedCodalResponse(BaseModel):
    """Paginated list of Codal announcements"""

    items: list[CodalAnnouncementSchema]
    total: int


class PaginatedCompaniesResponse(BaseModel):
    """Paginated list of securities"""

    items: list[SecuritySchema]
    total: int
    page: int
    per_page: int
    pages: int


class FinancialStatementSchema(BaseModel):
    id: int
    codal_announcement_id: int | None = None
    security_id: int | None = None
    symbol: str = Field(max_length=50)
    company_name: str | None = Field(default=None, max_length=300)
    statement_type: str = Field(max_length=30)
    period_end_date: _dt.date
    period_end_jalali: str = Field(max_length=12)
    fiscal_year_end: _dt.date | None = None
    fiscal_year_end_jalali: str | None = Field(default=None, max_length=12)
    is_audited: bool = False
    is_consolidated: bool = False
    period_months: int | None = None
    revenue: int | None = None
    cost_of_revenue: int | None = None
    gross_profit: int | None = None
    operating_income: int | None = None
    net_income: int | None = None
    total_assets: int | None = None
    total_liabilities: int | None = None
    total_equity: int | None = None
    eps: float | None = None
    line_items: dict | None = None
    codal_link_pdf: str | None = None
    codal_link_excel: str | None = None
    created_at: _dt.datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TickTradeSchema(BaseModel):
    id: int
    security_id: int
    date: _dt.date
    row_num: int = Field(ge=0)
    time: str | None = Field(default=None, max_length=10)
    price: float | None = None
    volume: int | None = Field(default=None, ge=0)
    canceled: bool | None = False

    model_config = ConfigDict(from_attributes=True)


# ─── RAG SCHEMAS ─────────────────────────────────────────────────────────────


class RAGSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)
    symbol: str | None = Field(default=None, max_length=50)


class RAGSearchSource(BaseModel):
    title: str | None = None
    symbol: str | None = None
    page_numbers: str | None = None
    similarity: float = 0
    source_url: str | None = None
    content_preview: str | None = None
    doc_category: str | None = None


class RAGSearchResult(BaseModel):
    chunk_id: int
    content: str
    page_numbers: str | None = None
    chunk_index: int = 0
    document_id: int
    title: str | None = None
    symbol: str | None = None
    source_url: str | None = None
    similarity: float = 0


class RAGSearchResponse(BaseModel):
    query: str
    results: list[RAGSearchResult]


class RAGChatMessage(BaseModel):
    role: Literal["user", "assistant"] = Field()
    content: str | None = None


class RAGChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    history: list[RAGChatMessage] | None = Field(
        default=None, max_length=50,
        description="Optional prior conversation turns for multi-turn context",
    )
    symbol: str | None = Field(default=None, max_length=50)
    top_k: int = Field(default=5, ge=1, le=20)


class RAGChatResponse(BaseModel):
    answer: str
    sources: list[RAGSearchSource]
    tools_used: list[str] = []
    model: str | None = None
    tools_used: list[str] = []
    model: str | None = None


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
    title: str | None = None
    symbol: str | None = None
    status: str
    page_count: int | None = Field(default=None, ge=0)
    created_at: _dt.datetime
    source: str
    doc_category: str = "codal"

    model_config = ConfigDict(from_attributes=True)


# ─── CHAT SCHEMAS ─────────────────────────────────────────────────────────────


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"] = Field()
    content: str | None = None


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)
    model: str | None = Field(default=None, max_length=100)
    symbol: str | None = Field(default=None, max_length=50)
    top_k: int = Field(default=5, ge=1, le=20)


class ChatResponse(BaseModel):
    answer: str
    sources: list[RAGSearchSource] = []
    tools_used: list[str] = []
    model: str
    intent: str | None = None
    confidence: float | None = None


class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str


class ModelsResponse(BaseModel):
    models: list[ModelInfo]
    default: str


# ─── CHAT SESSION SCHEMAS ────────────────────────────────────────────────────


class ChatSessionCreate(BaseModel):
    title: str | None = Field(default="New Chat", max_length=200)
    model: str | None = Field(default=None, max_length=100)
    symbol: str | None = Field(default=None, max_length=50)


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str | None = None
    sources: list | None = None
    tools_used: list[str] | None = None
    model: str | None = None
    created_at: _dt.datetime

    model_config = ConfigDict(from_attributes=True)


class ChatSessionOut(BaseModel):
    id: int
    title: str
    model: str | None = None
    symbol: str | None = None
    is_active: bool = True
    created_at: _dt.datetime
    updated_at: _dt.datetime

    model_config = ConfigDict(from_attributes=True)


class ChatSessionDetail(ChatSessionOut):
    messages: list[ChatMessageOut] = []


class ChatMessageSave(BaseModel):
    role: Literal["user", "assistant"]
    content: str | None = None
    sources: list | None = None
    tools_used: list[str] | None = None
    model: str | None = None
