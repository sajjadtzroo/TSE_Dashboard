# Portfolio Phase 1: Backend Core + Accounting Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add backend-persisted portfolio with transaction ledger, computed holdings, TWRR/IRR/FIFO accounting, and two new frontend pages (Transaction Ledger + P&L).

**Architecture:** New SQLAlchemy models (`Portfolio`, `Transaction`) with full CRUD REST API. Holdings computed from transactions via service layer. TWRR/IRR calculated server-side. Frontend gets two new pages + updated nav, backed by new TanStack Query hooks. Anonymous users keep localStorage; auth users get backend persistence.

**Tech Stack:** SQLAlchemy ORM, Alembic migration, FastAPI router, Pydantic v2 schemas, Python stdlib for TWRR/IRR (no numpy dependency), React + Mantine + Recharts for frontend pages.

---

## File Structure

### Backend (new files)

| File | Responsibility |
|------|----------------|
| `api/schemas_portfolio.py` | Pydantic request/response schemas for portfolio + transactions |
| `api/services_portfolio.py` | Business logic: FIFO cost basis, TWRR, IRR, holdings aggregation |
| `api/routes/portfolios.py` | REST endpoints: portfolio CRUD, transactions CRUD, performance, accounting, import |
| `alembic/versions/xxxx_add_portfolio_tables.py` | DB migration for `portfolios` + `transactions` tables |

### Backend (modified files)

| File | Change |
|------|--------|
| `database/models.py` | Add `Portfolio` and `Transaction` ORM models |
| `api/routes/__init__.py` | Register `portfolio_router` in `all_routers` |

### Frontend (new files)

| File | Responsibility |
|------|----------------|
| `frontend/src/hooks/usePortfolioAPI.js` | TanStack Query hooks for all portfolio API endpoints |
| `frontend/src/pages/portfolio/TransactionLedger.jsx` | Transaction journal page with filters and CRUD |
| `frontend/src/pages/portfolio/ProfitAndLoss.jsx` | P&L page with TWRR/IRR KPIs and waterfall chart |
| `frontend/src/pages/portfolio/components/AddTransactionModal.jsx` | Modal for adding/editing transactions |
| `frontend/src/pages/portfolio/components/WaterfallChart.jsx` | Cash flow waterfall Recharts component |
| `frontend/src/pages/portfolio/components/TWRRvsIRRCard.jsx` | TWRR vs IRR comparison card |

### Frontend (modified files)

| File | Change |
|------|--------|
| `frontend/src/constants/portfolioNav.js` | Add accounting section with new nav items |
| `frontend/src/App.jsx` | Add routes for `/portfolio/transactions` and `/portfolio/pnl` |

### Tests (new files)

| File | What it tests |
|------|---------------|
| `tests/unit/test_portfolio_service.py` | FIFO, TWRR, IRR, holdings aggregation |
| `tests/unit/test_portfolio_routes.py` | API endpoints: CRUD, auth, validation |

---

## Task 1: Database Models

**Files:**
- Modify: `database/models.py` (append at end, before any final newline)

- [ ] **Step 1: Add Portfolio and Transaction models**

Open `database/models.py` and add at the end of the file:

```python
# ── Portfolio ───────────────────────────────────────────────────────────────


class Portfolio(Base):
    """User investment portfolio — container for transactions."""

    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(100), nullable=False, default="سبد اصلی")
    currency = Column(String(3), nullable=False, default="IRR")
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    user = relationship("User")
    transactions = relationship(
        "PortfolioTransaction",
        back_populates="portfolio",
        cascade="all, delete-orphan",
        lazy="select",
    )

    __table_args__ = (
        CheckConstraint(
            "currency IN ('IRR', 'USD')", name="ck_portfolios_currency"
        ),
        Index("idx_portfolios_user_default", "user_id", "is_default"),
    )

    def __repr__(self):
        return f"<Portfolio(id={self.id}, user={self.user_id}, name='{self.name}')>"


class PortfolioTransaction(Base):
    """Individual buy/sell/dividend/fee transaction in a portfolio."""

    __tablename__ = "portfolio_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    portfolio_id = Column(
        Integer,
        ForeignKey("portfolios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    symbol = Column(String(30), nullable=False)
    market_type = Column(String(10), nullable=False, default="tse")
    tx_type = Column(String(20), nullable=False)
    quantity = Column(Numeric(18, 8), nullable=False, default=0)
    price = Column(Numeric(18, 4), nullable=False, default=0)
    fee = Column(Numeric(18, 4), nullable=False, default=0)
    executed_at = Column(DateTime(timezone=True), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    portfolio = relationship("Portfolio", back_populates="transactions")

    __table_args__ = (
        CheckConstraint(
            "tx_type IN ('buy', 'sell', 'dividend', 'fee', 'deposit', 'withdrawal')",
            name="ck_ptx_tx_type",
        ),
        CheckConstraint(
            "market_type IN ('tse', 'crypto')",
            name="ck_ptx_market_type",
        ),
        Index("idx_ptx_portfolio_date", "portfolio_id", "executed_at"),
        Index("idx_ptx_portfolio_symbol", "portfolio_id", "symbol"),
    )

    def __repr__(self):
        return (
            f"<PortfolioTransaction(id={self.id}, {self.tx_type} "
            f"{self.quantity} {self.symbol} @ {self.price})>"
        )
```

- [ ] **Step 2: Verify models import cleanly**

Run:
```bash
python -c "from database.models import Portfolio, PortfolioTransaction; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add database/models.py
git commit -m "feat(portfolio): add Portfolio and PortfolioTransaction ORM models"
```

---

## Task 2: Alembic Migration

**Files:**
- Create: `alembic/versions/xxxx_add_portfolio_tables.py` (auto-generated)

- [ ] **Step 1: Generate migration**

```bash
alembic revision --autogenerate -m "add portfolio and transaction tables"
```

- [ ] **Step 2: Review generated migration**

Open the generated file in `alembic/versions/`. Verify it contains:
- `create_table('portfolios', ...)` with all columns and constraints
- `create_table('portfolio_transactions', ...)` with all columns, constraints, and indexes
- `drop_table` calls in `downgrade()`

- [ ] **Step 3: Run migration**

```bash
alembic upgrade head
```
Expected: migration applies cleanly.

- [ ] **Step 4: Verify tables exist**

```bash
python -c "
from config.settings import DATABASE_URL
from sqlalchemy import create_engine, inspect
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)
tables = inspector.get_table_names()
assert 'portfolios' in tables, 'portfolios table missing'
assert 'portfolio_transactions' in tables, 'portfolio_transactions table missing'
print('Tables verified OK')
"
```

- [ ] **Step 5: Commit**

```bash
git add alembic/versions/
git commit -m "feat(portfolio): add migration for portfolio tables"
```

---

## Task 3: Portfolio Service Layer

**Files:**
- Create: `api/services_portfolio.py`
- Test: `tests/unit/test_portfolio_service.py`

- [ ] **Step 1: Write tests for holdings aggregation**

Create `tests/unit/test_portfolio_service.py`:

