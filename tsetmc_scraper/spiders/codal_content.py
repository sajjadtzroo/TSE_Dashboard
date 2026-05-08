"""
Codal Content Downloader Spider
Downloads the actual document content for ALL announcement types.

For financial statements (letter_type=6) with Excel:
  → downloads Excel HTML → parses financial tables → stores raw + structured data

For all other announcement types (or financial without Excel):
  → downloads PDF (preferred) or HTML page → stores raw only (no parsing)

This spider is the all-type successor to codal_financials_detail.py.
Run codal_financial first to populate codal_announcements, then run this.

Usage:
  # Download everything (all letter types, batch of 1000):
  scrapy crawl codal_content

  # Larger batch:
  scrapy crawl codal_content -a batch_size=5000

  # Financial statements only (letter_type=6):
  scrapy crawl codal_content -a letter_type=6

  # Non-financial only:
  scrapy crawl codal_content -a letter_type=-2   # any non-6 value → see filter below
"""

import gzip
import logging
import os
import re
from datetime import UTC, datetime

import scrapy
from parsel import Selector

from config.settings import DATABASE_URL
from database.connection import get_db_manager
from database.models import CodalAnnouncement, CodalRawResponse
from tsetmc_scraper.items import FinancialStatementItem
from tsetmc_scraper.utils import BROWSER_UA, persian_to_english_numbers

# Reuse parsing helpers from the financial detail spider
from tsetmc_scraper.spiders.codal_financials_detail import (
    EXCEL_URL_TEMPLATE,
    HOT_FIELD_MAP,
    RAW_STORAGE_DIR,
    STATEMENT_TYPE_MAP,
    normalize_persian,
)

logger = logging.getLogger(__name__)

LETTER_TYPE_FINANCIAL = 6
# All letter types that produce structured financial data worth downloading
FINANCIAL_LETTER_TYPES = {6, 56, 57, 130}


