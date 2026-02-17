"""
Scrapy downloader middlewares for TSETMC scraper.

ExponentialBackoffMiddleware — retries 429/503 responses with exponential
backoff + jitter, replacing Scrapy's default RetryMiddleware for those codes.
"""
import logging
import random
import time

from scrapy import signals

logger = logging.getLogger(__name__)


class ExponentialBackoffMiddleware:
    """Retry failed requests with exponential backoff, especially for 429 rate limits."""

    def __init__(self, max_retries=5, base_delay=2.0, max_delay=60.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            max_retries=crawler.settings.getint('RETRY_TIMES', 5),
            base_delay=crawler.settings.getfloat('BACKOFF_BASE_DELAY', 2.0),
            max_delay=crawler.settings.getfloat('BACKOFF_MAX_DELAY', 60.0),
        )

    def process_response(self, request, response, spider):
        if response.status in (429, 503):
            retries = request.meta.get('backoff_retries', 0)
            if retries < self.max_retries:
                delay = min(self.base_delay * (2 ** retries), self.max_delay)
                delay += random.uniform(0, delay * 0.25)  # jitter
                logger.info(
                    "Backoff retry %d/%d for %s (HTTP %s) — sleeping %.1fs",
                    retries + 1, self.max_retries, request.url,
                    response.status, delay,
                )
                time.sleep(delay)
                retry_req = request.copy()
                retry_req.meta['backoff_retries'] = retries + 1
                retry_req.dont_filter = True
                return retry_req
            logger.warning(
                "Max backoff retries (%d) reached for %s (HTTP %s)",
                self.max_retries, request.url, response.status,
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
        for i in result:
            yield i

    def process_spider_exception(self, response, exception, spider):
        pass

    async def process_start(self, start):
        async for item_or_request in start:
            yield item_or_request

    def spider_opened(self, spider):
        spider.logger.info("Spider opened: %s", spider.name)
