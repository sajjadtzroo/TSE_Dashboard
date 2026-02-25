"""Unit tests for GET /api/gold/history."""
import datetime as _dt
from unittest.mock import MagicMock

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


class TestGoldHistory:
    def test_returns_list_of_xy_points(self, client_with_mock_db):
        client, mock_db = client_with_mock_db

        # Security lookup for GOLD_18K
        sec_mock = MagicMock()
        sec_mock.__getitem__ = lambda self, i: 99
        mock_db.query.return_value.filter.return_value.first.return_value = sec_mock

        rows = []
        for i in range(3):
            r = MagicMock()
            r.bucket = _dt.datetime(2026, 2, 18, i * 4, 0, 0,
                                    tzinfo=_dt.timezone.utc)
            r.max_price = 42_000_000 + i * 100_000
            rows.append(r)

        mock_db.query.return_value.filter.return_value \
            .group_by.return_value.order_by.return_value.all.return_value = rows

        resp = client.get("/api/gold/history?days=7")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 3
        assert data[0]["y"] == 42_000_000
        assert "x" in data[0]

    def test_returns_empty_when_no_gold_security(self, client_with_mock_db):
        client, mock_db = client_with_mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = None
        resp = client.get("/api/gold/history?days=7")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_days_param_validated(self, client_with_mock_db):
        client, _ = client_with_mock_db
        assert client.get("/api/gold/history?days=0").status_code == 422
        assert client.get("/api/gold/history?days=91").status_code == 422
