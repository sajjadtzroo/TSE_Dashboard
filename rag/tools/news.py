"""News tools — semantic search over news articles."""

import json
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import desc, text
from sqlalchemy.orm import Session

from database.models import NewsArticle

logger = logging.getLogger(__name__)

# ── Tool definitions ─────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_news",
            "description": "Search recent financial news articles using semantic similarity. "
            "Use this for questions about market news, events, announcements, "
            "sentiment analysis, or trending topics.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query in Persian or English",
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of days to look back (default 7, max 30)",
                    },
                    "source_type": {
                        "type": "string",
                        "description": "Filter by source type: telegram, rss, cryptopanic, newsapi",
                    },
                    "language": {
                        "type": "string",
                        "description": "Filter by language: fa, en",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_trending_news",
            "description": "Get the most impactful news articles from the last 24 hours, "
            "ranked by impact score. Good for market-moving news summaries.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of articles to return (default 5, max 10)",
                    },
                },
            },
        },
    },
]


# ── Tool implementations ─────────────────────────────────────────────────────


def search_news(
    db: Session,
    query: str,
    days: int = 7,
    source_type: str = None,
    language: str = None,
) -> str:
    """Semantic search over news articles using cosine similarity on embeddings."""
    from rag.embedder import embed_query

    days = min(max(days, 1), 30)
    cutoff = datetime.now(UTC) - timedelta(days=days)

    # Generate query embedding
    try:
        query_embedding = embed_query(query)
    except Exception as e:
        logger.error(f"Failed to generate query embedding: {e}")
        return json.dumps(
            {"results": [], "message": "Embedding service unavailable."},
            ensure_ascii=False,
        )

    # Build cosine similarity query using pgvector
    embedding_str = "[" + ",".join(str(x) for x in query_embedding.tolist()) + "]"

    filters = ["na.published_at >= :cutoff", "na.embedding IS NOT NULL"]
    params = {"cutoff": cutoff, "embedding": embedding_str}

    if source_type:
        filters.append("na.source_type = :source_type")
        params["source_type"] = source_type
    if language:
        filters.append("na.language = :language")
        params["language"] = language

    where_clause = " AND ".join(filters)

    sql = text(f"""
        SELECT na.id, na.title, na.body, na.source, na.source_type,
               na.published_at, na.category, na.sentiment_label,
               na.sentiment_score, na.impact_score, na.related_symbols,
               na.url,
               1 - (na.embedding <=> :embedding::vector) AS similarity
        FROM news_articles na
        WHERE {where_clause}
        ORDER BY na.embedding <=> :embedding::vector
        LIMIT 10
    """)

    rows = db.execute(sql, params).fetchall()

    if not rows:
        return json.dumps(
            {"results": [], "message": "No relevant news articles found."},
            ensure_ascii=False,
        )

    output = []
    for r in rows:
        output.append(
            {
                "id": r.id,
                "title": r.title,
                "body": (r.body or "")[:500],
                "source": r.source,
                "source_type": r.source_type,
                "published_at": str(r.published_at),
                "category": r.category,
                "sentiment": r.sentiment_label,
                "sentiment_score": float(r.sentiment_score) if r.sentiment_score else None,
                "impact_score": r.impact_score,
                "related_symbols": r.related_symbols or [],
                "url": r.url,
                "similarity": round(float(r.similarity), 3),
            }
        )

    return json.dumps({"count": len(output), "results": output}, ensure_ascii=False)


def get_trending_news(db: Session, limit: int = 5) -> str:
    """Get top news articles by impact score from last 24 hours."""
    limit = min(max(limit, 1), 10)
    cutoff = datetime.now(UTC) - timedelta(hours=24)

    articles = (
        db.query(NewsArticle)
        .filter(
            NewsArticle.published_at >= cutoff,
            NewsArticle.impact_score.isnot(None),
        )
        .order_by(desc(NewsArticle.impact_score))
        .limit(limit)
        .all()
    )

    if not articles:
        return json.dumps(
            {"results": [], "message": "No trending news in the last 24 hours."},
            ensure_ascii=False,
        )

    output = [
        {
            "id": a.id,
            "title": a.title,
            "body": (a.body or "")[:300],
            "source": a.source,
            "source_type": a.source_type,
            "published_at": str(a.published_at),
            "category": a.category,
            "sentiment": a.sentiment_label,
            "impact_score": a.impact_score,
            "related_symbols": a.related_symbols or [],
            "url": a.url,
        }
        for a in articles
    ]

    return json.dumps({"count": len(output), "results": output}, ensure_ascii=False)


# ── Dispatch map ──────────────────────────────────────────────────────────────

TOOL_DISPATCH = {
    "search_news": search_news,
    "get_trending_news": get_trending_news,
}
