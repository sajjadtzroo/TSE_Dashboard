"""
services/news_fetchers.py
~~~~~~~~~~~~~~~~~~~~~~~~~
Scheduled fetchers for financial news from multiple sources:

1. **RSS feeds** -- Iranian financial news (sena.ir, boursepress.ir, irna.ir, isna.ir)
2. **CryptoPanic API** -- Hot crypto news with sentiment
3. **NewsAPI.org** -- International business headlines
4. **Enrichment trigger** -- Delegates un-scored articles to AI enrichment

All functions accept a SQLAlchemy ``Session`` and follow the same upsert
pattern used in ``scheduler/commodity_fetcher.py``.
"""

import logging
from datetime import UTC, datetime

import feedparser
import requests
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from config.settings import CRYPTOPANIC_API_KEY, NEWSAPI_API_KEY, REDIS_URL
from database.models import NewsArticle

logger = logging.getLogger(__name__)

# -- RSS feed sources ----------------------------------------------------------

RSS_FEEDS: list[dict] = [
    {
        "url": "https://www.sena.ir/rss",
        "source": "sena.ir",
        "category": "stock",
    },
    {
        "url": "https://boursepress.ir/rss",
        "source": "boursepress.ir",
        "category": "stock",
    },
    {
        "url": "https://www.irna.ir/rss/economy",
        "source": "irna.ir",
        "category": "economy",
    },
    {
        "url": "https://www.isna.ir/rss/economy",
        "source": "isna.ir",
        "category": "economy",
    },
]


# -- Helpers -------------------------------------------------------------------

def _parse_rss_date(entry) -> datetime:
    """Extract published date from a feedparser entry, falling back to now."""
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        from calendar import timegm
        return datetime.fromtimestamp(timegm(entry.published_parsed), tz=UTC)
    if hasattr(entry, "updated_parsed") and entry.updated_parsed:
        from calendar import timegm
        return datetime.fromtimestamp(timegm(entry.updated_parsed), tz=UTC)
    return datetime.now(UTC)


def _get_redis_client():
    """Return a sync Redis client for counters, or None if unavailable."""
    try:
        import redis
        return redis.Redis.from_url(REDIS_URL, socket_connect_timeout=2, decode_responses=True)
    except Exception:
        return None


# -- 1. RSS feeds --------------------------------------------------------------

def fetch_rss_feeds(session) -> int:
    """Fetch from Iranian financial RSS feeds.

    Uses feedparser to parse each feed. For each entry, upserts into
    news_articles with ON CONFLICT (url) DO NOTHING.

    Returns count of rows inserted.
    """
    now = datetime.now(UTC)
    total = 0

    for feed_cfg in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_cfg["url"])
            if feed.bozo and not feed.entries:
                logger.warning("RSS feed %s returned no entries (bozo=%s)", feed_cfg["source"], feed.bozo_exception)
                continue

            rows = []
            for entry in feed.entries:
                url = getattr(entry, "link", None)
                if not url:
                    continue

                title = getattr(entry, "title", "").strip()
                if not title:
                    continue

                body = getattr(entry, "summary", None) or getattr(entry, "description", None)
                published_at = _parse_rss_date(entry)

                rows.append({
                    "source": feed_cfg["source"],
                    "source_type": "rss",
                    "title": title[:500],
                    "body": (body[:5000] if body else None),
                    "url": url[:500],
                    "published_at": published_at,
                    "fetched_at": now,
                    "language": "fa",
                    "category": feed_cfg["category"],
                    "tags": [],
                    "related_symbols": [],
                })

            if rows:
                for row in rows:
                    stmt = (
                        insert(NewsArticle.__table__)
                        .values(**row)
                        .on_conflict_do_nothing(index_elements=["url"])
                    )
                    session.execute(stmt)
                session.flush()
                total += len(rows)
                logger.info("RSS %s: processed %d entries", feed_cfg["source"], len(rows))

        except Exception:
            logger.warning("Failed to fetch RSS from %s", feed_cfg["source"], exc_info=True)

    logger.info("RSS fetch complete: %d total entries processed", total)
    return total


# -- 2. CryptoPanic API -------------------------------------------------------

