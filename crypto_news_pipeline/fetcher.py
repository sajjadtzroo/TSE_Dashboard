"""
News fetcher — polls CryptoPanic API and RSS feeds for crypto articles.
Uses trafilatura for full-text extraction from article URLs.
"""

import hashlib
import logging
import re
import time
from datetime import UTC, datetime
from urllib.parse import urlparse, urlunparse

import feedparser
import requests
import trafilatura

from .config import (
    ALL_SOURCES,
    CRYPTOPANIC_API_KEY,
    TIER1_SOURCES,
    TIER2_SOURCES,
)

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 20
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


# ── URL normalization ────────────────────────────────────────────────────────


def normalize_url(url: str) -> str:
    """Strip query params, fragments, trailing slashes for dedup."""
    parsed = urlparse(url)
    clean = urlunparse((
        parsed.scheme,
        parsed.netloc.lower(),
        parsed.path.rstrip("/"),
        "",  # params
        "",  # query
        "",  # fragment
    ))
    return clean


def url_hash(url: str) -> str:
    """SHA256 hash of normalized URL."""
    return hashlib.sha256(normalize_url(url).encode()).hexdigest()


# ── Full text extraction ─────────────────────────────────────────────────────


def extract_full_text(url: str) -> str | None:
    """Download URL and extract article body text with trafilatura."""
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            return None
        text = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
        )
        return text if text and len(text) > 100 else None
    except Exception as exc:
        logger.warning(f"trafilatura extraction failed for {url}: {exc}")
        return None


# ── CryptoPanic fetcher ──────────────────────────────────────────────────────


def fetch_cryptopanic(last_seen_url: str | None = None) -> list[dict]:
    """
    Fetch posts from CryptoPanic API.
    Returns list of raw article dicts. Stops when it hits last_seen_url.
    """
    if not CRYPTOPANIC_API_KEY:
        logger.warning("CRYPTOPANIC_API_KEY not set — skipping CryptoPanic")
        return []

    articles = []
    url = (
        f"https://cryptopanic.com/api/v1/posts/"
        f"?auth_token={CRYPTOPANIC_API_KEY}"
        f"&kind=news&public=true"
    )

    try:
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.error(f"CryptoPanic API request failed: {exc}")
        return []

    for post in data.get("results", []):
        post_url = post.get("url", "")
        if not post_url:
            continue
        if last_seen_url and normalize_url(post_url) == normalize_url(last_seen_url):
            break

        # Parse published_at
        published_str = post.get("published_at", "")
        try:
            published_at = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            published_at = datetime.now(UTC)

        # Sentiment from CryptoPanic votes
        votes = post.get("votes", {})
        cp_sentiment = None
        if votes:
            pos = votes.get("positive", 0) + votes.get("important", 0)
            neg = votes.get("negative", 0) + votes.get("toxic", 0)
            if pos > neg:
                cp_sentiment = "positive"
            elif neg > pos:
                cp_sentiment = "negative"

        # Extract full text
        full_text = extract_full_text(post_url)
        raw_text = full_text or post.get("title", "")

        articles.append({
            "url": post_url,
            "url_hash": url_hash(post_url),
            "title": post.get("title", ""),
            "raw_text": raw_text,
            "source": "cryptopanic",
            "source_tier": 1,
            "published_at": published_at,
            "cryptopanic_sentiment": cp_sentiment,
        })

    logger.info(f"CryptoPanic: fetched {len(articles)} articles")
    return articles


# ── RSS fetcher ──────────────────────────────────────────────────────────────


def fetch_rss(source_name: str, feed_url: str, tier: int,
              seen_hashes: set[str] | None = None) -> list[dict]:
    """
    Fetch articles from an RSS feed.
    Returns list of raw article dicts, skipping already-seen URL hashes.
    """
    seen = seen_hashes or set()
    articles = []

    try:
        feed = feedparser.parse(feed_url, agent=USER_AGENT)
    except Exception as exc:
        logger.error(f"RSS parse failed for {source_name} ({feed_url}): {exc}")
        return []

    if feed.bozo and not feed.entries:
        logger.warning(f"RSS feed {source_name} returned no entries (bozo={feed.bozo})")
        return []

    for entry in feed.entries:
        link = entry.get("link", "")
        if not link:
            continue

        h = url_hash(link)
        if h in seen:
            continue
        seen.add(h)

        # Parse published date
        published_at = datetime.now(UTC)
        for date_field in ("published_parsed", "updated_parsed"):
            parsed_time = entry.get(date_field)
            if parsed_time:
                try:
                    published_at = datetime(*parsed_time[:6], tzinfo=UTC)
                except (TypeError, ValueError):
                    pass
                break

        # Try full text extraction, fall back to RSS summary
        full_text = extract_full_text(link)
        if not full_text:
            summary = entry.get("summary", "") or entry.get("description", "")
            # Strip HTML from RSS summary
            full_text = re.sub(r"<[^>]+>", " ", summary).strip()

        title = entry.get("title", "")
        raw_text = full_text or title

        articles.append({
            "url": link,
            "url_hash": h,
            "title": title,
            "raw_text": raw_text,
            "source": source_name,
            "source_tier": tier,
            "published_at": published_at,
            "cryptopanic_sentiment": None,
        })

    logger.info(f"RSS {source_name}: fetched {len(articles)} articles")
    return articles


# ── Aggregate fetch ──────────────────────────────────────────────────────────


def fetch_all_sources(
    tiers: str = "tier1",
    seen_hashes: set[str] | None = None,
    last_cryptopanic_url: str | None = None,
) -> list[dict]:
    """
    Fetch from all configured sources.

    Args:
        tiers: "tier1", "tier2", or "all"
        seen_hashes: set of URL hashes already processed (for dedup)
        last_cryptopanic_url: last seen CryptoPanic URL (for pagination)

    Returns:
        List of raw article dicts, deduplicated by URL hash.
    """
    seen = seen_hashes or set()
    all_articles = []

    # Select sources
    if tiers == "tier1":
        sources = TIER1_SOURCES
    elif tiers == "tier2":
        sources = TIER2_SOURCES
    elif tiers == "all":
        sources = ALL_SOURCES
    else:
        sources = TIER1_SOURCES

    start = time.time()

    for name, cfg in sources.items():
        try:
            if cfg["type"] == "api" and name == "cryptopanic":
                articles = fetch_cryptopanic(last_seen_url=last_cryptopanic_url)
            elif cfg["type"] == "rss":
                articles = fetch_rss(name, cfg["url"], cfg["tier"], seen_hashes=seen)
            else:
                logger.warning(f"Unknown source type for {name}: {cfg['type']}")
                continue

            # Dedup against already-seen hashes
            for article in articles:
                if article["url_hash"] not in seen:
                    seen.add(article["url_hash"])
                    all_articles.append(article)

        except Exception as exc:
            logger.error(f"Source {name} failed entirely: {exc}", exc_info=True)
            continue

    elapsed = time.time() - start
    logger.info(
        f"Fetched {len(all_articles)} articles from {len(sources)} sources "
        f"in {elapsed:.1f}s"
    )
    return all_articles


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    # Quick test: fetch tier1 RSS only (no API key needed for RSS)
    articles = fetch_all_sources(tiers="tier1")
    for a in articles[:3]:
        print(f"[{a['source']}] {a['title'][:80]}")
        print(f"  URL: {a['url']}")
        print(f"  Text: {len(a['raw_text'])} chars")
        print()
