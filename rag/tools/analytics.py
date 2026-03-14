"""Advanced analytics tools — historical beta, dividend history, quarterly YoY."""

import json
import logging
import math
from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from database.models import DailyOHLCV, FinancialStatement, MarketIndex
from rag.tools._helpers import _dec, _find_security, _not_found, _to_jalali

logger = logging.getLogger(__name__)

# ── Tool definitions ─────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "compute_historical_beta",
            "description": (
                "Calculate historical beta for a stock by regressing its daily returns "
                "against the TEDPIX market index. Returns raw beta, adjusted beta "
                "(Bloomberg method), R-squared, and annualized volatility."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol in Persian (e.g. فولاد)",
                    },
                    "days": {
                        "type": "integer",
                        "description": "Trading days for regression (default 252, max 500)",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_dividend_history",
            "description": (
                "Get dividend and EPS history for a stock from financial statements. "
                "Shows EPS trend, payout patterns, and dividend yield estimates."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol in Persian (e.g. فولاد)",
                    },
                    "periods": {
                        "type": "integer",
                        "description": "Number of annual periods to retrieve (default 5, max 10)",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_quarterly_comparison",
            "description": (
                "Compare quarterly financial metrics YoY (year-over-year) and QoQ "
                "(quarter-over-quarter). Shows revenue, gross profit, operating income, "
                "net income, EPS with growth rates."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol in Persian (e.g. فولاد)",
                    },
                    "quarters": {
                        "type": "integer",
                        "description": "Number of quarters to retrieve (default 8, max 16)",
                    },
                },
                "required": ["symbol"],
            },
        },
    },
]


# ── Implementations ──────────────────────────────────────────────────────────


def _daily_returns(prices: list[float]) -> list[float]:
    """Compute daily log returns from a price series (oldest-first)."""
    returns = []
    for i in range(1, len(prices)):
        if prices[i - 1] > 0 and prices[i] > 0:
            returns.append(math.log(prices[i] / prices[i - 1]))
    return returns


def compute_historical_beta(db: Session, symbol: str, days: int = 252) -> str:
    """Regress stock returns against TEDPIX to compute beta."""
    days = min(max(days, 30), 500)

    sec = _find_security(db, symbol)
    if not sec:
        return _not_found(symbol)

    cutoff = date.today() - timedelta(days=int(days * 1.5))

    # Fetch stock prices
    stock_rows = (
        db.query(DailyOHLCV.date, DailyOHLCV.close)
        .filter(
            DailyOHLCV.security_id == sec.security_id,
            DailyOHLCV.date >= cutoff,
            DailyOHLCV.close.isnot(None),
            DailyOHLCV.close > 0,
        )
        .order_by(DailyOHLCV.date.asc())
        .all()
    )

    if len(stock_rows) < 30:
        return json.dumps(
            {"error": f"Insufficient price data for {symbol} ({len(stock_rows)} days)"},
            ensure_ascii=False,
        )

    # Fetch TEDPIX index values for the same date range
    index_rows = (
        db.query(MarketIndex.date, MarketIndex.index_value)
        .filter(
            MarketIndex.name.ilike("%شاخص کل%"),
            MarketIndex.date >= cutoff,
            MarketIndex.index_value.isnot(None),
            MarketIndex.index_value > 0,
        )
        .order_by(MarketIndex.date.asc())
        .all()
    )

    if len(index_rows) < 30:
        # Fallback: try by English name
        index_rows = (
            db.query(MarketIndex.date, MarketIndex.index_value)
            .filter(
                MarketIndex.name.ilike("%TEDPIX%"),
                MarketIndex.date >= cutoff,
                MarketIndex.index_value.isnot(None),
                MarketIndex.index_value > 0,
            )
            .order_by(MarketIndex.date.asc())
            .all()
        )

    if len(index_rows) < 30:
        return json.dumps(
            {"error": "Insufficient market index data for beta calculation"},
            ensure_ascii=False,
        )

    # Align dates: only use dates present in both series
    stock_map = {r.date: float(r.close) for r in stock_rows}
    index_map = {r.date: float(r.index_value) for r in index_rows}
    common_dates = sorted(set(stock_map) & set(index_map))

    if len(common_dates) < 30:
        return json.dumps(
            {"error": f"Only {len(common_dates)} common trading days found, need at least 30"},
            ensure_ascii=False,
        )

    # Limit to requested number of days
    common_dates = common_dates[-days:]

    stock_prices = [stock_map[d] for d in common_dates]
    index_prices = [index_map[d] for d in common_dates]

    stock_returns = _daily_returns(stock_prices)
    index_returns = _daily_returns(index_prices)

    n = len(stock_returns)
    if n < 20:
        return json.dumps({"error": "Not enough return data points"}, ensure_ascii=False)

    # OLS regression: stock_return = alpha + beta * index_return
    mean_s = sum(stock_returns) / n
    mean_m = sum(index_returns) / n

    cov_sm = sum((s - mean_s) * (m - mean_m) for s, m in zip(stock_returns, index_returns)) / n
    var_m = sum((m - mean_m) ** 2 for m in index_returns) / n
    var_s = sum((s - mean_s) ** 2 for s in stock_returns) / n

    if var_m == 0:
        return json.dumps({"error": "Market index has zero variance"}, ensure_ascii=False)

    raw_beta = cov_sm / var_m
    alpha = mean_s - raw_beta * mean_m
    adjusted_beta = (2 / 3) * raw_beta + (1 / 3) * 1.0  # Bloomberg adjustment

    # R-squared
    ss_res = sum(
        (s - (alpha + raw_beta * m)) ** 2
        for s, m in zip(stock_returns, index_returns)
    )
    ss_tot = sum((s - mean_s) ** 2 for s in stock_returns)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    # Annualized volatility
    ann_vol_stock = math.sqrt(var_s * 252) * 100
    ann_vol_market = math.sqrt(var_m * 252) * 100
    correlation = cov_sm / math.sqrt(var_s * var_m) if var_s > 0 and var_m > 0 else 0

    return json.dumps(
        {
            "symbol": symbol,
            "trading_days_used": n,
            "date_range": {
                "from": _to_jalali(common_dates[0]),
                "to": _to_jalali(common_dates[-1]),
            },
            "raw_beta": round(raw_beta, 4),
            "adjusted_beta": round(adjusted_beta, 4),
            "alpha_daily": round(alpha, 6),
            "r_squared": round(r_squared, 4),
            "correlation": round(correlation, 4),
            "annualized_volatility_pct": round(ann_vol_stock, 2),
            "market_volatility_pct": round(ann_vol_market, 2),
            "interpretation": (
                "بتای بالای ۱ = ریسک بیشتر از بازار، بتای زیر ۱ = ریسک کمتر از بازار. "
                "بتای تعدیل‌شده (بلومبرگ) = ⅔ × بتای خام + ⅓ × ۱."
            ),
        },
        ensure_ascii=False,
    )


