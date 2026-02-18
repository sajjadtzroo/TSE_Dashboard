"""
Logging utilities for spiders
Standardized logging functions to reduce boilerplate and ensure consistency
"""

import logging
from datetime import datetime
from typing import Any

from scrapy.http import Response
from twisted.python.failure import Failure


def get_spider_logger(spider_name: str) -> logging.Logger:
    """
    Get a logger instance for a spider

    Args:
        spider_name: Name of the spider

    Returns:
        Configured logger instance
    """
    return logging.getLogger(f"tsetmc_scraper.spiders.{spider_name}")


def log_spider_start(logger: logging.Logger, spider_name: str, **kwargs) -> None:
    """
    Log spider start with standardized banner

    Args:
        logger: Logger instance
        spider_name: Name of the spider
        **kwargs: Additional info to log (e.g., date_range, symbol, etc.)
    """
    logger.info("=" * 80)
    logger.info(f"Starting {spider_name} Spider at {datetime.now()}")

    if kwargs:
        logger.info("Configuration:")
        for key, value in kwargs.items():
            logger.info(f"  {key}: {value}")

    logger.info("=" * 80)


def log_spider_close(
    logger: logging.Logger,
    spider_name: str,
    reason: str,
    stats: dict[str, Any] | None = None,
) -> None:
    """
    Log spider completion with standardized banner

    Args:
        logger: Logger instance
        spider_name: Name of the spider
        reason: Reason for spider closure
        stats: Optional statistics dictionary (items_scraped, errors, etc.)
    """
    logger.info("=" * 80)
    logger.info(f"{spider_name} Spider closed: {reason}")
    logger.info(f"Completed at {datetime.now()}")

    if stats:
        logger.info("Statistics:")
        for key, value in stats.items():
            logger.info(f"  {key}: {value}")

    logger.info("=" * 80)


def log_json_error(
    logger: logging.Logger, error: Exception, response: Response | None = None
) -> None:
    """
    Log JSON parsing errors with context

    Args:
        logger: Logger instance
        error: The JSON parsing exception
        response: Optional response object for additional context
    """
    logger.error(f"Failed to parse JSON: {error}")

    if response:
        logger.error(f"URL: {response.url}")
        logger.error(f"Status: {response.status}")

        # Log first 200 chars of response for debugging
        response_preview = response.text[:200] if response.text else "Empty response"
        logger.error(f"Response preview: {response_preview}...")


def log_api_error(
    logger: logging.Logger, api_response: dict[str, Any], endpoint: str | None = None
) -> None:
    """
    Log API-level errors (e.g., BrsApi error responses)

    Args:
        logger: Logger instance
        api_response: The API error response dictionary
        endpoint: Optional endpoint name for context
    """
    error_msg = api_response.get("message_error", "Unknown error")
    code_http = api_response.get("code_http", "N/A")

    if endpoint:
        logger.error(f"API error from {endpoint}: {error_msg} (HTTP {code_http})")
    else:
        logger.error(f"API error: {error_msg} (HTTP {code_http})")

    logger.error(f"Full response: {api_response}")


def log_request_error(logger: logging.Logger, failure: Failure) -> None:
    """
    Log Scrapy request failures (used in errback)

    Args:
        logger: Logger instance
        failure: Twisted Failure object from errback
    """
    logger.error(f"Request failed: {failure.value}")

    if failure.request:
        logger.error(f"URL: {failure.request.url}")
        logger.error(f"Method: {failure.request.method}")

    # Log the traceback for debugging
    logger.debug(f"Traceback: {failure.getTraceback()}")


def log_processing_stats(
    logger: logging.Logger,
    total_received: int,
    total_yielded: int,
    total_skipped: int = 0,
    total_errors: int = 0,
    **kwargs,
) -> None:
    """
    Log processing statistics

    Args:
        logger: Logger instance
        total_received: Number of items received from API
        total_yielded: Number of items yielded to pipeline
        total_skipped: Number of items skipped
        total_errors: Number of errors encountered
        **kwargs: Additional statistics (e.g., by_type counts)
    """
    logger.info("Processing complete:")
    logger.info(f"  Received: {total_received}")
    logger.info(f"  Yielded:  {total_yielded}")

    if total_skipped > 0:
        logger.info(f"  Skipped:  {total_skipped}")

    if total_errors > 0:
        logger.warning(f"  Errors:   {total_errors}")

    # Log additional stats
    for key, value in kwargs.items():
        logger.info(f"  {key}: {value}")

    # Calculate and log success rate
    if total_received > 0:
        success_rate = (total_yielded / total_received) * 100
        logger.info(f"  Success rate: {success_rate:.1f}%")