```python
"""Unit tests for portfolio service — FIFO, TWRR, IRR, holdings."""

from datetime import datetime, timezone
from decimal import Decimal

import pytest


def _tx(tx_type, symbol, quantity, price, fee=0, executed_at=None, market_type="tse"):
    """Helper to build a mock transaction dict."""
    from unittest.mock import MagicMock

    t = MagicMock()
    t.tx_type = tx_type
    t.symbol = symbol
    t.market_type = market_type
    t.quantity = Decimal(str(quantity))
    t.price = Decimal(str(price))
    t.fee = Decimal(str(fee))
    t.executed_at = executed_at or datetime(2026, 1, 15, tzinfo=timezone.utc)
    return t


class TestAggregateHoldings:
    def test_single_buy(self):
        from api.services_portfolio import aggregate_holdings

        txs = [_tx("buy", "FOLD", 1000, 5000)]
        holdings = aggregate_holdings(txs)
        assert len(holdings) == 1
        assert holdings[0]["symbol"] == "FOLD"
        assert holdings[0]["quantity"] == Decimal("1000")
        assert holdings[0]["avg_cost"] == Decimal("5000")

    def test_buy_then_sell(self):
        from api.services_portfolio import aggregate_holdings

        txs = [
            _tx("buy", "FOLD", 1000, 5000),
            _tx("sell", "FOLD", 400, 6000),
        ]
        holdings = aggregate_holdings(txs)
        assert len(holdings) == 1
        assert holdings[0]["quantity"] == Decimal("600")

    def test_fully_sold_excluded(self):
        from api.services_portfolio import aggregate_holdings

        txs = [
            _tx("buy", "FOLD", 1000, 5000),
            _tx("sell", "FOLD", 1000, 6000),
        ]
        holdings = aggregate_holdings(txs)
        assert len(holdings) == 0

    def test_dividends_ignored_in_quantity(self):
        from api.services_portfolio import aggregate_holdings

        txs = [
            _tx("buy", "FOLD", 1000, 5000),
            _tx("dividend", "FOLD", 0, 0),
        ]
        holdings = aggregate_holdings(txs)
        assert holdings[0]["quantity"] == Decimal("1000")


class TestFIFOCostBasis:
    def test_single_lot(self):
        from api.services_portfolio import fifo_cost_basis

        txs = [_tx("buy", "FOLD", 1000, 5000, fee=50000)]
        result = fifo_cost_basis(txs, "FOLD")
        assert result["total_cost"] == Decimal("5000000")
        assert result["total_fees"] == Decimal("50000")
        assert result["realized_pnl"] == Decimal("0")

    def test_partial_sell(self):
        from api.services_portfolio import fifo_cost_basis

        txs = [
            _tx("buy", "FOLD", 1000, 5000, fee=10000),
            _tx("sell", "FOLD", 400, 7000, fee=5000),
        ]
        result = fifo_cost_basis(txs, "FOLD")
        # Sold 400 shares bought at 5000 = cost 2,000,000
        # Sell proceeds: 400 * 7000 = 2,800,000
        # Realized PnL: 2,800,000 - 2,000,000 = 800,000 (before fees)
        assert result["realized_pnl"] == Decimal("800000")
        assert result["remaining_quantity"] == Decimal("600")
        assert result["remaining_cost"] == Decimal("3000000")

    def test_two_lots_fifo_order(self):
        from api.services_portfolio import fifo_cost_basis

        txs = [
            _tx("buy", "FOLD", 500, 4000, executed_at=datetime(2026, 1, 1, tzinfo=timezone.utc)),
            _tx("buy", "FOLD", 500, 6000, executed_at=datetime(2026, 1, 10, tzinfo=timezone.utc)),
            _tx("sell", "FOLD", 700, 7000, executed_at=datetime(2026, 1, 20, tzinfo=timezone.utc)),
        ]
        result = fifo_cost_basis(txs, "FOLD")
        # FIFO: sell 500 from lot1 @ 4000 + 200 from lot2 @ 6000
        # Cost = 500*4000 + 200*6000 = 2,000,000 + 1,200,000 = 3,200,000
        # Proceeds = 700*7000 = 4,900,000
        # Realized = 4,900,000 - 3,200,000 = 1,700,000
        assert result["realized_pnl"] == Decimal("1700000")
        assert result["remaining_quantity"] == Decimal("300")
        assert result["remaining_cost"] == Decimal("1800000")  # 300 * 6000


class TestTWRR:
    def test_no_cash_flows(self):
        from api.services_portfolio import compute_twrr

        # Simple: start 100, end 120, no cash flows
        values = [
            (datetime(2026, 1, 1, tzinfo=timezone.utc), Decimal("100"), Decimal("0")),
            (datetime(2026, 6, 1, tzinfo=timezone.utc), Decimal("120"), Decimal("0")),
        ]
        twrr = compute_twrr(values)
        assert abs(twrr - 0.20) < 0.001  # 20% return

    def test_with_deposit(self):
        from api.services_portfolio import compute_twrr

        # Day 0: value 100, Day 30: value 110 then deposit 50, Day 60: value 170
        values = [
            (datetime(2026, 1, 1, tzinfo=timezone.utc), Decimal("100"), Decimal("0")),
            (datetime(2026, 1, 31, tzinfo=timezone.utc), Decimal("110"), Decimal("50")),
            (datetime(2026, 3, 2, tzinfo=timezone.utc), Decimal("170"), Decimal("0")),
        ]
        twrr = compute_twrr(values)
        # Period 1: 110/100 = 1.10
        # Period 2: 170/(110+50) = 170/160 = 1.0625
        # TWRR = 1.10 * 1.0625 - 1 = 0.16875
        assert abs(twrr - 0.16875) < 0.001


class TestIRR:
    def test_simple_investment(self):
        from api.services_portfolio import compute_irr

        # Invest 1000, receive 1100 after 1 year
        cash_flows = [
            (datetime(2025, 1, 1, tzinfo=timezone.utc), Decimal("-1000")),
            (datetime(2026, 1, 1, tzinfo=timezone.utc), Decimal("1100")),
        ]
        irr = compute_irr(cash_flows)
        assert irr is not None
        assert abs(irr - 0.10) < 0.01  # ~10% annual return

    def test_no_cash_flows_returns_none(self):
        from api.services_portfolio import compute_irr

        irr = compute_irr([])
        assert irr is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/unit/test_portfolio_service.py -v --no-header -q
```
Expected: all tests FAIL with `ModuleNotFoundError: No module named 'api.services_portfolio'`

- [ ] **Step 3: Implement portfolio service**

Create `api/services_portfolio.py`:

