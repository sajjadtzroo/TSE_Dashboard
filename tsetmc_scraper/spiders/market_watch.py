"""
Market Watch Spider
Fetches real-time price, client type, and order book data via BrsApi.ir
Runs every 2.5 minutes during trading hours.

Endpoint: https://BrsApi.ir/Api/Tsetmc/AllSymbols.php?key=KEY&type=1
"""

import json
import logging
from datetime import UTC, datetime

import scrapy

from tsetmc_scraper.items import (
    ClientTypeItem,
    CompanyItem,
    DailyPriceItem,
    FinancialIndicatorItem,
    OrderBookItem,
)
from tsetmc_scraper.utils import BROWSER_UA, num, to_int

logger = logging.getLogger(__name__)


class MarketWatchSpider(scrapy.Spider):
    name = "market_watch"
    allowed_domains = ["brsapi.ir", "BrsApi.ir"]

    custom_settings = {
        "CONCURRENT_REQUESTS": 1,
        "DOWNLOAD_DELAY": 0,
        "RETRY_TIMES": 3,
        "RETRY_HTTP_CODES": [500, 502, 503, 504, 408, 429],
    }

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Market Watch Spider at {datetime.now()}")
        logger.info("=" * 80)

        base_url = self.settings.get("BRSAPI_BASE_URL", "https://BrsApi.ir/Api/Tsetmc")
        api_key = self.settings.get("BRSAPI_KEY", "")

        url = f"{base_url}/AllSymbols.php?key={api_key}&type=1"
        yield scrapy.Request(
            url=url,
            callback=self.parse_all_symbols,
            errback=self.handle_error,
            headers={"User-Agent": BROWSER_UA},
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

        today = datetime.now().date()
        now_utc = datetime.now(UTC)
        price_count = 0
        client_count = 0
        ob_count = 0
        company_count = 0
        fin_count = 0

        FUND_KEYWORDS = ("صندوق", "اختصاصی")

        logger.info(f"Received {len(data)} symbols from BrsApi")

        for item in data:
            try:
                ins_code = int(item["id"])

                # --- Company Item (security master data) ---
                sector = item.get("cs", "")
                comp = CompanyItem()
                comp["item_type"] = "company"
                comp["ins_code"] = ins_code
                comp["symbol"] = item.get("l18", "")
                comp["name_fa"] = item.get("l30", "")
                comp["isin"] = item.get("isin", "") or None
                comp["sector_name_fa"] = sector
                comp["total_shares"] = to_int(item.get("z"), 0)
                comp["is_active"] = True
                comp["type"] = (
                    "fund" if any(kw in sector for kw in FUND_KEYWORDS) else "stock"
                )

                yield comp
                company_count += 1

                # --- Financial Indicator Item ---
                eps_val = num(item.get("eps"), 0)
                pe_val = num(item.get("pe"), 0)
                mv_val = to_int(item.get("mv"), 0)
                if eps_val or pe_val or mv_val:
                    fin = FinancialIndicatorItem()
                    fin["item_type"] = "financial_indicator"
                    fin["ins_code"] = ins_code
                    fin["date"] = today
                    fin["eps"] = eps_val
                    fin["pe_ratio"] = pe_val
                    fin["market_cap"] = mv_val
                    yield fin
                    fin_count += 1

                # --- Daily Price Item ---
                price = DailyPriceItem()
                price["item_type"] = "daily_price"
                price["ins_code"] = ins_code
                price["date"] = today
                price["open"] = num(item.get("pf"), 0)
                price["high"] = num(item.get("pmax"), 0)
                price["low"] = num(item.get("pmin"), 0)
                price["close"] = num(item.get("pc"), 0)
                price["last"] = num(item.get("pl"), 0)
                price["volume"] = to_int(item.get("tvol"), 0)
                price["value"] = to_int(item.get("tval"), 0)
                price["trades"] = to_int(item.get("tno"), 0)
                price["adj_close"] = num(item.get("pc"), 0)
                price["price_yesterday"] = num(item.get("py"), 0)
                price["close_change"] = num(item.get("pcc"), 0)
                price["close_change_pct"] = num(item.get("pcp"), 0)
                price["last_change"] = num(item.get("plc"), 0)
                price["last_change_pct"] = num(item.get("plp"), 0)
                price["threshold_min"] = num(item.get("tmin"), 0)
                price["threshold_max"] = num(item.get("tmax"), 0)

                yield price
                price_count += 1

                # --- Client Type Item ---
                ct = ClientTypeItem()
                ct["item_type"] = "client_type"
                ct["ins_code"] = ins_code
                ct["date"] = today
                ct["real_buy_count"] = to_int(item.get("Buy_CountI"), 0)
                ct["real_buy_volume"] = to_int(item.get("Buy_I_Volume"), 0)
                ct["real_sell_count"] = to_int(item.get("Sell_CountI"), 0)
                ct["real_sell_volume"] = to_int(item.get("Sell_I_Volume"), 0)
                ct["legal_buy_count"] = to_int(item.get("Buy_CountN"), 0)
                ct["legal_buy_volume"] = to_int(item.get("Buy_N_Volume"), 0)
                ct["legal_sell_count"] = to_int(item.get("Sell_CountN"), 0)
                ct["legal_sell_volume"] = to_int(item.get("Sell_N_Volume"), 0)

                yield ct
                client_count += 1

                # --- Order Book Item ---
                ob = OrderBookItem()
                ob["item_type"] = "order_book"
                ob["ins_code"] = ins_code
                ob["snapshot_time"] = now_utc
                for level in range(1, 6):
                    ob[f"bid_price_{level}"] = num(item.get(f"pd{level}"), 0)
                    ob[f"bid_vol_{level}"] = to_int(item.get(f"qd{level}"), 0)
                    ob[f"bid_count_{level}"] = to_int(item.get(f"zd{level}"), 0)
                    ob[f"ask_price_{level}"] = num(item.get(f"po{level}"), 0)
                    ob[f"ask_vol_{level}"] = to_int(item.get(f"qo{level}"), 0)
                    ob[f"ask_count_{level}"] = to_int(item.get(f"zo{level}"), 0)

                yield ob
                ob_count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping symbol: {e}")
                continue

        logger.info(
            f"Parsed {company_count} companies, {price_count} prices, {fin_count} financials, {client_count} client types, {ob_count} order books"
        )

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")
        logger.error(f"URL: {failure.request.url}")

    def closed(self, reason):
        logger.info("=" * 80)
        logger.info(f"Market Watch Spider closed: {reason}")
        logger.info(f"Completed at {datetime.now()}")
        logger.info("=" * 80)
