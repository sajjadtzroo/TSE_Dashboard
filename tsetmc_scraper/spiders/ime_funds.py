"""
IME Funds Spider
Fetches commodity fund data from BrsApi.ir IME Fund endpoint.

Endpoint: https://BrsApi.ir/Api/IME/Fund.php?key=KEY
"""

import logging
from datetime import datetime

from tsetmc_scraper.items import IMEFundItem
from tsetmc_scraper.spiders.base import BrsApiSpider
from tsetmc_scraper.utils import num, to_int

logger = logging.getLogger(__name__)


class IMEFundsSpider(BrsApiSpider):
    name = "ime_funds"

    def start_requests(self):
        self.log_start_banner()

        url = self.brsapi_url("IME/Fund.php")
        yield self.make_request(url, self.parse)

    def parse(self, response):
        data = self.unwrap_envelope(response.text, label="ime_funds")
        if data is None:
            return

        today = datetime.now().date()
        count = 0

        logger.info(f"Received {len(data)} IME fund records from BrsApi")

        for rec in data:
            try:
                item = IMEFundItem()
                item["item_type"] = "ime_fund"
                item["date"] = today
                item["date_shamsi"] = rec.get("date_update")
                item["isin"] = rec.get("isin", "")
                item["symbol"] = rec.get("l18") or rec.get("symbol")
                item["name"] = rec.get("l30") or rec.get("name")
                item["settlement_price"] = to_int(rec.get("py"))
                item["open"] = to_int(rec.get("pf"))
                item["high"] = to_int(rec.get("pmax"))
                item["low"] = to_int(rec.get("pmin"))
                item["last"] = to_int(rec.get("pl"))
                item["last_change"] = to_int(rec.get("plc"))
                item["last_change_pct"] = num(rec.get("plp"))
                item["close"] = to_int(rec.get("pc"))
                item["trades"] = to_int(rec.get("tno"))
                item["volume"] = to_int(rec.get("tvol"))
                item["value"] = to_int(rec.get("tval"))

                # Client type
                item["real_buy_count"] = to_int(rec.get("Buy_CountI"))
                item["real_buy_volume"] = to_int(rec.get("Buy_I_Volume"))
                item["real_sell_count"] = to_int(rec.get("Sell_CountI"))
                item["real_sell_volume"] = to_int(rec.get("Sell_I_Volume"))
                item["legal_buy_count"] = to_int(rec.get("Buy_CountN"))
                item["legal_buy_volume"] = to_int(rec.get("Buy_N_Volume"))
                item["legal_sell_count"] = to_int(rec.get("Sell_CountN"))
                item["legal_sell_volume"] = to_int(rec.get("Sell_N_Volume"))

                # 5-level order book
                for lvl in range(1, 6):
                    item[f"bid_price_{lvl}"] = to_int(rec.get(f"pd{lvl}"))
                    item[f"bid_vol_{lvl}"] = to_int(rec.get(f"qd{lvl}"))
                    item[f"ask_price_{lvl}"] = to_int(rec.get(f"po{lvl}"))
                    item[f"ask_vol_{lvl}"] = to_int(rec.get(f"qo{lvl}"))

                if item["isin"]:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping IME fund record: {e}")
                continue

        logger.info(f"Parsed {count} IME fund items")
