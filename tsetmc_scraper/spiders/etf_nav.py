"""
ETF NAV Spider
Fetches ETF Net Asset Values from BrsApi.ir Nav endpoint.

Endpoint: https://Api.BrsApi.ir/Tsetmc/Nav.php?key=KEY
Response: {code_http, successful, data: [...records...]}
"""

import logging
from datetime import datetime

from tsetmc_scraper.items import ETFNavItem
from tsetmc_scraper.spiders.base import BrsApiSpider
from tsetmc_scraper.utils import num, to_int

logger = logging.getLogger(__name__)


class ETFNavSpider(BrsApiSpider):
    name = "etf_nav"

    def start_requests(self):
        self.log_start_banner()

        url = self.brsapi_url("Tsetmc/Nav.php")
        yield self.make_request(url, self.parse)

    def parse(self, response):
        data = self.unwrap_envelope(response.text, label="etf_nav")
        if data is None:
            return

        today = datetime.now().date()
        count = 0

        logger.info(f"Received {len(data)} ETF NAV records from BrsApi")

        for rec in data:
            try:
                item = ETFNavItem()
                item["item_type"] = "etf_nav"
                item["ins_code"] = to_int(rec.get("id") or rec.get("ins_code"))
                item["date"] = today
                item["time"] = rec.get("heven") or rec.get("time")
                item["symbol"] = rec.get("l18", "").strip()
                item["name_fa"] = rec.get("l30") or rec.get("name")
                item["nav_issuance"] = num(rec.get("psubtran"))
                item["nav_redemption"] = num(rec.get("predtran"))
                item["last_price"] = num(rec.get("pl"))
                item["fund_type"] = rec.get("fund_type") or rec.get("type")

                # Use API bubble_percent if available, else calculate
                bp = rec.get("bubble_percent")
                if bp is not None:
                    item["bubble_pct"] = num(bp)
                else:
                    nav_red = num(rec.get("predtran"))
                    last = num(rec.get("pl"))
                    if nav_red and last and nav_red > 0:
                        item["bubble_pct"] = round(
                            ((last - nav_red) / nav_red) * 100, 4
                        )
                    else:
                        item["bubble_pct"] = None

                if item["symbol"]:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping ETF NAV record: {e}")
                continue

        logger.info(f"Parsed {count} ETF NAV items")
