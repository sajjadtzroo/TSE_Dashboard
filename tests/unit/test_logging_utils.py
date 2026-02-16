"""
Unit tests for logging utilities
Tests standardized logging functions for spiders
"""
import pytest
import logging
from unittest.mock import Mock, MagicMock, patch, call
from datetime import datetime
from scrapy.http import Response, Request
from twisted.python.failure import Failure

from tsetmc_scraper.utils.logging_utils import (
    get_spider_logger,
    log_spider_start,
    log_spider_close,
    log_json_error,
    log_api_error,
    log_request_error,
    log_processing_stats,
    log_item_skip,
    log_parse_error,
    log_data_validation_error,
    log_unexpected_response,
    log_rate_limit,
    log_empty_response,
    log_duplicate_detection,
    TimedOperation,
)


@pytest.fixture
def mock_logger():
    """Create a mock logger for testing"""
    return Mock(spec=logging.Logger)


@pytest.fixture
def mock_response():
    """Create a mock Scrapy response"""
    response = Mock(spec=Response)
    response.url = "https://example.com/api"
    response.status = 200
    response.text = '{"data": "test response"}'
    return response


@pytest.fixture
def mock_request():
    """Create a mock Scrapy request"""
    request = Mock(spec=Request)
    request.url = "https://example.com/api"
    request.method = "GET"
    return request


class TestGetSpiderLogger:
    """Test spider logger creation"""

    def test_get_spider_logger(self):
        """Test getting a logger for a spider"""
        logger = get_spider_logger("market_watch")
        assert isinstance(logger, logging.Logger)
        assert "market_watch" in logger.name

    def test_logger_namespace(self):
        """Test logger follows correct namespace"""
        logger = get_spider_logger("test_spider")
        assert logger.name == "tsetmc_scraper.spiders.test_spider"


class TestLogSpiderStart:
    """Test spider start logging"""

    def test_log_spider_start_basic(self, mock_logger):
        """Test basic spider start logging"""
        log_spider_start(mock_logger, "TestSpider")

        assert mock_logger.info.call_count >= 3
        calls = [str(call) for call in mock_logger.info.call_args_list]
        assert any("=" in str(call) for call in calls)
        assert any("Starting TestSpider Spider" in str(call) for call in calls)

    def test_log_spider_start_with_kwargs(self, mock_logger):
        """Test spider start logging with additional parameters"""
        log_spider_start(
            mock_logger,
            "TestSpider",
            date_range="2025-01-01 to 2025-01-31",
            symbols=150
        )

        calls_str = "\n".join(str(call) for call in mock_logger.info.call_args_list)
        assert "date_range" in calls_str
        assert "2025-01-01 to 2025-01-31" in calls_str
        assert "symbols" in calls_str
        assert "150" in calls_str


class TestLogSpiderClose:
    """Test spider close logging"""

    def test_log_spider_close_basic(self, mock_logger):
        """Test basic spider close logging"""
        log_spider_close(mock_logger, "TestSpider", "finished")

        assert mock_logger.info.call_count >= 3
        calls_str = "\n".join(str(call) for call in mock_logger.info.call_args_list)
        assert "TestSpider Spider closed" in calls_str
        assert "finished" in calls_str

    def test_log_spider_close_with_stats(self, mock_logger):
        """Test spider close logging with statistics"""
        stats = {
            "items_scraped": 500,
            "items_dropped": 10,
            "errors": 2
        }
        log_spider_close(mock_logger, "TestSpider", "finished", stats=stats)

        calls_str = "\n".join(str(call) for call in mock_logger.info.call_args_list)
        assert "items_scraped" in calls_str
        assert "500" in calls_str
        assert "errors" in calls_str


class TestLogJsonError:
    """Test JSON error logging"""

    def test_log_json_error_basic(self, mock_logger):
        """Test basic JSON error logging"""
        error = ValueError("Expecting value: line 1 column 1 (char 0)")
        log_json_error(mock_logger, error)

        mock_logger.error.assert_called()
        calls_str = "\n".join(str(call) for call in mock_logger.error.call_args_list)
        assert "Failed to parse JSON" in calls_str

    def test_log_json_error_with_response(self, mock_logger, mock_response):
        """Test JSON error logging with response context"""
        error = ValueError("Invalid JSON")
        log_json_error(mock_logger, error, response=mock_response)

        calls_str = "\n".join(str(call) for call in mock_logger.error.call_args_list)
        assert "Failed to parse JSON" in calls_str
        assert "https://example.com/api" in calls_str
        assert "200" in calls_str


