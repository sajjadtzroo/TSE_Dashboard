"""
Shareholders Spider
Fetches major shareholder data per-symbol from BrsApi.ir Shareholder endpoint.
Supports historical backfill via -a date= (Shamsi date).

Endpoint: https://BrsApi.ir/Api/Tsetmc/Shareholder.php?key=KEY&l18=SYMBOL[&date=SHAMSI_DATE]

API response fields: name, volume, percent, change
(No ins_code in response -- we carry it from the securities DB query.)
"""

import json
import logging
from datetime import datetime

from config.settings import DATABASE_URL
from database.connection import get_db_manager
from database.models import Security
from tsetmc_scraper.items import ShareholderItem
from tsetmc_scraper.spiders.base import BrsApiSpider
from tsetmc_scraper.utils import num, to_int

logger = logging.getLogger(__name__)


class ShareholdersSpider(BrsApiSpider):
    name = "shareholders"
    concurrent_requests = 4
    download_delay = 0.5

    def __init__(self, symbol=None, date=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.target_symbol = symbol
        self.target_date = date  # Shamsi date string

    def start_requests(self):
        self.log_start_banner()

        if self.target_symbol:
            # Single symbol mode -- look up ins_code from DB
            securities = self._get_all_securities()
            sec_map = {s[0]: s[1] for s in securities}
            ins_code = sec_map.get(self.target_symbol)
            securities_to_fetch = [(self.target_symbol, ins_code)]
        else:
            securities_to_fetch = self._get_all_securities()

        logger.info(f"Fetching shareholders for {len(securities_to_fetch)} symbols")

        for sym, ins_code in securities_to_fetch:
            url = self.brsapi_url("Tsetmc/Shareholder.php") + f"&l18={sym}"
            if self.target_date:
                url += f"&date={self.target_date}"
            yield self.make_request(
                url,
                self.parse,
                cb_kwargs={"symbol": sym, "ins_code": ins_code},
            )

    def _get_all_securities(self):
        """Return list of (symbol, ins_code) tuples for active TSE securities."""
        try:
            db_manager = get_db_manager(DATABASE_URL)
            with db_manager.get_session() as session:
                rows = (
                    session.query(Security.symbol, Security.ins_code)
                    .filter(
                        Security.is_active == True,
                        Security.market_type == "tse",
                        Security.ins_code.isnot(None),
                    )
                    .all()
                )
                return [(r[0], r[1]) for r in rows]
        except Exception as e:
            logger.error(f"Could not load securities: {e}")
            return []

    def parse(self, response, symbol, ins_code):
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

        for rec in data:
            try:
                item = ShareholderItem()
                item["item_type"] = "shareholder"
                # ins_code comes from our DB -- the API does not return a valid ins_code.
                # rec.get("id") is a small shareholder-entity ID, not a 14-digit ins_code.
                item["ins_code"] = ins_code
                item["symbol"] = symbol
                item["date"] = today
                item["shareholder_id"] = rec.get("shareholder_id") or rec.get("sh_id") or rec.get("id")
                item["name"] = rec.get("name") or rec.get("sh_name")
                item["volume"] = to_int(rec.get("volume") or rec.get("shares"))
                item["percent"] = num(rec.get("percent") or rec.get("pct"))
                item["change"] = to_int(rec.get("change"))

                if item["name"]:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping shareholder record for {symbol}: {e}")
                continue

        logger.debug(f"Parsed {count} shareholder items for {symbol}")

    def handle_error(self, failure):
        logger.debug(f"Request failed: {failure.value}")
