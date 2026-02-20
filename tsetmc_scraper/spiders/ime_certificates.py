"""
IME Certificates Spider
Fetches deposit certificates from BrsApi.ir IME Certificate endpoint.
Two API calls: type=1 (general) and type=2 (coin/saffron).

Endpoint: https://BrsApi.ir/Api/IME/Certificate.php?key=KEY&type=1|2
"""

import json
import logging
from datetime import datetime

from tsetmc_scraper.items import IMECertificateItem
from tsetmc_scraper.spiders.base import BrsApiSpider
from tsetmc_scraper.utils import num, to_int

logger = logging.getLogger(__name__)


class IMECertificatesSpider(BrsApiSpider):
    name = "ime_certificates"
    download_delay = 1

    def start_requests(self):
        self.log_start_banner()

        api_key = self.settings.get("BRSAPI_KEY", "")
        for cert_type in [1, 2]:
            url = f"https://BrsApi.ir/Api/IME/Certificate.php?key={api_key}&type={cert_type}"
            yield self.make_request(
                url,
                self.parse,
                cb_kwargs={"cert_type": cert_type},
            )

    def parse(self, response, cert_type):
        # This endpoint needs per-cert_type error messages, so parse manually.
        try:
            raw = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON for type={cert_type}: {e}")
            return

        if isinstance(raw, dict):
            if not raw.get("successful"):
                logger.error(
                    f"API returned unsuccessful for type={cert_type}: {raw.get('message_error')}"
                )
                return
            data = raw.get("data", [])
        elif isinstance(raw, list):
            data = raw
        else:
            logger.error(f"Unexpected response type: {type(raw)}")
            return

        today = datetime.now().date()
        count = 0
        max_levels = 5 if cert_type == 2 else 3

        logger.info(f"Received {len(data)} IME certificate type={cert_type} records")

        for rec in data:
            try:
                item = IMECertificateItem()
                item["item_type"] = "ime_certificate"
                item["date"] = today
                item["date_shamsi"] = rec.get("date_update")
                item["cert_type"] = cert_type
                item["commodity"] = rec.get("commodity")
                item["contract_code"] = rec.get("contract_code", "")
                item["contract_description"] = rec.get("contract_description")
                item["contract_size"] = to_int(rec.get("contract_size"))
                item["contract_size_unit"] = rec.get("contract_size_unit")
                item["isin"] = rec.get("isin")
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

                # Order book levels
                for lvl in range(1, max_levels + 1):
                    item[f"bid_price_{lvl}"] = to_int(rec.get(f"pd{lvl}"))
                    item[f"bid_vol_{lvl}"] = to_int(rec.get(f"qd{lvl}"))
                    item[f"ask_price_{lvl}"] = to_int(rec.get(f"po{lvl}"))
                    item[f"ask_vol_{lvl}"] = to_int(rec.get(f"qo{lvl}"))
                # Null out unused levels
                for lvl in range(max_levels + 1, 6):
                    item[f"bid_price_{lvl}"] = None
                    item[f"bid_vol_{lvl}"] = None
                    item[f"ask_price_{lvl}"] = None
                    item[f"ask_vol_{lvl}"] = None

                # Client type (type=2 only)
                if cert_type == 2:
                    item["real_buy_count"] = to_int(rec.get("Buy_CountI"))
                    item["real_buy_volume"] = to_int(rec.get("Buy_I_Volume"))
                    item["real_sell_count"] = to_int(rec.get("Sell_CountI"))
                    item["real_sell_volume"] = to_int(rec.get("Sell_I_Volume"))
                    item["legal_buy_count"] = to_int(rec.get("Buy_CountN"))
                    item["legal_buy_volume"] = to_int(rec.get("Buy_N_Volume"))
                    item["legal_sell_count"] = to_int(rec.get("Sell_CountN"))
                    item["legal_sell_volume"] = to_int(rec.get("Sell_N_Volume"))

                if item["contract_code"]:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping certificate record: {e}")
                continue

        logger.info(f"Parsed {count} IME certificate type={cert_type} items")
