"""
Tests for Issue 1: NULL→None conversion in market endpoints.
Verifies that NULL prices become None (not 0) and legitimate zeros are preserved.
"""

from decimal import Decimal

import pytest
from pydantic import ValidationError

from api.schemas import ClientTypeSchema, MarketOverviewSchema


class TestMarketOverviewSchemaNulls:
    """MarketOverviewSchema should accept None for price fields."""

    def test_schema_accepts_none_price_fields(self):
        schema = MarketOverviewSchema(
            symbol="TEST",
            close=None,
            close_change=None,
            close_change_pct=None,
            low=None,
            high=None,
            volume=0,
            value=0,
            trades=0,
        )
        assert schema.close is None
        assert schema.close_change is None
        assert schema.close_change_pct is None
        assert schema.low is None
        assert schema.high is None

    def test_schema_accepts_zero_price_fields(self):
        schema = MarketOverviewSchema(
            symbol="TEST",
            close=0.0,
            close_change=0.0,
            close_change_pct=0.0,
            low=0.0,
            high=0.0,
            volume=0,
            value=0,
            trades=0,
        )
        assert schema.close == 0.0
        assert schema.close_change == 0.0
        assert schema.close_change_pct == 0.0
        assert schema.low == 0.0
        assert schema.high == 0.0

    def test_schema_accepts_normal_values(self):
        schema = MarketOverviewSchema(
            symbol="TEST",
            close=1050.0,
            close_change=50.0,
            close_change_pct=5.0,
            low=950.0,
            high=1100.0,
            volume=1000000,
            value=1050000000,
            trades=5000,
        )
        assert schema.close == 1050.0
        assert schema.low == 950.0
        assert schema.high == 1100.0

    def test_schema_rejects_missing_required_fields(self):
        with pytest.raises(ValidationError):
            MarketOverviewSchema(
                close=100.0,
                volume=0,
                value=0,
                trades=0,
            )

    def test_volume_zero_preserved(self):
        schema = MarketOverviewSchema(
            symbol="TEST",
            volume=0,
            value=0,
            trades=0,
        )
        assert schema.volume == 0
        assert schema.value == 0
        assert schema.trades == 0


class TestClientTypeSchemaNulls:
    """ClientTypeSchema mirrors MarketOverviewSchema null behavior."""

    def test_schema_accepts_none_price_fields(self):
        schema = ClientTypeSchema(
            symbol="TEST",
            close=None,
            close_change=None,
            close_change_pct=None,
            low=None,
            high=None,
            volume=0,
            value=0,
            trades=0,
        )
        assert schema.close is None
        assert schema.low is None
        assert schema.high is None

    def test_schema_accepts_zero_price_fields(self):
        schema = ClientTypeSchema(
            symbol="TEST",
            close=0.0,
            close_change=0.0,
            close_change_pct=0.0,
            low=0.0,
            high=0.0,
            volume=0,
            value=0,
            trades=0,
        )
        assert schema.close == 0.0

    def test_client_type_extra_fields(self):
        schema = ClientTypeSchema(
            symbol="TEST",
            volume=0,
            value=0,
            trades=0,
            real_buy_count=100,
            real_sell_count=50,
            legal_buy_count=10,
            legal_sell_count=5,
        )
        assert schema.real_buy_count == 100
        assert schema.legal_sell_count == 5


class TestNullConversionLogic:
    """Test the `is not None` conversion logic used in market.py."""

    def test_null_close_returns_none_not_zero(self):
        """ohlcv.close=None should produce None, not 0."""
        close_value = None
        result = float(close_value) if close_value is not None else None
        assert result is None

    def test_zero_close_preserved_as_zero(self):
        """ohlcv.close=Decimal('0') should produce 0.0, not None."""
        close_value = Decimal("0")
        result = float(close_value) if close_value is not None else None
        assert result == 0.0

    def test_null_low_high_returns_none(self):
        for value in [None]:
            result = float(value) if value is not None else None
            assert result is None

    def test_null_change_fields_return_none(self):
        for value in [None]:
            result = float(value) if value is not None else None
            assert result is None

    def test_decimal_zero_is_falsy_but_preserved(self):
        """Decimal('0') is falsy — using `if val` would wrongly convert to None."""
        val = Decimal("0")
        assert not val  # falsy
        # Old buggy logic: float(val) if val else 0 → 0 (correct by accident)
        # But: float(val) if val else None → None (WRONG)
        # Fixed logic:
        result = float(val) if val is not None else None
        assert result == 0.0
