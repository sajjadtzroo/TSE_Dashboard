"""
Codal Announcements Spider
Fetches company announcements from BrsApi.ir Codal/Announcement endpoint.
Supports date range backfill via -a date_start= -a date_end= and pagination.

Endpoint: https://BrsApi.ir/Api/Codal/Announcement.php?key=KEY[&date_start=X&date_end=Y&page=N]
"""
import scrapy
import json
import logging
from datetime import datetime

from tsetmc_scraper.items import CodalAnnouncementItem
from tsetmc_scraper.utils import to_int, BROWSER_UA

logger = logging.getLogger(__name__)


class CodalSpider(scrapy.Spider):
    name = 'codal'
    allowed_domains = ['brsapi.ir', 'BrsApi.ir']

    custom_settings = {
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 3,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
        'HTTPERROR_ALLOWED_CODES': [400],
    }

    def __init__(self, date_start=None, date_end=None, max_pages=5, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.date_start = date_start
        self.date_end = date_end
        self.max_pages = int(max_pages)

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Codal Spider at {datetime.now()}")
        logger.info("=" * 80)

        yield self._build_request(page=1)

    def _build_request(self, page=1):
        api_key = self.settings.get('BRSAPI_KEY', '')
        url = f'https://BrsApi.ir/Api/Codal/Announcement.php?key={api_key}&page={page}'
        if self.date_start:
            url += f'&date_start={self.date_start}'
        if self.date_end:
            url += f'&date_end={self.date_end}'
        return scrapy.Request(
            url=url,
            callback=self.parse,
            errback=self.handle_error,
            headers={'User-Agent': BROWSER_UA},
            cb_kwargs={'page': page},
        )

    def parse(self, response, page):
        try:
            raw = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON on page {page}: {e}")
            return

        if isinstance(raw, dict):
            # Codal API uses 'announcement' key, not 'data'/'successful'
            data = raw.get('announcement') or raw.get('data', [])
            if not data and raw.get('successful') is False:
                logger.error(f"API returned unsuccessful on page {page}: {raw.get('message_error')}")
                return
            total_pages = to_int(raw.get('count_page')) or 0
            total_items = to_int(raw.get('count_announcement')) or 0
            if page == 1:
                logger.info(f"Total announcements: {total_items}, pages: {total_pages}")
        elif isinstance(raw, list):
            data = raw
            total_pages = 0
        else:
            logger.error(f"Unexpected response type on page {page}: {type(raw)}")
            return

        count = 0

        logger.info(f"Received {len(data)} codal announcement records on page {page}")

        for rec in data:
            try:
                item = CodalAnnouncementItem()
                item['item_type'] = 'codal'
                item['symbol'] = rec.get('l18') or rec.get('symbol')
                item['company_name'] = rec.get('l30') or rec.get('company_name') or rec.get('name')
                item['title'] = rec.get('title')
                item['code'] = rec.get('code', '')
                item['category'] = to_int(rec.get('category'))
                item['date_title'] = rec.get('date_title')
                item['date_send'] = rec.get('date_send')
                item['time_send'] = rec.get('time_send')
                item['date_publish'] = rec.get('date_publish')
                item['time_publish'] = rec.get('time_publish')
                item['link'] = rec.get('link') or rec.get('url')
                item['link_pdf'] = rec.get('link_pdf') or rec.get('url_pdf')
                item['link_excel'] = rec.get('link_excel') or rec.get('url_excel')
                item['link_attachment'] = rec.get('link_attachment') or rec.get('url_attachment')

                if item['code']:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping codal record: {e}")
                continue

        logger.info(f"Parsed {count} codal items on page {page}")

        # Auto-paginate up to max_pages
        if len(data) > 0 and page < self.max_pages:
            yield self._build_request(page=page + 1)

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")

    def closed(self, reason):
        logger.info(f"Codal Spider closed: {reason}")
