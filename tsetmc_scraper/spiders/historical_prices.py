"""
Historical Prices Spider
Fetches historical price data for all instruments
Used for backfilling historical data
"""
import scrapy
import json
import logging
from datetime import datetime
from tsetmc_scraper.items import DailyPriceItem

logger = logging.getLogger(__name__)


class HistoricalPricesSpider(scrapy.Spider):
    """
    Spider to fetch historical price data for all instruments
    Can be run with specific InsCodes or fetch all instruments
    """
    name = 'historical_prices'
    allowed_domains = ['tsetmc.com']

    custom_settings = {
        'CONCURRENT_REQUESTS': 4,
        'DOWNLOAD_DELAY': 1.0,  # Slower to avoid overloading
    }

    def __init__(self, ins_codes=None, *args, **kwargs):
        """
        Initialize spider

        Args:
            ins_codes: Comma-separated list of InsCodes to fetch (optional)
                      If not provided, will fetch all instruments
        """
        super().__init__(*args, **kwargs)

        if ins_codes:
            # Parse comma-separated InsCodes
            self.instruments = [int(code.strip()) for code in ins_codes.split(',')]
            logger.info(f"Will fetch history for {len(self.instruments)} specified instruments")
        else:
            self.instruments = []
            logger.info("Will fetch history for all instruments")

    def start_requests(self):
        """Generate initial requests"""
        logger.info("="*80)
        logger.info(f"Starting Historical Prices Spider at {datetime.now()}")
        logger.info("="*80)

        if not self.instruments:
            # Get list of all instruments first
            url = 'http://tsetmc.com/api/ClosingPrice/GetClosingPriceDailyAllInst'
            yield scrapy.Request(
                url=url,
                callback=self.parse_instrument_list,
                errback=self.handle_error
            )
        else:
            # Directly fetch history for specified instruments
            for ins_code in self.instruments:
                yield from self.request_history(ins_code)

    def parse_instrument_list(self, response):
        """Parse instrument list to get all InsCodes"""
        try:
            data = json.loads(response.text)
            instruments = data.get('closingPriceDaily', [])

            logger.info(f"Found {len(instruments)} instruments")

            for instrument in instruments:
                ins_code = instrument.get('insCode')
                if ins_code:
                    self.instruments.append(ins_code)
                    yield from self.request_history(ins_code)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from instrument list: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in parse_instrument_list: {e}", exc_info=True)

    def request_history(self, ins_code):
        """
        Request historical data for an instrument

        Args:
            ins_code: Instrument code
        """
        # Top=0 means fetch all historical data
        url = f'http://tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/{ins_code}/0'

        yield scrapy.Request(
            url=url,
            callback=self.parse_historical_data,
            errback=self.handle_error,
            meta={'ins_code': ins_code},
            dont_filter=True
        )

    def parse_historical_data(self, response):
        """
        Parse historical price data

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
        ins_code = response.meta['ins_code']

        try:
            data = json.loads(response.text)
            price_data = data.get('closingPriceDaily', [])

            logger.info(f"Received {len(price_data)} historical records for instrument {ins_code}")

            for record in price_data:
                try:
                    # Create daily price item
                    item = DailyPriceItem()
                    item['item_type'] = 'daily_price'

                    # Core identifiers
                    item['ins_code'] = record.get('insCode', ins_code)
                    item['d_even'] = record.get('dEven')

                    # OHLC prices
                    item['price_first'] = record.get('priceFirst')
                    item['price_last'] = record.get('pClosing')
                    item['price_min'] = record.get('priceMin')
                    item['price_max'] = record.get('priceMax')

                    # Price changes
                    item['price_yesterday'] = record.get('priceYesterday')
                    price_last = record.get('pClosing', 0)
                    price_yesterday = record.get('priceYesterday', 0)

                    if price_yesterday and price_yesterday > 0:
                        item['price_change'] = price_last - price_yesterday
                        item['price_change_percent'] = ((price_last - price_yesterday) / price_yesterday) * 100
                    else:
                        item['price_change'] = 0
                        item['price_change_percent'] = 0

                    # Volume and value
                    item['q_tot_tran_5j'] = record.get('qTotTran5J')
                    item['q_tot_cap'] = record.get('qTotCap')
                    item['z_tot_tran'] = record.get('zTotTran')

                    # Adjusted close
                    item['adj_close'] = record.get('pClosing')

                    yield item

                except Exception as e:
                    logger.error(f"Error parsing historical record for {ins_code}: {e}")
                    continue

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON for instrument {ins_code}: {e}")
            logger.error(f"Response text: {response.text[:500]}")
        except Exception as e:
            logger.error(f"Unexpected error parsing history for {ins_code}: {e}", exc_info=True)

    def handle_error(self, failure):
        """Handle request errors"""
        logger.error(f"Request failed: {failure.value}")
        logger.error(f"URL: {failure.request.url}")

    def closed(self, reason):
        """Called when spider closes"""
        logger.info("="*80)
        logger.info(f"Historical Prices Spider closed: {reason}")
        logger.info(f"Processed {len(self.instruments)} instruments")
        logger.info(f"Completed at {datetime.now()}")
        logger.info("="*80)