```python
"""
Portfolio business logic: holdings aggregation, FIFO cost basis, TWRR, IRR.
"""

import logging
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from database.models import Portfolio, PortfolioTransaction

logger = logging.getLogger(__name__)

_ZERO = Decimal("0")


# ── Holdings Aggregation ────────────────────────────────────────────────────


def aggregate_holdings(transactions):
    """Compute current holdings from a list of transactions.

    Returns a list of dicts with keys:
        symbol, market_type, quantity, avg_cost, total_cost, total_fees
    """
    holdings = defaultdict(lambda: {
        "quantity": _ZERO,
        "total_cost": _ZERO,
        "total_fees": _ZERO,
        "market_type": "tse",
    })

    for tx in transactions:
        sym = tx.symbol
        holdings[sym]["market_type"] = tx.market_type

        if tx.tx_type == "buy":
            holdings[sym]["quantity"] += tx.quantity
            holdings[sym]["total_cost"] += tx.quantity * tx.price
            holdings[sym]["total_fees"] += tx.fee
        elif tx.tx_type == "sell":
            holdings[sym]["quantity"] -= tx.quantity
            holdings[sym]["total_fees"] += tx.fee

    result = []
    for sym, h in holdings.items():
        qty = h["quantity"]
        if qty <= _ZERO:
            continue
        avg_cost = h["total_cost"] / qty if qty > 0 else _ZERO
        result.append({
            "symbol": sym,
            "market_type": h["market_type"],
            "quantity": qty,
            "avg_cost": avg_cost,
            "total_cost": h["total_cost"],
            "total_fees": h["total_fees"],
        })

    return result


# ── FIFO Cost Basis ─────────────────────────────────────────────────────────


def fifo_cost_basis(transactions, symbol):
    """Compute FIFO cost basis for a single symbol.

    Returns dict with:
        remaining_quantity, remaining_cost, realized_pnl, total_fees
    """
    buys = []  # queue of (quantity, price)
    realized_pnl = _ZERO
    total_fees = _ZERO

    # Sort by execution date for FIFO ordering
    sorted_txs = sorted(
        [t for t in transactions if t.symbol == symbol],
        key=lambda t: t.executed_at,
    )

    for tx in sorted_txs:
        total_fees += tx.fee

        if tx.tx_type == "buy":
            buys.append([tx.quantity, tx.price])
        elif tx.tx_type == "sell":
            sell_qty = tx.quantity
            sell_price = tx.price
            while sell_qty > 0 and buys:
                lot_qty, lot_price = buys[0]
                matched = min(sell_qty, lot_qty)
                realized_pnl += matched * (sell_price - lot_price)
                buys[0][0] -= matched
                sell_qty -= matched
                if buys[0][0] <= 0:
                    buys.pop(0)

    remaining_quantity = sum(b[0] for b in buys)
    remaining_cost = sum(b[0] * b[1] for b in buys)

    return {
        "remaining_quantity": remaining_quantity,
        "remaining_cost": remaining_cost,
        "realized_pnl": realized_pnl,
        "total_cost": remaining_cost,
        "total_fees": total_fees,
    }


# ── TWRR (Time-Weighted Rate of Return) ────────────────────────────────────


def compute_twrr(value_flow_pairs):
    """Compute TWRR from a list of (date, portfolio_value, net_cash_flow).

    value_flow_pairs: [(datetime, Decimal value_before_flow, Decimal net_flow), ...]
        - Sorted by date ascending
        - value is portfolio value BEFORE the cash flow on that date
        - net_flow is positive for deposits, negative for withdrawals
        - The last entry should have net_flow = 0 (just the final value)

    Returns float TWRR (e.g., 0.20 for 20% total return).
    """
    if len(value_flow_pairs) < 2:
        return 0.0

    chain = 1.0
    for i in range(1, len(value_flow_pairs)):
        prev_date, prev_value, prev_flow = value_flow_pairs[i - 1]
        curr_date, curr_value, curr_flow = value_flow_pairs[i]

        # Beginning value for this sub-period = previous value + previous cash flow
        beginning = float(prev_value + prev_flow)
        if beginning <= 0:
            continue

        # Sub-period return
        sub_return = float(curr_value) / beginning
        chain *= sub_return

    return chain - 1.0


def annualize_return(total_return, days):
    """Annualize a total return over a given number of days."""
    if days <= 0:
        return 0.0
    return (1.0 + total_return) ** (365.0 / days) - 1.0


# ── IRR (Internal Rate of Return) ──────────────────────────────────────────


def compute_irr(cash_flows, max_iterations=100, tolerance=1e-7):
    """Compute IRR using Newton-Raphson method.

    cash_flows: [(datetime, Decimal amount), ...]
        - Negative = outflow (investment), positive = inflow (return)
        - Must contain at least one negative and one positive

    Returns annualized IRR as float, or None if not converging.
    """
    if len(cash_flows) < 2:
        return None

    # Convert to (day_offset, amount) pairs
    base_date = cash_flows[0][0]
    flows = []
    for dt, amount in cash_flows:
        days = (dt - base_date).days
        flows.append((days / 365.0, float(amount)))

    # Newton-Raphson
    rate = 0.10  # initial guess

    for _ in range(max_iterations):
        npv = 0.0
        dnpv = 0.0  # derivative

        for t, cf in flows:
            denom = (1.0 + rate) ** t
            if denom == 0:
                return None
            npv += cf / denom
            if t != 0:
                dnpv -= t * cf / ((1.0 + rate) ** (t + 1))

        if abs(dnpv) < 1e-12:
            return None

        new_rate = rate - npv / dnpv

        if abs(new_rate - rate) < tolerance:
            return new_rate

        rate = new_rate

    return None  # did not converge


# ── Database Queries ────────────────────────────────────────────────────────


def get_user_portfolios(db: Session, user_id: int):
    """Get all portfolios for a user."""
    return (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user_id)
        .order_by(Portfolio.is_default.desc(), Portfolio.created_at)
        .all()
    )


def get_portfolio_or_404(db: Session, portfolio_id: int, user_id: int):
    """Get a portfolio by ID, ensuring it belongs to the user."""
    from fastapi import HTTPException

    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.id == portfolio_id, Portfolio.user_id == user_id)
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


def get_or_create_default_portfolio(db: Session, user_id: int):
    """Get user's default portfolio, creating one if none exists."""
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user_id, Portfolio.is_default == True)
        .first()
    )
    if portfolio:
        return portfolio

    portfolio = Portfolio(
        user_id=user_id,
        name="سبد اصلی",
        currency="IRR",
        is_default=True,
    )
    db.add(portfolio)
    db.flush()
    return portfolio


def get_transactions(db: Session, portfolio_id: int, **filters):
    """Get transactions for a portfolio with optional filters.

    Filters: symbol, tx_type, from_date, to_date, page, per_page
    """
    query = (
        db.query(PortfolioTransaction)
        .filter(PortfolioTransaction.portfolio_id == portfolio_id)
    )

    if filters.get("symbol"):
        query = query.filter(PortfolioTransaction.symbol == filters["symbol"])
    if filters.get("tx_type"):
        query = query.filter(PortfolioTransaction.tx_type == filters["tx_type"])
    if filters.get("from_date"):
        query = query.filter(PortfolioTransaction.executed_at >= filters["from_date"])
    if filters.get("to_date"):
        query = query.filter(PortfolioTransaction.executed_at <= filters["to_date"])

    total = query.count()
    query = query.order_by(PortfolioTransaction.executed_at.desc())

    page = filters.get("page", 1)
    per_page = filters.get("per_page", 50)
    query = query.offset((page - 1) * per_page).limit(per_page)

    return query.all(), total


def import_from_localstorage(db: Session, portfolio: Portfolio, holdings_json: list):
    """Import holdings from localStorage JSON format into transactions.

    Each item: { symbol, quantity, buyPrice, addedAt?, market_type? }
    """
    from datetime import datetime, timezone

    for item in holdings_json:
        symbol = item.get("symbol")
        quantity = item.get("quantity")
        buy_price = item.get("buyPrice")
        if not symbol or not quantity or not buy_price:
            continue

        added_at = item.get("addedAt")
        if added_at:
            try:
                executed_at = datetime.fromisoformat(added_at.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                executed_at = datetime.now(timezone.utc)
        else:
            executed_at = datetime.now(timezone.utc)

        tx = PortfolioTransaction(
            portfolio_id=portfolio.id,
            symbol=symbol,
            market_type=item.get("market_type", "tse"),
            tx_type="buy",
            quantity=Decimal(str(quantity)),
            price=Decimal(str(buy_price)),
            fee=_ZERO,
            executed_at=executed_at,
            note="Imported from local storage",
        )
        db.add(tx)

    db.flush()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/unit/test_portfolio_service.py -v --no-header -q
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/services_portfolio.py tests/unit/test_portfolio_service.py
git commit -m "feat(portfolio): add service layer — FIFO, TWRR, IRR, holdings aggregation"
```

---

## Task 4: Pydantic Schemas

**Files:**
- Create: `api/schemas_portfolio.py`

- [ ] **Step 1: Create schemas**

Create `api/schemas_portfolio.py`:

```python
"""Pydantic schemas for portfolio API endpoints."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# ── Portfolio ───────────────────────────────────────────────────────────────


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


# ── Transactions ────────────────────────────────────────────────────────────

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


# ── Import ──────────────────────────────────────────────────────────────────


class ImportItem(BaseModel):
    symbol: str
    quantity: float
    buyPrice: float
    addedAt: str | None = None
    market_type: str = "tse"


class ImportRequest(BaseModel):
    holdings: list[ImportItem]


# ── Performance / Accounting responses ──────────────────────────────────────


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
```

- [ ] **Step 2: Verify schemas import cleanly**

```bash
python -c "from api.schemas_portfolio import PortfolioCreate, TransactionCreate, PerformanceResponse; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add api/schemas_portfolio.py
git commit -m "feat(portfolio): add Pydantic schemas for portfolio API"
```

---

## Task 5: API Routes

**Files:**
- Create: `api/routes/portfolios.py`
- Modify: `api/routes/__init__.py`
- Test: `tests/unit/test_portfolio_routes.py`

- [ ] **Step 1: Write route tests**

Create `tests/unit/test_portfolio_routes.py`:

