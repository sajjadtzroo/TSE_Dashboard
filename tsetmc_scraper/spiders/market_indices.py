"""
Market Indices Spider
Fetches TSE market indices from BrsApi.ir Index endpoint.

Endpoint: https://BrsApi.ir/Api/Tsetmc/Index.php?key=KEY
Response: {code_http, successful, data: [...records...]}
"""
import scrapy
import json
import logging
from datetime import datetime

from tsetmc_scraper.items import MarketIndexItem
from tsetmc_scraper.utils import num, to_int, BROWSER_UA

logger = logging.getLogger(__name__)


class MarketIndicesSpider(scrapy.Spider):
    name = 'market_indices'
    allowed_domains = ['brsapi.ir', 'BrsApi.ir']

    custom_settings = {
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 0,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
    }

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Market Indices Spider at {datetime.now()}")
        logger.info("=" * 80)

        api_key = self.settings.get('BRSAPI_KEY', '')
        url = f'https://BrsApi.ir/Api/Tsetmc/Index.php?key={api_key}'
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

        logger.info(f"Received {len(data)} market index records from BrsApi")

        for rec in data:
            try:
                item = MarketIndexItem()
                item['item_type'] = 'market_index'
                item['date'] = today
                item['time'] = rec.get('heven') or rec.get('time')
                item['name'] = rec.get('name', '')
                item['index_value'] = num(rec.get('xNivInuClMresworwordings') or rec.get('last') or rec.get('value'))
                item['index_change'] = num(rec.get('change') or rec.get('plc'))
                item['index_change_pct'] = num(rec.get('percent') or rec.get('plp'))
                item['min_value'] = num(rec.get('pmin') or rec.get('low'))
                item['max_value'] = num(rec.get('pmax') or rec.get('high'))
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

        logger.info(f"Parsed {count} market index items")

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")

    def closed(self, reason):
        logger.info(f"Market Indices Spider closed: {reason}")