def log_item_skip(
    logger: logging.Logger, reason: str, item_info: str | None = None
) -> None:
    """
    Log when an item is skipped during processing

    Args:
        logger: Logger instance
        reason: Reason for skipping
        item_info: Optional item identifier or info for context
    """
    if item_info:
        logger.debug(f"Skipping item ({item_info}): {reason}")
    else:
        logger.debug(f"Skipping item: {reason}")


def log_parse_error(
    logger: logging.Logger,
    error: Exception,
    field: str | None = None,
    item_info: str | None = None,
) -> None:
    """
    Log field parsing errors

    Args:
        logger: Logger instance
        error: The parsing exception
        field: Optional field name that caused the error
        item_info: Optional item identifier for context
    """
    if field and item_info:
        logger.warning(
            f"Parse error for field '{field}' in item ({item_info}): {error}"
        )
    elif field:
        logger.warning(f"Parse error for field '{field}': {error}")
    else:
        logger.warning(f"Parse error: {error}")


def log_data_validation_error(
    logger: logging.Logger,
    field: str,
    value: Any,
    expected: str,
    item_info: str | None = None,
) -> None:
    """
    Log data validation errors

    Args:
        logger: Logger instance
        field: Field name
        value: The invalid value
        expected: Description of expected value/format
        item_info: Optional item identifier for context
    """
    if item_info:
        logger.warning(
            f"Validation error in item ({item_info}): "
            f"field '{field}' = {value} (expected: {expected})"
        )
    else:
        logger.warning(
            f"Validation error: field '{field}' = {value} (expected: {expected})"
        )


def log_unexpected_response(
    logger: logging.Logger,
    expected_type: str,
    actual_type: str,
    response: Response | None = None,
) -> None:
    """
    Log unexpected response type/format

    Args:
        logger: Logger instance
        expected_type: Description of expected response type
        actual_type: Description of actual response type
        response: Optional response object for context
    """
    logger.error(
        f"Unexpected response type: expected {expected_type}, got {actual_type}"
    )

    if response:
        logger.error(f"URL: {response.url}")
        logger.error(f"Response preview: {response.text[:200]}...")


def log_rate_limit(logger: logging.Logger, retry_after: int | None = None) -> None:
    """
    Log rate limit encounters

    Args:
        logger: Logger instance
        retry_after: Optional retry-after value in seconds
    """
    if retry_after:
        logger.warning(f"Rate limit reached. Retry after {retry_after} seconds")
    else:
        logger.warning("Rate limit reached. Retrying with backoff...")


def log_empty_response(logger: logging.Logger, endpoint: str | None = None) -> None:
    """
    Log when API returns empty data

    Args:
        logger: Logger instance
        endpoint: Optional endpoint name for context
    """
    if endpoint:
        logger.warning(f"Empty response from {endpoint}")
    else:
        logger.warning("Empty response from API")


def log_duplicate_detection(
    logger: logging.Logger, item_info: str, action: str = "skipping"
) -> None:
    """
    Log duplicate item detection

    Args:
        logger: Logger instance
        item_info: Item identifier
        action: Action taken (e.g., "skipping", "updating")
    """
    logger.debug(f"Duplicate detected ({item_info}): {action}")


# Context manager for timed operations
class TimedOperation:
    """
    Context manager for logging operation duration

    Usage:
        with TimedOperation(logger, "Fetching market data"):
            # ... perform operation ...
    """

    def __init__(
        self, logger: logging.Logger, operation_name: str, level: int = logging.INFO
    ):
        self.logger = logger
        self.operation_name = operation_name
        self.level = level
        self.start_time = None

    def __enter__(self):
        self.start_time = datetime.now()
        self.logger.log(self.level, f"Starting: {self.operation_name}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds()

        if exc_type is None:
            self.logger.log(
                self.level, f"Completed: {self.operation_name} (took {duration:.2f}s)"
            )
        else:
            self.logger.error(
                f"Failed: {self.operation_name} after {duration:.2f}s - {exc_val}"
            )

        # Don't suppress exceptions
        return False
