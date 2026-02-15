"""
Market Watch Spider
Fetches real-time price and client type data for all instruments via BrsApi.ir
This is the PRIMARY spider that runs every 2 minutes during trading hours.

Endpoint: https://BrsApi.ir/Api/Tsetmc/AllSymbols.php?key=KEY&type=1
"""
import scrapy
import json
import logging
from datetime import datetime
from tsetmc_scraper.items import DailyPriceItem, ClientTypeItem

logger = logging.getLogger(__name__)


class MarketWatchSpider(scrapy.Spider):
    """
    Spider to fetch real-time market data for all instruments.
    Single API call returns prices + client type for all symbols.
    """
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
        """
        Parse BrsApi AllSymbols JSON response.

        Each item contains:
          Price:  pf (first), pl (last), pc (close), pmin, pmax, py (yesterday)
                  pcc (close change), pcp (close change %), plc, plp
          Trade:  tno (trades), tvol (volume), tval (value)
          Info:   id (ins_code), l18 (symbol), l30 (name), isin, cs (sector)
          Client: Buy_CountI/N, Sell_CountI/N, Buy_I_Volume/N, Sell_I_Volume/N
        """
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.error(f"Response: {response.text[:500]}")
            return

        if isinstance(data, dict) and data.get('code_http'):
            logger.error(f"API error: {data}")
            return

        if not isinstance(data, list):
            logger.error(f"Unexpected response type: {type(data)}")
            return

        today = int(datetime.now().strftime('%Y%m%d'))
        price_count = 0
        client_count = 0

        logger.info(f"Received {len(data)} symbols from BrsApi")

        for item in data:
            try:
                ins_code = int(item['id'])

                # --- Daily Price Item ---
                price = DailyPriceItem()
                price['item_type'] = 'daily_price'
                price['ins_code'] = ins_code
                price['d_even'] = today
                price['price_first'] = self._num(item.get('pf'))
                price['price_last'] = self._num(item.get('pc'))  # close/final price
                price['price_min'] = self._num(item.get('pmin'))
                price['price_max'] = self._num(item.get('pmax'))
                price['price_yesterday'] = self._num(item.get('py'))
                price['price_change'] = self._num(item.get('pcc'))
                price['price_change_percent'] = self._num(item.get('pcp'))
                price['z_tot_tran'] = self._int(item.get('tno'))
                price['q_tot_tran_5j'] = self._int(item.get('tvol'))
                price['q_tot_cap'] = self._int(item.get('tval'))
                price['adj_close'] = self._num(item.get('pc'))

                yield price
                price_count += 1

                # --- Client Type Item ---
                ct = ClientTypeItem()
                ct['item_type'] = 'client_type'
                ct['ins_code'] = ins_code
                ct['d_even'] = today
                ct['real_buyer_count'] = self._int(item.get('Buy_CountI'))
                ct['real_buyer_volume'] = self._int(item.get('Buy_I_Volume'))
                ct['real_buyer_value'] = 0
                ct['real_seller_count'] = self._int(item.get('Sell_CountI'))
                ct['real_seller_volume'] = self._int(item.get('Sell_I_Volume'))
                ct['real_seller_value'] = 0
                ct['legal_buyer_count'] = self._int(item.get('Buy_CountN'))
                ct['legal_buyer_volume'] = self._int(item.get('Buy_N_Volume'))
                ct['legal_buyer_value'] = 0
                ct['legal_seller_count'] = self._int(item.get('Sell_CountN'))
                ct['legal_seller_volume'] = self._int(item.get('Sell_N_Volume'))
                ct['legal_seller_value'] = 0

                yield ct
                client_count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping symbol: {e}")
                continue

        logger.info(f"Parsed {price_count} price items, {client_count} client type items")

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
