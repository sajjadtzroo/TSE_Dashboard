"""
estjt.ir Gold & Coin Price Spider
Scrapes the Tehran Gold & Coin Sellers Union website (estjt.ir/tv/)
and stores live prices in the gold_prices hypertable every 30 seconds.

Data sources:
  - XAU_OZ        : international gold ounce price (USD)
  - XAU_TEHRAN    : Tehran reference gold price (Toman)
  - GOLD_18K      : 18K gold (Toman)
  - GOLD_24K      : 24K gold (Toman)
  - COIN_FULL_NEW : full Bahar Azadi coin, new model (Toman)
  - COIN_FULL_OLD : full Bahar Azadi coin, old model (Toman)
  - COIN_HALF     : half coin (Toman)
  - COIN_QUARTER  : quarter coin (Toman)
  - COIN_GRAM     : gram coin (Toman)

Usage:
  scrapy crawl estjt_gold
"""

import logging
import re
from datetime import UTC, datetime
from decimal import Decimal

import scrapy
from sqlalchemy.dialects.postgresql import insert

from config.settings import DATABASE_URL
from database.connection import get_db_manager
from database.models import GoldPrice, Security
from tsetmc_scraper.utils import persian_to_english_numbers

logger = logging.getLogger(__name__)

_TV_URL = "https://www.estjt.ir/tv/"

# Map Persian labels (as they appear on the page) → security symbol
# Include both variants of the ounce label (with/without hamza diacritic)
_LABEL_TO_SYMBOL: dict[str, str] = {
    "اُنس":          "XAU_OZ",        # with hamza diacritic
    "انس":           "XAU_OZ",        # without diacritic (fallback)
    "مظنه تهران":    "XAU_TEHRAN",
    "طلا ۱۸ عیار":  "GOLD_18K",
    "طلا ۲۴ عیار":  "GOLD_24K",
    "سکه طرح جدید": "COIN_FULL_NEW",
    "سکه طرح قدیم": "COIN_FULL_OLD",
    "نیم سکه":       "COIN_HALF",
    "ربع سکه":       "COIN_QUARTER",
    "سکه گرمی":      "COIN_GRAM",
}

# Symbols for which a USD price is expected (prefixed with $ on the page)
_USD_SYMBOLS = {"XAU_OZ"}


def _parse_price(raw: str):
    """Return (price_irr, price_usd) from a raw price string.

    For USD prices (e.g. '$5,120'):  price_irr=None, price_usd=Decimal(5120)
    For IRR prices (e.g. '86,000,000'): price_irr=86000000, price_usd=None
    """
    raw = raw.strip()
    is_usd = raw.startswith("$")
    if is_usd:
        raw = raw.lstrip("$").strip()

    # Convert Persian/Arabic digits to ASCII
    raw = persian_to_english_numbers(raw)
    # Remove thousands separators (comma and Arabic thousands separator ٬)
    raw = re.sub(r"[,،٬]", "", raw)
    raw = raw.strip()

    try:
        val = int(float(raw))
    except (ValueError, TypeError):
        return None, None

    if val <= 0:
        return None, None

    if is_usd:
        return None, Decimal(val)
    return val, None


class EstjtGoldSpider(scrapy.Spider):
    name = "estjt_gold"
    allowed_domains = ["www.estjt.ir", "estjt.ir"]

    custom_settings = {
        "CONCURRENT_REQUESTS": 1,
        "DOWNLOAD_DELAY": 0,
        "AUTOTHROTTLE_ENABLED": False,
        "RETRY_TIMES": 2,
        "DOWNLOAD_TIMEOUT": 20,
        "HTTPPROXY_ENABLED": False,
        "DEFAULT_REQUEST_HEADERS": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "fa,en;q=0.9",
            "Referer": "https://www.estjt.ir/",
        },
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.db_manager = None
        # symbol → security_id mapping
        self._sec_map: dict[str, int] = {}
        self.inserted = 0

    def start_requests(self):
        self.db_manager = get_db_manager(DATABASE_URL)
        self._load_security_map()
        if not self._sec_map:
            logger.error(
                "No gold/coin securities found in DB — "
                "run migration 018_currency_gold first"
            )
            return
        logger.info(f"Loaded {len(self._sec_map)} security IDs: {list(self._sec_map)}")
        yield scrapy.Request(_TV_URL, callback=self.parse, errback=self.handle_error)

    def _load_security_map(self):
        """Populate symbol → security_id for all 9 gold/coin symbols."""
        symbols = list(_LABEL_TO_SYMBOL.values())
        session = self.db_manager.get_scoped_session()
        try:
            rows = (
                session.query(Security.symbol, Security.security_id)
                .filter(Security.symbol.in_(symbols))
                .all()
            )
            for sym, sec_id in rows:
                self._sec_map[sym] = sec_id
        except Exception as e:
            logger.error(f"Failed to load security map: {e}")
        finally:
            session.close()

    def parse(self, response):
        if response.status != 200:
            logger.warning(f"Non-200 from estjt.ir: {response.status}")
            return

        scraped_at = datetime.now(UTC)
        rows = []

        # Each price row: div.price-table > div with span.label + span.amount
        price_divs = response.css("div.price-table > div")
        if not price_divs:
            logger.warning("No price rows found — page structure may have changed")
            return

        logger.info(f"Found {len(price_divs)} price rows")

        for div in price_divs:
            label_raw = div.css("span.label::text").get("").strip()
            amount_raw = div.css("span.amount::text").get("").strip()

            if not label_raw or not amount_raw:
                continue

            # Normalize label — convert Persian digits, strip extra whitespace
            label = persian_to_english_numbers(label_raw).strip()
            # Also try original (without digit conversion) for dict lookup
            symbol = _LABEL_TO_SYMBOL.get(label_raw) or _LABEL_TO_SYMBOL.get(label)
            if symbol is None:
                logger.debug(f"Unknown label, skipping: {label_raw!r}")
                continue

            sec_id = self._sec_map.get(symbol)
            if sec_id is None:
                logger.debug(f"No security_id for symbol {symbol}, skipping")
                continue

            price_irr, price_usd = _parse_price(amount_raw)

            if price_irr is None and price_usd is None:
                logger.warning(f"Could not parse price for {symbol}: {amount_raw!r}")
                continue

            rows.append({
                "security_id": sec_id,
                "scraped_at":  scraped_at,
                "price_irr":   price_irr,
                "price_usd":   price_usd,
                "source":      "estjt.ir",
            })
            logger.debug(
                f"{symbol}: irr={price_irr}, usd={price_usd}"
            )

        if rows:
            self._bulk_insert(rows)
        else:
            logger.warning("No valid price rows to insert")

        logger.info(f"estjt_gold done — inserted={self.inserted} this run")

    def _bulk_insert(self, rows: list[dict]):
        """Plain INSERT — each run generates unique scraped_at timestamps."""
        session = self.db_manager.get_scoped_session()
        try:
            stmt = insert(GoldPrice.__table__).values(rows)
            result = session.execute(stmt)
            session.commit()
            self.inserted += result.rowcount
            logger.info(f"Inserted {result.rowcount} gold price rows")
        except Exception as e:
            session.rollback()
            logger.error(f"Bulk insert failed: {e}")
        finally:
            session.close()

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.request.url} — {failure.value}")

    def closed(self, reason):
        logger.info(
            f"EstjtGoldSpider closed ({reason}) — inserted={self.inserted}"
        )
