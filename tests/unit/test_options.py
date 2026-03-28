"""Unit tests for options API endpoints:
  - GET /api/options/underlyings
  - GET /api/options/chain
  - GET /api/options
"""

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


def _make_option(**overrides):
    """Create a realistic mock Option ORM object."""
    defaults = dict(
        id=1,
        ins_code=12345678901234567,
        isin="IRO1TEST0001",
        symbol="DTEST1230C10000",
        name_fa="اختیار خ.تست-10000-1403/12/30",
        option_type="call",
        underlying="TEST1",
        underlying_security_id=1,
        strike_price=Decimal("10000"),
        expiry_date="1403/12/30",
        date=_dt.date(2026, 3, 18),
        open=Decimal("500"),
        high=Decimal("600"),
        low=Decimal("450"),
        close=Decimal("550"),
        last=Decimal("540"),
        yesterday=Decimal("500"),
        close_change=Decimal("50"),
        volume=12000,
        value=6600000,
        trades=350,
        threshold_min=Decimal("300"),
        threshold_max=Decimal("700"),
        base_volume=10000,
        bid_price_1=Decimal("540"),
        bid_vol_1=500,
        bid_count_1=5,
        ask_price_1=Decimal("560"),
        ask_vol_1=300,
        ask_count_1=3,
    )
    defaults.update(overrides)
    opt = MagicMock()
    for k, v in defaults.items():
        setattr(opt, k, v)
    return opt


def _make_security(**overrides):
    """Create a mock Security object."""
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
    sec = MagicMock()
    for k, v in defaults.items():
        setattr(sec, k, v)
    return sec


def _make_ohlcv(**overrides):
    """Create a mock DailyOHLCV object."""
    defaults = dict(
        security_id=1,
        date=_dt.date(2026, 3, 18),
        open=Decimal("9800"),
        high=Decimal("10200"),
        low=Decimal("9700"),
        close=Decimal("10000"),
        last=Decimal("10000"),
        close_change=Decimal("200"),
        close_change_pct=Decimal("2.0"),
        volume=5000000,
        value=50000000000,
        trades=15000,
    )
    defaults.update(overrides)
    ohlcv = MagicMock()
    for k, v in defaults.items():
        setattr(ohlcv, k, v)
    return ohlcv


# ─── GET /api/options/underlyings ───────────────────────────────────────────


