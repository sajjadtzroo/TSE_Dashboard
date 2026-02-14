"""
Instrument Details Spider
Fetches company metadata and financial indicators for all instruments
Runs daily to update company information
"""
import scrapy
import json
import logging
from datetime import datetime
from tsetmc_scraper.items import CompanyItem, FinancialIndicatorItem

logger = logging.getLogger(__name__)


class InstrumentDetailsSpider(scrapy.Spider):
    """
    Spider to fetch instrument details and financial indicators
    This spider first gets the list of all instruments, then fetches details for each
    """
    name = 'instrument_details'
    allowed_domains = ['tsetmc.com']

    custom_settings = {
        'CONCURRENT_REQUESTS': 8,
        'DOWNLOAD_DELAY': 0.3,
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.instruments = []
        self.today = int(datetime.now().strftime('%Y%m%d'))

    def start_requests(self):
        """Get list of all instruments first"""
        logger.info("="*80)
        logger.info(f"Starting Instrument Details Spider at {datetime.now()}")
        logger.info("="*80)

        # First, get list of all instruments
        url = 'http://tsetmc.com/api/ClosingPrice/GetClosingPriceDailyAllInst'
        yield scrapy.Request(
            url=url,
            callback=self.parse_instrument_list,
            errback=self.handle_error,
            meta={'source': 'instrument_list'}
        )

    def parse_instrument_list(self, response):
        """Parse instrument list to get all InsCodes"""
        try:
            data = json.loads(response.text)
            instruments = data.get('closingPriceDaily', [])

            logger.info(f"Found {len(instruments)} instruments")

            # Extract unique InsCodes
            for instrument in instruments:
                ins_code = instrument.get('insCode')
                if ins_code:
                    self.instruments.append(ins_code)

                    # Also create basic company item from this data
                    # (will be updated with more details later)
                    company_item = CompanyItem()
                    company_item['item_type'] = 'company'
                    company_item['ins_code'] = ins_code
                    company_item['symbol'] = instrument.get('lVal18AFC', '')  # Symbol
                    company_item['name_fa'] = instrument.get('lVal30', '')  # Persian name
                    company_item['name_en'] = None
                    company_item['isin'] = None
                    company_item['sector_name_fa'] = None
                    company_item['sector_name_en'] = None
                    company_item['is_active'] = True

                    yield company_item

            logger.info(f"Requesting details for {len(self.instruments)} instruments")

            # Now fetch detailed info for each instrument
            for ins_code in self.instruments:
                yield scrapy.Request(
                    url=f'http://tsetmc.com/api/Instrument/GetInstrumentInfo/{ins_code}',
                    callback=self.parse_instrument_details,
                    errback=self.handle_error,
                    meta={'ins_code': ins_code},
                    dont_filter=True
                )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from instrument list: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in parse_instrument_list: {e}", exc_info=True)

    def parse_instrument_details(self, response):
        """
        Parse detailed instrument information

        Expected JSON structure:
        {
            "instrumentInfo": {
                "insCode": 12345678901234567,
                "instrumentID": "IRO1ABCD0001",
                "lVal18AFC": "SYMBOL",
                "lVal30": "Persian Name",
                "cSocCSAC": "Sector Name",
                "pClosing": 1000,
                "priceYesterday": 950,
                "totalNumberOfSharesIssued": 1000000000,
                "estimatedEPS": 100,
                "eps": 95,
                "pE": 10.5,
                "nav": 500,
                "pNavF": 2.0,
                "zTitad": 5000,
                "qTotTran5J": 1000000,
                ...
            }
        }
        """
        ins_code = response.meta['ins_code']

        try:
            data = json.loads(response.text)
            info = data.get('instrumentInfo', {})

            if not info:
                logger.warning(f"No info returned for instrument {ins_code}")
                return

            # Update company item with detailed information
            company_item = CompanyItem()
            company_item['item_type'] = 'company'
            company_item['ins_code'] = ins_code
            company_item['symbol'] = info.get('lVal18AFC', '')
            company_item['name_fa'] = info.get('lVal30', '')
            company_item['name_en'] = info.get('lVal18', '')  # English name if available
            company_item['isin'] = info.get('instrumentID', '')  # ISIN code
            company_item['sector_name_fa'] = info.get('cSocCSAC', '')  # Sector
            company_item['sector_name_en'] = None
            company_item['is_active'] = True

            yield company_item

            # Create financial indicator item
            financial_item = FinancialIndicatorItem()
            financial_item['item_type'] = 'financial_indicator'
            financial_item['ins_code'] = ins_code
            financial_item['d_even'] = self.today

            # Valuation metrics
            financial_item['pe_ratio'] = info.get('pE')
            financial_item['eps'] = info.get('eps')
            financial_item['estimated_eps'] = info.get('estimatedEPS')
            financial_item['nav'] = info.get('nav')

            # Calculate market cap
            total_shares = info.get('totalNumberOfSharesIssued')
            closing_price = info.get('pClosing')
            if total_shares and closing_price:
                financial_item['market_cap'] = total_shares * closing_price
            else:
                financial_item['market_cap'] = None

            financial_item['total_shares'] = total_shares

            # Price ranges (if available)
            financial_item['min_week'] = info.get('priceMin52Week')
            financial_item['max_week'] = info.get('priceMax52Week')
            financial_item['min_year'] = info.get('priceMinYear')
            financial_item['max_year'] = info.get('priceMaxYear')

            # Price thresholds (daily limits)
            financial_item['price_threshold_min'] = info.get('pMin')
            financial_item['price_threshold_max'] = info.get('pMax')

            yield financial_item

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON for instrument {ins_code}: {e}")
        except Exception as e:
            logger.error(f"Error parsing details for {ins_code}: {e}", exc_info=True)

    def handle_error(self, failure):
        """Handle request errors"""
        logger.error(f"Request failed: {failure.value}")
        logger.error(f"URL: {failure.request.url}")

    def closed(self, reason):
        """Called when spider closes"""
        logger.info("="*80)
        logger.info(f"Instrument Details Spider closed: {reason}")
        logger.info(f"Processed {len(self.instruments)} instruments")
        logger.info(f"Completed at {datetime.now()}")
        logger.info("="*80)