```python
"""Unit tests for portfolio API routes."""

from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def portfolio_client(mock_viewer_user, mock_db):
    """TestClient with auth for portfolio routes."""
    from fastapi.testclient import TestClient

    from api.auth import get_current_user
    from api.deps import get_db
    from api.main import app

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_viewer_user
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


class TestListPortfolios:
    @patch("api.routes.portfolios.svc.get_user_portfolios")
    def test_returns_user_portfolios(self, mock_get, portfolio_client, mock_viewer_user):
        from database.models import Portfolio

        p = Portfolio(id=1, user_id=mock_viewer_user.id, name="سبد اصلی",
                      currency="IRR", is_default=True)
        mock_get.return_value = [p]

        resp = portfolio_client.get("/api/portfolios")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["name"] == "سبد اصلی"

    def test_unauthenticated_returns_401(self, unauthed_client):
        resp = unauthed_client.get("/api/portfolios")
        assert resp.status_code == 401


class TestCreatePortfolio:
    @patch("api.routes.portfolios.svc.get_user_portfolios")
    def test_creates_portfolio(self, mock_get, portfolio_client, mock_db, mock_viewer_user):
        mock_get.return_value = []  # no existing portfolios
        mock_db.flush = MagicMock()
        mock_db.add = MagicMock()
        mock_db.refresh = MagicMock()

        resp = portfolio_client.post("/api/portfolios", json={
            "name": "Test Portfolio",
            "currency": "IRR",
        })
        assert resp.status_code == 201
        mock_db.add.assert_called_once()

    def test_invalid_currency_returns_422(self, portfolio_client):
        resp = portfolio_client.post("/api/portfolios", json={
            "name": "Test",
            "currency": "EUR",
        })
        assert resp.status_code == 422


class TestAddTransaction:
    @patch("api.routes.portfolios.svc.get_portfolio_or_404")
    def test_adds_transaction(self, mock_get_port, portfolio_client, mock_db):
        from database.models import Portfolio

        mock_get_port.return_value = Portfolio(id=1, user_id=1, name="Test",
                                               currency="IRR", is_default=True)
        mock_db.add = MagicMock()
        mock_db.flush = MagicMock()
        mock_db.refresh = MagicMock()

        resp = portfolio_client.post("/api/portfolios/1/transactions", json={
            "symbol": "FOLD",
            "tx_type": "buy",
            "quantity": "1000",
            "price": "5000",
            "fee": "10000",
            "executed_at": "2026-03-28T10:00:00Z",
        })
        assert resp.status_code == 201
        mock_db.add.assert_called_once()

    @patch("api.routes.portfolios.svc.get_portfolio_or_404")
    def test_invalid_tx_type_returns_422(self, mock_get_port, portfolio_client):
        from database.models import Portfolio

        mock_get_port.return_value = Portfolio(id=1, user_id=1, name="Test",
                                               currency="IRR", is_default=True)
        resp = portfolio_client.post("/api/portfolios/1/transactions", json={
            "symbol": "FOLD",
            "tx_type": "invalid",
            "quantity": "1000",
            "price": "5000",
            "executed_at": "2026-03-28T10:00:00Z",
        })
        assert resp.status_code == 422


class TestGetHoldings:
    @patch("api.routes.portfolios.svc.aggregate_holdings")
    @patch("api.routes.portfolios.svc.get_portfolio_or_404")
    def test_returns_computed_holdings(self, mock_port, mock_agg, portfolio_client):
        from database.models import Portfolio

        mock_port.return_value = Portfolio(id=1, user_id=1, name="Test",
                                           currency="IRR", is_default=True)
        mock_port.return_value.transactions = []
        mock_agg.return_value = [{
            "symbol": "FOLD",
            "market_type": "tse",
            "quantity": Decimal("1000"),
            "avg_cost": Decimal("5000"),
            "total_cost": Decimal("5000000"),
            "total_fees": Decimal("10000"),
        }]

        resp = portfolio_client.get("/api/portfolios/1/holdings")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["symbol"] == "FOLD"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/unit/test_portfolio_routes.py -v --no-header -q
```
Expected: FAIL (routes module doesn't exist yet).

- [ ] **Step 3: Implement routes**

Create `api/routes/portfolios.py`:

```python
"""Portfolio REST API — CRUD, transactions, performance, accounting, import."""

import logging
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api import services_portfolio as svc
from api.auth import get_current_user
from api.cache import cache_manager
from api.deps import get_db
from api.schemas_portfolio import (
    AccountingResponse,
    AccountingSymbol,
    HoldingResponse,
    ImportRequest,
    PerformanceResponse,
    PortfolioCreate,
    PortfolioResponse,
    PortfolioUpdate,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from api.utils import handle_api_errors, wrap_response
from database.models import Portfolio, PortfolioTransaction

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/portfolios", tags=["portfolios"])


def _cache_tag(user_id: int) -> str:
    return f"portfolio_{user_id}"


# ── Portfolio CRUD ──────────────────────────────────────────────────────────


@router.get("")
@handle_api_errors("Failed to list portfolios")
def list_portfolios(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolios = svc.get_user_portfolios(db, user.id)
    return wrap_response([
        PortfolioResponse.model_validate(p).model_dump() for p in portfolios
    ])


@router.post("", status_code=status.HTTP_201_CREATED)
@handle_api_errors("Failed to create portfolio")
def create_portfolio(
    req: PortfolioCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = svc.get_user_portfolios(db, user.id)
    is_first = len(existing) == 0

    portfolio = Portfolio(
        user_id=user.id,
        name=req.name,
        currency=req.currency,
        is_default=is_first,
    )
    db.add(portfolio)
    db.flush()
    db.refresh(portfolio)
    cache_manager.invalidate_tag(_cache_tag(user.id))
    return wrap_response(PortfolioResponse.model_validate(portfolio).model_dump())


@router.get("/{portfolio_id}")
@handle_api_errors("Failed to get portfolio")
def get_portfolio(
    portfolio_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = svc.get_portfolio_or_404(db, portfolio_id, user.id)
    return wrap_response(PortfolioResponse.model_validate(portfolio).model_dump())


@router.put("/{portfolio_id}")
@handle_api_errors("Failed to update portfolio")
def update_portfolio(
    portfolio_id: int,
    req: PortfolioUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = svc.get_portfolio_or_404(db, portfolio_id, user.id)
    if req.name is not None:
        portfolio.name = req.name
    if req.currency is not None:
        portfolio.currency = req.currency
    db.flush()
    cache_manager.invalidate_tag(_cache_tag(user.id))
    return wrap_response(PortfolioResponse.model_validate(portfolio).model_dump())


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
@handle_api_errors("Failed to delete portfolio")
def delete_portfolio(
    portfolio_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = svc.get_portfolio_or_404(db, portfolio_id, user.id)
    db.delete(portfolio)
    db.flush()
    cache_manager.invalidate_tag(_cache_tag(user.id))


# ── Transactions ────────────────────────────────────────────────────────────


@router.get("/{portfolio_id}/transactions")
@handle_api_errors("Failed to list transactions")
def list_transactions(
    portfolio_id: int,
    symbol: str | None = Query(default=None),
    tx_type: str | None = Query(default=None),
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    transactions, total = svc.get_transactions(
        db, portfolio_id,
        symbol=symbol, tx_type=tx_type,
        from_date=from_date, to_date=to_date,
        page=page, per_page=per_page,
    )
    return wrap_response({
        "items": [TransactionResponse.model_validate(t).model_dump() for t in transactions],
        "total": total,
        "page": page,
        "per_page": per_page,
    })


@router.post("/{portfolio_id}/transactions", status_code=status.HTTP_201_CREATED)
@handle_api_errors("Failed to add transaction")
def add_transaction(
    portfolio_id: int,
    req: TransactionCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    tx = PortfolioTransaction(
        portfolio_id=portfolio_id,
        symbol=req.symbol,
        market_type=req.market_type,
        tx_type=req.tx_type,
        quantity=req.quantity,
        price=req.price,
        fee=req.fee,
        executed_at=req.executed_at,
        note=req.note,
    )
    db.add(tx)
    db.flush()
    db.refresh(tx)
    cache_manager.invalidate_tag(_cache_tag(user.id))
    return wrap_response(TransactionResponse.model_validate(tx).model_dump())


@router.put("/{portfolio_id}/transactions/{tx_id}")
@handle_api_errors("Failed to update transaction")
def update_transaction(
    portfolio_id: int,
    tx_id: int,
    req: TransactionUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    tx = (
        db.query(PortfolioTransaction)
        .filter(
            PortfolioTransaction.id == tx_id,
            PortfolioTransaction.portfolio_id == portfolio_id,
        )
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    for field in ("symbol", "market_type", "tx_type", "quantity", "price",
                  "fee", "executed_at", "note"):
        val = getattr(req, field, None)
        if val is not None:
            setattr(tx, field, val)

    db.flush()
    cache_manager.invalidate_tag(_cache_tag(user.id))
    return wrap_response(TransactionResponse.model_validate(tx).model_dump())


@router.delete("/{portfolio_id}/transactions/{tx_id}",
               status_code=status.HTTP_204_NO_CONTENT)
@handle_api_errors("Failed to delete transaction")
def delete_transaction(
    portfolio_id: int,
    tx_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    tx = (
        db.query(PortfolioTransaction)
        .filter(
            PortfolioTransaction.id == tx_id,
            PortfolioTransaction.portfolio_id == portfolio_id,
        )
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.flush()
    cache_manager.invalidate_tag(_cache_tag(user.id))


# ── Computed Holdings ───────────────────────────────────────────────────────


@router.get("/{portfolio_id}/holdings")
@handle_api_errors("Failed to compute holdings")
def get_holdings(
    portfolio_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = svc.get_portfolio_or_404(db, portfolio_id, user.id)
    txs = (
        db.query(PortfolioTransaction)
        .filter(PortfolioTransaction.portfolio_id == portfolio_id)
        .order_by(PortfolioTransaction.executed_at)
        .all()
    )
    holdings = svc.aggregate_holdings(txs)
    return wrap_response([
        HoldingResponse(**h).model_dump() for h in holdings
    ])


# ── Performance ─────────────────────────────────────────────────────────────


@router.get("/{portfolio_id}/performance")
@handle_api_errors("Failed to compute performance")
def get_performance(
    portfolio_id: int,
    period: str = Query(default="all", pattern=r"^(1m|3m|6m|ytd|1y|all)$"),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = svc.get_portfolio_or_404(db, portfolio_id, user.id)
    txs = (
        db.query(PortfolioTransaction)
        .filter(PortfolioTransaction.portfolio_id == portfolio_id)
        .order_by(PortfolioTransaction.executed_at)
        .all()
    )

    if not txs:
        return wrap_response(PerformanceResponse().model_dump())

    # Build cash flow list for IRR
    cash_flows = []
    for tx in txs:
        if tx.tx_type in ("buy", "deposit"):
            cash_flows.append((tx.executed_at, -tx.quantity * tx.price - tx.fee))
        elif tx.tx_type in ("sell", "withdrawal"):
            cash_flows.append((tx.executed_at, tx.quantity * tx.price - tx.fee))
        elif tx.tx_type == "dividend":
            cash_flows.append((tx.executed_at, tx.quantity * tx.price))

    # For TWRR we need portfolio valuations at cash flow dates
    # Simplified: use transaction-implied values
    # Full implementation would fetch market prices — placeholder for now
    irr = svc.compute_irr(cash_flows) if len(cash_flows) >= 2 else None

    first_date = txs[0].executed_at
    last_date = txs[-1].executed_at
    period_days = max((last_date - first_date).days, 1)

    return wrap_response(PerformanceResponse(
        irr=irr,
        period_days=period_days,
    ).model_dump())


# ── Accounting ──────────────────────────────────────────────────────────────


@router.get("/{portfolio_id}/accounting")
@handle_api_errors("Failed to compute accounting")
def get_accounting(
    portfolio_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = svc.get_portfolio_or_404(db, portfolio_id, user.id)
    txs = (
        db.query(PortfolioTransaction)
        .filter(PortfolioTransaction.portfolio_id == portfolio_id)
        .order_by(PortfolioTransaction.executed_at)
        .all()
    )

    if not txs:
        return wrap_response(AccountingResponse().model_dump())

    # Get unique symbols
    symbols = list({tx.symbol for tx in txs})

    per_symbol = []
    total_realized = Decimal("0")
    total_fees = Decimal("0")
    total_dividends = Decimal("0")

    for sym in symbols:
        basis = svc.fifo_cost_basis(txs, sym)
        per_symbol.append(AccountingSymbol(
            symbol=sym,
            remaining_quantity=basis["remaining_quantity"],
            remaining_cost=basis["remaining_cost"],
            realized_pnl=basis["realized_pnl"],
            total_fees=basis["total_fees"],
        ))
        total_realized += basis["realized_pnl"]
        total_fees += basis["total_fees"]

    # Sum dividends
    for tx in txs:
        if tx.tx_type == "dividend":
            total_dividends += tx.quantity * tx.price

    return wrap_response(AccountingResponse(
        total_realized_pnl=total_realized,
        total_fees=total_fees,
        total_dividends=total_dividends,
        per_symbol=per_symbol,
    ).model_dump())


# ── Import from localStorage ───────────────────────────────────────────────


@router.post("/{portfolio_id}/import", status_code=status.HTTP_201_CREATED)
@handle_api_errors("Failed to import holdings")
def import_holdings(
    portfolio_id: int,
    req: ImportRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = svc.get_portfolio_or_404(db, portfolio_id, user.id)
    svc.import_from_localstorage(
        db, portfolio,
        [item.model_dump() for item in req.holdings],
    )
    cache_manager.invalidate_tag(_cache_tag(user.id))
    return wrap_response({"imported": len(req.holdings)})
```

- [ ] **Step 4: Register router in `__init__.py`**

Add to `api/routes/__init__.py`:

```python
from api.routes.portfolios import router as portfolio_router
```

And add `portfolio_router` to the `all_routers` list.

- [ ] **Step 5: Run route tests**

```bash
pytest tests/unit/test_portfolio_routes.py -v --no-header -q
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add api/routes/portfolios.py api/routes/__init__.py tests/unit/test_portfolio_routes.py
git commit -m "feat(portfolio): add REST API routes — CRUD, transactions, performance, accounting"
```

---

## Task 6: Frontend API Hooks

**Files:**
- Create: `frontend/src/hooks/usePortfolioAPI.js`

- [ ] **Step 1: Create TanStack Query hooks**

Create `frontend/src/hooks/usePortfolioAPI.js`:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const STALE_5MIN = 5 * 60 * 1000;

// ── Portfolio CRUD ─────────────────────────────────────────────────────────

export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: () => api.get('/portfolios').then((r) => r.data.data),
    staleTime: STALE_5MIN,
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/portfolios', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  });
}

