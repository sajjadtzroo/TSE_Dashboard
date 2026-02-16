"""
Market Prices Spider
Fetches gold/currency, commodity, and cryptocurrency prices from BrsApi.ir.
Three API calls: Gold_Currency (free), Commodity, Cryptocurrency.

Endpoints:
  - https://BrsApi.ir/Api/Market/Gold_Currency.php?key=KEY (free tier)
  - https://BrsApi.ir/Api/Market/Commodity.php?key=KEY
  - https://BrsApi.ir/Api/Market/Cryptocurrency.php?key=KEY
"""
import scrapy
import json
import logging
from datetime import datetime

from tsetmc_scraper.items import MarketPriceItem

logger = logging.getLogger(__name__)

BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

ENDPOINTS = [
    ('gold_currency', 'https://BrsApi.ir/Api/Market/Gold_Currency.php?key={key}', 'gold'),
    ('commodity', 'https://BrsApi.ir/Api/Market/Commodity.php?key={key}', 'commodity'),
    ('cryptocurrency', 'https://BrsApi.ir/Api/Market/Cryptocurrency.php?key={key}', 'crypto'),
]


class MarketPricesSpider(scrapy.Spider):
    name = 'market_prices'
    allowed_domains = ['brsapi.ir', 'BrsApi.ir']

    custom_settings = {
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 1,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
    }

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Market Prices Spider at {datetime.now()}")
        logger.info("=" * 80)

        api_key = self.settings.get('BRSAPI_KEY', '')
        for ep_name, url_tpl, market_type in ENDPOINTS:
            url = url_tpl.format(key=api_key)
            yield scrapy.Request(
                url=url,
                callback=self.parse,
                errback=self.handle_error,
                headers={'User-Agent': BROWSER_UA},
                cb_kwargs={'market_type': market_type, 'ep_name': ep_name},
            )

    def parse(self, response, market_type, ep_name):
        try:
            raw = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON for {ep_name}: {e}")
            return

        if isinstance(raw, dict):
            if not raw.get('successful'):
                logger.error(f"API returned unsuccessful for {ep_name}: {raw.get('message_error')}")
                return
            data = raw.get('data', [])
        elif isinstance(raw, list):
            data = raw
        else:
            logger.error(f"Unexpected response type for {ep_name}: {type(raw)}")
            return

        today = datetime.now().date()
        count = 0

        logger.info(f"Received {len(data)} {ep_name} records from BrsApi")

        # Gold_Currency endpoint contains both gold and currency items
        for rec in data:
            try:
                item = MarketPriceItem()
                item['item_type'] = 'market_price'
                item['date'] = today

                # Determine sub-market_type for gold_currency
                actual_market_type = market_type
                if ep_name == 'gold_currency':
                    # Classify based on category or name fields
                    cat = (rec.get('category') or '').lower()
                    name = (rec.get('name') or rec.get('l18') or '').lower()
                    if 'currency' in cat or 'ارز' in name or 'dollar' in name.lower() or 'دلار' in name or 'یورو' in name:
                        actual_market_type = 'currency'
                    else:
                        actual_market_type = 'gold'

                item['market_type'] = actual_market_type
                item['symbol'] = rec.get('l18') or rec.get('symbol') or rec.get('name', '')
                item['name_fa'] = rec.get('l30') or rec.get('name') or rec.get('l18', '')
                item['time'] = rec.get('heven') or rec.get('time')
                item['price'] = self._num(rec.get('price') or rec.get('pl') or rec.get('pc'))
                item['price_toman'] = self._num(rec.get('price_toman') or rec.get('price_irt'))
                item['change_value'] = self._num(rec.get('change') or rec.get('plc') or rec.get('pcc'))
                item['change_pct'] = self._num(rec.get('percent') or rec.get('plp') or rec.get('pcp'))
                item['unit'] = rec.get('unit')
                item['market_cap'] = self._num(rec.get('mv') or rec.get('market_cap'))
                item['icon_url'] = rec.get('icon') or rec.get('icon_url')

                if item['symbol']:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping {ep_name} record: {e}")
                continue

        logger.info(f"Parsed {count} {ep_name} items")

    @staticmethod
    def _num(val):
        try:
            return float(val) if val is not None else None
        except (ValueError, TypeError):
            return None

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")

    def closed(self, reason):
        logger.info(f"Market Prices Spider closed: {reason}")
