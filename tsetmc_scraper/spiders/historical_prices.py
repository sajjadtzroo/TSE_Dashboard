"""
Historical Prices Spider
Fetches historical price data for instruments.
Uses BrsApi.ir for instrument list, old.tsetmc.com for historical CSV data.

Endpoints:
  - BrsApi AllSymbols.php    -> instrument list (when no ins_codes given)
  - old.tsetmc.com Export-txt.aspx -> historical CSV per instrument
"""
import scrapy
import json
import logging
from datetime import datetime
from tsetmc_scraper.items import DailyPriceItem

logger = logging.getLogger(__name__)

TSETMC_BASE = 'https://old.tsetmc.com/tsev2/data'


class HistoricalPricesSpider(scrapy.Spider):
    """
    Spider to fetch historical price data for all instruments.
    Can be run with specific InsCodes or fetch all instruments.
    """
    name = 'historical_prices'
    allowed_domains = ['old.tsetmc.com', 'brsapi.ir', 'BrsApi.ir']

    custom_settings = {
        'CONCURRENT_REQUESTS': 4,
        'DOWNLOAD_DELAY': 1.0,
    }

    def __init__(self, ins_codes=None, *args, **kwargs):
        """
        Args:
            ins_codes: Comma-separated list of InsCodes to fetch (optional).
                       If not provided, will fetch all instruments from BrsApi.
        """
        super().__init__(*args, **kwargs)

        if ins_codes:
            self.instruments = [int(code.strip()) for code in ins_codes.split(',')]
            logger.info(f"Will fetch history for {len(self.instruments)} specified instruments")
        else:
            self.instruments = []
            logger.info("Will fetch history for all instruments")

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Historical Prices Spider at {datetime.now()}")
        logger.info("=" * 80)

        if not self.instruments:
            # Get instrument list from BrsApi
            base_url = self.settings.get('BRSAPI_BASE_URL', 'https://BrsApi.ir/Api/Tsetmc')
            api_key = self.settings.get('BRSAPI_KEY', '')
            url = f'{base_url}/AllSymbols.php?key={api_key}&type=1'
            yield scrapy.Request(
                url=url,
                callback=self.parse_instrument_list,
                errback=self.handle_error,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
            )
        else:
            for ins_code in self.instruments:
                yield from self.request_history(ins_code)

    def parse_instrument_list(self, response):
        """Parse BrsApi AllSymbols to get instrument IDs."""
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

        logger.info(f"Found {len(data)} instruments from BrsApi")

        for item in data:
            try:
                ins_code = int(item['id'])
                self.instruments.append(ins_code)
                yield from self.request_history(ins_code)
            except (KeyError, ValueError, TypeError):
                continue

    def request_history(self, ins_code):
        """Request historical CSV data from old.tsetmc.com."""
        yield scrapy.Request(
            url=f'{TSETMC_BASE}/Export-txt.aspx?i={ins_code}&t=i',
            callback=self.parse_historical_data,
            errback=self.handle_error,
            meta={'ins_code': ins_code},
            dont_filter=True,
            headers={
                'Referer': 'https://old.tsetmc.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        )

    def parse_historical_data(self, response):
        """
        Parse Export-txt.aspx CSV response.

        Header: <TICKER>,<DTYYYYMMDD>,<FIRST>,<HIGH>,<LOW>,<CLOSE>,<VALUE>,<VOL>,<OPENINT>,<PER>,<OPEN>,<LAST>

        Column mapping:
          [1] date    [2] first   [3] high    [4] low
          [5] close   [6] value   [7] volume  [8] trade count
        """
        ins_code = response.meta['ins_code']

        try:
            lines = response.text.strip().split('\n')
            if len(lines) < 2:
                logger.warning(f"No historical data for instrument {ins_code}")
                return

            data_lines = lines[1:]
            logger.info(f"Received {len(data_lines)} historical records for {ins_code}")

            # Process oldest first so we can track previous close
            data_lines.reverse()
            prev_close = None
            count = 0

            for line in data_lines:
                line = line.strip()
                if not line:
                    continue
                fields = line.split(',')
                if len(fields) < 9:
                    continue

                try:
                    close_price = self._to_float(fields[5])

                    item = DailyPriceItem()
                    item['item_type'] = 'daily_price'
                    item['ins_code'] = ins_code
                    item['d_even'] = int(fields[1])
                    item['price_first'] = self._to_float(fields[2])
                    item['price_last'] = close_price
                    item['price_min'] = self._to_float(fields[4])
                    item['price_max'] = self._to_float(fields[3])
                    item['q_tot_cap'] = self._to_int(fields[6])
                    item['q_tot_tran_5j'] = self._to_int(fields[7])
                    item['z_tot_tran'] = self._to_int(fields[8])
                    item['adj_close'] = close_price

                    if prev_close and prev_close > 0:
                        item['price_yesterday'] = prev_close
                        item['price_change'] = close_price - prev_close
                        item['price_change_percent'] = round(
                            ((close_price - prev_close) / prev_close) * 100, 2
                        )
                    else:
                        item['price_yesterday'] = 0
                        item['price_change'] = 0
                        item['price_change_percent'] = 0

                    prev_close = close_price
                    yield item
                    count += 1

                except (ValueError, IndexError) as e:
                    logger.debug(f"Skipping row for {ins_code}: {e}")
                    continue

            logger.info(f"Parsed {count} historical records for {ins_code}")

        except Exception as e:
            logger.error(f"Error parsing history for {ins_code}: {e}", exc_info=True)

    @staticmethod
    def _to_float(val):
        try:
            return float(val) if val and val.strip() else 0
        except (ValueError, TypeError):
            return 0

    @staticmethod
    def _to_int(val):
        try:
            return int(float(val)) if val and val.strip() else 0
        except (ValueError, TypeError):
            return 0

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")
        logger.error(f"URL: {failure.request.url}")

    def closed(self, reason):
        logger.info("=" * 80)
        logger.info(f"Historical Prices Spider closed: {reason}")
        logger.info(f"Processed {len(self.instruments)} instruments")
        logger.info(f"Completed at {datetime.now()}")
        logger.info("=" * 80)
