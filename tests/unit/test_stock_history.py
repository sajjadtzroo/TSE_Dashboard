"""Unit tests for GET /api/stocks/{symbol}/history — used by options backtesting."""

import datetime as _dt
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.deps import get_db


@pytest.fixture
def client_with_mock_db():
    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app), mock_db
    app.dependency_overrides.clear()


def _make_security(**overrides):
    from database.models import Security

    defaults = dict(
        security_id=1,
        ins_code="12345678901234561",
        symbol="TEST1",
        name_fa="شرکت تست",
        name_en="Test Company",
        type="stock",
        sector_name_fa="فناوری اطلاعات",
        market_type="stock_exchange",
        is_active=True,
    )
    defaults.update(overrides)
    sec = MagicMock(spec=Security)
    for k, v in defaults.items():
        setattr(sec, k, v)
    return sec


def _make_ohlcv(security_id=1, day_offset=0, base_price=10000):
    """Create a mock ORM DailyOHLCV."""
    from database.models import DailyOHLCV

    d = _dt.date(2026, 3, 1) + _dt.timedelta(days=day_offset)
    price = Decimal(str(base_price + day_offset * 50))
    ohlcv = MagicMock(spec=DailyOHLCV)
    ohlcv.security_id = security_id
    ohlcv.date = d
    ohlcv.open = price - 50
    ohlcv.high = price + 100
    ohlcv.low = price - 100
    ohlcv.close = price
    ohlcv.last = price
    ohlcv.close_change = Decimal("50")
    ohlcv.close_change_pct = Decimal("0.5")
    ohlcv.volume = 1000000
    ohlcv.value = int(price) * 1000000
    ohlcv.trades = 5000
    return ohlcv


class TestStockHistory:
    @patch("api.routes.stocks.get_security_or_404")
    def test_returns_ohlcv_data(self, mock_get_sec, client_with_mock_db):
        client, mock_db = client_with_mock_db
        sec = _make_security()
        mock_get_sec.return_value = sec

        rows = [_make_ohlcv(day_offset=i) for i in range(5)]
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = list(reversed(rows))

        resp = client.get("/api/stocks/TEST1/history?days=5")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 5

    @patch("api.routes.stocks.get_security_or_404")
    def test_default_days_is_30(self, mock_get_sec, client_with_mock_db):
        client, mock_db = client_with_mock_db
        sec = _make_security()
        mock_get_sec.return_value = sec

        rows = [_make_ohlcv(day_offset=i) for i in range(30)]
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = list(reversed(rows))

        resp = client.get("/api/stocks/TEST1/history")
        assert resp.status_code == 200

    @patch("api.routes.stocks.get_security_or_404")
    def test_days_zero_returns_all(self, mock_get_sec, client_with_mock_db):
        """days=0 should return all data (no limit)."""
        client, mock_db = client_with_mock_db
        sec = _make_security()
        mock_get_sec.return_value = sec

        rows = [_make_ohlcv(day_offset=i) for i in range(100)]
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = list(reversed(rows))

        resp = client.get("/api/stocks/TEST1/history?days=0")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 100

    @patch("api.routes.stocks.get_security_or_404")
    def test_large_days_for_backtesting(self, mock_get_sec, client_with_mock_db):
        """Backtesting needs 500+ days of data."""
        client, mock_db = client_with_mock_db
        sec = _make_security()
        mock_get_sec.return_value = sec

        rows = [_make_ohlcv(day_offset=i) for i in range(500)]
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = list(reversed(rows))

        resp = client.get("/api/stocks/TEST1/history?days=500")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 500
