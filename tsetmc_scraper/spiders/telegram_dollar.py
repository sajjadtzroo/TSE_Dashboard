"""
Telegram Dollar Rate Spider
Polls the public Telegram channel preview page https://t.me/s/dollar_tehran3bze
and stores new USD/IRR rate messages in the dollar_rates hypertable.

Message format (examples):
  دلار نـــقـدی تهران 💵 163,800 خــرید🔵
  دلار فردایی تهران ⏳ 164,100 فروش🔴
  دلار فردایی تهران 164,200 معامله شد ✅

Parsed fields:
  rate_type : 'spot'    (نقدی)  or 'forward' (فردایی)
  side      : 'buy'     (خرید)  / 'sell'     (فروش)  / 'traded' (معامله شد)
  price     : BigInteger in Iranian Toman (commas stripped, Persian digits normalised)

Usage (via scheduler every 60 s, or manually):
  scrapy crawl telegram_dollar
  scrapy crawl telegram_dollar -a channel=dollar_tehran3bze
"""

import logging
import re
from datetime import UTC, datetime

import scrapy
from sqlalchemy.dialects.postgresql import insert

from config.settings import DATABASE_URL
from database.connection import get_db_manager
from database.models import DollarRate
from tsetmc_scraper.utils import persian_to_english_numbers

logger = logging.getLogger(__name__)

# t.me/s/{channel} is the public HTML preview — no auth needed
_CHANNEL_URL = "https://t.me/s/{channel}"

# Keyword sets for classification (use .find() so partial zero-width chars match)
_SPOT_KW    = "نقد"      # نقدی, نـقدی, نـــقـدی
_FORWARD_KW = "فردا"     # فردایی, فـردایی
_BUY_KW     = "خرید"    # خرید, خـرید, خـــرید
_SELL_KW    = "فروش"    # فروش, فـروش
_TRADED_KW  = "معامله"  # معامله شد

_PRICE_RE = re.compile(r"[\d,٠-٩]+")  # matches ASCII + Persian digit groups
# Arabic tatweel/kashida (U+0640) is used for decorative stretching in channel
# messages (e.g. نـــقـدی instead of نقدی). Strip it before keyword matching.
_TATWEEL_RE = re.compile(r"\u0640+")


def _normalize(text: str) -> str:
    """Strip Arabic tatweel and normalise for keyword matching."""
    return _TATWEEL_RE.sub("", text)


def _classify(text: str):
    """Return (rate_type, side) from raw message text, or None if unrecognised."""
    t = _normalize(text)

    if _SPOT_KW in t:
        rate_type = "spot"
    elif _FORWARD_KW in t:
        rate_type = "forward"
    else:
        return None, None

    if _BUY_KW in t:
        side = "buy"
    elif _SELL_KW in t:
        side = "sell"
    elif _TRADED_KW in t:
        side = "traded"
    else:
        return None, None

    return rate_type, side


def _extract_price(text: str) -> int | None:
    """Extract the largest numeric value from message text as Toman price."""
    text_en = persian_to_english_numbers(text)
    candidates = _PRICE_RE.findall(text_en)
    numbers = []
    for c in candidates:
        try:
            numbers.append(int(c.replace(",", "")))
        except ValueError:
            pass
    if not numbers:
        return None
    # Price is always the largest number in the message
    val = max(numbers)
    # Sanity check: dollar price should be > 10,000 Toman
    return val if val > 10_000 else None


class TelegramDollarSpider(scrapy.Spider):
    name = "telegram_dollar"
    allowed_domains = ["t.me"]

    custom_settings = {
        "CONCURRENT_REQUESTS": 1,
        "DOWNLOAD_DELAY": 0,
        "AUTOTHROTTLE_ENABLED": False,
        "RETRY_TIMES": 2,
        "DOWNLOAD_TIMEOUT": 30,
        "HTTPPROXY_ENABLED": False,
        # t.me blocks requests without a browser UA
        "DEFAULT_REQUEST_HEADERS": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "fa,en;q=0.9",
        },
    }

    def __init__(self, channel="dollar_tehran3bze", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.channel = channel
        self.db_manager = None
        self.inserted = 0
        self.skipped = 0

    def start_requests(self):
        self.db_manager = get_db_manager(DATABASE_URL)
        url = _CHANNEL_URL.format(channel=self.channel)
        logger.info(f"Fetching {url}")
        yield scrapy.Request(url, callback=self.parse, errback=self.handle_error)

    def parse(self, response):
        if response.status != 200:
            logger.warning(f"Non-200 from t.me: {response.status}")
            return

        # Each post: <div class="tgme_widget_message" data-post="channel/1234">
        posts = response.css("div.tgme_widget_message[data-post]")
        logger.info(f"Found {len(posts)} messages on page")

        # Highest msg_id already stored → only insert newer
        last_stored = self._get_last_msg_id()

        rows = []
        for post in posts:
            data_post = post.attrib.get("data-post", "")
            try:
                msg_id = int(data_post.split("/")[-1])
            except (ValueError, IndexError):
                continue

            if msg_id <= last_stored:
                self.skipped += 1
                continue

            # Timestamp
            dt_str = post.css("time[datetime]::attr(datetime)").get()
            if not dt_str:
                continue
            try:
                posted_at = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
            except ValueError:
                continue

            # Message text (strip HTML tags)
            raw_text = post.css("div.tgme_widget_message_text").get("") or ""
            clean = re.sub(r"<[^>]+>", "", raw_text).strip()

            rate_type, side = _classify(clean)
            if rate_type is None:
                continue

            price = _extract_price(clean)
            if price is None:
                continue

            rows.append({
                "posted_at": posted_at.astimezone(UTC).replace(tzinfo=UTC),
                "msg_id": msg_id,
                "channel": self.channel,
                "rate_type": rate_type,
                "side": side,
                "price": price,
                "raw_text": clean[:500],
                "scraped_at": datetime.now(UTC),
            })

        if rows:
            self._bulk_insert(rows)

        logger.info(
            f"telegram_dollar done — inserted={self.inserted} skipped={self.skipped}"
        )

    def _get_last_msg_id(self) -> int:
        """Return the highest msg_id already in DB for this channel (0 if empty)."""
        session = self.db_manager.get_scoped_session()
        try:
            from sqlalchemy import func
            result = session.query(
                func.max(DollarRate.msg_id)
            ).filter(DollarRate.channel == self.channel).scalar()
            return result or 0
        except Exception as e:
            logger.warning(f"Could not query last msg_id: {e}")
            return 0
        finally:
            session.close()

    def _bulk_insert(self, rows: list[dict]):
        """Upsert rows — ON CONFLICT DO NOTHING so re-runs are safe."""
        session = self.db_manager.get_scoped_session()
        try:
            stmt = (
                insert(DollarRate.__table__)
                .values(rows)
                .on_conflict_do_nothing(constraint="pk_dollar_rates")
            )
            result = session.execute(stmt)
            session.commit()
            self.inserted += result.rowcount
            logger.info(f"Inserted {result.rowcount} new dollar rate rows")
        except Exception as e:
            session.rollback()
            logger.error(f"Bulk insert failed: {e}")
        finally:
            session.close()

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.request.url} — {failure.value}")

    def closed(self, reason):
        logger.info(
            f"TelegramDollarSpider closed ({reason}) — "
            f"inserted={self.inserted} skipped={self.skipped}"
        )