class CodalContentSpider(scrapy.Spider):
    name = "codal_content"
    allowed_domains = ["excel.codal.ir", "codal.ir", "d.codal.ir"]

    custom_settings = {
        "CONCURRENT_REQUESTS": 8,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 4,
        "DOWNLOAD_DELAY": 0,
        "AUTOTHROTTLE_ENABLED": False,
        "RETRY_TIMES": 2,
        "RETRY_HTTP_CODES": [500, 502, 503, 504, 408, 429],
        "DOWNLOAD_TIMEOUT": 60,
    }

    def __init__(self, batch_size=1000, letter_type=None, worker_id=0, num_workers=1, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.batch_size = int(batch_size)
        # None = all types; 6 = financial only; any other int = that specific type
        self.filter_letter_type = int(letter_type) if letter_type is not None else None
        self.worker_id = int(worker_id)
        self.num_workers = int(num_workers)
        self.db_manager = None
        self.processed_count = 0
        self.error_count = 0

    def start_requests(self):
        logger.info("=" * 80)
        logger.info("Starting Codal Content Downloader Spider")
        logger.info(f"  Batch size    : {self.batch_size}")
        logger.info(f"  Letter type   : {self.filter_letter_type or 'ALL'}")
        if self.num_workers > 1:
            logger.info(f"  Worker        : {self.worker_id}/{self.num_workers} (id % {self.num_workers} == {self.worker_id})")
        logger.info("=" * 80)

        os.makedirs(RAW_STORAGE_DIR, exist_ok=True)

        self.db_manager = get_db_manager(DATABASE_URL)
        session = self.db_manager.get_scoped_session()

        try:
            q = session.query(CodalAnnouncement).filter(
                CodalAnnouncement.is_processed == False,
                CodalAnnouncement.is_failed == False,
            )
            if self.filter_letter_type is not None:
                q = q.filter(CodalAnnouncement.letter_type == self.filter_letter_type)
            if self.num_workers > 1:
                q = q.filter(CodalAnnouncement.id % self.num_workers == self.worker_id)

            rows = q.order_by(CodalAnnouncement.id.desc()).limit(self.batch_size).all()
            logger.info(f"Found {len(rows)} unprocessed announcements")

            # Extract all fields into plain dicts while the session is still open.
            # This prevents DetachedInstanceError when _mark_processed() closes the
            # scoped session mid-iteration (SQLAlchemy expires ORM objects on commit).
            announcements = [
                {
                    "id":           r.id,
                    "letter_serial": r.letter_serial,
                    "letter_type":  r.letter_type,
                    "has_excel":    r.has_excel,
                    "link_pdf":     r.link_pdf,
                    "link":         r.link,
                    "symbol":       r.symbol,
                    "company_name": r.company_name,
                    "title":        r.title,
                }
                for r in rows
            ]
        finally:
            session.close()

        for ann in announcements:
            req = self._build_request(ann)
            if req:
                yield req

    def _build_request(self, ann):
        """Choose the best URL and callback for this announcement.
        ann is a plain dict with keys: id, letter_serial, letter_type, has_excel,
        link_pdf, link, symbol, company_name, title.
        """
        meta = {
            "announcement_id": ann["id"],
            "letter_serial": ann["letter_serial"],
            "letter_type": ann["letter_type"],
            "symbol": ann["symbol"],
            "company_name": ann["company_name"],
            "title": ann["title"],
        }

        is_financial = ann["letter_type"] in FINANCIAL_LETTER_TYPES

        # Priority 1: Financial statement with Excel → download + parse structured data
        if is_financial and ann["has_excel"] and ann["letter_serial"]:
            url = EXCEL_URL_TEMPLATE.format(letter_serial=ann["letter_serial"])
            return scrapy.Request(
                url=url,
                callback=self.parse_excel,
                errback=self.handle_error,
                headers={"User-Agent": BROWSER_UA, "Referer": "https://codal.ir/"},
                meta=meta,
            )

        # Priority 2: Financial statement PDF (no Excel) → store raw binary
        if is_financial and ann["link_pdf"]:
            return scrapy.Request(
                url=ann["link_pdf"],
                callback=self.parse_pdf,
                errback=self.handle_error,
                headers={"User-Agent": BROWSER_UA, "Referer": "https://codal.ir/"},
                meta=meta,
            )

        # Priority 3: Non-financial with PDF → skip download, mark processed immediately.
        # Metadata (title, date, company, link_pdf) already stored; PDF accessible via link_pdf.
        if not is_financial and ann["link_pdf"]:
            logger.debug(f"Non-financial ann {ann['id']} (type={ann['letter_type']}) — skipping PDF download")
            self._mark_processed(ann["id"])
            return None

        # Priority 4: HTML page (financial without PDF, or non-financial without PDF) → store raw text
        if ann["link"]:
            return scrapy.Request(
                url=ann["link"],
                callback=self.parse_html_page,
                errback=self.handle_error,
                headers={"User-Agent": BROWSER_UA, "Referer": "https://codal.ir/"},
                meta=meta,
            )

        # No downloadable content — mark as processed to avoid infinite retries
        logger.debug(f"No downloadable URL for announcement {ann['id']} — skipping")
        self._mark_processed(ann["id"])
        return None

    # ── Excel (financial statements) ──────────────────────────────────────────

    def parse_excel(self, response):
        m = response.meta
        announcement_id = m["announcement_id"]
        letter_serial = m["letter_serial"]

        if response.status != 200:
            self._mark_retry(announcement_id, f"HTTP {response.status}")
            return

        # Some older announcements return a binary XLS (OLE2) instead of HTML.
        # Detect by checking content-type or by whether .text is available.
        content_type = response.headers.get("Content-Type", b"").decode("utf-8", errors="replace").lower()
        is_binary = "html" not in content_type and not hasattr(response, "text")
        if not is_binary:
            try:
                _ = response.text  # triggers decode — if it raises, treat as binary
            except Exception:
                is_binary = True

        if is_binary or "html" not in content_type:
            # Binary XLS — store raw and mark processed (no HTML table parsing possible)
            raw_bytes = response.body
            if len(raw_bytes) < 10:
                self._mark_retry(announcement_id, "Empty binary response")
                return
            self._store_raw(letter_serial, announcement_id, raw_bytes, ext="xls.gz",
                            symbol=m["symbol"], letter_type=m["letter_type"],
                            announcement_minio_field="minio_excel_key")
            self._mark_processed(announcement_id)
            self.processed_count += 1
            return

        html_body = response.text
        if len(html_body) < 100:
            self._mark_retry(announcement_id, "Empty HTML body")
            return

        self._store_raw(letter_serial, announcement_id, html_body.encode("utf-8"), ext="html.gz",
                        symbol=m["symbol"], letter_type=m["letter_type"],
                        announcement_minio_field="minio_excel_key")

        try:
            statements = self._parse_financial_tables(
                html_body, announcement_id,
                m["symbol"], m["company_name"], m["title"],
            )
        except Exception as e:
            self._mark_retry(announcement_id, f"Parse error: {e}")
            logger.error(f"Parse error for announcement {announcement_id}: {e}")
            return

        if not statements:
            self._mark_retry(announcement_id, "No financial tables found in HTML")
            return

        yield from statements
        self._mark_processed(announcement_id)
        self.processed_count += 1

    # ── PDF ───────────────────────────────────────────────────────────────────

    def parse_pdf(self, response):
        m = response.meta
        announcement_id = m["announcement_id"]
        letter_serial = m.get("letter_serial") or f"ann_{announcement_id}"

        if response.status != 200 or len(response.body) < 100:
            self._mark_retry(announcement_id, f"HTTP {response.status} or empty PDF")
            return

        self._store_raw(letter_serial, announcement_id, response.body, ext="pdf.gz",
                        symbol=m["symbol"], letter_type=m["letter_type"],
                        announcement_minio_field="minio_pdf_key")
        self._mark_processed(announcement_id)
        self.processed_count += 1

    # ── HTML page (non-financial, fallback) ───────────────────────────────────

    def parse_html_page(self, response):
        m = response.meta
        announcement_id = m["announcement_id"]
        letter_serial = m.get("letter_serial") or f"ann_{announcement_id}"

        if response.status != 200 or len(response.text) < 50:
            self._mark_retry(announcement_id, f"HTTP {response.status} or empty HTML")
            return

        self._store_raw(letter_serial, announcement_id, response.text.encode("utf-8"), ext="html.gz",
                        symbol=m["symbol"], letter_type=m["letter_type"])
        self._mark_processed(announcement_id)
        self.processed_count += 1

    # ── Storage ───────────────────────────────────────────────────────────────

    def _store_raw(self, letter_serial, announcement_id, content_bytes, ext,
                   symbol=None, letter_type=None, announcement_minio_field=None):
        """Gzip and write content to disk; record path in codal_raw_responses; upload to MinIO."""
        safe_serial = re.sub(r"[^a-zA-Z0-9_=+\-]", "_", str(letter_serial))
        filename = f"{safe_serial}.{ext}"
        filepath = os.path.join(RAW_STORAGE_DIR, filename)
        storage_path = f"codal/raw/{filename}"

        with gzip.open(filepath, "wb") as f:
            f.write(content_bytes)

        # Upload gzipped file to MinIO (failure is non-fatal)
        minio_key = None
        if symbol:
            try:
                from api.services_storage import codal_raw_key, storage as _storage
                minio_key = _storage.upload(
                    codal_raw_key(symbol, str(letter_serial), ext),
                    open(filepath, "rb").read(),
                    content_type="application/gzip",
                )
            except Exception as _exc:
                logger.warning(f"MinIO upload failed for {filename}: {_exc}")

        session = self.db_manager.get_scoped_session()
        try:
            from sqlalchemy.dialects.postgresql import insert
            stmt = (
                insert(CodalRawResponse.__table__)
                .values(
                    codal_announcement_id=announcement_id,
                    letter_serial=str(letter_serial),
                    storage_path=storage_path,
                    minio_key=minio_key,
                    size_bytes=len(content_bytes),
                    fetched_at=datetime.now(UTC),
                )
                .on_conflict_do_nothing(constraint="uq_raw_letter_serial")
            )
            session.execute(stmt)
            # Also update the announcement's minio field if requested
            if minio_key and announcement_minio_field:
                session.query(CodalAnnouncement).filter(
                    CodalAnnouncement.id == announcement_id
                ).update({announcement_minio_field: minio_key})
            session.commit()
        except Exception as e:
            session.rollback()
            logger.warning(f"Failed to record raw response for {announcement_id}: {e}")
        finally:
            session.close()

    # ── Financial table parsing (mirrors codal_financials_detail logic) ────────

    def _parse_financial_tables(self, html_body, announcement_id, symbol, company_name, title):
        from tsetmc_scraper.spiders.codal_financials_detail import (
            CodalFinancialsDetailSpider,
        )
        # Delegate to the existing spider's parsing methods via a temporary instance
        _parser = CodalFinancialsDetailSpider.__new__(CodalFinancialsDetailSpider)
        _parser.batch_size = 0
        _parser.max_retries = 3
        _parser.db_manager = self.db_manager
        _parser.session = None
        _parser.processed_count = 0
        _parser.error_count = 0
        return _parser._parse_financial_tables(
            html_body, announcement_id, symbol, company_name, title
        )

    # ── DB helpers ────────────────────────────────────────────────────────────

    def _mark_processed(self, announcement_id):
        session = self.db_manager.get_scoped_session()
        try:
            session.query(CodalAnnouncement).filter(
                CodalAnnouncement.id == announcement_id
            ).update({"is_processed": True, "parse_errors": None})
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to mark {announcement_id} processed: {e}")
        finally:
            session.close()

    def _mark_retry(self, announcement_id, error_msg):
        self.error_count += 1
        session = self.db_manager.get_scoped_session()
        try:
            ann = session.query(CodalAnnouncement).filter(
                CodalAnnouncement.id == announcement_id
            ).first()
            if ann:
                ann.retry_count = (ann.retry_count or 0) + 1
                ann.parse_errors = error_msg
                if ann.retry_count >= 3:
                    ann.is_failed = True
                    logger.warning(f"Announcement {announcement_id} marked failed: {error_msg}")
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to update retry for {announcement_id}: {e}")
        finally:
            session.close()

    def handle_error(self, failure):
        announcement_id = failure.request.meta.get("announcement_id")
        if announcement_id:
            self._mark_retry(announcement_id, f"Request failed: {failure.value}")
        logger.error(f"Request failed: {failure.request.url} — {failure.value}")

    def closed(self, reason):
        logger.info("=" * 80)
        logger.info(f"Codal Content Spider closed: {reason}")
        logger.info(f"  Processed: {self.processed_count}, Errors: {self.error_count}")
        logger.info("=" * 80)
