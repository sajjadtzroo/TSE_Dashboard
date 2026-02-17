"""
Options Spider
Fetches options contracts from TSETMC Market Watch page.
Parses call/put contracts with strike price, expiry, and order book data.

Endpoint: https://old.tsetmc.com/tsev2/data/MarketWatchInit.aspx?h=0&r=0
- Section 2 (split by ';'): instrument records, field[25]=='3A' = options
- Section 3 (split by ';'): 5-level order book per instrument
"""
import re
import scrapy
import logging
from datetime import datetime

from tsetmc_scraper.items import OptionItem
from tsetmc_scraper.utils import num, to_int

logger = logging.getLogger(__name__)


class OptionsSpider(scrapy.Spider):
    name = 'options'
    allowed_domains = ['old.tsetmc.com']

    custom_settings = {
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 0,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
    }

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Options Spider at {datetime.now()}")
        logger.info("=" * 80)

        url = 'https://old.tsetmc.com/tsev2/data/MarketWatchInit.aspx?h=0&r=0'
        yield scrapy.Request(
            url=url,
            callback=self.parse,
            errback=self.handle_error,
            meta={'proxy': ''},  # bypass system proxy for TSETMC
        )

    def parse(self, response):
        text = response.text
        sections = text.split('@')

        if len(sections) < 3:
            logger.error(f"Expected at least 3 sections, got {len(sections)}")
            return

        # Section 2: instruments (index 2), Section 3: order book (index 3)
        instruments_raw = sections[2]
        orderbook_raw = sections[3] if len(sections) > 3 else ''

        # Build order book lookup: ins_code -> list of levels
        ob_map = self._parse_order_book(orderbook_raw)

        # Parse instruments
        today = datetime.now().date()
        count = 0

        for record in instruments_raw.split(';'):
            if not record.strip():
                continue

            fields = record.split(',')
            if len(fields) < 26:
                continue

            # Filter for options: field[25] == '3A'
            if fields[25].strip() != '3A':
                continue

            ins_code_str = fields[0].strip()
            name_fa = fields[3].strip()

            # Parse option name to extract type, underlying, strike, expiry
            option_type, underlying, strike, expiry = self._parse_option_name(name_fa)
            if not option_type:
                logger.debug(f"Could not parse option name: {name_fa}")
                continue

            item = OptionItem()
            item['item_type'] = 'option'
            item['ins_code'] = ins_code_str
            item['isin'] = fields[1].strip() or None
            item['symbol'] = fields[2].strip()
            item['name_fa'] = name_fa
            item['option_type'] = option_type
            item['underlying'] = underlying
            item['strike_price'] = num(strike, 0)
            item['expiry_date'] = expiry
            item['date'] = today

            # OHLCV
            item['close'] = num(fields[5], 0)
            item['last'] = num(fields[6], 0)
            item['yesterday'] = num(fields[7], 0)
            item['trades'] = to_int(fields[8], 0)
            item['volume'] = to_int(fields[9], 0)
            item['value'] = to_int(fields[10], 0)
            item['low'] = num(fields[11], 0)
            item['high'] = num(fields[12], 0)
            item['open'] = num(fields[13], 0)
            item['close_change'] = num(fields[14], 0)
            item['threshold_max'] = num(fields[19], 0)
            item['threshold_min'] = num(fields[20], 0)
            item['base_volume'] = to_int(fields[21], 0)

            # Order book level 1
            ob_levels = ob_map.get(ins_code_str, [])
            if ob_levels:
                lvl = ob_levels[0]  # best bid/ask
                item['bid_count_1'] = to_int(lvl.get('bid_count'), 0)
                item['bid_vol_1'] = to_int(lvl.get('bid_vol'), 0)
                item['bid_price_1'] = num(lvl.get('bid_price'), 0)
                item['ask_count_1'] = to_int(lvl.get('ask_count'), 0)
                item['ask_vol_1'] = to_int(lvl.get('ask_vol'), 0)
                item['ask_price_1'] = num(lvl.get('ask_price'), 0)
            else:
                for f in ['bid_price_1', 'bid_vol_1', 'bid_count_1',
                           'ask_price_1', 'ask_vol_1', 'ask_count_1']:
                    item[f] = None

            yield item
            count += 1

        logger.info(f"Parsed {count} option contracts")

    def _parse_order_book(self, raw):
        """Parse section 3 order book data into a dict keyed by ins_code."""
        ob_map = {}
        if not raw:
            return ob_map

        for record in raw.split(';'):
            if not record.strip():
                continue

            fields = record.split(',')
            # Each record: ins_code, level, bid_count, bid_vol, bid_price,
            #              ask_price, ask_vol, ask_count
            if len(fields) < 8:
                continue

            ins_code = fields[0].strip()
            level_data = {
                'bid_count': fields[2].strip(),
                'bid_vol': fields[3].strip(),
                'bid_price': fields[4].strip(),
                'ask_price': fields[5].strip(),
                'ask_vol': fields[6].strip(),
                'ask_count': fields[7].strip(),
            }

            if ins_code not in ob_map:
                ob_map[ins_code] = []
            ob_map[ins_code].append(level_data)

        return ob_map

    @staticmethod
    def _parse_option_name(name_fa):
        """
        Parse option name like 'اختيارخ اهرم-14000-1404/11/29'
        Returns: (option_type, underlying, strike, expiry) or (None,...) on failure.
        """
        if not name_fa:
            return None, None, None, None

        # Determine call/put
        if 'اختيارخ' in name_fa or 'اختیارخ' in name_fa:
            option_type = 'call'
        elif 'اختيارف' in name_fa or 'اختیارف' in name_fa:
            option_type = 'put'
        else:
            return None, None, None, None

        # Pattern: اختيارخ UNDERLYING-STRIKE-EXPIRY
        # Expiry can be 4-digit year (1404/11/29) or 2-digit (04/11/29)
        match = re.match(
            r'اختي?ار[خف]\s+(.+?)-(\d+)-(\d{2,4}/\d{2}/\d{2})',
            name_fa
        )
        if not match:
            # Try with ی instead of ي
            match = re.match(
                r'اختی?ار[خف]\s+(.+?)-(\d+)-(\d{2,4}/\d{2}/\d{2})',
                name_fa
            )

        if match:
            underlying = match.group(1).strip()
            strike = match.group(2)
            expiry = match.group(3)
            # Normalize 2-digit year to 4-digit (e.g. 04/11/29 -> 1404/11/29)
            if len(expiry.split('/')[0]) == 2:
                expiry = '14' + expiry
            return option_type, underlying, strike, expiry

        return option_type, None, None, None

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")
        logger.error(f"URL: {failure.request.url}")

    def closed(self, reason):
        logger.info("=" * 80)
        logger.info(f"Options Spider closed: {reason}")
        logger.info(f"Completed at {datetime.now()}")
        logger.info("=" * 80)
