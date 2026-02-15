"""
Market Watch Spider
Fetches real-time price, client type, and order book data via BrsApi.ir
Runs every 2.5 minutes during trading hours.

Endpoint: https://BrsApi.ir/Api/Tsetmc/AllSymbols.php?key=KEY&type=1
"""
import scrapy
import json
import logging
from datetime import datetime, timezone
from tsetmc_scraper.items import DailyPriceItem, ClientTypeItem, OrderBookItem

logger = logging.getLogger(__name__)


class MarketWatchSpider(scrapy.Spider):
    name = 'market_watch'
    allowed_domains = ['brsapi.ir', 'BrsApi.ir']

    custom_settings = {
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 0,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
    }

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Market Watch Spider at {datetime.now()}")
        logger.info("=" * 80)

        base_url = self.settings.get('BRSAPI_BASE_URL', 'https://BrsApi.ir/Api/Tsetmc')
        api_key = self.settings.get('BRSAPI_KEY', '')

        url = f'{base_url}/AllSymbols.php?key={api_key}&type=1'
        yield scrapy.Request(
            url=url,
            callback=self.parse_all_symbols,
            errback=self.handle_error,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
        )

    def parse_all_symbols(self, response):
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            return

        if isinstance(data, dict) and data.get('code_http'):
            logger.error(f"API error: {data}")
            return

        if not isinstance(data, list):
            logger.error(f"Unexpected response type: {type(data)}")
            return

        today = datetime.now().date()
        now_utc = datetime.now(timezone.utc)
        price_count = 0
        client_count = 0
        ob_count = 0

        logger.info(f"Received {len(data)} symbols from BrsApi")

        for item in data:
            try:
                ins_code = int(item['id'])

                # --- Daily Price Item ---
                price = DailyPriceItem()
                price['item_type'] = 'daily_price'
                price['ins_code'] = ins_code
                price['date'] = today
                price['open'] = self._num(item.get('pf'))
                price['high'] = self._num(item.get('pmax'))
                price['low'] = self._num(item.get('pmin'))
                price['close'] = self._num(item.get('pc'))
                price['last'] = self._num(item.get('pl'))
                price['volume'] = self._int(item.get('tvol'))
                price['value'] = self._int(item.get('tval'))
                price['trades'] = self._int(item.get('tno'))
                price['adj_close'] = self._num(item.get('pc'))
                price['price_yesterday'] = self._num(item.get('py'))
                price['close_change'] = self._num(item.get('pcc'))
                price['close_change_pct'] = self._num(item.get('pcp'))
                price['last_change'] = self._num(item.get('plc'))
                price['last_change_pct'] = self._num(item.get('plp'))
                price['threshold_min'] = self._num(item.get('tmin'))
                price['threshold_max'] = self._num(item.get('tmax'))

                yield price
                price_count += 1

                # --- Client Type Item ---
                ct = ClientTypeItem()
                ct['item_type'] = 'client_type'
                ct['ins_code'] = ins_code
                ct['date'] = today
                ct['real_buy_count'] = self._int(item.get('Buy_CountI'))
                ct['real_buy_volume'] = self._int(item.get('Buy_I_Volume'))
                ct['real_sell_count'] = self._int(item.get('Sell_CountI'))
                ct['real_sell_volume'] = self._int(item.get('Sell_I_Volume'))
                ct['legal_buy_count'] = self._int(item.get('Buy_CountN'))
                ct['legal_buy_volume'] = self._int(item.get('Buy_N_Volume'))
                ct['legal_sell_count'] = self._int(item.get('Sell_CountN'))
                ct['legal_sell_volume'] = self._int(item.get('Sell_N_Volume'))

                yield ct
                client_count += 1

                # --- Order Book Item ---
                ob = OrderBookItem()
                ob['item_type'] = 'order_book'
                ob['ins_code'] = ins_code
                ob['snapshot_time'] = now_utc
                for level in range(1, 6):
                    ob[f'bid_price_{level}'] = self._num(item.get(f'pd{level}'))
                    ob[f'bid_vol_{level}'] = self._int(item.get(f'qd{level}'))
                    ob[f'bid_count_{level}'] = self._int(item.get(f'zd{level}'))
                    ob[f'ask_price_{level}'] = self._num(item.get(f'po{level}'))
                    ob[f'ask_vol_{level}'] = self._int(item.get(f'qo{level}'))
                    ob[f'ask_count_{level}'] = self._int(item.get(f'zo{level}'))

                yield ob
                ob_count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping symbol: {e}")
                continue

        logger.info(f"Parsed {price_count} prices, {client_count} client types, {ob_count} order books")

    @staticmethod
    def _num(val):
        try:
            return float(val) if val is not None else 0
        except (ValueError, TypeError):
            return 0

    @staticmethod
    def _int(val):
        try:
            return int(val) if val is not None else 0
        except (ValueError, TypeError):
            return 0

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")
        logger.error(f"URL: {failure.request.url}")

    def closed(self, reason):
        logger.info("=" * 80)
        logger.info(f"Market Watch Spider closed: {reason}")
        logger.info(f"Completed at {datetime.now()}")
        logger.info("=" * 80)
