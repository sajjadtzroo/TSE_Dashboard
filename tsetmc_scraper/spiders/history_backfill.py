"""
History Backfill Spider
Fetches historical OHLCV data via BrsApi.ir History endpoint for all securities.
Upserts into daily_ohlcv via the standard pipeline.

Endpoint: https://BrsApi.ir/Api/Tsetmc/History.php?key=KEY&id=INS_CODE
Response: [{date, pf, pmax, pmin, pc, pl, py, tno, tvol, tval}, ...]

Usage:
  scrapy crawl history_backfill
  scrapy crawl history_backfill -a symbols=FOLD1,TAPICO
  scrapy crawl history_backfill -a limit=10
"""

import json
import logging
from datetime import date, datetime

import scrapy

from config.settings import DATABASE_URL
from database.connection import get_db_manager
from database.models import DailyOHLCV, Security
from tsetmc_scraper.items import DailyPriceItem
from tsetmc_scraper.utils import BROWSER_UA, num, to_int

logger = logging.getLogger(__name__)


class HistoryBackfillSpider(scrapy.Spider):
    name = "history_backfill"
    allowed_domains = ["brsapi.ir", "BrsApi.ir"]

    custom_settings = {
        "CONCURRENT_REQUESTS": 2,
        "DOWNLOAD_DELAY": 1,
        "RETRY_TIMES": 3,
        "RETRY_HTTP_CODES": [500, 502, 503, 504, 408, 429],
    }

    def __init__(self, symbols=None, limit=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.target_symbols = None
        self.limit = None
        self.total_records = 0
        self.total_instruments = 0
        # Track existing dates per security to skip known data
        self.existing_dates = {}

        if symbols:
            self.target_symbols = [s.strip() for s in symbols.split(",")]
        if limit:
            self.limit = int(limit)

    def _load_securities(self):
        """Load securities with ins_code from DB"""
        db = get_db_manager(DATABASE_URL)
        session = db.get_scoped_session()
        try:
            query = session.query(Security).filter(
                Security.ins_code.isnot(None),
                Security.is_active == True,
                Security.market_type == "tse",
            )
            if self.target_symbols:
                query = query.filter(Security.symbol.in_(self.target_symbols))
            securities = query.order_by(Security.symbol).all()
            result = [(s.ins_code, s.symbol, s.security_id) for s in securities]

            # Batch-load all existing dates in a single query (avoids N+1)
            sec_ids = [sec_id for _, _, sec_id in result]
            if sec_ids:
                rows = (
                    session.query(DailyOHLCV.security_id, DailyOHLCV.date)
                    .filter(DailyOHLCV.security_id.in_(sec_ids))
                    .all()
                )
                for sec_id, d in rows:
                    self.existing_dates.setdefault(sec_id, set()).add(d)

            return result
        finally:
            session.close()

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting History Backfill Spider at {datetime.now()}")
        logger.info("=" * 80)

        api_key = self.settings.get("BRSAPI_KEY", "")
        securities = self._load_securities()

        if self.limit:
            securities = securities[: self.limit]

        logger.info(f"Will backfill {len(securities)} instruments")

        for ins_code, symbol, sec_id in securities:
            url = (
                f"https://BrsApi.ir/Api/Tsetmc/History.php?key={api_key}&id={ins_code}"
            )
            yield scrapy.Request(
                url=url,
                callback=self.parse_history,
                errback=self.handle_error,
                headers={"User-Agent": BROWSER_UA},
                meta={
                    "ins_code": ins_code,
                    "symbol": symbol,
                    "security_id": sec_id,
                },
            )

    def parse_history(self, response):
        ins_code = response.meta["ins_code"]
        symbol = response.meta["symbol"]
        sec_id = response.meta["security_id"]
        existing = self.existing_dates.get(sec_id, set())

        try:
            raw = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON for {symbol}: {e}")
            return

        # Handle envelope format
        if isinstance(raw, dict):
            if not raw.get("successful", True):
                logger.warning(f"API error for {symbol}: {raw.get('message_error')}")
                return
            data = raw.get("data", raw)
            if isinstance(data, dict):
                data = [data]
        elif isinstance(raw, list):
            data = raw
        else:
            logger.error(f"Unexpected response type for {symbol}: {type(raw)}")
            return

        if not data:
            logger.debug(f"No history data for {symbol}")
            return

        count = 0
        skipped = 0

        for rec in data:
            try:
                # Parse date - could be YYYYMMDD int or YYYY/MM/DD string
                date_raw = rec.get("date") or rec.get("dEven")
                if date_raw is None:
                    continue

                rec_date = self._parse_date(date_raw)
                if rec_date is None:
                    continue

                # Skip if we already have data for this date
                if rec_date in existing:
                    skipped += 1
                    continue

                close = num(rec.get("pc") or rec.get("pClosing"))
                if not close:
                    continue

                yesterday = num(rec.get("py") or rec.get("priceYesterday"))

                item = DailyPriceItem()
                item["item_type"] = "daily_price"
                item["ins_code"] = ins_code
                item["date"] = rec_date
                item["open"] = num(rec.get("pf") or rec.get("priceFirst"))
                item["high"] = num(rec.get("pmax") or rec.get("priceMax"))
                item["low"] = num(rec.get("pmin") or rec.get("priceMin"))
                item["close"] = close
                item["last"] = num(rec.get("pl") or rec.get("pDrCotVal"))
                item["volume"] = to_int(rec.get("tvol") or rec.get("qTotTran5J"))
                item["value"] = to_int(rec.get("tval") or rec.get("qTotCap"))
                item["trades"] = to_int(rec.get("tno") or rec.get("zTotTran"))
                item["adj_close"] = close
                item["price_yesterday"] = yesterday

                change = num(rec.get("pcc") or rec.get("priceChange"))
                if change is not None:
                    item["close_change"] = change
                elif yesterday and close:
                    item["close_change"] = round(close - yesterday, 2)

                pcp = num(rec.get("pcp"))
                if pcp is not None:
                    item["close_change_pct"] = pcp
                elif yesterday and yesterday > 0 and close:
                    item["close_change_pct"] = round(
                        ((close - yesterday) / yesterday) * 100, 2
                    )

                yield item
                count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping record for {symbol}: {e}")
                continue

        self.total_records += count
        self.total_instruments += 1
        if count > 0:
            logger.info(f"{symbol}: {count} new records (skipped {skipped} existing)")

    @staticmethod
    def _parse_date(val):
        """Parse various date formats to a date object"""
        if isinstance(val, date):
            return val
        if isinstance(val, (int, float)):
            d_str = str(int(val))
            if len(d_str) == 8:
                return date(int(d_str[:4]), int(d_str[4:6]), int(d_str[6:8]))
            return None
        if isinstance(val, str):
            val = val.strip().replace("/", "-")
            for fmt in ("%Y-%m-%d", "%Y%m%d"):
                try:
                    return datetime.strptime(val, fmt).date()
                except ValueError:
                    continue
        return None

    def handle_error(self, failure):
        symbol = failure.request.meta.get("symbol", "?")
        logger.error(f"Request failed for {symbol}: {failure.value}")

    def closed(self, reason):
        logger.info("=" * 80)
        logger.info(f"History Backfill Spider closed: {reason}")
        logger.info(
            f"Total: {self.total_records} new records across {self.total_instruments} instruments"
        )
        logger.info(f"Completed at {datetime.now()}")
        logger.info("=" * 80)
