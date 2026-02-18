"""
Codal Financial Statements Detail Spider
Reads unprocessed financial statement announcements from DB, fetches Excel HTML,
stores raw HTML to local filesystem (gzipped), parses financial data.

Usage:
  scrapy crawl codal_financials_detail
  scrapy crawl codal_financials_detail -a batch_size=100
  scrapy crawl codal_financials_detail -a max_retries=3

Pipeline flow: fetch HTML → gzip & store locally → parse → write to Postgres → mark processed
"""

import gzip
import logging
import os
import re
from datetime import UTC, datetime

import jdatetime
import scrapy
from parsel import Selector

from config.settings import DATABASE_URL
from database.connection import get_db_manager
from database.models import CodalAnnouncement, CodalRawResponse
from tsetmc_scraper.items import FinancialStatementItem
from tsetmc_scraper.utils import BROWSER_UA, persian_to_english_numbers

logger = logging.getLogger(__name__)


def normalize_persian(text):
    """Normalize Arabic/Persian character variants for consistent matching.
    Arabic ي (U+064A) → Persian ی (U+06CC)
    Arabic ك (U+0643) → Persian ک (U+06A9)
    Also strips ZWNJ and extra whitespace.
    """
    text = text.replace("\u064a", "\u06cc")  # Arabic yaa → Persian yaa
    text = text.replace("\u0643", "\u06a9")  # Arabic kaf → Persian kaf
    text = text.replace("\u200c", " ")  # ZWNJ → space
    return " ".join(text.split())  # collapse whitespace


EXCEL_URL_TEMPLATE = "https://excel.codal.ir/service/Excel/GetAll/{letter_serial}/0"
RAW_STORAGE_DIR = os.path.join("data", "codal_raw")

# Mapping of Persian table headers to statement types
# IMPORTANT: Order matters — more specific patterns MUST come before shorter ones
# e.g. "صورت سود و زیان جامع" must match before "سود و زیان"
STATEMENT_TYPE_MAP = [
    ("صورت سود و زیان جامع", "comprehensive_income"),
    ("سود و زیان جامع", "comprehensive_income"),
    ("صورت تغییرات در حقوق مالکانه", "equity_changes"),
    ("تغییرات در حقوق مالکانه", "equity_changes"),
    ("صورت جریان وجوه نقد", "cash_flow"),
    ("جریان وجوه نقد", "cash_flow"),
    ("صورت وضعیت مالی", "balance_sheet"),
    ("ترازنامه", "balance_sheet"),
    ("صورت سود و زیان", "income_statement"),
    ("سود و زیان", "income_statement"),
]

# Mapping of Persian line item names to hot field column names
# All keys use normalized Persian (ی not ي, ک not ك, spaces not ZWNJ)
HOT_FIELD_MAP = {
    "درآمدهای عملیاتی": "revenue",
    "درآمد عملیاتی": "revenue",
    "جمع درآمدهای عملیاتی": "revenue",
    "جمع درآمدها": "revenue",
    "بهای تمام شده درآمدهای عملیاتی": "cost_of_revenue",
    "بهای تمام شده": "cost_of_revenue",
    "سود (زیان) ناخالص": "gross_profit",
    "سود ناخالص": "gross_profit",
    "سود(زیان) ناخالص": "gross_profit",
    "سود (زیان) عملیاتی": "operating_income",
    "سود عملیاتی": "operating_income",
    "سود(زیان) عملیاتی": "operating_income",
    "سود (زیان) خالص": "net_income",
    "سود خالص": "net_income",
    "سود(زیان) خالص": "net_income",
    "سود (زیان) پایه هر سهم": "eps",
    "سود پایه هر سهم": "eps",
    "جمع دارایی ها": "total_assets",
    "جمع داراییها": "total_assets",
    "جمع بدهی ها": "total_liabilities",
    "جمع بدهیها": "total_liabilities",
    "جمع حقوق مالکانه": "total_equity",
    "جمع حقوق صاحبان سهام": "total_equity",
}


