"""
Base spider class for BrsApi.ir spiders.

Centralises allowed_domains, default custom_settings, error handling, logging
banners, and URL construction so individual spiders only define their
``parse`` methods and ``start_requests``.
"""

import json
import logging
from datetime import datetime

import scrapy

from tsetmc_scraper.utils import BROWSER_UA

logger = logging.getLogger(__name__)


class BrsApiSpider(scrapy.Spider):
    """Base class for all BrsApi-backed spiders."""

    allowed_domains = ["brsapi.ir", "BrsApi.ir", "api.brsapi.ir", "Api.BrsApi.ir"]

    # Subclasses can override these two to customise settings
    concurrent_requests = 1
    download_delay = 0

    # Class-level dict (Scrapy reads cls.custom_settings before instantiation)
    custom_settings = {
        "CONCURRENT_REQUESTS": 1,
        "DOWNLOAD_DELAY": 0,
        "RETRY_TIMES": 3,
        "RETRY_HTTP_CODES": [500, 502, 503, 504, 408, 429],
    }

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls.custom_settings = {
            "CONCURRENT_REQUESTS": cls.concurrent_requests,
            "DOWNLOAD_DELAY": cls.download_delay,
            "RETRY_TIMES": 3,
            "RETRY_HTTP_CODES": [500, 502, 503, 504, 408, 429],
        }

    # ── URL helpers ─────────────────────────────────────────────────────────

    def brsapi_url(self, path: str) -> str:
        """Build a full BrsApi URL with the configured API key.

        *path* should be e.g. ``"Tsetmc/Nav.php"`` or ``"IME/Option.php"``.
        Extra query params can be appended by the caller.
        """
        api_key = self.settings.get("BRSAPI_KEY", "")
        return f"https://Api.BrsApi.ir/{path}?key={api_key}"

    # ── Request helpers ─────────────────────────────────────────────────────

    def make_request(self, url, callback, **kwargs):
        """Create a ``scrapy.Request`` with standard UA and errback."""
        return scrapy.Request(
            url=url,
            callback=callback,
            errback=self.handle_error,
            headers={"User-Agent": BROWSER_UA},
            **kwargs,
        )

    # ── Logging helpers ─────────────────────────────────────────────────────

    def log_start_banner(self):
        """Log a standard start banner.  Call from ``start_requests``."""
        label = self.name.replace("_", " ").title()
        logger.info("=" * 80)
        logger.info(f"Starting {label} Spider at {datetime.now()}")
        logger.info("=" * 80)

    # ── Standard callbacks ──────────────────────────────────────────────────

    def handle_error(self, failure):
        logger.error(f"Request failed: {failure.value}")

    def closed(self, reason):
        label = self.name.replace("_", " ").title()
        logger.info(f"{label} Spider closed: {reason}")

    # ── JSON unwrap ─────────────────────────────────────────────────────────

    @staticmethod
    def unwrap_envelope(text: str, *, label: str = ""):
        """Parse a BrsApi JSON response and unwrap the ``{successful, data}``
        envelope.

        Returns the list of records, or ``None`` on error (already logged).
        """
        prefix = f"[{label}] " if label else ""
        try:
            raw = json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"{prefix}Failed to parse JSON: {e}")
            return None

        if isinstance(raw, dict):
            if not raw.get("successful"):
                logger.error(
                    f"{prefix}API returned unsuccessful: {raw.get('message_error')}"
                )
                return None
            data = raw.get("data", [])
        elif isinstance(raw, list):
            data = raw
        else:
            logger.error(f"{prefix}Unexpected response type: {type(raw)}")
            return None

        if not isinstance(data, list):
            logger.error(f"{prefix}Unexpected data type: {type(data)}")
            return None

        return data