def get_dividend_history(db: Session, symbol: str, periods: int = 5) -> str:
    """Get EPS and dividend data from annual financial statements."""
    periods = min(max(periods, 1), 10)

    # Fetch annual income statements (period_months=12)
    rows = (
        db.query(FinancialStatement)
        .filter(
            FinancialStatement.symbol == symbol,
            FinancialStatement.statement_type == "income_statement",
            FinancialStatement.period_months == 12,
        )
        .order_by(FinancialStatement.period_end_date.desc())
        .limit(periods)
        .all()
    )

    if not rows:
        return json.dumps(
            {"error": f"No annual financial data found for {symbol}"},
            ensure_ascii=False,
        )

    # Chronological order
    rows = list(reversed(rows))

    history = []
    for r in rows:
        period_data = {
            "period": r.period_end_jalali or str(r.period_end_date),
            "is_audited": r.is_audited,
        }

        # Core earnings data
        eps = _dec(r.eps)
        net_income = _dec(r.net_income)
        revenue = _dec(r.revenue)

        period_data["eps"] = eps
        period_data["net_income_mln_rial"] = net_income
        period_data["revenue_mln_rial"] = revenue

        # Check line_items for dividend-related data
        li = r.line_items or {}
        dps = li.get("dividends_per_share") or li.get("dps") or li.get("سود نقدی هر سهم")
        if dps is not None:
            try:
                period_data["dps"] = float(dps)
                if eps and float(eps) > 0:
                    period_data["payout_ratio_pct"] = round(float(dps) / float(eps) * 100, 1)
            except (ValueError, TypeError):
                pass

        # Look for retained earnings or dividend declarations
        retained = li.get("retained_earnings") or li.get("سود انباشته")
        if retained is not None:
            try:
                period_data["retained_earnings_mln_rial"] = float(retained)
            except (ValueError, TypeError):
                pass

        history.append(period_data)

    # Compute EPS growth
    eps_values = [h["eps"] for h in history if h.get("eps") is not None and h["eps"] != 0]
    eps_cagr = None
    if len(eps_values) >= 2 and eps_values[0] > 0 and eps_values[-1] > 0:
        n = len(eps_values) - 1
        eps_cagr = round(((eps_values[-1] / eps_values[0]) ** (1 / n) - 1) * 100, 1)

    return json.dumps(
        {
            "symbol": symbol,
            "periods": history,
            "count": len(history),
            "eps_cagr_pct": eps_cagr,
            "note": (
                "اگر DPS (سود نقدی هر سهم) موجود نباشد، داده‌ای از صورت‌های مالی استخراج نشده. "
                "برای اطلاعات دقیق‌تر سود تقسیمی، مصوبات مجمع را بررسی کنید."
            ),
        },
        ensure_ascii=False,
    )


