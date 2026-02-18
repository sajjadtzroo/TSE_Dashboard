"""
Instrument Details Spider
Fetches company metadata and financial indicators via BrsApi.ir
Runs daily to update company information.

Endpoint: https://BrsApi.ir/Api/Tsetmc/AllSymbols.php?key=KEY&type=1
"""

import json
import logging
from datetime import datetime

import scrapy

from tsetmc_scraper.items import CompanyItem, FinancialIndicatorItem
from tsetmc_scraper.utils import num, to_int

logger = logging.getLogger(__name__)

# Sector names that indicate a fund rather than a stock
FUND_SECTORS = {"صندوق سرمایه گذاری قابل معامله"}


class InstrumentDetailsSpider(scrapy.Spider):
    name = "instrument_details"
    allowed_domains = ["brsapi.ir", "BrsApi.ir"]

    custom_settings = {
        "CONCURRENT_REQUESTS": 1,
        "DOWNLOAD_DELAY": 0,
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.count = 0
        self.today = datetime.now().date()

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Instrument Details Spider at {datetime.now()}")
        logger.info("=" * 80)

        base_url = self.settings.get("BRSAPI_BASE_URL", "https://BrsApi.ir/Api/Tsetmc")
        api_key = self.settings.get("BRSAPI_KEY", "")

        url = f"{base_url}/AllSymbols.php?key={api_key}&type=1"
        yield scrapy.Request(
            url=url,
            callback=self.parse_all_symbols,
            errback=self.handle_error,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
        )

    def parse_all_symbols(self, response):
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            return

        if isinstance(data, dict) and data.get("code_http"):
            logger.error(f"API error: {data}")
            return

        if not isinstance(data, list):
            logger.error(f"Unexpected response type: {type(data)}")
            return

        logger.info(f"Received {len(data)} symbols from BrsApi")

        for item in data:
            try:
                ins_code = int(item["id"])
                sector_name = item.get("cs", "")

                # --- Company Item ---
                company = CompanyItem()
                company["item_type"] = "company"
                company["ins_code"] = ins_code
                company["symbol"] = item.get("l18", "")
                company["name_fa"] = item.get("l30", "")
                company["name_en"] = None
                company["isin"] = item.get("isin", "")
                company["type"] = "fund" if sector_name in FUND_SECTORS else "stock"
                company["sector_id"] = to_int(item.get("cs_id"))
                company["sector_name_fa"] = sector_name
                company["sector_name_en"] = None
                company["base_volume"] = to_int(item.get("bvol"))
                company["total_shares"] = to_int(item.get("z"))
                company["is_active"] = True

                yield company

                # --- Financial Indicator Item ---
                fi = FinancialIndicatorItem()
                fi["item_type"] = "financial_indicator"
                fi["ins_code"] = ins_code
                fi["date"] = self.today

                fi["eps"] = num(item.get("eps"))
                fi["estimated_eps"] = num(item.get("eps"))
                fi["pe_ratio"] = num(item.get("pe"))
                fi["market_cap"] = to_int(item.get("mv"))
                fi["nav"] = None

                yield fi
                self.count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping symbol: {e}")
                continue

        logger.info(f"Parsed {self.count} instruments")

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")
        logger.error(f"URL: {failure.request.url}")

    def closed(self, reason):
        logger.info("=" * 80)
        logger.info(f"Instrument Details Spider closed: {reason}")
        logger.info(f"Processed {self.count} instruments")
        logger.info(f"Completed at {datetime.now()}")
        logger.info("=" * 80)
