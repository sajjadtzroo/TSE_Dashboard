"""
ETF NAV Spider
Fetches ETF Net Asset Values from BrsApi.ir Nav endpoint.

Endpoint: https://BrsApi.ir/Api/Tsetmc/Nav.php?key=KEY
Response: {code_http, successful, data: [...records...]}
"""
import scrapy
import json
import logging
from datetime import datetime

from tsetmc_scraper.items import ETFNavItem

logger = logging.getLogger(__name__)

BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'


class ETFNavSpider(scrapy.Spider):
    name = 'etf_nav'
    allowed_domains = ['brsapi.ir', 'BrsApi.ir']

    custom_settings = {
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 0,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
    }

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting ETF NAV Spider at {datetime.now()}")
        logger.info("=" * 80)

        api_key = self.settings.get('BRSAPI_KEY', '')
        url = f'https://BrsApi.ir/Api/Tsetmc/Nav.php?key={api_key}'
        yield scrapy.Request(
            url=url,
            callback=self.parse,
            errback=self.handle_error,
            headers={'User-Agent': BROWSER_UA},
        )

    def parse(self, response):
        try:
            raw = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            return

        if isinstance(raw, dict):
            if not raw.get('successful'):
                logger.error(f"API returned unsuccessful: {raw.get('message_error')}")
                return
            data = raw.get('data', [])
        elif isinstance(raw, list):
            data = raw
        else:
            logger.error(f"Unexpected response type: {type(raw)}")
            return

        today = datetime.now().date()
        count = 0

        logger.info(f"Received {len(data)} ETF NAV records from BrsApi")

        for rec in data:
            try:
                item = ETFNavItem()
                item['item_type'] = 'etf_nav'
                item['ins_code'] = self._int(rec.get('id'))
                item['date'] = today
                item['time'] = rec.get('heven') or rec.get('time')
                item['symbol'] = rec.get('l18', '')
                item['name_fa'] = rec.get('l30')
                item['nav_issuance'] = self._num(rec.get('psubtran'))
                item['nav_redemption'] = self._num(rec.get('predtran'))
                item['last_price'] = self._num(rec.get('pl'))
                item['fund_type'] = rec.get('fund_type') or rec.get('type')

                # Calculate bubble %
                nav_red = self._num(rec.get('predtran'))
                last = self._num(rec.get('pl'))
                if nav_red and last and nav_red > 0:
                    item['bubble_pct'] = round(((last - nav_red) / nav_red) * 100, 4)
                else:
                    item['bubble_pct'] = None

                if item['ins_code']:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping ETF NAV record: {e}")
                continue

        logger.info(f"Parsed {count} ETF NAV items")

    @staticmethod
    def _num(val):
        try:
            return float(val) if val is not None else None
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _int(val):
        try:
            return int(val) if val is not None else None
        except (ValueError, TypeError):
            return None

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")

    def closed(self, reason):
        logger.info(f"ETF NAV Spider closed: {reason}")
