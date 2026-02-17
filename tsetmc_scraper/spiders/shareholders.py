"""
Shareholders Spider
Fetches major shareholder data per-symbol from BrsApi.ir Shareholder endpoint.
Supports historical backfill via -a date= (Shamsi date).

Endpoint: https://BrsApi.ir/Api/Tsetmc/Shareholder.php?key=KEY&l18=SYMBOL[&date=SHAMSI_DATE]
"""
import scrapy
import json
import logging
from datetime import datetime

from tsetmc_scraper.items import ShareholderItem
from tsetmc_scraper.utils import num, to_int, BROWSER_UA
from database.connection import get_db_manager
from database.models import Security
from config.settings import DATABASE_URL

logger = logging.getLogger(__name__)


class ShareholdersSpider(scrapy.Spider):
    name = 'shareholders'
    allowed_domains = ['brsapi.ir', 'BrsApi.ir']

    custom_settings = {
        'CONCURRENT_REQUESTS': 4,
        'DOWNLOAD_DELAY': 0.5,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
    }

    def __init__(self, symbol=None, date=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.target_symbol = symbol
        self.target_date = date  # Shamsi date string

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Shareholders Spider at {datetime.now()}")
        logger.info("=" * 80)

        api_key = self.settings.get('BRSAPI_KEY', '')

        if self.target_symbol:
            symbols = [self.target_symbol]
        else:
            symbols = self._get_all_symbols()

        logger.info(f"Fetching shareholders for {len(symbols)} symbols")

        for sym in symbols:
            url = f'https://BrsApi.ir/Api/Tsetmc/Shareholder.php?key={api_key}&l18={sym}'
            if self.target_date:
                url += f'&date={self.target_date}'
            yield scrapy.Request(
                url=url,
                callback=self.parse,
                errback=self.handle_error,
                headers={'User-Agent': BROWSER_UA},
                cb_kwargs={'symbol': sym},
            )

    def _get_all_symbols(self):
        try:
            db_manager = get_db_manager(DATABASE_URL)
            with db_manager.get_session() as session:
                rows = session.query(Security.symbol, Security.ins_code).filter(
                    Security.is_active == True,
                    Security.market_type == 'tse',
                    Security.ins_code.isnot(None),
                ).all()
                return [r[0] for r in rows]
        except Exception as e:
            logger.error(f"Could not load symbols: {e}")
            return []

    def parse(self, response, symbol):
        try:
            raw = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON for {symbol}: {e}")
            return

        if isinstance(raw, dict):
            if not raw.get('successful'):
                logger.debug(f"API unsuccessful for {symbol}: {raw.get('message_error')}")
                return
            data = raw.get('data', [])
        elif isinstance(raw, list):
            data = raw
        else:
            return

        today = datetime.now().date()
        count = 0

        for rec in data:
            try:
                item = ShareholderItem()
                item['item_type'] = 'shareholder'
                item['ins_code'] = to_int(rec.get('id') or rec.get('ins_code'))
                item['symbol'] = symbol
                item['date'] = today
                item['shareholder_id'] = rec.get('shareholder_id') or rec.get('sh_id')
                item['name'] = rec.get('name') or rec.get('sh_name')
                item['volume'] = to_int(rec.get('volume') or rec.get('shares'))
                item['percent'] = num(rec.get('percent') or rec.get('pct'))
                item['change'] = to_int(rec.get('change'))

                if item['name']:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping shareholder record for {symbol}: {e}")
                continue

        logger.debug(f"Parsed {count} shareholder items for {symbol}")

    def handle_error(self, failure):
        logger.debug(f"Request failed: {failure.value}")

    def closed(self, reason):
        logger.info(f"Shareholders Spider closed: {reason}")