class TestLogApiError:
    """Test API error logging"""

    def test_log_api_error_basic(self, mock_logger):
        """Test basic API error logging"""
        api_response = {
            "code_http": 401,
            "message_error": "Invalid API key"
        }
        log_api_error(mock_logger, api_response)

        calls_str = "\n".join(str(call) for call in mock_logger.error.call_args_list)
        assert "API error" in calls_str
        assert "Invalid API key" in calls_str
        assert "401" in calls_str

    def test_log_api_error_with_endpoint(self, mock_logger):
        """Test API error logging with endpoint context"""
        api_response = {
            "code_http": 500,
            "message_error": "Internal server error"
        }
        log_api_error(mock_logger, api_response, endpoint="AllSymbols")

        calls_str = "\n".join(str(call) for call in mock_logger.error.call_args_list)
        assert "AllSymbols" in calls_str


class TestLogRequestError:
    """Test request error logging"""

    def test_log_request_error(self, mock_logger, mock_request):
        """Test request failure logging"""
        # Create a mock Failure object
        failure = Mock(spec=Failure)
        failure.value = Exception("Connection timeout")
        failure.request = mock_request
        failure.getTraceback.return_value = "Traceback..."

        log_request_error(mock_logger, failure)

        assert mock_logger.error.call_count >= 2
        calls_str = "\n".join(str(call) for call in mock_logger.error.call_args_list)
        assert "Request failed" in calls_str
        assert "Connection timeout" in calls_str
        assert "https://example.com/api" in calls_str


class TestLogProcessingStats:
    """Test processing statistics logging"""

    def test_log_processing_stats_basic(self, mock_logger):
        """Test basic statistics logging"""
        log_processing_stats(
            mock_logger,
            total_received=100,
            total_yielded=95
        )

        calls_str = "\n".join(str(call) for call in mock_logger.info.call_args_list)
        assert "Received: 100" in calls_str
        assert "Yielded:  95" in calls_str
        assert "Success rate: 95.0%" in calls_str

    def test_log_processing_stats_with_errors(self, mock_logger):
        """Test statistics logging with errors"""
        log_processing_stats(
            mock_logger,
            total_received=100,
            total_yielded=90,
            total_skipped=5,
            total_errors=5
        )

        # Check that warning is called for errors
        assert mock_logger.warning.called
        calls_str = "\n".join(str(call) for call in mock_logger.info.call_args_list)
        assert "Skipped:  5" in calls_str

    def test_log_processing_stats_with_kwargs(self, mock_logger):
        """Test statistics logging with additional stats"""
        log_processing_stats(
            mock_logger,
            total_received=200,
            total_yielded=200,
            by_type_stocks=150,
            by_type_funds=50
        )

        calls_str = "\n".join(str(call) for call in mock_logger.info.call_args_list)
        assert "by_type_stocks: 150" in calls_str
        assert "by_type_funds: 50" in calls_str


class TestLogItemSkip:
    """Test item skip logging"""

    def test_log_item_skip_basic(self, mock_logger):
        """Test basic item skip logging"""
        log_item_skip(mock_logger, "Invalid data format")

        mock_logger.debug.assert_called_once()
        calls_str = str(mock_logger.debug.call_args)
        assert "Skipping item" in calls_str
        assert "Invalid data format" in calls_str

    def test_log_item_skip_with_info(self, mock_logger):
        """Test item skip logging with item info"""
        log_item_skip(mock_logger, "Missing required field", item_info="INS123456")

        calls_str = str(mock_logger.debug.call_args)
        assert "INS123456" in calls_str


class TestLogParseError:
    """Test parse error logging"""

    def test_log_parse_error_basic(self, mock_logger):
        """Test basic parse error logging"""
        error = ValueError("Invalid integer")
        log_parse_error(mock_logger, error)

        mock_logger.warning.assert_called_once()
        calls_str = str(mock_logger.warning.call_args)
        assert "Parse error" in calls_str
        assert "Invalid integer" in calls_str

    def test_log_parse_error_with_field(self, mock_logger):
        """Test parse error logging with field context"""
        error = ValueError("Invalid date")
        log_parse_error(mock_logger, error, field="date_trade")

        calls_str = str(mock_logger.warning.call_args)
        assert "date_trade" in calls_str

    def test_log_parse_error_with_full_context(self, mock_logger):
        """Test parse error logging with full context"""
        error = ValueError("Invalid price")
        log_parse_error(mock_logger, error, field="price", item_info="SYMBOL123")

        calls_str = str(mock_logger.warning.call_args)
        assert "price" in calls_str
        assert "SYMBOL123" in calls_str


class TestLogDataValidationError:
    """Test data validation error logging"""

    def test_log_data_validation_error(self, mock_logger):
        """Test validation error logging"""
        log_data_validation_error(
            mock_logger,
            field="price",
            value=-100,
            expected="positive number"
        )

        calls_str = str(mock_logger.warning.call_args)
        assert "Validation error" in calls_str
        assert "price" in calls_str
        assert "-100" in calls_str
        assert "positive number" in calls_str

    def test_log_data_validation_error_with_context(self, mock_logger):
        """Test validation error logging with item context"""
        log_data_validation_error(
            mock_logger,
            field="volume",
            value="invalid",
            expected="integer",
            item_info="INS789"
        )

        calls_str = str(mock_logger.warning.call_args)
        assert "INS789" in calls_str


