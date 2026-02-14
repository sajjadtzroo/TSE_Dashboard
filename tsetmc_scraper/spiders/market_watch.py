"""
Market Watch Spider
Fetches real-time price data for all instruments from TSETMC API
This is the PRIMARY spider that runs every 2 minutes during trading hours
"""
import scrapy
import json
import logging
from datetime import datetime
from tsetmc_scraper.items import DailyPriceItem, ClientTypeItem

logger = logging.getLogger(__name__)


class MarketWatchSpider(scrapy.Spider):
    """
    Spider to fetch real-time market data for all instruments
    Fetches:
    1. All instruments' closing prices (daily_prices)
    2. Client type data (legal vs. real traders)
    """
    name = 'market_watch'
    allowed_domains = ['tsetmc.com']

    custom_settings = {
        'CONCURRENT_REQUESTS': 4,
        'DOWNLOAD_DELAY': 0.5,
        'RETRY_TIMES': 5,
        'RETRY_HTTP_CODES': [403, 500, 502, 503, 504, 408, 429],
    }

    def start_requests(self):
        """Generate initial requests"""
        logger.info("="*80)
        logger.info(f"Starting Market Watch Spider at {datetime.now()}")
        logger.info("="*80)

        # Main endpoint: All instruments closing prices
        url_market = 'http://tsetmc.com/api/ClosingPrice/GetClosingPriceDailyAllInst'
        yield scrapy.Request(
            url=url_market,
            callback=self.parse_market_watch,
            errback=self.handle_error,
            meta={'source': 'market_watch'}
        )

        # Client type endpoint: Legal vs. Real traders
        url_client = 'http://tsetmc.com/api/ClientType/GetClientTypeAll'
        yield scrapy.Request(
            url=url_client,
            callback=self.parse_client_type,
            errback=self.handle_error,
            meta={'source': 'client_type'}
        )

    def parse_market_watch(self, response):
        """
        Parse market watch data for all instruments

        Expected JSON structure:
        {
            "closingPriceDaily": [
                {
                    "insCode": 12345678901234567,
                    "dEven": 20240214,
                    "pClosing": 1000,
                    "priceFirst": 990,
                    "priceMin": 980,
                    "priceMax": 1010,
                    "priceYesterday": 950,
                    "qTotTran5J": 1000000,
                    "qTotCap": 1000000000,
                    "zTotTran": 500,
                    ...
                },
                ...
            ]
        }
        """
        try:
            data = json.loads(response.text)
            instruments = data.get('closingPriceDaily', [])

            logger.info(f"Received {len(instruments)} instruments from market watch")

            for instrument in instruments:
                try:
                    # Extract and yield daily price item
                    item = DailyPriceItem()
                    item['item_type'] = 'daily_price'

                    # Core identifiers
                    item['ins_code'] = instrument.get('insCode')
                    item['d_even'] = instrument.get('dEven')

                    # OHLC prices
                    item['price_first'] = instrument.get('priceFirst')
                    item['price_last'] = instrument.get('pClosing')  # Note: API uses 'pClosing'
                    item['price_min'] = instrument.get('priceMin')
                    item['price_max'] = instrument.get('priceMax')

                    # Price changes
                    item['price_yesterday'] = instrument.get('priceYesterday')
                    price_last = instrument.get('pClosing', 0)
                    price_yesterday = instrument.get('priceYesterday', 0)

                    if price_yesterday and price_yesterday > 0:
                        item['price_change'] = price_last - price_yesterday
                        item['price_change_percent'] = ((price_last - price_yesterday) / price_yesterday) * 100
                    else:
                        item['price_change'] = 0
                        item['price_change_percent'] = 0

                    # Volume and value
                    item['q_tot_tran_5j'] = instrument.get('qTotTran5J')
                    item['q_tot_cap'] = instrument.get('qTotCap')
                    item['z_tot_tran'] = instrument.get('zTotTran')

                    # Adjusted close (same as close for now, can be calculated later)
                    item['adj_close'] = instrument.get('pClosing')

                    yield item

                except Exception as e:
                    logger.error(f"Error parsing instrument {instrument.get('insCode')}: {e}")
                    continue

            logger.info(f"Successfully parsed {len(instruments)} daily price items")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from market watch: {e}")
            logger.error(f"Response text: {response.text[:500]}")
        except Exception as e:
            logger.error(f"Unexpected error in parse_market_watch: {e}", exc_info=True)

    def parse_client_type(self, response):
        """
        Parse client type data (legal vs. real traders)

        Expected JSON structure:
        {
            "clientType": [
                {
                    "insCode": 12345678901234567,
                    "dEven": 20240214,
                    "buy_CountI": 100,
                    "buy_I_Volume": 10000,
                    "sell_CountI": 90,
                    "sell_I_Volume": 9000,
                    "buy_CountN": 50,
                    "buy_N_Volume": 50000,
                    "sell_CountN": 45,
                    "sell_N_Volume": 48000,
                    ...
                },
                ...
            ]
        }
        """
        try:
            data = json.loads(response.text)
            client_data = data.get('clientType', [])

            logger.info(f"Received {len(client_data)} client type records")

            for record in client_data:
                try:
                    item = ClientTypeItem()
                    item['item_type'] = 'client_type'

                    # Core identifiers
                    item['ins_code'] = record.get('insCode')
                    item['d_even'] = record.get('dEven')

                    # Real (individual) traders - 'I' in API
                    item['real_buyer_count'] = record.get('buy_CountI')
                    item['real_buyer_volume'] = record.get('buy_I_Volume')
                    item['real_buyer_value'] = record.get('buy_I_Value', 0)

                    item['real_seller_count'] = record.get('sell_CountI')
                    item['real_seller_volume'] = record.get('sell_I_Volume')
                    item['real_seller_value'] = record.get('sell_I_Value', 0)

                    # Legal (institutional) traders - 'N' in API
                    item['legal_buyer_count'] = record.get('buy_CountN')
                    item['legal_buyer_volume'] = record.get('buy_N_Volume')
                    item['legal_buyer_value'] = record.get('buy_N_Value', 0)

                    item['legal_seller_count'] = record.get('sell_CountN')
                    item['legal_seller_volume'] = record.get('sell_N_Volume')
                    item['legal_seller_value'] = record.get('sell_N_Value', 0)

                    yield item

                except Exception as e:
                    logger.error(f"Error parsing client type for {record.get('insCode')}: {e}")
                    continue

            logger.info(f"Successfully parsed {len(client_data)} client type items")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from client type: {e}")
            logger.error(f"Response text: {response.text[:500]}")
        except Exception as e:
            logger.error(f"Unexpected error in parse_client_type: {e}", exc_info=True)

    def handle_error(self, failure):
        """Handle request errors"""
        logger.error(f"Request failed: {failure.value}")
        logger.error(f"URL: {failure.request.url}")

    def closed(self, reason):
        """Called when spider closes"""
        logger.info("="*80)
        logger.info(f"Market Watch Spider closed: {reason}")
        logger.info(f"Completed at {datetime.now()}")
        logger.info("="*80)
