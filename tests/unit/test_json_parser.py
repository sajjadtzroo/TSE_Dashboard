"""
Unit tests for JSON parser utilities.
"""
import pytest
import json
from tsetmc_scraper.parsers.json_parser import (
    unwrap_brsapi_envelope,
    BrsApiResponse,
    parse_brsapi_record,
)
from tsetmc_scraper.parsers.type_converters import safe_float


class TestUnwrapBrsApiEnvelope:
    def test_successful_dict_response(self):
        response = json.dumps({
            "code_http": 200,
            "successful": True,
            "data": [{"symbol": "TEST", "price": 1000}]
        })

        result = unwrap_brsapi_envelope(response)

        assert result.success is True
        assert len(result.data) == 1
        assert result.data[0]["symbol"] == "TEST"
        assert result.error_message is None

    def test_failed_dict_response(self):
        response = json.dumps({
            "code_http": 401,
            "successful": False,
            "message_error": "Invalid API key",
            "data": []
        })

        result = unwrap_brsapi_envelope(response)

        assert result.success is False
        assert result.data == []
        assert result.error_message == "Invalid API key"
        assert result.http_code == 401

    def test_plain_list_response(self):
        response = json.dumps([
            {"symbol": "TEST1"},
            {"symbol": "TEST2"}
        ])

        result = unwrap_brsapi_envelope(response)

        assert result.success is True
        assert len(result.data) == 2
        assert result.data[0]["symbol"] == "TEST1"

    def test_invalid_json(self):
        response = "not valid json{{"

        result = unwrap_brsapi_envelope(response)

        assert result.success is False
        assert result.data == []
        assert "JSON decode error" in result.error_message

    def test_empty_data(self):
        response = json.dumps({
            "successful": True,
            "data": []
        })

        result = unwrap_brsapi_envelope(response)

        assert result.success is True
        assert result.data == []

    def test_null_data(self):
        response = json.dumps({
            "successful": True,
            "data": None
        })

        result = unwrap_brsapi_envelope(response)

        assert result.success is True
        assert result.data == []

    def test_single_item_data(self):
        """Test handling of non-list data field."""
        response = json.dumps({
            "successful": True,
            "data": {"symbol": "TEST"}
        })

        result = unwrap_brsapi_envelope(response)

        assert result.success is True
        assert len(result.data) == 1
        assert result.data[0]["symbol"] == "TEST"


class TestParseBrsApiRecord:
    def test_basic_mapping(self):
        record = {
            "Name": "Test Company",
            "Price": "1000",
            "Volume": "50000"
        }

        mapping = {
            "name": "Name",
            "price": "Price",
            "volume": "Volume"
        }

        result = parse_brsapi_record(record, mapping)

        assert result["name"] == "Test Company"
        assert result["price"] == "1000"
        assert result["volume"] == "50000"

    def test_with_converters(self):
        record = {
            "Name": "Test",
            "Price": "1000.5",
            "Volume": "50000"
        }

        mapping = {
            "name": "Name",
            "price": "Price",
            "volume": "Volume"
        }

        from tsetmc_scraper.parsers.type_converters import safe_float, safe_int
        converters = {
            "price": safe_float,
            "volume": safe_int
        }

        result = parse_brsapi_record(record, mapping, converters)

        assert result["name"] == "Test"
        assert result["price"] == 1000.5
        assert result["volume"] == 50000

    def test_missing_field(self):
        record = {"Name": "Test"}
        mapping = {"name": "Name", "price": "Price"}

        result = parse_brsapi_record(record, mapping)

        assert result["name"] == "Test"
        assert result["price"] is None
