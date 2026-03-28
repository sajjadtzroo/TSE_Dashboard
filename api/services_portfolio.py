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


def fifo_cost_basis(transactions, symbol):
    """Compute FIFO cost basis for a single symbol.

    Returns dict with:
        remaining_quantity, remaining_cost, realized_pnl, total_fees
    """
    buys = []
    realized_pnl = _ZERO
    total_fees = _ZERO

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


def compute_twrr(value_flow_pairs):
    """Compute TWRR from a list of (date, portfolio_value, net_cash_flow)."""
    if len(value_flow_pairs) < 2:
        return 0.0

    chain = 1.0
    for i in range(1, len(value_flow_pairs)):
        prev_date, prev_value, prev_flow = value_flow_pairs[i - 1]
        curr_date, curr_value, curr_flow = value_flow_pairs[i]

        beginning = float(prev_value + prev_flow)
        if beginning <= 0:
            continue

        sub_return = float(curr_value) / beginning
        chain *= sub_return

    return chain - 1.0


def annualize_return(total_return, days):
    """Annualize a total return over a given number of days."""
    if days <= 0:
        return 0.0
    return (1.0 + total_return) ** (365.0 / days) - 1.0


def compute_irr(cash_flows, max_iterations=100, tolerance=1e-7):
    """Compute IRR using Newton-Raphson method."""
    if len(cash_flows) < 2:
        return None

    base_date = cash_flows[0][0]
    flows = []
    for dt, amount in cash_flows:
        days = (dt - base_date).days
        flows.append((days / 365.0, float(amount)))

    rate = 0.10

    for _ in range(max_iterations):
        npv = 0.0
        dnpv = 0.0

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

    return None


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
    """Get transactions for a portfolio with optional filters."""
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


def import_from_localstorage(db: Session, portfolio, holdings_json: list):
    """Import holdings from localStorage JSON format into transactions."""
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
