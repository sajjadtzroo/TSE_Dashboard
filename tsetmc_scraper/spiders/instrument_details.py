"""
Instrument Details Spider
Fetches company metadata and financial indicators via BrsApi.ir
Runs daily to update company information.

Endpoint: https://BrsApi.ir/Api/Tsetmc/AllSymbols.php?key=KEY&type=1
"""
import scrapy
import json
import logging
from datetime import datetime
from tsetmc_scraper.items import CompanyItem, FinancialIndicatorItem

logger = logging.getLogger(__name__)


class InstrumentDetailsSpider(scrapy.Spider):
    """
    Spider to fetch instrument details and financial indicators.
    Single API call returns all company + financial data.
    """
    name = 'instrument_details'
    allowed_domains = ['brsapi.ir', 'BrsApi.ir']

    custom_settings = {
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 0,
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.count = 0
        self.today = int(datetime.now().strftime('%Y%m%d'))

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Instrument Details Spider at {datetime.now()}")
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
        Parse BrsApi AllSymbols JSON response for company + financial data.

        Fields used:
          Company: id (ins_code), l18 (symbol), l30 (name_fa), isin, cs (sector)
          Financial: eps, pe, z (total_shares), mv (market_cap),
                     tmin/tmax (thresholds), pc (close price)
        """
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

        logger.info(f"Received {len(data)} symbols from BrsApi")

        for item in data:
            try:
                ins_code = int(item['id'])

                # --- Company Item ---
                company = CompanyItem()
                company['item_type'] = 'company'
                company['ins_code'] = ins_code
                company['symbol'] = item.get('l18', '')
                company['name_fa'] = item.get('l30', '')
                company['name_en'] = None
                company['isin'] = item.get('isin', '')
                company['sector_name_fa'] = item.get('cs', '')
                company['sector_name_en'] = None
                company['is_active'] = True

                yield company

                # --- Financial Indicator Item ---
                fi = FinancialIndicatorItem()
                fi['item_type'] = 'financial_indicator'
                fi['ins_code'] = ins_code
                fi['d_even'] = self.today

                fi['eps'] = self._num(item.get('eps'))
                fi['estimated_eps'] = self._num(item.get('eps'))
                fi['pe_ratio'] = self._num(item.get('pe'))
                fi['total_shares'] = self._int(item.get('z'))
                fi['market_cap'] = self._int(item.get('mv'))
                fi['nav'] = None

                fi['min_week'] = None
                fi['max_week'] = None
                fi['min_year'] = None
                fi['max_year'] = None

                fi['price_threshold_min'] = self._num(item.get('tmin'))
                fi['price_threshold_max'] = self._num(item.get('tmax'))

                yield fi
                self.count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping symbol: {e}")
                continue

        logger.info(f"Parsed {self.count} instruments")

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
        logger.error(f"URL: {failure.request.url}")

    def closed(self, reason):
        logger.info("=" * 80)
        logger.info(f"Instrument Details Spider closed: {reason}")
        logger.info(f"Processed {self.count} instruments")
        logger.info(f"Completed at {datetime.now()}")
        logger.info("=" * 80)
