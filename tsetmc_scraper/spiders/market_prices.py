"""
Market Prices Spider
Fetches gold/currency, commodity, and cryptocurrency prices from BrsApi.ir.
Three API calls: Gold_Currency (free), Commodity, Cryptocurrency.

Endpoints:
  - https://BrsApi.ir/Api/Market/Gold_Currency.php?key=KEY (free tier)
  - https://BrsApi.ir/Api/Market/Commodity.php?key=KEY
  - https://BrsApi.ir/Api/Market/Cryptocurrency.php?key=KEY
"""

import logging
from datetime import datetime

from tsetmc_scraper.items import MarketPriceItem
from tsetmc_scraper.spiders.base import BrsApiSpider
from tsetmc_scraper.utils import num

logger = logging.getLogger(__name__)

ENDPOINTS = [
    (
        "gold_currency",
        "Market/Gold_Currency.php",
        "gold",
    ),
    ("commodity", "Market/Commodity.php", "commodity"),
    (
        "cryptocurrency",
        "Market/Cryptocurrency.php",
        "crypto",
    ),
]


class MarketPricesSpider(BrsApiSpider):
    name = "market_prices"
    download_delay = 1

    def start_requests(self):
        self.log_start_banner()

        for ep_name, path, market_type in ENDPOINTS:
            url = self.brsapi_url(path)
            yield self.make_request(
                url,
                self.parse,
                cb_kwargs={"market_type": market_type, "ep_name": ep_name},
            )

    def parse(self, response, market_type, ep_name):
        data = self.unwrap_envelope(response.text, label=ep_name)
        if data is None:
            return

        today = datetime.now().date()
        count = 0

        logger.info(f"Received {len(data)} {ep_name} records from BrsApi")

        # Gold_Currency endpoint contains both gold and currency items
        for rec in data:
            try:
                item = MarketPriceItem()
                item["item_type"] = "market_price"
                item["date"] = today

                # Determine sub-market_type for gold_currency
                actual_market_type = market_type
                if ep_name == "gold_currency":
                    # Classify based on category or name fields
                    cat = (rec.get("category") or "").lower()
                    name = (rec.get("name") or rec.get("l18") or "").lower()
                    if (
                        "currency" in cat
                        or "ارز" in name
                        or "dollar" in name.lower()
                        or "دلار" in name
                        or "یورو" in name
                    ):
                        actual_market_type = "currency"
                    else:
                        actual_market_type = "gold"

                item["market_type"] = actual_market_type
                item["symbol"] = (
                    rec.get("l18") or rec.get("symbol") or rec.get("name", "")
                )
                item["name_fa"] = (
                    rec.get("l30") or rec.get("name") or rec.get("l18", "")
                )
                item["time"] = rec.get("heven") or rec.get("time")
                item["price"] = num(rec.get("price") or rec.get("pl") or rec.get("pc"))
                item["price_toman"] = num(
                    rec.get("price_toman") or rec.get("price_irt")
                )
                item["change_value"] = num(
                    rec.get("change") or rec.get("plc") or rec.get("pcc")
                )
                item["change_pct"] = num(
                    rec.get("percent") or rec.get("plp") or rec.get("pcp")
                )
                item["unit"] = rec.get("unit")
                item["market_cap"] = num(rec.get("mv") or rec.get("market_cap"))
                item["icon_url"] = rec.get("icon") or rec.get("icon_url")

                if item["symbol"]:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping {ep_name} record: {e}")
                continue

        logger.info(f"Parsed {count} {ep_name} items")
