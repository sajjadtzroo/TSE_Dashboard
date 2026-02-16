"""
IME Physical Trades Spider
Fetches physical commodity trade data from BrsApi.ir IME Physical endpoint.
Supports date range for historical backfill via -a date_start= -a date_end=

Endpoint: https://BrsApi.ir/Api/IME/Physical.php?key=KEY[&date_start=X&date_end=Y]
"""
import scrapy
import json
import logging
from datetime import datetime

from tsetmc_scraper.items import IMEPhysicalTradeItem

logger = logging.getLogger(__name__)

BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'


class IMEPhysicalSpider(scrapy.Spider):
    name = 'ime_physical'
    allowed_domains = ['brsapi.ir', 'BrsApi.ir']

    custom_settings = {
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 0,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
    }

    def __init__(self, date_start=None, date_end=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.date_start = date_start
        self.date_end = date_end

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting IME Physical Spider at {datetime.now()}")
        logger.info("=" * 80)

        api_key = self.settings.get('BRSAPI_KEY', '')
        url = f'https://BrsApi.ir/Api/IME/Physical.php?key={api_key}'
        if self.date_start:
            url += f'&date_start={self.date_start}'
        if self.date_end:
            url += f'&date_end={self.date_end}'

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

        logger.info(f"Received {len(data)} IME physical trade records")

        for rec in data:
            try:
                item = IMEPhysicalTradeItem()
                item['item_type'] = 'ime_physical'

                # Parse trade date from API or use today
                date_str = rec.get('date_trade') or rec.get('date')
                if date_str:
                    item['date_trade_shamsi'] = str(date_str)
                    # Try to parse Gregorian date if available
                    greg = rec.get('date_trade_miladi') or rec.get('date_miladi')
                    if greg:
                        try:
                            item['date_trade'] = datetime.strptime(str(greg)[:10], '%Y-%m-%d').date()
                        except (ValueError, TypeError):
                            item['date_trade'] = today
                    else:
                        item['date_trade'] = today
                else:
                    item['date_trade'] = today
                    item['date_trade_shamsi'] = None

                item['symbol'] = rec.get('symbol') or rec.get('l18')
                item['name'] = rec.get('name') or rec.get('l30')
                item['category_id'] = self._int(rec.get('category_id'))
                item['code_offer'] = rec.get('code_offer', '')
                item['market_hall'] = rec.get('market_hall')
                item['producer'] = rec.get('producer')
                item['supplier'] = rec.get('supplier')
                item['broker'] = rec.get('broker')
                item['contract_type'] = rec.get('contract_type')
                item['settlement_type'] = rec.get('settlement_type')
                item['date_settlement'] = rec.get('date_settlement')
                item['date_delivery'] = rec.get('date_delivery')
                item['location_delivery'] = rec.get('location_delivery')
                item['price_base_offer'] = self._int(rec.get('price_base_offer'))
                item['price_min'] = self._int(rec.get('price_min'))
                item['price_max'] = self._int(rec.get('price_max'))
                item['price_last'] = self._int(rec.get('price_last'))
                item['volume_offer'] = self._int(rec.get('volume_offer'))
                item['volume_contract'] = self._int(rec.get('volume_contract'))
                item['demand'] = self._int(rec.get('demand'))
                item['value'] = self._int(rec.get('value'))
                item['currency'] = rec.get('currency')
                item['packaging_type'] = rec.get('packaging_type')
                item['unit'] = rec.get('unit')

                if item['code_offer']:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping IME physical record: {e}")
                continue

        logger.info(f"Parsed {count} IME physical trade items")

    @staticmethod
    def _int(val):
        try:
            return int(val) if val is not None else None
        except (ValueError, TypeError):
            return None

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")

    def closed(self, reason):
        logger.info(f"IME Physical Spider closed: {reason}")
