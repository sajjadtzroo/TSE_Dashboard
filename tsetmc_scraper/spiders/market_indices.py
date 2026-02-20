"""
Market Indices Spider
Fetches TSE market indices from BrsApi.ir Index endpoint.

Endpoint: https://BrsApi.ir/Api/Tsetmc/Index.php?key=KEY&type=N
  type=1: Main market (single object)
  type=2: Secondary market (single object)
  type=3: Featured indices (array of objects with name, min, max, etc.)
"""

import json
import logging
from datetime import datetime

from tsetmc_scraper.items import MarketIndexItem
from tsetmc_scraper.spiders.base import BrsApiSpider
from tsetmc_scraper.utils import num, to_int

logger = logging.getLogger(__name__)


INDEX_TYPES = [
    (1, "بازار اول"),
    (2, "بازار دوم"),
    (3, None),  # type=3 returns array with names
]


class MarketIndicesSpider(BrsApiSpider):
    name = "market_indices"
    download_delay = 1

    def start_requests(self):
        self.log_start_banner()

        api_key = self.settings.get("BRSAPI_KEY", "")

        for type_num, default_name in INDEX_TYPES:
            url = (
                f"https://BrsApi.ir/Api/Tsetmc/Index.php?key={api_key}&type={type_num}"
            )
            yield self.make_request(
                url,
                self.parse,
                cb_kwargs={"type_num": type_num, "default_name": default_name},
            )

    def parse(self, response, type_num, default_name):
        # This endpoint returns single objects (type=1/2) or arrays (type=3),
        # not the standard {successful, data} envelope, so parse manually.
        try:
            raw = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON for type={type_num}: {e}")
            return

        today = datetime.now().date()

        # type=3 returns array, type=1/2 return single object
        if isinstance(raw, list):
            records = raw
        elif isinstance(raw, dict):
            records = [raw]
        else:
            logger.error(f"Unexpected response type for type={type_num}: {type(raw)}")
            return

        logger.info(f"Received {len(records)} records for type={type_num}")
        count = 0

        for rec in records:
            try:
                item = MarketIndexItem()
                item["item_type"] = "market_index"
                item["date"] = today
                item["time"] = rec.get("time")
                item["name"] = (
                    rec.get("name") or default_name or f"Index type={type_num}"
                )
                item["index_value"] = num(rec.get("index"))
                item["index_change"] = num(rec.get("index_change"))
                item["index_change_pct"] = num(rec.get("index_change_percent"))
                item["min_value"] = num(rec.get("min"))
                item["max_value"] = num(rec.get("max"))
                item["market_value"] = num(rec.get("mv"))
                item["trades"] = to_int(rec.get("tno"))
                item["volume"] = to_int(rec.get("tvol"))
                item["value"] = num(rec.get("tval"))
                item["state"] = rec.get("state")

                if item["name"]:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping index record: {e}")
                continue

        logger.info(f"Parsed {count} market index items for type={type_num}")
