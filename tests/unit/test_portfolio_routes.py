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
        mock_get.return_value = []
        mock_db.flush = MagicMock()
        mock_db.add = MagicMock()

        def fake_refresh(obj):
            obj.id = 99
            obj.created_at = None

        mock_db.refresh = MagicMock(side_effect=fake_refresh)

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

        def fake_refresh(obj):
            obj.id = 99
            obj.created_at = None

        mock_db.refresh = MagicMock(side_effect=fake_refresh)

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
    def test_returns_computed_holdings(self, mock_port, mock_agg, portfolio_client, mock_db):
        from database.models import Portfolio

        mock_port.return_value = Portfolio(id=1, user_id=1, name="Test",
                                           currency="IRR", is_default=True)
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
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
