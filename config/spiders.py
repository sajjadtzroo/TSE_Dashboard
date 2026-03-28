"""
Single source of truth for spider names, timeouts, and cache-tag mappings.

Imported by ``scheduler/jobs.py`` and ``api/routes/scraper.py`` so both stay in
sync without duplicating the list.
"""

from typing import Literal

# ── Canonical spider names ──────────────────────────────────────────────────

SPIDER_NAMES: list[str] = [
    "market_watch",
    "instrument_details",
    "history_backfill",
    "options",
    "ime_options",
    "ime_futures",
    "market_indices",
    "etf_nav",
    "ime_certificates",
    "ime_funds",
    "ime_forwards",
    "market_prices",
    "ime_physical",
    "shareholders",
    "codal",
    "tick_trades",
    "telegram_dollar",
    "estjt_gold",
]

SpiderName = Literal[
    "market_watch",
    "instrument_details",
    "history_backfill",
    "options",
    "ime_options",
    "ime_futures",
    "market_indices",
    "etf_nav",
    "ime_certificates",
    "ime_funds",
    "ime_forwards",
    "market_prices",
    "ime_physical",
    "shareholders",
    "codal",
    "tick_trades",
    "telegram_dollar",
    "estjt_gold",
]

# ── Per-spider timeout overrides (seconds).  Default is 600 (10 min). ──────

SPIDER_TIMEOUTS: dict[str, int | None] = {
    # None = no timeout; these spiders run until done regardless of how long it takes
    "history_backfill": None,
    "shareholders": None,
    "codal_financial": None,
    "codal_financials_detail": None,
}

# ── Spider → cache tags mapping for invalidation ───────────────────────────

SPIDER_CACHE_TAGS: dict[str, list[str]] = {
    "market_watch": ["market_watch"],
    "instrument_details": ["instrument_details"],
    "options": ["options"],
    "market_indices": ["market_indices"],
    "etf_nav": ["etf_nav"],
    "market_prices": ["market_prices"],
    "ime_options": ["ime_options"],
    "ime_futures": ["ime_futures"],
    "ime_certificates": ["ime_certificates"],
    "ime_funds": ["ime_funds"],
    "ime_forwards": ["ime_forwards"],
    "ime_physical": ["ime_physical"],
    "codal": ["codal"],
    "codal_financial": ["codal"],
    "codal_financials_detail": ["codal"],
    "telegram_dollar": ["currency_rates"],
    "estjt_gold":      ["gold_prices"],
}

# ── Crypto cache tags (invalidated after fetcher jobs) ──────────────────────

CRYPTO_CACHE_TAGS: dict[str, list[str]] = {
    "crypto_ticker": ["crypto_ticker"],
    "crypto_ohlcv": ["crypto_ohlcv"],
    "crypto_global": ["crypto_global"],
}

# ── Commodity cache tags (invalidated after fetcher jobs) ─────────────────────

COMMODITY_CACHE_TAGS: dict[str, list[str]] = {
    "commodity_prices": ["commodity_prices"],
    "commodity_history": ["commodity_history"],
}

NEWS_CACHE_TAGS: dict[str, list[str]] = {
    "news_rss": ["news"],
    "news_cryptopanic": ["news"],
    "news_newsapi": ["news"],
    "news_enrich": ["news"],
}
