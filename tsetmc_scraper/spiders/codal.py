"""
Codal Announcements Spider
Fetches company announcements from BrsApi.ir Codal/Announcement endpoint.
Supports date range backfill via -a date_start= -a date_end= and pagination.

Endpoint: https://BrsApi.ir/Api/Codal/Announcement.php?key=KEY[&date_start=X&date_end=Y&page=N]
"""

import json
import logging
import re
from datetime import datetime
from urllib.parse import unquote

import scrapy

from tsetmc_scraper.items import CodalAnnouncementItem
from tsetmc_scraper.utils import BROWSER_UA, to_int

logger = logging.getLogger(__name__)


class CodalSpider(scrapy.Spider):
    name = "codal"
    allowed_domains = ["brsapi.ir", "BrsApi.ir"]

    custom_settings = {
        "CONCURRENT_REQUESTS": 1,
        "DOWNLOAD_DELAY": 3,
        "RETRY_TIMES": 3,
        "RETRY_HTTP_CODES": [500, 502, 503, 504, 408, 429],
        "HTTPERROR_ALLOWED_CODES": [400],
    }

    # Earliest Jalali date to fetch (inclusive). Format: YYYY-MM-DD per BrsAPI docs.
    CUTOFF_DATE = "1395-01-01"

    def __init__(self, date_start=None, date_end=None, max_pages=0, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Default: go back to 1395/01/01 unless caller overrides
        self.date_start = date_start or self.CUTOFF_DATE
        self.date_end = date_end
        # 0 means no hard page cap — spider stops when data runs out or cutoff is hit
        self.max_pages = int(max_pages)

    def start_requests(self):
        logger.info("=" * 80)
        logger.info(f"Starting Codal Spider at {datetime.now()}")
        logger.info("=" * 80)

        yield self._build_request(page=1)

    def _build_request(self, page=1):
        api_key = self.settings.get("BRSAPI_KEY", "")
        url = f"https://Api.BrsApi.ir/Codal/Announcement.php?key={api_key}&page={page}"
        if self.date_start:
            url += f"&date_start={self.date_start}"
        if self.date_end:
            url += f"&date_end={self.date_end}"
        return scrapy.Request(
            url=url,
            callback=self.parse,
            errback=self.handle_error,
            headers={"User-Agent": BROWSER_UA},
            cb_kwargs={"page": page},
        )

    def parse(self, response, page):
        try:
            raw = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON on page {page}: {e}")
            return

        if isinstance(raw, dict):
            # Codal API uses 'announcement' key, not 'data'/'successful'
            data = raw.get("announcement") or raw.get("data", [])
            if not data and raw.get("successful") is False:
                logger.error(
                    f"API returned unsuccessful on page {page}: {raw.get('message_error')}"
                )
                return
            total_pages = to_int(raw.get("count_page")) or 0
            total_items = to_int(raw.get("count_announcement")) or 0
            if page == 1:
                logger.info(f"Total announcements: {total_items}, pages: {total_pages}")
        elif isinstance(raw, list):
            data = raw
            total_pages = 0
        else:
            logger.error(f"Unexpected response type on page {page}: {type(raw)}")
            return

        count = 0

        logger.info(f"Received {len(data)} codal announcement records on page {page}")

        for rec in data:
            try:
                item = CodalAnnouncementItem()
                item["item_type"] = "codal"
                item["symbol"] = rec.get("l18") or rec.get("symbol")
                item["company_name"] = (
                    rec.get("l30") or rec.get("company_name") or rec.get("name")
                )
                item["title"] = rec.get("title")
                item["code"] = rec.get("code", "")
                item["category"] = to_int(rec.get("category"))
                item["date_title"] = rec.get("date_title")
                item["date_send"] = rec.get("date_send")
                item["time_send"] = rec.get("time_send")
                item["date_publish"] = rec.get("date_publish")
                item["time_publish"] = rec.get("time_publish")
                item["link"] = rec.get("link") or rec.get("url")

                # Extract LetterSerial embedded in link URL
                m = re.search(r"LetterSerial=([^&]+)", item["link"] or "")
                item["letter_serial"] = unquote(m.group(1)) if m else None
                # let= param in link is the LetterType id
                m_lt = re.search(r"[?&]let=([0-9]+)", item["link"] or "")
                item["letter_type"] = int(m_lt.group(1)) if m_lt else None

                raw_pdf = rec.get("link_pdf") or rec.get("url_pdf")
                item["link_pdf"] = f"https://codal.ir/{raw_pdf.lstrip('/')}" if raw_pdf and not raw_pdf.startswith("http") else (raw_pdf or None)

                raw_excel = rec.get("link_excel") or rec.get("url_excel")
                item["link_excel"] = f"https://codal.ir/{raw_excel.lstrip('/')}" if raw_excel and not raw_excel.startswith("http") else (raw_excel or None)

                raw_attach = rec.get("link_attachment") or rec.get("url_attachment")
                item["link_attachment"] = f"https://codal.ir/{raw_attach.lstrip('/')}" if raw_attach and not raw_attach.startswith("http") else (raw_attach or None)

                item["has_pdf"] = bool(item["link_pdf"])
                item["has_excel"] = bool(item["link_excel"])

                if item["code"]:
                    yield item
                    count += 1

            except (KeyError, ValueError, TypeError) as e:
                logger.debug(f"Skipping codal record: {e}")
                continue

        logger.info(f"Parsed {count} codal items on page {page}")

        if not data:
            return

        # Early-stop: if every record on this page is older than the cutoff, no need
        # to paginate further — the API returns newest-first.
        cutoff = self.CUTOFF_DATE.replace("/", "").replace("-", "")  # canonical YYYYMMDD
        dates_on_page = [
            (rec.get("date_publish") or rec.get("date_send") or "").replace("/", "").replace("-", "")
            for rec in data
        ]
        dates_on_page = [d for d in dates_on_page if d]
        if dates_on_page and max(dates_on_page) < cutoff:
            logger.info(
                f"All records on page {page} are before {cutoff} — stopping pagination."
            )
            return

        # Paginate: stop only when max_pages is set and reached, or no more data
        next_page = page + 1
        if self.max_pages and next_page > self.max_pages:
            logger.info(f"Reached max_pages={self.max_pages}, stopping.")
            return

        yield self._build_request(page=next_page)

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")

    def closed(self, reason):
        logger.info(f"Codal Spider closed: {reason}")
