"""
Scrapy downloader middlewares for TSETMC scraper.

ExponentialBackoffMiddleware — retries 429/503 responses with exponential
backoff + jitter.  Uses Scrapy's download_delay meta key instead of blocking
time.sleep(), so the Twisted reactor stays responsive.

BrsApiBudgetMiddleware — enforces a daily request quota against any
``*.brsapi.ir`` host. Drops requests once the cap is reached.
"""

import logging
import random
from urllib.parse import urlparse

from scrapy import signals
from scrapy.exceptions import IgnoreRequest

logger = logging.getLogger(__name__)


class BrsApiBudgetMiddleware:
    """Enforce a daily request budget on BrsAPI calls.

    Intercepts ``process_request`` for any URL whose host ends in
    ``brsapi.ir``. Pre-increments a Redis-backed counter; if the increment
    overshoots the daily cap (``BRSAPI_DAILY_LIMIT``, default 10000), the
    request is dropped via ``IgnoreRequest``.
    """

    def process_request(self, request, spider):
        host = (urlparse(request.url).hostname or "").lower()
        if not host.endswith("brsapi.ir"):
            return None
        from api.brsapi_budget import consume_sync

        allowed, used, limit = consume_sync(1)
        if not allowed:
            spider.logger.error(
                "BrsAPI daily budget exhausted (%d/%d) — dropping %s",
                used,
                limit,
                request.url,
            )
            raise IgnoreRequest(
                f"BrsAPI daily budget exhausted ({used}/{limit})"
            )
        return None


class ExponentialBackoffMiddleware:
    """Retry failed requests with exponential backoff, especially for 429 rate limits.

    Instead of blocking ``time.sleep()`` (which freezes the entire Twisted
    reactor), this schedules the retry with a per-request ``download_delay``
    so other requests can continue processing.
    """

    def __init__(self, max_retries=5, base_delay=2.0, max_delay=60.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            max_retries=crawler.settings.getint("RETRY_TIMES", 5),
            base_delay=crawler.settings.getfloat("BACKOFF_BASE_DELAY", 2.0),
            max_delay=crawler.settings.getfloat("BACKOFF_MAX_DELAY", 60.0),
        )

    def process_response(self, request, response, spider):
        if response.status in (429, 503):
            retries = request.meta.get("backoff_retries", 0)
            if retries < self.max_retries:
                delay = min(self.base_delay * (2**retries), self.max_delay)
                delay += random.uniform(0, delay * 0.25)  # jitter
                logger.info(
                    "Backoff retry %d/%d for %s (HTTP %s) — delay %.1fs",
                    retries + 1,
                    self.max_retries,
                    request.url,
                    response.status,
                    delay,
                )
                retry_req = request.copy()
                retry_req.meta["backoff_retries"] = retries + 1
                retry_req.meta["download_slot"] = f"backoff_{id(retry_req)}"
                retry_req.meta["download_delay"] = delay
                retry_req.dont_filter = True
                return retry_req
            logger.warning(
                "Max backoff retries (%d) reached for %s (HTTP %s)",
                self.max_retries,
                request.url,
                response.status,
            )
        return response


class TsetmcScraperSpiderMiddleware:
    """Basic spider middleware (kept for Scrapy compatibility)."""

    @classmethod
    def from_crawler(cls, crawler):
        s = cls()
        crawler.signals.connect(s.spider_opened, signal=signals.spider_opened)
        return s

    def process_spider_input(self, response, spider):
        return None

    def process_spider_output(self, response, result, spider):
        yield from result

    def process_spider_exception(self, response, exception, spider):
        pass

    async def process_start(self, start):
        async for item_or_request in start:
            yield item_or_request

    def spider_opened(self, spider):
        spider.logger.info("Spider opened: %s", spider.name)