def _pct_change(current, previous):
    """Compute percentage change, handling None and zero."""
    if current is None or previous is None:
        return None
    if previous == 0:
        return None
    return round((current - previous) / abs(previous) * 100, 1)


def get_quarterly_comparison(db: Session, symbol: str, quarters: int = 8) -> str:
    """Compare quarterly financials YoY and QoQ."""
    quarters = min(max(quarters, 2), 16)

    # Fetch quarterly statements (period_months=3)
    rows = (
        db.query(FinancialStatement)
        .filter(
            FinancialStatement.symbol == symbol,
            FinancialStatement.statement_type == "income_statement",
            FinancialStatement.period_months.in_([3, 6, 9, 12]),
        )
        .order_by(FinancialStatement.period_end_date.desc())
        .limit(quarters * 2)  # Fetch extra for YoY comparison
        .all()
    )

    if not rows:
        return json.dumps(
            {"error": f"No quarterly financial data found for {symbol}"},
            ensure_ascii=False,
        )

    # Chronological order
    rows = list(reversed(rows))

    # Build quarterly data with YoY and QoQ
    metrics = []
    for i, r in enumerate(rows):
        entry = {
            "period": r.period_end_jalali or str(r.period_end_date),
            "period_end_date": str(r.period_end_date),
            "period_months": r.period_months,
            "is_audited": r.is_audited,
            "revenue": _dec(r.revenue),
            "gross_profit": _dec(r.gross_profit),
            "operating_income": _dec(r.operating_income),
            "net_income": _dec(r.net_income),
            "eps": _dec(r.eps),
        }

        # Compute margins
        rev = _dec(r.revenue)
        if rev and rev > 0:
            if r.gross_profit is not None:
                entry["gross_margin_pct"] = round(float(r.gross_profit) / rev * 100, 1)
            if r.operating_income is not None:
                entry["operating_margin_pct"] = round(float(r.operating_income) / rev * 100, 1)
            if r.net_income is not None:
                entry["net_margin_pct"] = round(float(r.net_income) / rev * 100, 1)

        # QoQ comparison (vs previous entry)
        if i > 0:
            prev = rows[i - 1]
            entry["qoq_revenue_pct"] = _pct_change(_dec(r.revenue), _dec(prev.revenue))
            entry["qoq_net_income_pct"] = _pct_change(_dec(r.net_income), _dec(prev.net_income))

        # YoY comparison (find same period_months ~4 entries back)
        yoy_match = None
        for j in range(i - 1, -1, -1):
            if (
                rows[j].period_months == r.period_months
                and rows[j] != r
                and abs((r.period_end_date - rows[j].period_end_date).days - 365) < 60
            ):
                yoy_match = rows[j]
                break

        if yoy_match:
            entry["yoy_revenue_pct"] = _pct_change(_dec(r.revenue), _dec(yoy_match.revenue))
            entry["yoy_gross_profit_pct"] = _pct_change(
                _dec(r.gross_profit), _dec(yoy_match.gross_profit)
            )
            entry["yoy_operating_income_pct"] = _pct_change(
                _dec(r.operating_income), _dec(yoy_match.operating_income)
            )
            entry["yoy_net_income_pct"] = _pct_change(
                _dec(r.net_income), _dec(yoy_match.net_income)
            )
            entry["yoy_eps_pct"] = _pct_change(_dec(r.eps), _dec(yoy_match.eps))

        metrics.append(entry)

    # Return only the most recent `quarters` entries
    metrics = metrics[-quarters:]

    return json.dumps(
        {
            "symbol": symbol,
            "quarters": metrics,
            "count": len(metrics),
        },
        ensure_ascii=False,
    )


TOOL_DISPATCH = {
    "compute_historical_beta": compute_historical_beta,
    "get_dividend_history": get_dividend_history,
    "get_quarterly_comparison": get_quarterly_comparison,
}