export function useUpdatePortfolio(portfolioId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      api.put(`/portfolios/${portfolioId}`, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  });
}

export function useDeletePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/portfolios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  });
}

// ── Transactions ───────────────────────────────────────────────────────────

export function useTransactions(portfolioId, filters = {}) {
  const { symbol, tx_type, from, to, page = 1, per_page = 50 } = filters;
  return useQuery({
    queryKey: ['portfolio-transactions', portfolioId, filters],
    queryFn: () =>
      api
        .get(`/portfolios/${portfolioId}/transactions`, {
          params: { symbol, tx_type, from, to, page, per_page },
        })
        .then((r) => r.data.data),
    enabled: !!portfolioId,
    staleTime: STALE_5MIN,
  });
}

export function useAddTransaction(portfolioId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      api.post(`/portfolios/${portfolioId}/transactions`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-transactions', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-holdings', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-performance', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-accounting', portfolioId] });
    },
  });
}

export function useUpdateTransaction(portfolioId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ txId, data }) =>
      api.put(`/portfolios/${portfolioId}/transactions/${txId}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-transactions', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-holdings', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-performance', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-accounting', portfolioId] });
    },
  });
}

export function useDeleteTransaction(portfolioId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (txId) => api.delete(`/portfolios/${portfolioId}/transactions/${txId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-transactions', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-holdings', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-performance', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-accounting', portfolioId] });
    },
  });
}

// ── Computed Data ──────────────────────────────────────────────────────────

export function usePortfolioHoldings(portfolioId) {
  return useQuery({
    queryKey: ['portfolio-holdings', portfolioId],
    queryFn: () =>
      api.get(`/portfolios/${portfolioId}/holdings`).then((r) => r.data.data),
    enabled: !!portfolioId,
    staleTime: STALE_5MIN,
  });
}

export function usePortfolioPerformance(portfolioId, period = 'all') {
  return useQuery({
    queryKey: ['portfolio-performance', portfolioId, period],
    queryFn: () =>
      api
        .get(`/portfolios/${portfolioId}/performance`, { params: { period } })
        .then((r) => r.data.data),
    enabled: !!portfolioId,
    staleTime: STALE_5MIN,
  });
}

