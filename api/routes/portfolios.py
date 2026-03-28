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
    AlertCreate,
    AlertResponse,
    AlertUpdate,
    GoalCreate,
    GoalResponse,
    GoalUpdate,
    HoldingResponse,
    ImportRequest,
    PerformanceResponse,
    PortfolioCreate,
    PortfolioResponse,
    PortfolioUpdate,
    TaxReportResponse,
    TaxSymbolSummary,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from api.utils import handle_api_errors, wrap_response
from database.models import Portfolio, PortfolioAlert, PortfolioGoal, PortfolioTransaction

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/portfolios", tags=["portfolios"])


def _cache_tag(user_id: int) -> str:
    return f"portfolio_{user_id}"


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

    cash_flows = []
    for tx in txs:
        if tx.tx_type in ("buy", "deposit"):
            cash_flows.append((tx.executed_at, -tx.quantity * tx.price - tx.fee))
        elif tx.tx_type in ("sell", "withdrawal"):
            cash_flows.append((tx.executed_at, tx.quantity * tx.price - tx.fee))
        elif tx.tx_type == "dividend":
            cash_flows.append((tx.executed_at, tx.quantity * tx.price))

    irr = svc.compute_irr(cash_flows) if len(cash_flows) >= 2 else None

    first_date = txs[0].executed_at
    last_date = txs[-1].executed_at
    period_days = max((last_date - first_date).days, 1)

    return wrap_response(PerformanceResponse(
        irr=irr,
        period_days=period_days,
    ).model_dump())


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

    for tx in txs:
        if tx.tx_type == "dividend":
            total_dividends += tx.quantity * tx.price

    return wrap_response(AccountingResponse(
        total_realized_pnl=total_realized,
        total_fees=total_fees,
        total_dividends=total_dividends,
        per_symbol=per_symbol,
    ).model_dump())


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


# ── Goals ───────────────────────────────────────────────────────────────────


@router.get("/{portfolio_id}/goals")
@handle_api_errors("Failed to list goals")
def list_goals(
    portfolio_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    goals = (
        db.query(PortfolioGoal)
        .filter(PortfolioGoal.portfolio_id == portfolio_id)
        .order_by(PortfolioGoal.created_at.desc())
        .all()
    )
    return wrap_response([GoalResponse.model_validate(g).model_dump() for g in goals])


@router.post("/{portfolio_id}/goals", status_code=status.HTTP_201_CREATED)
@handle_api_errors("Failed to create goal")
def create_goal(
    portfolio_id: int,
    req: GoalCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    goal = PortfolioGoal(
        portfolio_id=portfolio_id,
        name=req.name,
        target_value=req.target_value,
        target_date=req.target_date,
    )
    db.add(goal)
    db.flush()
    db.refresh(goal)
    return wrap_response(GoalResponse.model_validate(goal).model_dump())


@router.put("/{portfolio_id}/goals/{goal_id}")
@handle_api_errors("Failed to update goal")
def update_goal(
    portfolio_id: int,
    goal_id: int,
    req: GoalUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    goal = db.query(PortfolioGoal).filter(
        PortfolioGoal.id == goal_id,
        PortfolioGoal.portfolio_id == portfolio_id,
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for field in ("name", "target_value", "target_date"):
        val = getattr(req, field, None)
        if val is not None:
            setattr(goal, field, val)
    db.flush()
    return wrap_response(GoalResponse.model_validate(goal).model_dump())


@router.delete("/{portfolio_id}/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
@handle_api_errors("Failed to delete goal")
def delete_goal(
    portfolio_id: int,
    goal_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    goal = db.query(PortfolioGoal).filter(
        PortfolioGoal.id == goal_id,
        PortfolioGoal.portfolio_id == portfolio_id,
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.flush()


# ── Alerts ──────────────────────────────────────────────────────────────────


@router.get("/{portfolio_id}/alerts")
@handle_api_errors("Failed to list alerts")
def list_alerts(
    portfolio_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    alerts = (
        db.query(PortfolioAlert)
        .filter(PortfolioAlert.portfolio_id == portfolio_id)
        .order_by(PortfolioAlert.created_at.desc())
        .all()
    )
    return wrap_response([AlertResponse.model_validate(a).model_dump() for a in alerts])


@router.post("/{portfolio_id}/alerts", status_code=status.HTTP_201_CREATED)
@handle_api_errors("Failed to create alert")
def create_alert(
    portfolio_id: int,
    req: AlertCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    alert = PortfolioAlert(
        portfolio_id=portfolio_id,
        alert_type=req.alert_type,
        symbol=req.symbol,
        threshold=req.threshold,
    )
    db.add(alert)
    db.flush()
    db.refresh(alert)
    return wrap_response(AlertResponse.model_validate(alert).model_dump())


@router.put("/{portfolio_id}/alerts/{alert_id}")
@handle_api_errors("Failed to update alert")
def update_alert(
    portfolio_id: int,
    alert_id: int,
    req: AlertUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    alert = db.query(PortfolioAlert).filter(
        PortfolioAlert.id == alert_id,
        PortfolioAlert.portfolio_id == portfolio_id,
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    for field in ("alert_type", "symbol", "threshold", "is_active"):
        val = getattr(req, field, None)
        if val is not None:
            setattr(alert, field, val)
    db.flush()
    return wrap_response(AlertResponse.model_validate(alert).model_dump())


@router.delete("/{portfolio_id}/alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
@handle_api_errors("Failed to delete alert")
def delete_alert(
    portfolio_id: int,
    alert_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    alert = db.query(PortfolioAlert).filter(
        PortfolioAlert.id == alert_id,
        PortfolioAlert.portfolio_id == portfolio_id,
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.flush()


# ── Tax Reporting ───────────────────────────────────────────────────────────


@router.get("/{portfolio_id}/tax")
@handle_api_errors("Failed to generate tax report")
def get_tax_report(
    portfolio_id: int,
    year: str = Query(default="1404", pattern=r"^\d{4}$"),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate capital gains tax report for a Solar Hijri year."""
    svc.get_portfolio_or_404(db, portfolio_id, user.id)
    txs = (
        db.query(PortfolioTransaction)
        .filter(PortfolioTransaction.portfolio_id == portfolio_id)
        .order_by(PortfolioTransaction.executed_at)
        .all()
    )

    if not txs:
        return wrap_response(TaxReportResponse(year=year).model_dump())

    symbols = list({tx.symbol for tx in txs})
    per_symbol = []
    total_realized = Decimal("0")
    total_fees = Decimal("0")
    total_dividends = Decimal("0")

    for sym in symbols:
        basis = svc.fifo_cost_basis(txs, sym)
        buy_total = sum(
            tx.quantity * tx.price for tx in txs
            if tx.symbol == sym and tx.tx_type == "buy"
        )
        sell_total = sum(
            tx.quantity * tx.price for tx in txs
            if tx.symbol == sym and tx.tx_type == "sell"
        )
        per_symbol.append(TaxSymbolSummary(
            symbol=sym,
            buy_total=buy_total,
            sell_total=sell_total,
            realized_gain=basis["realized_pnl"],
            total_fees=basis["total_fees"],
        ))
        total_realized += basis["realized_pnl"]
        total_fees += basis["total_fees"]

    for tx in txs:
        if tx.tx_type == "dividend":
            total_dividends += tx.quantity * tx.price

    return wrap_response(TaxReportResponse(
        year=year,
        total_realized_gains=total_realized,
        total_fees=total_fees,
        total_dividends=total_dividends,
        net_taxable=total_realized + total_dividends - total_fees,
        per_symbol=per_symbol,
    ).model_dump())
