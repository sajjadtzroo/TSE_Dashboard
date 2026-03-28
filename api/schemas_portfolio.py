"""Pydantic schemas for portfolio API endpoints."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class PortfolioCreate(BaseModel):
    name: str = Field(default="سبد اصلی", min_length=1, max_length=100)
    currency: str = Field(default="IRR", pattern=r"^(IRR|USD)$")


class PortfolioUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    currency: str | None = Field(default=None, pattern=r"^(IRR|USD)$")


class PortfolioResponse(BaseModel):
    id: int
    name: str
    currency: str
    is_default: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


TX_TYPES = ("buy", "sell", "dividend", "fee", "deposit", "withdrawal")
MARKET_TYPES = ("tse", "crypto")


class TransactionCreate(BaseModel):
    symbol: str = Field(min_length=1, max_length=30)
    market_type: str = Field(default="tse", pattern=r"^(tse|crypto)$")
    tx_type: str = Field(pattern=r"^(buy|sell|dividend|fee|deposit|withdrawal)$")
    quantity: Decimal = Field(ge=0, decimal_places=8)
    price: Decimal = Field(ge=0, decimal_places=4)
    fee: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=4)
    executed_at: datetime
    note: str | None = Field(default=None, max_length=500)


class TransactionUpdate(BaseModel):
    symbol: str | None = Field(default=None, min_length=1, max_length=30)
    market_type: str | None = Field(default=None, pattern=r"^(tse|crypto)$")
    tx_type: str | None = Field(
        default=None,
        pattern=r"^(buy|sell|dividend|fee|deposit|withdrawal)$",
    )
    quantity: Decimal | None = Field(default=None, ge=0, decimal_places=8)
    price: Decimal | None = Field(default=None, ge=0, decimal_places=4)
    fee: Decimal | None = Field(default=None, ge=0, decimal_places=4)
    executed_at: datetime | None = None
    note: str | None = Field(default=None, max_length=500)


class TransactionResponse(BaseModel):
    id: int
    portfolio_id: int
    symbol: str
    market_type: str
    tx_type: str
    quantity: Decimal
    price: Decimal
    fee: Decimal
    executed_at: datetime
    note: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ImportItem(BaseModel):
    symbol: str
    quantity: float
    buyPrice: float
    addedAt: str | None = None
    market_type: str = "tse"


class ImportRequest(BaseModel):
    holdings: list[ImportItem]


class HoldingResponse(BaseModel):
    symbol: str
    market_type: str
    quantity: Decimal
    avg_cost: Decimal
    total_cost: Decimal
    total_fees: Decimal


class PerformanceResponse(BaseModel):
    twrr: float | None = None
    twrr_annualized: float | None = None
    irr: float | None = None
    total_return_pct: float | None = None
    period_days: int = 0


class AccountingSymbol(BaseModel):
    symbol: str
    remaining_quantity: Decimal
    remaining_cost: Decimal
    realized_pnl: Decimal
    total_fees: Decimal


class AccountingResponse(BaseModel):
    total_realized_pnl: Decimal = Decimal("0")
    total_unrealized_pnl: Decimal = Decimal("0")
    total_fees: Decimal = Decimal("0")
    total_dividends: Decimal = Decimal("0")
    per_symbol: list[AccountingSymbol] = []


# ── Goals ───────────────────────────────────────────────────────────────────


class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    target_value: Decimal = Field(gt=0)
    target_date: datetime | None = None


class GoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    target_value: Decimal | None = Field(default=None, gt=0)
    target_date: datetime | None = None


class GoalResponse(BaseModel):
    id: int
    portfolio_id: int
    name: str
    target_value: Decimal
    target_date: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Alerts ──────────────────────────────────────────────────────────────────

ALERT_TYPES = ("price_above", "price_below", "drawdown", "stop_loss", "rebalance")


class AlertCreate(BaseModel):
    alert_type: str = Field(pattern=r"^(price_above|price_below|drawdown|stop_loss|rebalance)$")
    symbol: str | None = Field(default=None, max_length=30)
    threshold: Decimal = Field(gt=0)


class AlertUpdate(BaseModel):
    alert_type: str | None = Field(default=None, pattern=r"^(price_above|price_below|drawdown|stop_loss|rebalance)$")
    symbol: str | None = Field(default=None, max_length=30)
    threshold: Decimal | None = Field(default=None, gt=0)
    is_active: bool | None = None


class AlertResponse(BaseModel):
    id: int
    portfolio_id: int
    alert_type: str
    symbol: str | None = None
    threshold: Decimal
    is_active: bool
    triggered_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Tax ─────────────────────────────────────────────────────────────────────


class TaxSymbolSummary(BaseModel):
    symbol: str
    buy_total: Decimal
    sell_total: Decimal
    realized_gain: Decimal
    total_fees: Decimal


class TaxReportResponse(BaseModel):
    year: str
    total_realized_gains: Decimal = Decimal("0")
    total_fees: Decimal = Decimal("0")
    total_dividends: Decimal = Decimal("0")
    net_taxable: Decimal = Decimal("0")
    per_symbol: list[TaxSymbolSummary] = []
