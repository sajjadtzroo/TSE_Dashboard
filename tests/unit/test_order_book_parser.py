"""
Unit tests for order book parser utilities.
"""

import pytest

from tsetmc_scraper.parsers.order_book_parser import (
    calculate_order_book_imbalance,
    extract_client_type_data,
    extract_order_book_levels,
)


class TestExtractOrderBookLevels:
    def test_brsapi_format(self):
        data = {
            "bid_price1": "1000",
            "bid_vol1": "5000",
            "bid_count1": "10",
            "ask_price1": "1100",
            "ask_vol1": "3000",
            "ask_count1": "5",
        }

        result = extract_order_book_levels(data, max_levels=3, key_format="brsapi")

        assert result["bid_price_1"] == 1000.0
        assert result["bid_vol_1"] == 5000
        assert result["bid_count_1"] == 10
        assert result["ask_price_1"] == 1100.0
        assert result["ask_vol_1"] == 3000
        assert result["ask_count_1"] == 5

    def test_multiple_levels(self):
        data = {
            "bid_price1": "1000",
            "bid_vol1": "5000",
            "bid_price2": "990",
            "bid_vol2": "4000",
            "bid_price3": "980",
            "bid_vol3": "3000",
            "ask_price1": "1100",
            "ask_vol1": "3000",
            "ask_price2": "1110",
            "ask_vol2": "2000",
            "ask_price3": "1120",
            "ask_vol3": "1000",
        }

        result = extract_order_book_levels(data, max_levels=3, key_format="brsapi")

        assert result["bid_price_1"] == 1000.0
        assert result["bid_price_2"] == 990.0
        assert result["bid_price_3"] == 980.0
        assert result["ask_price_1"] == 1100.0
        assert result["ask_price_2"] == 1110.0
        assert result["ask_price_3"] == 1120.0

    def test_missing_values(self):
        data = {"bid_price1": "1000"}

        result = extract_order_book_levels(data, max_levels=1, key_format="brsapi")

        assert result["bid_price_1"] == 1000.0
        assert result["bid_vol_1"] is None
        assert result["ask_price_1"] is None


class TestExtractClientTypeData:
    def test_brsapi_format(self):
        data = {
            "real_buyer_count": "100",
            "real_buyer_volume": "50000",
            "real_seller_count": "80",
            "real_seller_volume": "40000",
            "legal_buyer_count": "20",
            "legal_buyer_volume": "100000",
            "legal_seller_count": "15",
            "legal_seller_volume": "80000",
        }

        result = extract_client_type_data(data, key_format="brsapi")

        assert result["real_buy_count"] == 100
        assert result["real_buy_volume"] == 50000
        assert result["real_sell_count"] == 80
        assert result["real_sell_volume"] == 40000
        assert result["legal_buy_count"] == 20
        assert result["legal_buy_volume"] == 100000

    def test_missing_values(self):
        data = {"real_buyer_count": "100"}

        result = extract_client_type_data(data, key_format="brsapi")

        assert result["real_buy_count"] == 100
        assert result["real_buy_volume"] is None


class TestCalculateOrderBookImbalance:
    def test_balanced(self):
        order_book = {
            "bid_vol_1": 1000,
            "ask_vol_1": 1000,
        }

        imbalance = calculate_order_book_imbalance(order_book)
        assert imbalance == 0.0

    def test_more_bids(self):
        order_book = {
            "bid_vol_1": 2000,
            "ask_vol_1": 1000,
        }

        imbalance = calculate_order_book_imbalance(order_book)
        assert imbalance == pytest.approx(0.333, abs=0.01)

    def test_more_asks(self):
        order_book = {
            "bid_vol_1": 1000,
            "ask_vol_1": 2000,
        }

        imbalance = calculate_order_book_imbalance(order_book)
        assert imbalance == pytest.approx(-0.333, abs=0.01)

    def test_empty_book(self):
        order_book = {}

        imbalance = calculate_order_book_imbalance(order_book)
        assert imbalance == 0.0

    def test_multiple_levels(self):
        order_book = {
            "bid_vol_1": 1000,
            "bid_vol_2": 500,
            "ask_vol_1": 1000,
            "ask_vol_2": 500,
        }

        imbalance = calculate_order_book_imbalance(order_book)
        assert imbalance == 0.0