export function usePortfolioAccounting(portfolioId) {
  return useQuery({
    queryKey: ['portfolio-accounting', portfolioId],
    queryFn: () =>
      api.get(`/portfolios/${portfolioId}/accounting`).then((r) => r.data.data),
    enabled: !!portfolioId,
    staleTime: STALE_5MIN,
  });
}

// ── Import ─────────────────────────────────────────────────────────────────

export function useImportHoldings(portfolioId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (holdings) =>
      api.post(`/portfolios/${portfolioId}/import`, { holdings }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-transactions', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-holdings', portfolioId] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/usePortfolioAPI.js
git commit -m "feat(portfolio): add TanStack Query hooks for portfolio API"
```

---

## Task 7: Update Navigation

**Files:**
- Modify: `frontend/src/constants/portfolioNav.js`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add accounting nav section**

Replace the contents of `frontend/src/constants/portfolioNav.js`:

```jsx
import {
  IconBriefcase,
  IconChartLine,
  IconShieldCheck,
  IconAtom,
  IconUserCheck,
  IconTargetArrow,
  IconReceipt,
  IconCash,
} from '@tabler/icons-react';

export const portfolioMenuSections = [
  {
    label: 'سبد سرمایه‌گذاری',
    items: [
      { text: 'داشبورد', icon: IconBriefcase, path: '/portfolio' },
      { text: 'عملکرد', icon: IconChartLine, path: '/portfolio/performance' },
      { text: 'تحلیل ریسک', icon: IconShieldCheck, path: '/portfolio/risk' },
      { text: 'شبیه‌سازی', icon: IconAtom, path: '/portfolio/simulation' },
      { text: 'مشاور سرمایه‌گذاری', icon: IconUserCheck, path: '/portfolio/analyst' },
      { text: 'بهینه‌سازی سبد', icon: IconTargetArrow, path: '/portfolio/optimization' },
    ],
  },
  {
    label: 'حسابداری و گزارش',
    items: [
      { text: 'دفتر معاملات', icon: IconReceipt, path: '/portfolio/transactions' },
      { text: 'سود و زیان', icon: IconCash, path: '/portfolio/pnl' },
    ],
  },
];
```

- [ ] **Step 2: Add routes in App.jsx**

In `App.jsx`, add lazy imports after the existing portfolio imports (around line 87):

```jsx
const TransactionLedger = lazyRetry(() => import('./pages/portfolio/TransactionLedger'), 'TransactionLedger');
const ProfitAndLoss = lazyRetry(() => import('./pages/portfolio/ProfitAndLoss'), 'ProfitAndLoss');
```

Then inside the `<Route path="/portfolio" ...>` block (around line 254), add two new routes after the `optimization` route:

```jsx
<Route path="transactions" element={<TransactionLedger />} />
<Route path="pnl" element={<ProfitAndLoss />} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/constants/portfolioNav.js frontend/src/App.jsx
git commit -m "feat(portfolio): add accounting nav section and routes"
```

---

## Task 8: Add Transaction Modal

**Files:**
- Create: `frontend/src/pages/portfolio/components/AddTransactionModal.jsx`

- [ ] **Step 1: Create the modal component**

Create `frontend/src/pages/portfolio/components/AddTransactionModal.jsx`:

```jsx
import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Stack,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';

const TX_TYPE_OPTIONS = [
  { value: 'buy', label: 'خرید' },
  { value: 'sell', label: 'فروش' },
  { value: 'dividend', label: 'سود نقدی' },
  { value: 'fee', label: 'کارمزد' },
  { value: 'deposit', label: 'واریز' },
  { value: 'withdrawal', label: 'برداشت' },
];

const MARKET_TYPE_OPTIONS = [
  { value: 'tse', label: 'بورس تهران' },
  { value: 'crypto', label: 'ارز دیجیتال' },
];

export default function AddTransactionModal({
  opened,
  onClose,
  onSubmit,
  editTransaction = null,
}) {
  const [symbol, setSymbol] = useState('');
  const [marketType, setMarketType] = useState('tse');
  const [txType, setTxType] = useState('buy');
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [fee, setFee] = useState(0);
  const [executedAt, setExecutedAt] = useState(new Date());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editTransaction) {
      setSymbol(editTransaction.symbol || '');
      setMarketType(editTransaction.market_type || 'tse');
      setTxType(editTransaction.tx_type || 'buy');
      setQuantity(Number(editTransaction.quantity) || 0);
      setPrice(Number(editTransaction.price) || 0);
      setFee(Number(editTransaction.fee) || 0);
      setExecutedAt(new Date(editTransaction.executed_at));
      setNote(editTransaction.note || '');
    } else {
      setSymbol('');
      setMarketType('tse');
      setTxType('buy');
      setQuantity(0);
      setPrice(0);
      setFee(0);
      setExecutedAt(new Date());
      setNote('');
    }
  }, [editTransaction, opened]);

  const handleSubmit = () => {
    if (!symbol || quantity <= 0) return;
    onSubmit({
      symbol: symbol.trim(),
      market_type: marketType,
      tx_type: txType,
      quantity: String(quantity),
      price: String(price),
      fee: String(fee),
      executed_at: executedAt.toISOString(),
      note: note || null,
    });
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editTransaction ? 'ویرایش معامله' : 'ثبت معامله جدید'}
      size="md"
    >
      <Stack gap="sm">
        <Group grow>
          <TextInput
            label="نماد"
            placeholder="مثال: فولاد"
            value={symbol}
            onChange={(e) => setSymbol(e.currentTarget.value)}
            required
          />
          <Select
            label="بازار"
            data={MARKET_TYPE_OPTIONS}
            value={marketType}
            onChange={setMarketType}
          />
        </Group>

        <Select
          label="نوع معامله"
          data={TX_TYPE_OPTIONS}
          value={txType}
          onChange={setTxType}
        />

        <Group grow>
          <NumberInput
            label="تعداد"
            value={quantity}
            onChange={setQuantity}
            min={0}
            decimalScale={8}
          />
          <NumberInput
            label="قیمت واحد"
            value={price}
            onChange={setPrice}
            min={0}
            decimalScale={4}
          />
        </Group>

        <NumberInput
          label="کارمزد"
          value={fee}
          onChange={setFee}
          min={0}
          decimalScale={4}
        />

        <DateTimePicker
          label="تاریخ و ساعت"
          value={executedAt}
          onChange={setExecutedAt}
        />

        <TextInput
          label="یادداشت"
          placeholder="اختیاری"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />

        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose}>انصراف</Button>
          <Button onClick={handleSubmit} disabled={!symbol || quantity <= 0}>
            {editTransaction ? 'ذخیره' : 'ثبت'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/portfolio/components/AddTransactionModal.jsx
git commit -m "feat(portfolio): add AddTransactionModal component"
```

---

## Task 9: Transaction Ledger Page

**Files:**
- Create: `frontend/src/pages/portfolio/TransactionLedger.jsx`

- [ ] **Step 1: Create the page**

Create `frontend/src/pages/portfolio/TransactionLedger.jsx`:

```jsx
import { useState } from 'react';
import { Group, Select, Button, Text, Box, Badge } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconPlus, IconReceipt } from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RallyEmptyState from '../../components/RallyEmptyState';
import ExportButton from '../../components/ExportButton';
import AddTransactionModal from './components/AddTransactionModal';
import {
  usePortfolios,
  useTransactions,
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '../../hooks/usePortfolioAPI';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

const TX_BADGE_MAP = {
  buy: { color: 'green', label: 'خرید' },
  sell: { color: 'red', label: 'فروش' },
  dividend: { color: 'violet', label: 'سود نقدی' },
  fee: { color: 'yellow', label: 'کارمزد' },
  deposit: { color: 'blue', label: 'واریز' },
  withdrawal: { color: 'orange', label: 'برداشت' },
};

export default function TransactionLedger() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [filters, setFilters] = useState({ page: 1 });

  const { data: portfolios = [] } = usePortfolios();
  const defaultPortfolio = portfolios.find((p) => p.is_default) || portfolios[0];
  const portfolioId = defaultPortfolio?.id;

  const { data: txData, isLoading } = useTransactions(portfolioId, filters);
  const addTx = useAddTransaction(portfolioId);
  const updateTx = useUpdateTransaction(portfolioId);
  const deleteTx = useDeleteTransaction(portfolioId);

  const transactions = txData?.items || [];
  const total = txData?.total || 0;

  const handleSubmit = (data) => {
    if (editTx) {
      updateTx.mutate({ txId: editTx.id, data });
    } else {
      addTx.mutate(data);
    }
    setEditTx(null);
  };

  const handleDelete = (txId) => {
    deleteTx.mutate(txId);
  };

  const columns = [
    {
      accessor: 'executed_at',
      title: 'تاریخ',
      width: 140,
      render: (r) => (
        <Text size="sm" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {new Date(r.executed_at).toLocaleDateString('fa-IR')}
        </Text>
      ),
    },
    {
      accessor: 'tx_type',
      title: 'نوع',
      width: 90,
      render: (r) => {
        const badge = TX_BADGE_MAP[r.tx_type] || { color: 'gray', label: r.tx_type };
        return <Badge size="sm" variant="light" color={badge.color}>{badge.label}</Badge>;
      },
    },
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 100,
      render: (r) => (
        <Text size="sm" fw={600} c={r.market_type === 'crypto' ? rallyColors.yellow : rallyColors.blue}>
          {r.symbol}
          {r.market_type === 'crypto' && <Text component="span" size="xs" c="dimmed" ms={3}>$</Text>}
        </Text>
      ),
    },
    {
      accessor: 'quantity',
      title: 'تعداد',
      width: 100,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatNum(Number(r.quantity))}</Text>,
    },
    {
      accessor: 'price',
      title: 'قیمت',
      width: 110,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatNum(Number(r.price))}</Text>,
    },
    {
      accessor: 'fee',
      title: 'کارمزد',
      width: 90,
      textAlign: 'end',
      render: (r) => (
        <Text size="sm" c={Number(r.fee) > 0 ? rallyColors.yellow : 'dimmed'}>
          {Number(r.fee) > 0 ? formatNum(Number(r.fee)) : '—'}
        </Text>
      ),
    },
    {
      accessor: 'total',
      title: 'ارزش کل',
      width: 130,
      textAlign: 'end',
      render: (r) => {
        const total = Number(r.quantity) * Number(r.price);
        return <Text size="sm" fw={600}>{formatNum(Math.round(total))}</Text>;
      },
    },
    {
      accessor: 'note',
      title: 'یادداشت',
      width: 120,
      render: (r) => (
        <Text size="xs" c="dimmed" lineClamp={1}>{r.note || '—'}</Text>
      ),
    },
    {
      accessor: 'actions',
      title: '',
      width: 72,
      render: (r) => (
        <Group gap={4} wrap="nowrap">
          <Button
            variant="subtle"
            color="blue"
            size="compact-xs"
            onClick={() => { setEditTx(r); setModalOpen(true); }}
          >
            ویرایش
          </Button>
          <Button
            variant="subtle"
            color="red"
            size="compact-xs"
            onClick={() => handleDelete(r.id)}
          >
            حذف
          </Button>
        </Group>
      ),
    },
  ];

  const exportColumns = [
    { accessor: 'executed_at', title: 'تاریخ' },
    { accessor: 'tx_type', title: 'نوع' },
    { accessor: 'symbol', title: 'نماد' },
    { accessor: 'quantity', title: 'تعداد' },
    { accessor: 'price', title: 'قیمت' },
    { accessor: 'fee', title: 'کارمزد' },
    { accessor: 'note', title: 'یادداشت' },
  ];

  if (!portfolioId) {
    return (
      <>
        <PageHeader title="دفتر معاملات" />
        <RallyMainCard>
          <RallyEmptyState
            icon={IconReceipt}
            message="ابتدا وارد حساب کاربری شوید"
          />
        </RallyMainCard>
      </>
    );
  }

  return (
    <>
      <PageHeader title="دفتر معاملات">
        <Group gap="xs">
          <ExportButton filename="transactions" columns={exportColumns} records={transactions} />
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => { setEditTx(null); setModalOpen(true); }}
            color="blue"
          >
            ثبت معامله
          </Button>
        </Group>
      </PageHeader>

      <RallyMainCard noPadding>
        <RallyDataTable
          records={transactions}
          columns={columns}
          idAccessor="id"
          loading={isLoading}
          minHeight={400}
          emptyMessage="هنوز معامله‌ای ثبت نشده"
          pinLeftColumns
          storeColumnsKey="portfolio-transactions"
        />
      </RallyMainCard>

      <AddTransactionModal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); setEditTx(null); }}
        onSubmit={handleSubmit}
        editTransaction={editTx}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/portfolio/TransactionLedger.jsx
