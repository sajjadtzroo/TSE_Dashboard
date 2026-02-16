"""
Historical Prices Spider
Fetches historical price data for instruments.

Flow:
  1. DB query -> ISIN-to-BrsApi ins_code mapping (from securities table)
  2. members.tsetmc.com MarketWatchInit -> instrument list with TSETMC ins_codes + ISINs
  3. cdn.tsetmc.com ClosingPriceDailyList -> historical JSON per instrument
"""
import scrapy
import json
import logging
from datetime import datetime, date
from tsetmc_scraper.items import DailyPriceItem
from database.connection import get_db_manager
from database.models import Security
from config.settings import DATABASE_URL

logger = logging.getLogger(__name__)

CDN_BASE = 'https://cdn.tsetmc.com/api'
MWI_URL = 'https://members.tsetmc.com/tsev2/data/MarketWatchInit.aspx?h=0&r=0'


class HistoricalPricesSpider(scrapy.Spider):
    name = 'historical_prices'
    allowed_domains = ['members.tsetmc.com', 'cdn.tsetmc.com']

    custom_settings = {
        'CONCURRENT_REQUESTS': 4,
        'DOWNLOAD_DELAY': 0.5,
    }

    def __init__(self, ins_codes=None, symbols=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.isin_to_brsapi = {}
        self.specific_ins_codes = None
        self.specific_symbols = None
        self.count = 0

        if ins_codes:
            self.specific_ins_codes = [int(c.strip()) for c in ins_codes.split(',')]
            logger.info(f"Will fetch history for {len(self.specific_ins_codes)} specified ins_codes")
        elif symbols:
            self.specific_symbols = [s.strip() for s in symbols.split(',')]
            logger.info(f"Will fetch history for symbols: {self.specific_symbols}")

        self._load_isin_mapping()

    def _load_isin_mapping(self):
        """Load ISIN -> BrsApi ins_code mapping from the securities table."""
        try:
            db_manager = get_db_manager(DATABASE_URL)
            session = db_manager.get_scoped_session()
            securities = session.query(Security).filter(Security.isin.isnot(None)).all()
            for s in securities:
                if s.isin:
                    self.isin_to_brsapi[s.isin] = s.ins_code
            session.close()
            logger.info(f"Loaded ISIN mapping for {len(self.isin_to_brsapi)} instruments from DB")
        except Exception as e:
            logger.error(f"Failed to load ISIN mapping from DB: {e}")

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Historical Prices Spider at {datetime.now()}")
        logger.info("=" * 80)

        if self.specific_ins_codes:
            for ins_code in self.specific_ins_codes:
                yield from self._request_history_direct(ins_code)
        else:
            yield scrapy.Request(
                url=MWI_URL,
                callback=self.parse_market_watch_init,
                errback=self.handle_error,
                meta={'proxy': ''},
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://members.tsetmc.com/',
                },
            )

    def parse_market_watch_init(self, response):
        text = response.text
        sections = text.split('@')

        if len(sections) < 3:
            logger.error(f"MarketWatchInit has {len(sections)} sections, expected >= 3")
            return

        rows = sections[2].split(';')
        logger.info(f"MarketWatchInit has {len(rows)} instruments")

        matched = 0
        for row in rows:
            if not row.strip():
                continue
            fields = row.split(',')
            if len(fields) < 4:
                continue

            tsetmc_ins_code = fields[0].strip()
            isin = fields[1].strip()
            symbol = fields[2].strip()

            brsapi_ins_code = self.isin_to_brsapi.get(isin)
            if not brsapi_ins_code:
                continue

            if self.specific_symbols and symbol not in self.specific_symbols:
                continue

            matched += 1
            yield scrapy.Request(
                url=f'{CDN_BASE}/ClosingPrice/GetClosingPriceDailyList/{tsetmc_ins_code}/0',
                callback=self.parse_historical_json,
                errback=self.handle_error,
                meta={
                    'proxy': '',
                    'brsapi_ins_code': brsapi_ins_code,
                    'tsetmc_ins_code': tsetmc_ins_code,
                    'symbol': symbol,
                },
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            )

        logger.info(f"Matched {matched} instruments (TSETMC <-> BrsApi via ISIN)")

    def parse_historical_json(self, response):
        brsapi_ins_code = response.meta['brsapi_ins_code']
        symbol = response.meta['symbol']

        try:
            data = json.loads(response.text)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse JSON for {symbol}")
            return

        records = data.get('closingPriceDaily', [])
        if not records:
            logger.warning(f"No historical data for {symbol}")
            return

        logger.info(f"Received {len(records)} historical records for {symbol}")
        records.reverse()
        count = 0

        for rec in records:
            try:
                close_price = float(rec.get('pClosing', 0))
                yesterday = float(rec.get('priceYesterday', 0))

                # Convert YYYYMMDD int to date object
                d_even = int(rec.get('dEven', 0))
                d_str = str(d_even)
                if len(d_str) == 8:
                    rec_date = date(int(d_str[:4]), int(d_str[4:6]), int(d_str[6:8]))
                else:
                    continue

                item = DailyPriceItem()
                item['item_type'] = 'daily_price'
                item['ins_code'] = brsapi_ins_code
                item['date'] = rec_date
                item['open'] = float(rec.get('priceFirst', 0))
                item['high'] = float(rec.get('priceMax', 0))
                item['low'] = float(rec.get('priceMin', 0))
                item['close'] = close_price
                item['last'] = float(rec.get('pDrCotVal', 0))
                item['volume'] = int(float(rec.get('qTotTran5J', 0)))
                item['value'] = int(float(rec.get('qTotCap', 0)))
                item['trades'] = int(float(rec.get('zTotTran', 0)))
                item['adj_close'] = close_price

                price_change = float(rec.get('priceChange', 0))
                item['close_change'] = price_change
                item['price_yesterday'] = yesterday
                if yesterday and yesterday > 0:
                    item['close_change_pct'] = round(
                        (price_change / yesterday) * 100, 2
                    )
                else:
                    item['close_change_pct'] = 0

                yield item
                count += 1

            except (ValueError, TypeError, KeyError) as e:
                logger.debug(f"Skipping record for {symbol}: {e}")
                continue

        self.count += count
        logger.info(f"Parsed {count} historical records for {symbol}")

    def _request_history_direct(self, brsapi_ins_code):
        yield scrapy.Request(
            url=f'{CDN_BASE}/ClosingPrice/GetClosingPriceDailyList/{brsapi_ins_code}/0',
            callback=self.parse_historical_json,
            errback=self.handle_error,
            meta={
                'proxy': '',
                'brsapi_ins_code': brsapi_ins_code,
                'tsetmc_ins_code': brsapi_ins_code,
                'symbol': str(brsapi_ins_code),
            },
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        )

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")
        logger.error(f"URL: {failure.request.url}")

    def closed(self, reason):
        logger.info("=" * 80)
        logger.info(f"Historical Prices Spider closed: {reason}")
        logger.info(f"Total historical records: {self.count}")
        logger.info(f"Completed at {datetime.now()}")
        logger.info("=" * 80)
