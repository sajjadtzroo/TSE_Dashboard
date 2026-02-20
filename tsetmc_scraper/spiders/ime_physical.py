"""
IME Physical Trades Spider
Fetches physical commodity trade data from BrsApi.ir IME Physical endpoint.
Supports date range for historical backfill via -a date_start= -a date_end=

Endpoint: https://BrsApi.ir/Api/IME/Physical.php?key=KEY[&date_start=X&date_end=Y]
"""

import logging
from datetime import datetime

from tsetmc_scraper.items import IMEPhysicalTradeItem
from tsetmc_scraper.spiders.base import BrsApiSpider
from tsetmc_scraper.utils import to_int

logger = logging.getLogger(__name__)


class IMEPhysicalSpider(BrsApiSpider):
    name = "ime_physical"

    def __init__(self, date_start=None, date_end=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.date_start = date_start
        self.date_end = date_end

    def start_requests(self):
        self.log_start_banner()

        url = self.brsapi_url("IME/Physical.php")
        if self.date_start:
            url += f"&date_start={self.date_start}"
        if self.date_end:
            url += f"&date_end={self.date_end}"

        yield self.make_request(url, self.parse)

    def parse(self, response):
        data = self.unwrap_envelope(response.text, label="ime_physical")
        if data is None:
            return

        today = datetime.now().date()
        count = 0

        logger.info(f"Received {len(data)} IME physical trade records")

        for rec in data:
            try:
                item = IMEPhysicalTradeItem()
                item["item_type"] = "ime_physical"

                # Parse trade date from API or use today
                date_str = rec.get("date_trade") or rec.get("date")
                if date_str:
                    item["date_trade_shamsi"] = str(date_str)
                    # Try to parse Gregorian date if available
                    greg = rec.get("date_trade_miladi") or rec.get("date_miladi")
                    if greg:
                        try:
                            item["date_trade"] = datetime.strptime(
                                str(greg)[:10], "%Y-%m-%d"
                            ).date()
                        except (ValueError, TypeError):
                            item["date_trade"] = today
                    else:
                        item["date_trade"] = today
                else:
                    item["date_trade"] = today
                    item["date_trade_shamsi"] = None

                item["symbol"] = rec.get("symbol") or rec.get("l18")
                item["name"] = rec.get("name") or rec.get("l30")
                item["category_id"] = to_int(rec.get("category_id"))
                item["code_offer"] = rec.get("code_offer", "")
                item["market_hall"] = rec.get("market_hall")
                item["producer"] = rec.get("producer")
                item["supplier"] = rec.get("supplier")
                item["broker"] = rec.get("broker")
                item["contract_type"] = rec.get("contract_type")
                item["settlement_type"] = rec.get("settlement_type")
                item["date_settlement"] = rec.get("date_settlement")
                item["date_delivery"] = rec.get("date_delivery")
                item["location_delivery"] = rec.get("location_delivery")
                item["price_base_offer"] = to_int(rec.get("price_base_offer"))
                item["price_min"] = to_int(rec.get("price_min"))
                item["price_max"] = to_int(rec.get("price_max"))
                item["price_last"] = to_int(rec.get("price_last"))
                item["volume_offer"] = to_int(rec.get("volume_offer"))
                item["volume_contract"] = to_int(rec.get("volume_contract"))
                item["demand"] = to_int(rec.get("demand"))
                item["value"] = to_int(rec.get("value"))
                item["currency"] = rec.get("currency")
                item["packaging_type"] = rec.get("packaging_type")
                item["unit"] = rec.get("unit")

                if item["code_offer"]:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping IME physical record: {e}")
                continue

        logger.info(f"Parsed {count} IME physical trade items")