class TestLogUnexpectedResponse:
    """Test unexpected response logging"""

    def test_log_unexpected_response(self, mock_logger):
        """Test unexpected response type logging"""
        log_unexpected_response(
            mock_logger,
            expected_type="list",
            actual_type="dict"
        )

        calls_str = "\n".join(str(call) for call in mock_logger.error.call_args_list)
        assert "Unexpected response type" in calls_str
        assert "list" in calls_str
        assert "dict" in calls_str

    def test_log_unexpected_response_with_context(self, mock_logger, mock_response):
        """Test unexpected response logging with response context"""
        log_unexpected_response(
            mock_logger,
            expected_type="JSON array",
            actual_type="string",
            response=mock_response
        )

        calls_str = "\n".join(str(call) for call in mock_logger.error.call_args_list)
        assert "https://example.com/api" in calls_str


class TestLogRateLimit:
    """Test rate limit logging"""

    def test_log_rate_limit_basic(self, mock_logger):
        """Test basic rate limit logging"""
        log_rate_limit(mock_logger)

        mock_logger.warning.assert_called_once()
        calls_str = str(mock_logger.warning.call_args)
        assert "Rate limit" in calls_str

    def test_log_rate_limit_with_retry(self, mock_logger):
        """Test rate limit logging with retry-after"""
        log_rate_limit(mock_logger, retry_after=60)

        calls_str = str(mock_logger.warning.call_args)
        assert "60 seconds" in calls_str


class TestLogEmptyResponse:
    """Test empty response logging"""

    def test_log_empty_response_basic(self, mock_logger):
        """Test basic empty response logging"""
        log_empty_response(mock_logger)

        mock_logger.warning.assert_called_once()
        calls_str = str(mock_logger.warning.call_args)
        assert "Empty response" in calls_str

    def test_log_empty_response_with_endpoint(self, mock_logger):
        """Test empty response logging with endpoint"""
        log_empty_response(mock_logger, endpoint="AllSymbols")

        calls_str = str(mock_logger.warning.call_args)
        assert "AllSymbols" in calls_str


class TestLogDuplicateDetection:
    """Test duplicate detection logging"""

    def test_log_duplicate_detection(self, mock_logger):
        """Test duplicate detection logging"""
        log_duplicate_detection(mock_logger, "INS12345")

        mock_logger.debug.assert_called_once()
        calls_str = str(mock_logger.debug.call_args)
        assert "Duplicate detected" in calls_str
        assert "INS12345" in calls_str
        assert "skipping" in calls_str

    def test_log_duplicate_detection_custom_action(self, mock_logger):
        """Test duplicate detection with custom action"""
        log_duplicate_detection(mock_logger, "INS67890", action="updating")

        calls_str = str(mock_logger.debug.call_args)
        assert "updating" in calls_str


class TestTimedOperation:
    """Test timed operation context manager"""

    def test_timed_operation_success(self, mock_logger):
        """Test timed operation for successful operation"""
        with TimedOperation(mock_logger, "Test Operation"):
            pass

        assert mock_logger.log.call_count == 2
        calls = [call[0] for call in mock_logger.log.call_args_list]

        # Check start log
        assert "Starting: Test Operation" in str(calls[0])

        # Check completion log
        assert "Completed: Test Operation" in str(calls[1])
        assert "took" in str(calls[1])
        assert "s)" in str(calls[1])  # seconds

    def test_timed_operation_failure(self, mock_logger):
        """Test timed operation for failed operation"""
        with pytest.raises(ValueError):
            with TimedOperation(mock_logger, "Failing Operation"):
                raise ValueError("Test error")

        # Check that error was logged
        calls_str = "\n".join(str(call) for call in mock_logger.error.call_args_list)
        assert "Failed: Failing Operation" in calls_str
        assert "Test error" in calls_str

    def test_timed_operation_custom_level(self, mock_logger):
        """Test timed operation with custom log level"""
        with TimedOperation(mock_logger, "Debug Operation", level=logging.DEBUG):
            pass

        # Verify DEBUG level was used
        first_call = mock_logger.log.call_args_list[0]
        assert first_call[0][0] == logging.DEBUG


class TestIntegration:
    """Integration tests combining multiple logging functions"""

    def test_spider_lifecycle_logging(self, mock_logger):
        """Test complete spider lifecycle logging"""
        # Start
        log_spider_start(mock_logger, "TestSpider", symbols=100)

        # Processing
        log_processing_stats(
            mock_logger,
            total_received=100,
            total_yielded=95,
            total_skipped=3,
            total_errors=2
        )

        # Close
        log_spider_close(
            mock_logger,
            "TestSpider",
            "finished",
            stats={"items": 95}
        )

        # Verify all stages were logged
        assert mock_logger.info.call_count > 10
        assert mock_logger.warning.call_count >= 1  # For errors