def fetch_cryptopanic_news(session) -> int:
    """Fetch hot crypto news from CryptoPanic API.

    GET https://cryptopanic.com/api/v1/posts/?auth_token={key}&filter=hot&kind=news
    Maps: title, url, published_at, source (domain), related_symbols (from currencies).

    Returns count of rows inserted.
    """
    if not CRYPTOPANIC_API_KEY:
        logger.warning("CRYPTOPANIC_API_KEY not set -- skipping CryptoPanic fetch")
        return 0

    now = datetime.now(UTC)

    try:
        resp = requests.get(
            "https://cryptopanic.com/api/v1/posts/",
            params={
                "auth_token": CRYPTOPANIC_API_KEY,
                "filter": "hot",
                "kind": "news",
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        logger.warning("CryptoPanic API request failed", exc_info=True)
        return 0

    results = data.get("results", [])
    if not results:
        logger.info("CryptoPanic: no results returned")
        return 0

    total = 0
    for item in results:
        url = item.get("url")
        if not url:
            continue

        title = item.get("title", "").strip()
        if not title:
            continue

        # Parse published_at
        published_str = item.get("published_at")
        if published_str:
            try:
                published_at = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                published_at = now
        else:
            published_at = now

        # Source domain
        source_info = item.get("source", {})
        source = source_info.get("domain", "cryptopanic.com") if isinstance(source_info, dict) else "cryptopanic.com"

        # Related symbols from currencies list
        currencies = item.get("currencies", []) or []
        related_symbols = [c.get("code") for c in currencies if c.get("code")]

        stmt = (
            insert(NewsArticle.__table__)
            .values(
                source=source[:100],
                source_type="cryptopanic",
                title=title[:500],
                body=None,
                url=url[:500],
                published_at=published_at,
                fetched_at=now,
                language="en",
                category="crypto",
                tags=[],
                related_symbols=related_symbols,
            )
            .on_conflict_do_nothing(index_elements=["url"])
        )
        session.execute(stmt)
        total += 1

    session.flush()
    logger.info("CryptoPanic: processed %d articles", total)
    return total


# -- 3. NewsAPI.org ------------------------------------------------------------

def fetch_newsapi_headlines(session) -> int:
    """Fetch top business headlines from NewsAPI.org.

    GET https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=20&apiKey={key}

    Checks a daily Redis counter to stay under the 100 requests/day free-tier
    limit. Maps: title, url, published_at, body (description), image_url
    (urlToImage), source (name).

    Returns count of rows inserted.
    """
    if not NEWSAPI_API_KEY:
        logger.warning("NEWSAPI_API_KEY not set -- skipping NewsAPI fetch")
        return 0

    # Daily counter check via Redis to stay under 100/day
    r = _get_redis_client()
    if r:
        counter_key = f"newsapi:daily:{datetime.now(UTC).strftime('%Y-%m-%d')}"
        try:
            count = r.incr(counter_key)
            if count == 1:
                r.expire(counter_key, 86400)
            if count > 95:
                logger.warning("NewsAPI daily limit approaching (%d/100) -- skipping", count)
                return 0
        except Exception as e:
            logger.debug("Redis counter check failed (non-fatal): %s", e)

    now = datetime.now(UTC)

    try:
        resp = requests.get(
            "https://newsapi.org/v2/top-headlines",
            params={
                "category": "business",
                "language": "en",
                "pageSize": 20,
                "apiKey": NEWSAPI_API_KEY,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        logger.warning("NewsAPI request failed", exc_info=True)
        return 0

    articles = data.get("articles", [])
    if not articles:
        logger.info("NewsAPI: no articles returned")
        return 0

    total = 0
    for item in articles:
        url = item.get("url")
        if not url:
            continue

        title = (item.get("title") or "").strip()
        if not title:
            continue

        # Parse published_at
        published_str = item.get("publishedAt")
        if published_str:
            try:
                published_at = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                published_at = now
        else:
            published_at = now

        # Source name
        source_info = item.get("source", {})
        source = source_info.get("name", "newsapi") if isinstance(source_info, dict) else "newsapi"

        body = item.get("description")
        image_url = item.get("urlToImage")

        stmt = (
            insert(NewsArticle.__table__)
            .values(
                source=source[:100],
                source_type="newsapi",
                title=title[:500],
                body=(body[:5000] if body else None),
                url=url[:500],
                image_url=(image_url[:500] if image_url else None),
                published_at=published_at,
                fetched_at=now,
                language="en",
                category="economy",
                tags=[],
                related_symbols=[],
            )
            .on_conflict_do_nothing(index_elements=["url"])
        )
        session.execute(stmt)
        total += 1

    session.flush()
    logger.info("NewsAPI: processed %d articles", total)
    return total


# -- 4. Enrichment trigger ----------------------------------------------------

def enrich_pending_articles(session) -> int:
    """Trigger AI enrichment for articles without sentiment_score.

    Queries up to 20 articles WHERE sentiment_score IS NULL ordered by
    published_at DESC and delegates each to ``services.news_ai.enrich_article``.

    Returns count of articles enriched.
    """
    try:
        from services.news_ai import enrich_article
    except ImportError:
        logger.warning("services.news_ai not available -- skipping enrichment")
        return 0

    pending = (
        session.execute(
            select(NewsArticle)
            .where(NewsArticle.sentiment_score.is_(None))
            .order_by(NewsArticle.published_at.desc())
            .limit(20)
        )
        .scalars()
        .all()
    )

    if not pending:
        logger.info("No pending articles for enrichment")
        return 0

    enriched = 0
    for article in pending:
        try:
            enrich_article(session, article)
            enriched += 1
        except Exception:
            logger.warning("Failed to enrich article id=%s", article.id, exc_info=True)

    session.flush()
    logger.info("Enriched %d/%d pending articles", enriched, len(pending))
    return enriched
