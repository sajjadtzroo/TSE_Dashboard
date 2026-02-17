"""
Codal Financial Statements Search Spider
Paginates search.codal.ir API to collect financial statement announcements (LetterType=6).

Usage:
  # Backfill all financial statements from 1400/01/01 to now:
  scrapy crawl codal_financial -a from_date=1400/01/01 -a to_date=1404/11/30

  # Incremental: last 30 days (default when no dates given):
  scrapy crawl codal_financial

  # Limit pages for testing:
  scrapy crawl codal_financial -a from_date=1404/01/01 -a max_pages=3
"""
import scrapy
import json
import logging
from urllib.parse import urlencode

from tsetmc_scraper.items import CodalAnnouncementItem
from tsetmc_scraper.utils import BROWSER_UA, persian_to_english_numbers

logger = logging.getLogger(__name__)

SEARCH_API = 'https://search.codal.ir/api/search/v2/q'


class CodalFinancialSpider(scrapy.Spider):
    name = 'codal_financial'
    allowed_domains = ['search.codal.ir', 'codal.ir']

    custom_settings = {
        'CONCURRENT_REQUESTS': 1,
        'DOWNLOAD_DELAY': 2,
        'RETRY_TIMES': 5,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
        'HTTPERROR_ALLOWED_CODES': [400],
        # Bypass proxy — codal.ir is accessible directly
        'HTTPPROXY_ENABLED': False,
    }

    def __init__(self, from_date=None, to_date=None, max_pages=0, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.from_date = from_date   # Jalali: "1400/01/01"
        self.to_date = to_date       # Jalali: "1404/11/30"
        self.max_pages = int(max_pages)  # 0 = no limit (all pages)
        self.total_found = 0

    def start_requests(self):
        logger.info("=" * 80)
        logger.info("Starting Codal Financial Statements Search Spider")
        if self.from_date:
            logger.info(f"  Date range: {self.from_date} → {self.to_date or 'now'}")
        if self.max_pages:
            logger.info(f"  Max pages: {self.max_pages}")
        logger.info("=" * 80)

        yield self._build_request(page=1)

    def _build_request(self, page=1):
        params = {
            'Audited': 'true',
            'AuditorRef': '-1',
            'Category': '-1',
            'Childs': 'true',
            'CompanyState': '-1',
            'CompanyType': '-1',
            'Consolidatable': 'true',
            'IsNotAudited': 'true',
            'Lenght': '20',  # codal's typo — this is the page size
            'LetterType': '6',  # Financial statements
            'Mains': 'true',
            'NotAudited': 'true',
            'NotConsolidatable': 'true',
            'PageNumber': str(page),
            'Publisher': 'false',
            'TracingNo': '-1',
            'search': 'true',
        }
        if self.from_date:
            params['FromDate'] = self.from_date
        if self.to_date:
            params['ToDate'] = self.to_date

        url = f'{SEARCH_API}?{urlencode(params)}'
        return scrapy.Request(
            url=url,
            callback=self.parse,
            errback=self.handle_error,
            headers={
                'User-Agent': BROWSER_UA,
                'Accept': 'application/json',
                'Referer': 'https://search.codal.ir/',
            },
            cb_kwargs={'page': page},
            meta={'proxy': ''},  # bypass proxy
        )

    def parse(self, response, page):
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON on page {page}: {e}")
            return

        total = data.get('Total', 0)
        letters = data.get('Letters', [])

        if page == 1:
            self.total_found = total
            total_pages = (total + 19) // 20
            logger.info(f"Total financial statement announcements: {total} ({total_pages} pages)")

        logger.info(f"Page {page}: received {len(letters)} letters")

        count = 0
        for letter in letters:
            try:
                item = self._parse_letter(letter)
                if item:
                    yield item
                    count += 1
            except Exception as e:
                logger.debug(f"Skipping letter: {e}")
                continue

        logger.info(f"Page {page}: yielded {count} items")

        # Paginate
        if letters:
            next_page = page + 1
            if self.max_pages and next_page > self.max_pages:
                logger.info(f"Reached max_pages={self.max_pages}, stopping pagination")
                return
            total_pages = (self.total_found + 19) // 20
            if next_page <= total_pages:
                yield self._build_request(page=next_page)

    def _parse_letter(self, letter):
        """Parse a single letter from the search API response."""
        tracing_no = letter.get('TracingNo', '')
        if not tracing_no:
            return None

        symbol = letter.get('Symbol', '').strip()
        if not symbol:
            return None

        # Extract letter serial from Url or direct field
        letter_serial = letter.get('LetterSerial', '')
        url = letter.get('Url', '')

        # Build announcement code from TracingNo (unique identifier)
        code = persian_to_english_numbers(str(tracing_no))

        # Detect Excel/PDF availability
        has_excel = bool(letter.get('HasExcel', False))
        has_pdf = bool(letter.get('HasPdf', False))

        # Build links
        excel_url = letter.get('ExcelUrl', '')
        pdf_url = letter.get('PdfUrl', '')
        link = f'https://codal.ir{url}' if url and not url.startswith('http') else url

        # Extract publish date
        publish_date = persian_to_english_numbers(letter.get('PublishDateTime', ''))
        send_date = persian_to_english_numbers(letter.get('SentDateTime', ''))

        item = CodalAnnouncementItem()
        item['item_type'] = 'codal'
        item['symbol'] = persian_to_english_numbers(symbol)
        item['company_name'] = letter.get('CompanyName', '').strip()
        item['title'] = letter.get('Title', '').strip()
        item['code'] = code
        item['category'] = 6  # Financial statements
        item['date_title'] = persian_to_english_numbers(letter.get('Title', ''))
        item['date_send'] = send_date.split(' ')[0] if send_date else None
        item['time_send'] = send_date.split(' ')[1] if send_date and ' ' in send_date else None
        item['date_publish'] = publish_date.split(' ')[0] if publish_date else None
        item['time_publish'] = publish_date.split(' ')[1] if publish_date and ' ' in publish_date else None
        item['link'] = link
        item['link_pdf'] = pdf_url if pdf_url else None
        item['link_excel'] = excel_url if excel_url else None
        item['link_attachment'] = None
        item['letter_type'] = 6
        item['letter_serial'] = persian_to_english_numbers(str(letter_serial)) if letter_serial else None
        item['has_excel'] = has_excel
        item['has_pdf'] = has_pdf

        return item

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")

    def closed(self, reason):
        logger.info(f"Codal Financial Search Spider closed: {reason}")
        logger.info(f"Total announcements found: {self.total_found}")