class CodalFinancialsDetailSpider(scrapy.Spider):
    name = "codal_financials_detail"
    allowed_domains = ["excel.codal.ir", "codal.ir"]

    custom_settings = {
        "CONCURRENT_REQUESTS": 2,
        "DOWNLOAD_DELAY": 1,
        "RETRY_TIMES": 3,
        "RETRY_HTTP_CODES": [500, 502, 503, 504, 408, 429],
        "DOWNLOAD_TIMEOUT": 120,
        "HTTPPROXY_ENABLED": False,
    }

    def __init__(self, batch_size=500, max_retries=3, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.batch_size = int(batch_size)
        self.max_retries = int(max_retries)
        self.db_manager = None
        self.session = None
        self.processed_count = 0
        self.error_count = 0

    def start_requests(self):
        logger.info("=" * 80)
        logger.info("Starting Codal Financial Statements Detail Spider")
        logger.info(f"  Batch size: {self.batch_size}, Max retries: {self.max_retries}")
        logger.info("=" * 80)

        # Ensure raw storage directory exists
        os.makedirs(RAW_STORAGE_DIR, exist_ok=True)

        # Query DB for unprocessed announcements
        self.db_manager = get_db_manager(DATABASE_URL)
        self.session = self.db_manager.get_scoped_session()

        announcements = (
            self.session.query(CodalAnnouncement)
            .filter(
                CodalAnnouncement.has_excel == True,
                CodalAnnouncement.is_processed == False,
                CodalAnnouncement.is_failed == False,
                CodalAnnouncement.letter_serial.isnot(None),
            )
            .order_by(CodalAnnouncement.id)
            .limit(self.batch_size)
            .all()
        )

        logger.info(f"Found {len(announcements)} unprocessed announcements to fetch")

        for ann in announcements:
            url = EXCEL_URL_TEMPLATE.format(letter_serial=ann.letter_serial)
            yield scrapy.Request(
                url=url,
                callback=self.parse_excel,
                errback=self.handle_error,
                headers={
                    "User-Agent": BROWSER_UA,
                    "Accept": "text/html,application/xhtml+xml",
                    "Referer": "https://codal.ir/",
                },
                cb_kwargs={
                    "announcement_id": ann.id,
                    "letter_serial": ann.letter_serial,
                    "symbol": ann.symbol,
                    "company_name": ann.company_name,
                    "title": ann.title,
                },
                meta={"proxy": ""},
            )

        if self.session:
            self.session.close()

    def parse_excel(
        self, response, announcement_id, letter_serial, symbol, company_name, title
    ):
        """Parse Excel HTML response, store raw HTML, extract financial data."""
        if response.status != 200:
            self._mark_retry(announcement_id, f"HTTP {response.status}")
            return

        html_body = response.text
        if not html_body or len(html_body) < 100:
            self._mark_retry(announcement_id, "Empty or too-short response")
            return

        # Step 1: Store raw HTML (gzipped) to local filesystem
        self._store_raw_html(letter_serial, html_body, announcement_id)

        # Step 2: Parse the HTML tables
        try:
            statements = self._parse_financial_tables(
                html_body, announcement_id, symbol, company_name, title
            )
        except Exception as e:
            self._mark_retry(announcement_id, f"Parse error: {e}")
            logger.error(f"Parse error for announcement {announcement_id}: {e}")
            return

        if not statements:
            self._mark_retry(announcement_id, "No financial tables found in HTML")
            return

        # Step 3: Yield FinancialStatementItems for pipeline processing
        yield from statements

        # Step 4: Mark as processed
        self._mark_processed(announcement_id)
        self.processed_count += 1

    def _store_raw_html(self, letter_serial, html_body, announcement_id):
        """Gzip and store raw HTML to local filesystem."""
        # Sanitize letter_serial to prevent path traversal
        safe_serial = re.sub(r"[^a-zA-Z0-9_=+\-]", "_", letter_serial)
        filename = f"{safe_serial}.html.gz"
        filepath = os.path.join(RAW_STORAGE_DIR, filename)
        storage_path = f"codal/raw/{filename}"

        html_bytes = html_body.encode("utf-8")
        original_size = len(html_bytes)

        with gzip.open(filepath, "wb") as f:
            f.write(html_bytes)

        # Record metadata in DB
        session = self.db_manager.get_scoped_session()
        try:
            from sqlalchemy.dialects.postgresql import insert

            stmt = (
                insert(CodalRawResponse.__table__)
                .values(
                    codal_announcement_id=announcement_id,
                    letter_serial=letter_serial,
                    storage_path=storage_path,
                    size_bytes=original_size,
                    fetched_at=datetime.now(UTC),
                )
                .on_conflict_do_nothing(constraint="uq_raw_letter_serial")
            )
            session.execute(stmt)
            session.commit()
        except Exception as e:
            session.rollback()
            logger.warning(f"Failed to record raw response metadata: {e}")
        finally:
            session.close()

        return storage_path

    def _parse_financial_tables(
        self, html_body, announcement_id, symbol, company_name, title
    ):
        """Parse HTML tables and extract financial statement data."""
        sel = Selector(text=html_body)
        tables = sel.css("table")
        items = []

        # Detect period info from title or first table headers
        period_info = self._extract_period_info(title, sel)
        is_audited = self._detect_audited(title)
        is_consolidated = self._detect_consolidated(title)

        # Collect best table per statement type (dedup: keep the one with most data)
        best_by_type = {}  # statement_type -> (line_items, hot_fields)

        for table in tables:
            statement_type = self._identify_table_type(table)
            if not statement_type:
                continue

            line_items, hot_fields = self._extract_table_data(table)
            if not line_items and not hot_fields:
                continue

            existing = best_by_type.get(statement_type)
            if existing is None or len(line_items) > len(existing[0]):
                best_by_type[statement_type] = (line_items, hot_fields)

        # Build items from deduplicated results
        for statement_type, (line_items, hot_fields) in best_by_type.items():
            item = FinancialStatementItem()
            item["item_type"] = "financial_statement"
            item["codal_announcement_id"] = announcement_id
            item["symbol"] = symbol
            item["company_name"] = company_name
            item["statement_type"] = statement_type
            item["period_end_date"] = period_info.get("period_end_date")
            item["period_end_jalali"] = period_info.get("period_end_jalali", "")
            item["fiscal_year_end"] = period_info.get("fiscal_year_end")
            item["fiscal_year_end_jalali"] = period_info.get("fiscal_year_end_jalali")
            item["is_audited"] = is_audited
            item["is_consolidated"] = is_consolidated
            item["period_months"] = period_info.get("period_months")

            # Set hot fields
            for field_name in [
                "revenue",
                "cost_of_revenue",
                "gross_profit",
                "operating_income",
                "net_income",
                "total_assets",
                "total_liabilities",
                "total_equity",
                "eps",
            ]:
                item[field_name] = hot_fields.get(field_name)

            item["line_items"] = line_items
            items.append(item)

        return items

    def _identify_table_type(self, table):
        """Identify statement type from context: preceding h3, table-title div, or th text."""
        # Check .table-title div within the same container
        # The table is inside: div.table-containet > app-table > table
        # Sibling: div.table-title
        parent = table.xpath('./ancestor::div[contains(@class, "table-containet")]')
        if parent:
            title_div = parent.css(".table-title::text").get("")
            for persian_name, stmt_type in STATEMENT_TYPE_MAP:
                if persian_name in title_div:
                    return stmt_type

        # Check th/thead span text
        headers = table.css("th span::text, thead span::text").getall()
        header_text = " ".join(headers).strip()
        for persian_name, stmt_type in STATEMENT_TYPE_MAP:
            if persian_name in header_text:
                return stmt_type

        return None

    def _extract_table_data(self, table):
        """Extract line items and hot fields from a financial table.

        Codal HTML structure: <td><span>label</span></td><td><span>value</span></td>
        """
        rows = table.css("tbody tr")
        line_items = {}
        hot_fields = {}

        for row in rows:
            cells = row.css("td")
            if len(cells) < 2:
                continue

            # First cell is the label (text inside span)
            label = cells[0].css("span::text").get("").strip()
            if not label:
                label = cells[0].css("::text").get("").strip()
            if not label:
                continue

            # Get the value from the second cell (current period)
            value_text = cells[1].css("span::text").get("").strip()
            if not value_text:
                value_text = cells[1].css("::text").get("").strip()
            value_text = persian_to_english_numbers(value_text)

            # Clean and parse number
            value = self._parse_number(value_text)

            # Normalize the label for matching (Arabic→Persian yaa/kaf)
            normalized_label = normalize_persian(label)

            # Check if this is a hot field
            hot_field_name = HOT_FIELD_MAP.get(normalized_label)
            if hot_field_name:
                hot_fields[hot_field_name] = value

            # Always store in line_items too (with Persian label as key)
            if value is not None:
                line_items[normalized_label] = value

        return line_items, hot_fields

    def _parse_number(self, text):
        """Parse a number from text, handling parentheses for negatives and commas."""
        if not text:
            return None

        text = text.strip()
        if text in ("-", "--", "", "—"):
            return None

        # Handle parentheses for negative numbers: (123) -> -123
        is_negative = False
        if text.startswith("(") and text.endswith(")"):
            is_negative = True
            text = text[1:-1]

        # Remove commas and spaces
        text = text.replace(",", "").replace(" ", "").replace("\u200c", "")

        try:
            value = int(float(text))
            return -value if is_negative else value
        except (ValueError, TypeError):
            return None

    def _extract_period_info(self, title, sel):
        """Extract period end date and fiscal year info from report title."""
        info = {
            "period_end_date": None,
            "period_end_jalali": "",
            "fiscal_year_end": None,
            "fiscal_year_end_jalali": None,
            "period_months": None,
        }

        if not title:
            return info

        title = persian_to_english_numbers(title)

        # Look for Jalali date patterns: YYYY/MM/DD
        date_pattern = r"(\d{4})/(\d{1,2})/(\d{1,2})"
        dates = re.findall(date_pattern, title)

        if dates:
            # First date is typically the period end date
            year, month, day = int(dates[0][0]), int(dates[0][1]), int(dates[0][2])
            info["period_end_jalali"] = f"{year:04d}/{month:02d}/{day:02d}"
            try:
                jd = jdatetime.date(year, month, day)
                gd = jd.togregorian()
                info["period_end_date"] = gd
            except (ValueError, OverflowError):
                pass

            # Second date (if exists) is often the fiscal year end
            if len(dates) > 1:
                fy_year, fy_month, fy_day = (
                    int(dates[1][0]),
                    int(dates[1][1]),
                    int(dates[1][2]),
                )
                info["fiscal_year_end_jalali"] = (
                    f"{fy_year:04d}/{fy_month:02d}/{fy_day:02d}"
                )
                try:
                    jd2 = jdatetime.date(fy_year, fy_month, fy_day)
                    gd2 = jd2.togregorian()
                    info["fiscal_year_end"] = gd2
                except (ValueError, OverflowError):
                    pass

        # Detect period months
        if "3 ماهه" in title or "سه ماهه" in title or "۳ ماهه" in title:
            info["period_months"] = 3
        elif "6 ماهه" in title or "شش ماهه" in title or "۶ ماهه" in title:
            info["period_months"] = 6
        elif "9 ماهه" in title or "نه ماهه" in title or "۹ ماهه" in title:
            info["period_months"] = 9
        elif "12 ماهه" in title or "دوازده ماهه" in title or "سالانه" in title:
            info["period_months"] = 12
        elif "میاندوره" in title or "میان دوره" in title:
            info["period_months"] = 6  # interim is usually 6 months

        return info

    def _detect_audited(self, title):
        """Detect if the report is audited from title."""
        if not title:
            return False
        return "حسابرسی شده" in title or "حسابرسي شده" in title

    def _detect_consolidated(self, title):
        """Detect if the report is consolidated from title."""
        if not title:
            return False
        return "تلفیقی" in title or "تلفيقي" in title

    def _mark_processed(self, announcement_id):
        """Mark announcement as processed in DB."""
        session = self.db_manager.get_scoped_session()
        try:
            session.query(CodalAnnouncement).filter(
                CodalAnnouncement.id == announcement_id
            ).update(
                {
                    "is_processed": True,
                    "parse_errors": None,
                }
            )
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(
                f"Failed to mark announcement {announcement_id} as processed: {e}"
            )
        finally:
            session.close()

    def _mark_retry(self, announcement_id, error_msg):
        """Increment retry count or mark as failed."""
        self.error_count += 1
        session = self.db_manager.get_scoped_session()
        try:
            ann = (
                session.query(CodalAnnouncement)
                .filter(CodalAnnouncement.id == announcement_id)
                .first()
            )
            if ann:
                ann.retry_count = (ann.retry_count or 0) + 1
                ann.parse_errors = error_msg
                if ann.retry_count >= self.max_retries:
                    ann.is_failed = True
                    logger.warning(
                        f"Announcement {announcement_id} marked as failed after "
                        f"{ann.retry_count} retries: {error_msg}"
                    )
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(
                f"Failed to update retry count for announcement {announcement_id}: {e}"
            )
        finally:
            session.close()

    def handle_error(self, failure):
        """Handle request failures."""
        request = failure.request
        announcement_id = request.cb_kwargs.get("announcement_id")
        if announcement_id:
            self._mark_retry(announcement_id, f"Request failed: {failure.value}")
        logger.error(f"Request failed for {request.url}: {failure.value}")

    def closed(self, reason):
        logger.info("=" * 80)
        logger.info(f"Codal Financial Detail Spider closed: {reason}")
        logger.info(f"  Processed: {self.processed_count}, Errors: {self.error_count}")
        logger.info("=" * 80)
