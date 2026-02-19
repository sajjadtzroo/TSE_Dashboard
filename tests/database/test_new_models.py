# tests/database/test_new_models.py
import pytest
from sqlalchemy import inspect
from database.models import DailyPrices, DailyFundamentals, DailyClientType

def test_daily_prices_has_required_columns():
    mapper = inspect(DailyPrices)
    cols = {c.key for c in mapper.column_attrs}
    assert {"security_id", "date", "open", "high", "low", "close", "last",
            "volume", "value", "trades"}.issubset(cols)

def test_daily_fundamentals_has_required_columns():
    mapper = inspect(DailyFundamentals)
    cols = {c.key for c in mapper.column_attrs}
    assert {"security_id", "date", "eps", "pe_ratio", "market_cap", "nav"}.issubset(cols)

def test_daily_client_type_has_required_columns():
    mapper = inspect(DailyClientType)
    cols = {c.key for c in mapper.column_attrs}
    assert {"security_id", "date", "real_buy_count", "real_buy_volume",
            "legal_buy_count", "legal_buy_volume"}.issubset(cols)
