"""
IME Options Spider
Fetches commodity option contracts from BrsApi.ir IME Options endpoint.
Each API record contains a paired call+put at a strike; we split into 2 items.

Endpoint: https://Api.BrsApi.ir/IME/Option.php?key=KEY
Response: {code_http, successful, data: [...records...]}
"""

import logging
from datetime import datetime

from tsetmc_scraper.items import IMEOptionItem
from tsetmc_scraper.spiders.base import BrsApiSpider
from tsetmc_scraper.utils import num, to_int

logger = logging.getLogger(__name__)


class IMEOptionsSpider(BrsApiSpider):
    name = "ime_options"

    def start_requests(self):
        self.log_start_banner()

        url = self.brsapi_url("IME/Option.php")
        yield self.make_request(url, self.parse)

    def parse(self, response):
        data = self.unwrap_envelope(response.text, label="ime_options")
        if data is None:
            return

        today = datetime.now().date()
        count = 0

        logger.info(f"Received {len(data)} IME option records from BrsApi")

        for rec in data:
            try:
                # Shared fields across call and put
                shared = {
                    "date": today,
                    "date_shamsi": rec.get("date_update"),
                    "contract_category": rec.get("contract_category"),
                    "contract_category_sub": rec.get("contract_category_sub"),
                    "commodity": rec.get("contract_category_commodity"),
                    "price_strike": to_int(rec.get("price_strike")),
                    "level_strike": to_int(rec.get("level_strike")),
                }

                # --- Call side ---
                call = IMEOptionItem()
                call["item_type"] = "ime_option"
                call["option_type"] = "call"
                for k, v in shared.items():
                    call[k] = v
                call["contract_id"] = to_int(rec.get("call_contract_id"))
                call["contract_code"] = rec.get("call_contract_code", "")
                call["contract_description"] = rec.get("call_contract_description")
                call["contract_size"] = to_int(rec.get("call_contract_size"))
                call["date_end"] = rec.get("call_date_end")
                call["day_remain"] = to_int(rec.get("call_day_remain"))
                call["margin_initial"] = to_int(rec.get("call_margin_initial"))
                call["margin_required"] = to_int(rec.get("call_margin_required"))
                call["interest_open"] = to_int(rec.get("call_interest_open"))
                call["interest_open_change"] = to_int(rec.get("call_interest_openc"))
                call["interest_open_change_pct"] = num(rec.get("call_interest_openp"))
                call["settlement_price"] = to_int(rec.get("call_py"))
                call["open"] = to_int(rec.get("call_pf"))
                call["high"] = to_int(rec.get("call_pmax"))
                call["low"] = to_int(rec.get("call_pmin"))
                call["last"] = to_int(rec.get("call_pl"))
                call["last_change"] = to_int(rec.get("call_plc"))
                call["last_change_pct"] = num(rec.get("call_plp"))
                call["trades"] = to_int(rec.get("call_tno"))
                call["volume"] = to_int(rec.get("call_tvol"))
                call["value"] = to_int(rec.get("call_tval"))
                call["bid_price_1"] = to_int(rec.get("call_pd1"))
                call["bid_vol_1"] = to_int(rec.get("call_qd1"))
                call["ask_price_1"] = to_int(rec.get("call_po1"))
                call["ask_vol_1"] = to_int(rec.get("call_qo1"))
                call["bid_price_2"] = to_int(rec.get("call_pd2"))
                call["bid_vol_2"] = to_int(rec.get("call_qd2"))
                call["ask_price_2"] = to_int(rec.get("call_po2"))
                call["ask_vol_2"] = to_int(rec.get("call_qo2"))
                call["bid_price_3"] = to_int(rec.get("call_pd3"))
                call["bid_vol_3"] = to_int(rec.get("call_qd3"))
                call["ask_price_3"] = to_int(rec.get("call_po3"))
                call["ask_vol_3"] = to_int(rec.get("call_qo3"))

                if call["contract_code"]:
                    yield call
                    count += 1

                # --- Put side ---
                put = IMEOptionItem()
                put["item_type"] = "ime_option"
                put["option_type"] = "put"
                for k, v in shared.items():
                    put[k] = v
                put["contract_id"] = to_int(rec.get("put_contract_id"))
                put["contract_code"] = rec.get("put_contract_code", "")
                put["contract_description"] = rec.get("put_contract_description")
                put["contract_size"] = to_int(rec.get("put_contract_size"))
                put["date_end"] = rec.get("put_date_end")
                put["day_remain"] = to_int(rec.get("put_day_remain"))
                put["margin_initial"] = to_int(rec.get("put_margin_initial"))
                put["margin_required"] = to_int(rec.get("put_margin_required"))
                put["interest_open"] = to_int(rec.get("put_interest_open"))
                put["interest_open_change"] = to_int(rec.get("put_interest_openc"))
                put["interest_open_change_pct"] = num(rec.get("put_interest_openp"))
                put["settlement_price"] = to_int(rec.get("put_py"))
                put["open"] = to_int(rec.get("put_pf"))
                put["high"] = to_int(rec.get("put_pmax"))
                put["low"] = to_int(rec.get("put_pmin"))
                put["last"] = to_int(rec.get("put_pl"))
                put["last_change"] = to_int(rec.get("put_plc"))
                put["last_change_pct"] = num(rec.get("put_plp"))
                put["trades"] = to_int(rec.get("put_tno"))
                put["volume"] = to_int(rec.get("put_tvol"))
                put["value"] = to_int(rec.get("put_tval"))
                put["bid_price_1"] = to_int(rec.get("put_pd1"))
                put["bid_vol_1"] = to_int(rec.get("put_qd1"))
                put["ask_price_1"] = to_int(rec.get("put_po1"))
                put["ask_vol_1"] = to_int(rec.get("put_qo1"))
                put["bid_price_2"] = to_int(rec.get("put_pd2"))
                put["bid_vol_2"] = to_int(rec.get("put_qd2"))
                put["ask_price_2"] = to_int(rec.get("put_po2"))
                put["ask_vol_2"] = to_int(rec.get("put_qo2"))
                put["bid_price_3"] = to_int(rec.get("put_pd3"))
                put["bid_vol_3"] = to_int(rec.get("put_qd3"))
                put["ask_price_3"] = to_int(rec.get("put_po3"))
                put["ask_vol_3"] = to_int(rec.get("put_qo3"))

                if put["contract_code"]:
                    yield put
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping IME option record: {e}")
                continue

        logger.info(f"Parsed {count} IME option items (call+put split)")

    def handle_error(self, failure):
        super().handle_error(failure)
        logger.error(f"URL: {failure.request.url}")

    def closed(self, reason):
        logger.info("=" * 80)
        logger.info(f"IME Options Spider closed: {reason}")
        logger.info(f"Completed at {datetime.now()}")
        logger.info("=" * 80)