git commit -m "feat(portfolio): add TransactionLedger page"
```

---

## Task 10: Waterfall Chart + TWRR vs IRR Card

**Files:**
- Create: `frontend/src/pages/portfolio/components/WaterfallChart.jsx`
- Create: `frontend/src/pages/portfolio/components/TWRRvsIRRCard.jsx`

- [ ] **Step 1: Create WaterfallChart**

Create `frontend/src/pages/portfolio/components/WaterfallChart.jsx`:

```jsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import RallyMainCard from '../../../components/RallyMainCard';
import ChartEmptyState from '../../../components/charts/shared/ChartEmptyState';
import ChartTooltipV2 from '../../../components/charts/shared/ChartTooltipV2';
import { toPersianNum, formatNum } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';
import { GRID_STROKE, axisTick } from '../../../components/charts/shared/chartStyles';

const BAR_COLORS = {
  'سرمایه اولیه': rallyColors.blue,
  'خرید': rallyColors.green,
  'فروش': rallyColors.red,
  'سود نقدی': rallyColors.purple,
  'کارمزد': rallyColors.yellow,
  'ارزش فعلی': rallyColors.green,
};

export default function WaterfallChart({ accounting, totalCost, totalValue }) {
  if (!accounting) return null;

  const data = [
    { name: 'سرمایه اولیه', value: Number(totalCost) || 0 },
    { name: 'سود تحقق‌یافته', value: Number(accounting.total_realized_pnl) || 0 },
    { name: 'سود نقدی', value: Number(accounting.total_dividends) || 0 },
    { name: 'کارمزد', value: -(Number(accounting.total_fees) || 0) },
    { name: 'ارزش فعلی', value: totalValue || 0 },
  ].filter((d) => d.value !== 0 || d.name === 'ارزش فعلی');

  if (data.length === 0) return null;

  return (
    <RallyMainCard title="نمودار آبشاری" fullscreenable>
      {data.length < 2 ? (
        <ChartEmptyState height={280} message="داده کافی نیست" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="name" tick={axisTick(10)} />
            <YAxis tick={axisTick()} tickFormatter={(v) => formatNum(Math.round(v))} />
            <Tooltip
              content={
                <ChartTooltipV2
                  formatter={(v) => formatNum(Math.round(Number(v)))}
                />
              }
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={BAR_COLORS[entry.name] || rallyColors.blue} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </RallyMainCard>
  );
}
```

- [ ] **Step 2: Create TWRRvsIRRCard**

Create `frontend/src/pages/portfolio/components/TWRRvsIRRCard.jsx`:

```jsx
import { Group, Text, Box, Stack } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import { toPersianNum, formatPercent } from '../../../utils/formatUtils';
import rallyColors from '../../../theme/rallyColors';

export default function TWRRvsIRRCard({ twrr, irr }) {
  const hasTWRR = twrr != null && isFinite(twrr);
  const hasIRR = irr != null && isFinite(irr);

  if (!hasTWRR && !hasIRR) return null;

  const gap = hasTWRR && hasIRR ? ((twrr - irr) * 100).toFixed(1) : null;

  return (
    <RallyMainCard title="مقایسه TWRR و IRR">
      <Group justify="center" gap="xl" py="md">
        <Stack align="center" gap={2}>
          <Text size="xs" c="dimmed">TWRR (سالانه)</Text>
          <Text style={{ fontSize: 28, fontWeight: 800 }} c={rallyColors.purple}>
            {hasTWRR ? formatPercent(twrr * 100, 1) : '—'}
          </Text>
          <Text size="xs" c="dimmed">عملکرد مدیر سبد</Text>
        </Stack>

        <Box style={{ width: 1, height: 50, background: `${rallyColors.border}` }} />

        <Stack align="center" gap={2}>
          <Text size="xs" c="dimmed">IRR (سالانه)</Text>
          <Text style={{ fontSize: 28, fontWeight: 800 }} c="#06b6d4">
            {hasIRR ? formatPercent(irr * 100, 1) : '—'}
          </Text>
          <Text size="xs" c="dimmed">بازده واقعی سرمایه‌گذار</Text>
        </Stack>
      </Group>

      {gap && (
        <Box
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 6,
            padding: '8px 12px',
          }}
        >
          <Text size="xs" c="dimmed">
            <Text component="span" fw={600} c={rallyColors.textPrimary}>
              Gap: {toPersianNum(gap)}٪
            </Text>
            {' — '}
            {Number(gap) > 0
              ? 'TWRR > IRR: زمان‌بندی ورود/خروج نقدینگی بهینه نبوده'
              : 'IRR > TWRR: زمان‌بندی ورود/خروج نقدینگی مناسب بوده'}
          </Text>
        </Box>
      )}
    </RallyMainCard>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/portfolio/components/WaterfallChart.jsx \
        frontend/src/pages/portfolio/components/TWRRvsIRRCard.jsx
git commit -m "feat(portfolio): add WaterfallChart and TWRRvsIRRCard components"
```

---

## Task 11: Profit & Loss Page

**Files:**
- Create: `frontend/src/pages/portfolio/ProfitAndLoss.jsx`

- [ ] **Step 1: Create P&L page**

Create `frontend/src/pages/portfolio/ProfitAndLoss.jsx`:

```jsx
import { useState } from 'react';
import { SimpleGrid, SegmentedControl, Text, Box, Group } from '@mantine/core';
import {
  IconCash,
  IconTrendingUp,
  IconReceipt,
  IconChartLine,
} from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RallyKPICard from '../../components/RallyKPICard';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RallyEmptyState from '../../components/RallyEmptyState';
import ExportButton from '../../components/ExportButton';
import WaterfallChart from './components/WaterfallChart';
import TWRRvsIRRCard from './components/TWRRvsIRRCard';
import {
  usePortfolios,
  usePortfolioAccounting,
  usePortfolioPerformance,
  usePortfolioHoldings,
} from '../../hooks/usePortfolioAPI';
import { formatNum, toPersianNum, formatPercent } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';

const PERIOD_OPTIONS = [
  { label: 'ماهانه', value: '1m' },
  { label: 'فصلی', value: '3m' },
  { label: 'سالانه', value: '1y' },
  { label: 'از ابتدا', value: 'all' },
];

export default function ProfitAndLoss() {
  const [period, setPeriod] = useState('all');

  const { data: portfolios = [] } = usePortfolios();
  const defaultPortfolio = portfolios.find((p) => p.is_default) || portfolios[0];
  const portfolioId = defaultPortfolio?.id;

  const { data: accounting, isLoading: accLoading } = usePortfolioAccounting(portfolioId);
  const { data: performance } = usePortfolioPerformance(portfolioId, period);
  const { data: holdings = [] } = usePortfolioHoldings(portfolioId);

  const totalCost = holdings.reduce((s, h) => s + Number(h.total_cost || 0), 0);

  if (!portfolioId) {
    return (
      <>
        <PageHeader title="سود و زیان" />
        <RallyMainCard>
          <RallyEmptyState
            icon={IconCash}
            message="ابتدا وارد حساب کاربری شوید"
          />
        </RallyMainCard>
      </>
    );
  }

  const realized = Number(accounting?.total_realized_pnl || 0);
  const fees = Number(accounting?.total_fees || 0);
  const dividends = Number(accounting?.total_dividends || 0);
  const twrr = performance?.twrr_annualized;
  const irr = performance?.irr;

  const perSymbol = accounting?.per_symbol || [];

  const columns = [
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 100,
      render: (r) => <Text size="sm" fw={600} c={rallyColors.blue}>{r.symbol}</Text>,
    },
    {
      accessor: 'remaining_quantity',
      title: 'موجودی',
      width: 100,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatNum(Number(r.remaining_quantity))}</Text>,
    },
    {
      accessor: 'remaining_cost',
      title: 'بهای تمام‌شده',
      width: 130,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatNum(Math.round(Number(r.remaining_cost)))}</Text>,
    },
    {
      accessor: 'realized_pnl',
      title: 'سود تحقق‌یافته',
      width: 130,
      textAlign: 'end',
      render: (r) => {
        const val = Number(r.realized_pnl);
        const color = val > 0 ? rallyColors.green : val < 0 ? rallyColors.red : 'dimmed';
        return (
          <Text size="sm" fw={600} c={color}>
            {val > 0 ? '+' : ''}{formatNum(Math.round(val))}
          </Text>
        );
      },
    },
    {
      accessor: 'total_fees',
      title: 'کارمزد',
      width: 100,
      textAlign: 'end',
      render: (r) => (
        <Text size="sm" c={rallyColors.yellow}>
          {formatNum(Math.round(Number(r.total_fees)))}
        </Text>
      ),
    },
  ];

  const exportColumns = [
    { accessor: 'symbol', title: 'نماد' },
    { accessor: 'remaining_quantity', title: 'موجودی' },
    { accessor: 'remaining_cost', title: 'بهای تمام‌شده' },
    { accessor: 'realized_pnl', title: 'سود تحقق‌یافته' },
    { accessor: 'total_fees', title: 'کارمزد' },
  ];

  return (
    <>
      <PageHeader title="سود و زیان">
        <SegmentedControl
          size="xs"
          data={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
      </PageHeader>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="سود تحقق‌یافته"
            value={formatNum(Math.round(realized))}
            icon={IconTrendingUp}
            color={realized >= 0 ? rallyColors.green : rallyColors.red}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="سود نقدی"
            value={formatNum(Math.round(dividends))}
            icon={IconCash}
            color={rallyColors.purple}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="TWRR (سالانه)"
            value={twrr != null ? formatPercent(twrr * 100, 1) : '—'}
            icon={IconChartLine}
            color={rallyColors.purple}
          />
        </Box>
        <Box className={animStyles.cardEnter}>
          <RallyKPICard
            title="IRR (سالانه)"
            value={irr != null ? formatPercent(irr * 100, 1) : '—'}
            icon={IconChartLine}
            color="#06b6d4"
          />
        </Box>
      </SimpleGrid>

      {/* Charts */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md"
        className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}
      >
        <WaterfallChart
          accounting={accounting}
          totalCost={totalCost}
          totalValue={totalCost + realized}
        />
        <TWRRvsIRRCard twrr={twrr} irr={irr} />
      </SimpleGrid>

      {/* Per-symbol table */}
      <Box className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
        <RallyMainCard
          title="سود و زیان به تفکیک نماد"
          noPadding
          secondary={
            <ExportButton filename="pnl-breakdown" columns={exportColumns} records={perSymbol} />
          }
        >
          <RallyDataTable
            records={perSymbol}
            columns={columns}
            idAccessor="symbol"
            loading={accLoading}
            minHeight={200}
            emptyMessage="داده‌ای موجود نیست"
            storeColumnsKey="portfolio-pnl"
          />
        </RallyMainCard>
      </Box>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/portfolio/ProfitAndLoss.jsx
git commit -m "feat(portfolio): add Profit & Loss page with KPIs, waterfall, and breakdown table"
```

---

## Task 12: Build Verification

- [ ] **Step 1: Run all backend tests**

```bash
pytest tests/unit/test_portfolio_service.py tests/unit/test_portfolio_routes.py -v --no-header -q
```
Expected: all tests PASS.

- [ ] **Step 2: Verify frontend builds**

```bash
cd frontend && npm run build
```
Expected: build succeeds with no errors.

- [ ] **Step 3: Verify backend starts**

```bash
python -c "from api.main import app; print('App loads OK')"
```
Expected: `App loads OK`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(portfolio): Phase 1 complete — backend core + accounting pages"
```
