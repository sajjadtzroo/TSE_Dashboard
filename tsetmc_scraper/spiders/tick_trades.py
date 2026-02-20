"""
Tick Trades Spider
Fetches individual trade data per-symbol from BrsApi.ir Transaction endpoint.
Supports historical backfill via -a date= (Shamsi date).

Endpoint: https://BrsApi.ir/Api/Tsetmc/Transaction.php?key=KEY&l18=SYMBOL[&date=SHAMSI_DATE]
"""

import json
import logging
from datetime import datetime

from config.settings import DATABASE_URL
from database.connection import get_db_manager
from database.models import Security
from tsetmc_scraper.items import TickTradeItem
from tsetmc_scraper.spiders.base import BrsApiSpider
from tsetmc_scraper.utils import num, to_int

logger = logging.getLogger(__name__)


class TickTradesSpider(BrsApiSpider):
    name = "tick_trades"
    concurrent_requests = 4
    download_delay = 0.5

    def __init__(self, symbol=None, date=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.target_symbol = symbol
        self.target_date = date  # Shamsi date string

    def start_requests(self):
        self.log_start_banner()

        api_key = self.settings.get("BRSAPI_KEY", "")

        if self.target_symbol:
            symbols = [self.target_symbol]
        else:
            symbols = self._get_all_symbols()

        logger.info(f"Fetching tick trades for {len(symbols)} symbols")

        for sym in symbols:
            url = (
                f"https://BrsApi.ir/Api/Tsetmc/Transaction.php?key={api_key}&l18={sym}"
            )
            if self.target_date:
                url += f"&date={self.target_date}"
            yield self.make_request(
                url,
                self.parse,
                cb_kwargs={"symbol": sym},
            )

    def _get_all_symbols(self):
        try:
            db_manager = get_db_manager(DATABASE_URL)
            with db_manager.get_session() as session:
                rows = (
                    session.query(Security.symbol)
                    .filter(
                        Security.is_active == True,
                        Security.market_type == "tse",
                        Security.ins_code.isnot(None),
                    )
                    .all()
                )
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
            if not raw.get("successful"):
                logger.debug(
                    f"API unsuccessful for {symbol}: {raw.get('message_error')}"
                )
                return
            data = raw.get("data", [])
        elif isinstance(raw, list):
            data = raw
        else:
            return

        today = datetime.now().date()
        count = 0

        # Get ins_code from first record if available
        ins_code = None
        if data:
            ins_code = data[0].get("id") or data[0].get("ins_code")

        for idx, rec in enumerate(data):
            try:
                item = TickTradeItem()
                item["item_type"] = "tick_trade"
                item["ins_code"] = to_int(
                    ins_code or rec.get("id") or rec.get("ins_code")
                )
                item["symbol"] = symbol
                item["date"] = today
                item["row_num"] = to_int(rec.get("nTran") or rec.get("row")) or (
                    idx + 1
                )
                item["time"] = rec.get("hEven") or rec.get("time")
                item["price"] = num(
                    rec.get("qTotTran5J") or rec.get("price") or rec.get("pl")
                )
                item["volume"] = to_int(
                    rec.get("qTitTran") or rec.get("volume") or rec.get("tvol")
                )
                item["canceled"] = bool(rec.get("canceled", False))

                if item["ins_code"]:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping tick trade for {symbol}: {e}")
                continue

        if count > 0:
            logger.debug(f"Parsed {count} tick trades for {symbol}")

    def handle_error(self, failure):
        logger.debug(f"Request failed: {failure.value}")
