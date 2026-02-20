"""
IME Futures Spider
Fetches commodity futures contracts from BrsApi.ir IME Futures endpoint.
Each record is a single futures contract.

Endpoint: https://BrsApi.ir/Api/IME/Futures.php?key=KEY
Response: {code_http, successful, data: [...records...]}
"""

import logging
from datetime import datetime

from tsetmc_scraper.items import IMEFutureItem
from tsetmc_scraper.spiders.base import BrsApiSpider
from tsetmc_scraper.utils import num, to_int

logger = logging.getLogger(__name__)


class IMEFuturesSpider(BrsApiSpider):
    name = "ime_futures"

    def start_requests(self):
        self.log_start_banner()

        url = self.brsapi_url("IME/Futures.php")
        yield self.make_request(url, self.parse)

    def parse(self, response):
        data = self.unwrap_envelope(response.text, label="ime_futures")
        if data is None:
            return

        today = datetime.now().date()
        count = 0

        logger.info(f"Received {len(data)} IME futures records from BrsApi")

        for rec in data:
            try:
                item = IMEFutureItem()
                item["item_type"] = "ime_future"
                item["date"] = today
                item["date_shamsi"] = rec.get("date_update")
                item["contract_code"] = rec.get("contract_code", "")
                item["contract_description"] = rec.get("contract_description")
                item["contract_size"] = to_int(rec.get("contract_size"))
                item["contract_size_unit"] = rec.get("contract_size_unit")
                item["date_end"] = rec.get("date_end")
                item["day_remain"] = to_int(rec.get("day_remain"))
                item["margin_initial"] = to_int(rec.get("margin_initial"))
                item["margin_maintenance"] = to_int(rec.get("margin_maintenance"))
                item["interest_open"] = to_int(rec.get("interest_open"))
                item["interest_open_change"] = to_int(rec.get("interest_openc"))
                item["interest_open_change_pct"] = num(rec.get("interest_openp"))
                item["settlement_price"] = to_int(rec.get("py"))
                item["open"] = to_int(rec.get("pf"))
                item["high"] = to_int(rec.get("pmax"))
                item["low"] = to_int(rec.get("pmin"))
                item["last"] = to_int(rec.get("pl"))
                item["last_change"] = to_int(rec.get("plc"))
                item["last_change_pct"] = num(rec.get("plp"))
                item["instant_settlement"] = num(rec.get("pls"))
                item["trades"] = to_int(rec.get("tno"))
                item["volume"] = to_int(rec.get("tvol"))
                item["value"] = to_int(rec.get("tval"))
                item["real_buy_count"] = to_int(rec.get("Buy_CountI"))
                item["legal_buy_count"] = to_int(rec.get("Buy_CountN"))
                item["real_sell_count"] = to_int(rec.get("Sell_CountI"))
                item["legal_sell_count"] = to_int(rec.get("Sell_CountN"))

                # 3-level order book
                item["bid_price_1"] = to_int(rec.get("pd1"))
                item["bid_vol_1"] = to_int(rec.get("qd1"))
                item["ask_price_1"] = to_int(rec.get("po1"))
                item["ask_vol_1"] = to_int(rec.get("qo1"))
                item["bid_price_2"] = to_int(rec.get("pd2"))
                item["bid_vol_2"] = to_int(rec.get("qd2"))
                item["ask_price_2"] = to_int(rec.get("po2"))
                item["ask_vol_2"] = to_int(rec.get("qo2"))
                item["bid_price_3"] = to_int(rec.get("pd3"))
                item["bid_vol_3"] = to_int(rec.get("qd3"))
                item["ask_price_3"] = to_int(rec.get("po3"))
                item["ask_vol_3"] = to_int(rec.get("qo3"))

                if item["contract_code"]:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping IME futures record: {e}")
                continue

        logger.info(f"Parsed {count} IME futures items")

    def handle_error(self, failure):
        super().handle_error(failure)
        logger.error(f"URL: {failure.request.url}")

    def closed(self, reason):
        logger.info("=" * 80)
        logger.info(f"IME Futures Spider closed: {reason}")
        logger.info(f"Completed at {datetime.now()}")
        logger.info("=" * 80)
