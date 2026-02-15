"""
Historical Prices Spider
Fetches historical price data for instruments.

Flow:
  1. DB query -> ISIN-to-BrsApi ins_code mapping (from companies table)
  2. members.tsetmc.com MarketWatchInit -> instrument list with TSETMC ins_codes + ISINs
  3. cdn.tsetmc.com ClosingPriceDailyList -> historical JSON per instrument
"""
import scrapy
import json
import logging
from datetime import datetime
from tsetmc_scraper.items import DailyPriceItem
from database.connection import get_db_manager
from database.models import Company
from config.settings import DATABASE_URL

logger = logging.getLogger(__name__)

CDN_BASE = 'https://cdn.tsetmc.com/api'
MWI_URL = 'https://members.tsetmc.com/tsev2/data/MarketWatchInit.aspx?h=0&r=0'


class HistoricalPricesSpider(scrapy.Spider):
    """
    Spider to fetch historical price data for all instruments.
    Uses members.tsetmc.com for instrument list, cdn.tsetmc.com for historical JSON.
    Maps TSETMC ins_codes to BrsApi ins_codes via ISIN for DB consistency.
    """
    name = 'historical_prices'
    allowed_domains = ['members.tsetmc.com', 'cdn.tsetmc.com']

    custom_settings = {
        'CONCURRENT_REQUESTS': 4,
        'DOWNLOAD_DELAY': 0.5,
    }

    def __init__(self, ins_codes=None, symbols=None, *args, **kwargs):
        """
        Args:
            ins_codes: Comma-separated BrsApi InsCodes (optional).
            symbols: Comma-separated symbols to fetch (optional).
        """
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

        # Build ISIN mapping from DB (no network call needed)
        self._load_isin_mapping()

    def _load_isin_mapping(self):
        """Load ISIN -> BrsApi ins_code mapping from the companies table."""
        try:
            db_manager = get_db_manager(DATABASE_URL)
            session = db_manager.get_scoped_session()
            companies = session.query(Company).filter(Company.isin.isnot(None)).all()
            for c in companies:
                if c.isin:
                    self.isin_to_brsapi[c.isin] = c.ins_code
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
            # Get TSETMC instrument list from MarketWatchInit
            # Bypass system proxy for TSETMC (it works directly, proxy blocks it)
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
        """Step 2: Parse MarketWatchInit to get TSETMC ins_codes with ISINs."""
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

            # Find matching BrsApi ins_code via ISIN
            brsapi_ins_code = self.isin_to_brsapi.get(isin)
            if not brsapi_ins_code:
                continue

            # Filter by symbol if specified
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
        """
        Parse cdn.tsetmc.com ClosingPriceDailyList JSON response.

        Fields: dEven, priceFirst, priceMax, priceMin, pClosing (close),
                pDrCotVal (last), priceYesterday, priceChange,
                zTotTran (trades), qTotTran5J (volume), qTotCap (value)
        """
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

        # Records come newest-first, reverse for chronological processing
        records.reverse()
        count = 0

        for rec in records:
            try:
                close_price = float(rec.get('pClosing', 0))
                yesterday = float(rec.get('priceYesterday', 0))

                item = DailyPriceItem()
                item['item_type'] = 'daily_price'
                item['ins_code'] = brsapi_ins_code
                item['d_even'] = int(rec.get('dEven', 0))
                item['price_first'] = float(rec.get('priceFirst', 0))
                item['price_last'] = close_price
                item['price_min'] = float(rec.get('priceMin', 0))
                item['price_max'] = float(rec.get('priceMax', 0))
                item['price_yesterday'] = yesterday
                item['q_tot_tran_5j'] = int(float(rec.get('qTotTran5J', 0)))
                item['q_tot_cap'] = int(float(rec.get('qTotCap', 0)))
                item['z_tot_tran'] = int(float(rec.get('zTotTran', 0)))
                item['adj_close'] = close_price

                # Calculate change from data
                price_change = float(rec.get('priceChange', 0))
                item['price_change'] = price_change
                if yesterday and yesterday > 0:
                    item['price_change_percent'] = round(
                        (price_change / yesterday) * 100, 2
                    )
                else:
                    item['price_change_percent'] = 0

                yield item
                count += 1

            except (ValueError, TypeError, KeyError) as e:
                logger.debug(f"Skipping record for {symbol}: {e}")
                continue

        self.count += count
        logger.info(f"Parsed {count} historical records for {symbol}")

    def _request_history_direct(self, brsapi_ins_code):
        """Direct mode: search CDN for the instrument and fetch history."""
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
