"""
IME Forwards Spider
Fetches forward contracts from BrsApi.ir IME Forward endpoint.

Endpoint: https://BrsApi.ir/Api/IME/Forward.php?key=KEY
"""
import scrapy
import json
import logging
from datetime import datetime

from tsetmc_scraper.items import IMEForwardItem

logger = logging.getLogger(__name__)

BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'


class IMEForwardsSpider(scrapy.Spider):
    name = 'ime_forwards'
    allowed_domains = ['brsapi.ir', 'BrsApi.ir']

    custom_settings = {
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 0,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
    }

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting IME Forwards Spider at {datetime.now()}")
        logger.info("=" * 80)

        api_key = self.settings.get('BRSAPI_KEY', '')
        url = f'https://BrsApi.ir/Api/IME/Forward.php?key={api_key}'
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

        logger.info(f"Received {len(data)} IME forward records from BrsApi")

        for rec in data:
            try:
                item = IMEForwardItem()
                item['item_type'] = 'ime_forward'
                item['date'] = today
                item['date_shamsi'] = rec.get('date_update')
                item['ins_code'] = rec.get('id') or rec.get('ins_code')
                item['isin'] = rec.get('isin', '')
                item['symbol'] = rec.get('l18') or rec.get('symbol')
                item['name'] = rec.get('l30') or rec.get('name')
                item['settlement_price'] = self._int(rec.get('py'))
                item['open'] = self._int(rec.get('pf'))
                item['high'] = self._int(rec.get('pmax'))
                item['low'] = self._int(rec.get('pmin'))
                item['last'] = self._int(rec.get('pl'))
                item['last_change'] = self._int(rec.get('plc'))
                item['last_change_pct'] = self._num(rec.get('plp'))
                item['close'] = self._int(rec.get('pc'))
                item['trades'] = self._int(rec.get('tno'))
                item['volume'] = self._int(rec.get('tvol'))
                item['value'] = self._int(rec.get('tval'))

                # Client type
                item['real_buy_count'] = self._int(rec.get('Buy_CountI'))
                item['real_buy_volume'] = self._int(rec.get('Buy_I_Volume'))
                item['real_sell_count'] = self._int(rec.get('Sell_CountI'))
                item['real_sell_volume'] = self._int(rec.get('Sell_I_Volume'))
                item['legal_buy_count'] = self._int(rec.get('Buy_CountN'))
                item['legal_buy_volume'] = self._int(rec.get('Buy_N_Volume'))
                item['legal_sell_count'] = self._int(rec.get('Sell_CountN'))
                item['legal_sell_volume'] = self._int(rec.get('Sell_N_Volume'))

                # 5-level order book
                for lvl in range(1, 6):
                    item[f'bid_price_{lvl}'] = self._int(rec.get(f'pd{lvl}'))
                    item[f'bid_vol_{lvl}'] = self._int(rec.get(f'qd{lvl}'))
                    item[f'ask_price_{lvl}'] = self._int(rec.get(f'po{lvl}'))
                    item[f'ask_vol_{lvl}'] = self._int(rec.get(f'qo{lvl}'))

                if item['isin']:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping IME forward record: {e}")
                continue

        logger.info(f"Parsed {count} IME forward items")

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
        logger.info(f"IME Forwards Spider closed: {reason}")
