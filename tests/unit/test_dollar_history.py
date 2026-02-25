"""Unit tests for GET /api/dollar/history."""
import datetime as _dt
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


def _make_bucket_row(posted_at_iso: str, price: int):
    """Returns a mock row with .bucket and .max_price attributes."""
    row = MagicMock()
    row.bucket = _dt.datetime.fromisoformat(posted_at_iso)
    row.max_price = price
    return row


class TestDollarHistory:
    def test_returns_spot_and_forward_lists(self, client_with_mock_db):
        client, mock_db = client_with_mock_db

        # Security lookup
        sec_mock = MagicMock()
        sec_mock.__getitem__ = lambda self, i: 42
        mock_db.query.return_value.filter.return_value.first.return_value = sec_mock

        spot_rows = [
            _make_bucket_row("2026-02-18T08:00:00+00:00", 163000),
            _make_bucket_row("2026-02-18T12:00:00+00:00", 163500),
        ]
        fwd_rows = [
            _make_bucket_row("2026-02-18T08:00:00+00:00", 164000),
            _make_bucket_row("2026-02-18T12:00:00+00:00", 164500),
        ]

        mock_db.query.return_value.filter.return_value.group_by.return_value \
            .order_by.return_value.all.side_effect = [spot_rows, fwd_rows]

        resp = client.get("/api/dollar/history?days=7")
        assert resp.status_code == 200
        data = resp.json()
        assert "spot" in data
        assert "forward" in data
        assert len(data["spot"]) == 2
        assert data["spot"][0]["y"] == 163000
        assert "x" in data["spot"][0]

    def test_returns_empty_when_no_usd_security(self, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None
        resp = client.get("/api/dollar/history?days=7")
        assert resp.status_code == 200
        assert resp.json() == {"spot": [], "forward": []}

    def test_days_param_validated(self, client_with_mock_db):
        client, _ = client_with_mock_db
        resp = client.get("/api/dollar/history?days=0")
        assert resp.status_code == 422

    def test_days_max_validated(self, client_with_mock_db):
        client, _ = client_with_mock_db
        resp = client.get("/api/dollar/history?days=91")
        assert resp.status_code == 422
