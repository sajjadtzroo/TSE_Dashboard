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
        assert result["realized_pnl"] == Decimal("1700000")
        assert result["remaining_quantity"] == Decimal("300")
        assert result["remaining_cost"] == Decimal("1800000")


class TestTWRR:
    def test_no_cash_flows(self):
        from api.services_portfolio import compute_twrr

        values = [
            (datetime(2026, 1, 1, tzinfo=timezone.utc), Decimal("100"), Decimal("0")),
            (datetime(2026, 6, 1, tzinfo=timezone.utc), Decimal("120"), Decimal("0")),
        ]
        twrr = compute_twrr(values)
        assert abs(twrr - 0.20) < 0.001

    def test_with_deposit(self):
        from api.services_portfolio import compute_twrr

        values = [
            (datetime(2026, 1, 1, tzinfo=timezone.utc), Decimal("100"), Decimal("0")),
            (datetime(2026, 1, 31, tzinfo=timezone.utc), Decimal("110"), Decimal("50")),
            (datetime(2026, 3, 2, tzinfo=timezone.utc), Decimal("170"), Decimal("0")),
        ]
        twrr = compute_twrr(values)
        assert abs(twrr - 0.16875) < 0.001


class TestIRR:
    def test_simple_investment(self):
        from api.services_portfolio import compute_irr

        cash_flows = [
            (datetime(2025, 1, 1, tzinfo=timezone.utc), Decimal("-1000")),
            (datetime(2026, 1, 1, tzinfo=timezone.utc), Decimal("1100")),
        ]
        irr = compute_irr(cash_flows)
        assert irr is not None
        assert abs(irr - 0.10) < 0.01

    def test_no_cash_flows_returns_none(self):
        from api.services_portfolio import compute_irr

        irr = compute_irr([])
        assert irr is None