class TestOptionsUnderlyings:
    @patch("api.routes.options.get_latest_date")
    def test_returns_underlyings_list(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = _dt.date(2026, 3, 18)

        # aggregation query result
        agg_row = MagicMock()
        agg_row.underlying = "TEST1"
        agg_row.total_options = 10
        agg_row.call_count = 5
        agg_row.put_count = 5
        agg_row.expiry_dates = ["1403/12/30", "1404/03/31"]

        mock_db.query.return_value.filter.return_value.group_by.return_value.all.return_value = [agg_row]

        sec = _make_security()
        mock_db.query.return_value.filter.return_value.all.return_value = [sec]

        # Price subquery
        ohlcv = _make_ohlcv()
        mock_db.query.return_value.join.return_value.all.return_value = [ohlcv]

        resp = client.get("/api/options/underlyings")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["underlying"] == "TEST1"
        assert data[0]["total_options"] == 10
        assert data[0]["call_count"] == 5
        assert data[0]["put_count"] == 5
        assert len(data[0]["expiry_dates"]) == 2

    @patch("api.routes.options.get_latest_date")
    def test_returns_empty_when_no_data(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = None

        resp = client.get("/api/options/underlyings")
        assert resp.status_code == 200
        assert resp.json() == []

    @patch("api.routes.options.get_latest_date")
    def test_includes_close_price(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = _dt.date(2026, 3, 18)

        agg_row = MagicMock()
        agg_row.underlying = "TEST1"
        agg_row.total_options = 4
        agg_row.call_count = 2
        agg_row.put_count = 2
        agg_row.expiry_dates = ["1403/12/30"]

        mock_db.query.return_value.filter.return_value.group_by.return_value.all.return_value = [agg_row]

        sec = _make_security(security_id=42)
        mock_db.query.return_value.filter.return_value.all.return_value = [sec]

        ohlcv = _make_ohlcv(security_id=42, close=Decimal("15000"))
        mock_db.query.return_value.join.return_value.all.return_value = [ohlcv]

        resp = client.get("/api/options/underlyings")
        assert resp.status_code == 200
        data = resp.json()
        assert data[0]["close"] == 15000.0

    @patch("api.routes.options.get_latest_date")
    def test_handles_missing_security(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = _dt.date(2026, 3, 18)

        agg_row = MagicMock()
        agg_row.underlying = "UNKNOWN"
        agg_row.total_options = 2
        agg_row.call_count = 1
        agg_row.put_count = 1
        agg_row.expiry_dates = ["1403/12/30"]

        mock_db.query.return_value.filter.return_value.group_by.return_value.all.return_value = [agg_row]
        mock_db.query.return_value.filter.return_value.all.return_value = []
        mock_db.query.return_value.join.return_value.all.return_value = []

        resp = client.get("/api/options/underlyings")
        assert resp.status_code == 200
        data = resp.json()
        assert data[0]["underlying"] == "UNKNOWN"
        assert data[0]["security_id"] is None
        assert data[0]["name_fa"] is None
        assert data[0]["close"] is None


# ─── GET /api/options/chain ─────────────────────────────────────────────────


class TestOptionsChain:
    @patch("api.routes.options.get_latest_date")
    def test_returns_chain_for_underlying(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = _dt.date(2026, 3, 18)

        call_opt = _make_option(id=1, option_type="call", strike_price=Decimal("10000"))
        put_opt = _make_option(id=2, option_type="put", strike_price=Decimal("10000"), symbol="DTEST1230P10000")

        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [call_opt, put_opt]

        sec = _make_security()
        ohlcv = _make_ohlcv()
        mock_db.query.return_value.outerjoin.return_value.filter.return_value.order_by.return_value.first.return_value = (sec, ohlcv)

        resp = client.get("/api/options/chain?underlying=TEST1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["underlying_info"]["underlying"] == "TEST1"
        assert data["underlying_info"]["close"] == 10000.0
        assert len(data["options"]) == 2
        assert data["options"][0]["option_type"] == "call"
        assert data["options"][1]["option_type"] == "put"
        assert len(data["expiry_dates"]) == 1

    @patch("api.routes.options.get_latest_date")
    def test_requires_underlying_param(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        resp = client.get("/api/options/chain")
        assert resp.status_code == 422

    @patch("api.routes.options.get_latest_date")
    def test_returns_empty_when_no_latest_date(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = None

        resp = client.get("/api/options/chain?underlying=TEST1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["underlying_info"] is None
        assert data["options"] == []

    @patch("api.routes.options.get_latest_date")
    def test_filters_by_expiry_date(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = _dt.date(2026, 3, 18)

        opt = _make_option(expiry_date="1403/12/30")
        mock_db.query.return_value.filter.return_value.filter.return_value.order_by.return_value.all.return_value = [opt]

        sec = _make_security()
        ohlcv = _make_ohlcv()
        mock_db.query.return_value.outerjoin.return_value.filter.return_value.order_by.return_value.first.return_value = (sec, ohlcv)

        resp = client.get("/api/options/chain?underlying=TEST1&expiry_date=1403/12/30")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["options"]) == 1
        assert data["options"][0]["expiry_date"] == "1403/12/30"

    @patch("api.routes.options.get_latest_date")
    def test_option_fields_present(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = _dt.date(2026, 3, 18)

        opt = _make_option()
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [opt]

        sec = _make_security()
        ohlcv = _make_ohlcv()
        mock_db.query.return_value.outerjoin.return_value.filter.return_value.order_by.return_value.first.return_value = (sec, ohlcv)

        resp = client.get("/api/options/chain?underlying=TEST1")
        assert resp.status_code == 200
        option = resp.json()["options"][0]
        for field in ["id", "symbol", "option_type", "strike_price", "expiry_date",
                      "open", "high", "low", "close", "last", "volume", "trades",
                      "bid_price_1", "ask_price_1"]:
            assert field in option, f"Missing field: {field}"


# ─── GET /api/options ─���─────────────────────────────────────────────────────


class TestOptionsList:
    @patch("api.routes.options.get_latest_date")
    def test_returns_options_list(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = _dt.date(2026, 3, 18)

        opt1 = _make_option(id=1, symbol="DTEST1230C10000", option_type="call")
        opt2 = _make_option(id=2, symbol="DTEST1230P10000", option_type="put")
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [opt1, opt2]

        resp = client.get("/api/options")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2

    @patch("api.routes.options.get_latest_date")
    def test_returns_empty_when_no_data(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = None

        resp = client.get("/api/options")
        assert resp.status_code == 200
        assert resp.json() == []

    @patch("api.routes.options.get_latest_date")
    def test_filters_by_underlying(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = _dt.date(2026, 3, 18)

        opt = _make_option(underlying="TEST2")
        mock_db.query.return_value.filter.return_value.filter.return_value.order_by.return_value.all.return_value = [opt]

        resp = client.get("/api/options?underlying=TEST2")
        assert resp.status_code == 200

    @patch("api.routes.options.get_latest_date")
    def test_filters_by_option_type(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = _dt.date(2026, 3, 18)

        opt = _make_option(option_type="put")
        mock_db.query.return_value.filter.return_value.filter.return_value.order_by.return_value.all.return_value = [opt]

        resp = client.get("/api/options?option_type=put")
        assert resp.status_code == 200

    @patch("api.routes.options.get_latest_date")
    def test_limit_param(self, mock_latest_date, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_latest_date.return_value = _dt.date(2026, 3, 18)

        opt = _make_option()
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [opt]

        resp = client.get("/api/options?limit=1")
        assert resp.status_code == 200

    def test_limit_validation_min(self, client_with_mock_db):
        client, _ = client_with_mock_db
        resp = client.get("/api/options?limit=0")
        assert resp.status_code == 422

    def test_limit_validation_max(self, client_with_mock_db):
        client, _ = client_with_mock_db
        resp = client.get("/api/options?limit=5001")
        assert resp.status_code == 422
