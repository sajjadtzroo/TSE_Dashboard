"""
Market Indices Spider
Fetches TSE market indices from BrsApi.ir Index endpoint.

Endpoint: https://BrsApi.ir/Api/Tsetmc/Index.php?key=KEY&type=N
  type=1: Main market (single object)
  type=2: Secondary market (single object)
  type=3: Featured indices (array of objects with name, min, max, etc.)
"""
import scrapy
import json
import logging
from datetime import datetime

from tsetmc_scraper.items import MarketIndexItem
from tsetmc_scraper.utils import num, to_int, BROWSER_UA

logger = logging.getLogger(__name__)


INDEX_TYPES = [
    (1, 'بازار اول'),
    (2, 'بازار دوم'),
    (3, None),  # type=3 returns array with names
]



class MarketIndicesSpider(scrapy.Spider):
    name = 'market_indices'
    allowed_domains = ['brsapi.ir', 'BrsApi.ir']

    custom_settings = {
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 1,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
    }

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Market Indices Spider at {datetime.now()}")
        logger.info("=" * 80)

        api_key = self.settings.get('BRSAPI_KEY', '')

        for type_num, default_name in INDEX_TYPES:
            url = f'https://BrsApi.ir/Api/Tsetmc/Index.php?key={api_key}&type={type_num}'
            yield scrapy.Request(
                url=url,
                callback=self.parse,
                errback=self.handle_error,
                headers={'User-Agent': BROWSER_UA},
                cb_kwargs={'type_num': type_num, 'default_name': default_name},
            )

    def parse(self, response, type_num, default_name):
        try:
            raw = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON for type={type_num}: {e}")
            return

        today = datetime.now().date()

        # type=3 returns array, type=1/2 return single object
        if isinstance(raw, list):
            records = raw
        elif isinstance(raw, dict):
            records = [raw]
        else:
            logger.error(f"Unexpected response type for type={type_num}: {type(raw)}")
            return

        logger.info(f"Received {len(records)} records for type={type_num}")
        count = 0

        for rec in records:
            try:
                item = MarketIndexItem()
                item['item_type'] = 'market_index'
                item['date'] = today
                item['time'] = rec.get('time')
                item['name'] = rec.get('name') or default_name or f'Index type={type_num}'
                item['index_value'] = num(rec.get('index'))
                item['index_change'] = num(rec.get('index_change'))
                item['index_change_pct'] = num(rec.get('index_change_percent'))
                item['min_value'] = num(rec.get('min'))
                item['max_value'] = num(rec.get('max'))
                item['market_value'] = num(rec.get('mv'))
                item['trades'] = to_int(rec.get('tno'))
                item['volume'] = to_int(rec.get('tvol'))
                item['value'] = num(rec.get('tval'))
                item['state'] = rec.get('state')

                if item['name']:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping index record: {e}")
                continue

        logger.info(f"Parsed {count} market index items for type={type_num}")

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")

    def closed(self, reason):
        logger.info(f"Market Indices Spider closed: {reason}")
