"""
News endpoints: listing, trending, detail, mark-read, sources.
"""

import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from api.cache_decorators import cached
from api.deps import get_db
from api.utils import handle_api_errors
from api.schemas_news import (
    NewsArticleSchema,
    NewsListResponse,
    NewsSourceSchema,
)
from database.models import NewsArticle

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/news", tags=["news"])


# ── News List (paginated, filterable) ─────────────────────────────────────────


@router.get("", response_model=NewsListResponse)
@cached(
    module="news",
    endpoint="list",
    trading_ttl=60,
    off_hours_ttl=120,
    tags=["news"],
)
@handle_api_errors("Failed to fetch news articles")
def get_news(
    source_type: str | None = Query(None, description="Filter by source type"),
    category: str | None = Query(None, description="Filter by category"),
    language: str | None = Query(None, description="Filter by language code"),
    symbol: str | None = Query(None, description="Filter by related symbol"),
    search: str | None = Query(None, description="Search in title and body"),
    date_from: datetime | None = Query(None, description="Start date filter"),
    date_to: datetime | None = Query(None, description="End date filter"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
):
    """Return paginated news articles with optional filters."""
    query = db.query(NewsArticle)

    if source_type:
        query = query.filter(NewsArticle.source_type == source_type)
    if category:
        query = query.filter(NewsArticle.category == category)
    if language:
        query = query.filter(NewsArticle.language == language)
    if symbol:
        # JSONB contains check for related_symbols array
        query = query.filter(
            NewsArticle.related_symbols.op("@>")(f'["{symbol}"]')
        )
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            NewsArticle.title.ilike(pattern) | NewsArticle.body.ilike(pattern)
        )
    if date_from:
        query = query.filter(NewsArticle.published_at >= date_from)
    if date_to:
        query = query.filter(NewsArticle.published_at <= date_to)

    total = query.count()
    articles = (
        query.order_by(desc(NewsArticle.published_at))
        .offset(offset)
        .limit(limit)
        .all()
    )

    return NewsListResponse(
        total=total,
        articles=[NewsArticleSchema.model_validate(a) for a in articles],
    )


# ── Trending News ─────────────────────────────────────────────────────────────
# NOTE: registered BEFORE /{article_id} to avoid path capture


@router.get("/trending", response_model=list[NewsArticleSchema])
@cached(
    module="news",
    endpoint="trending",
    trading_ttl=120,
    off_hours_ttl=300,
    tags=["news"],
)
@handle_api_errors("Failed to fetch trending news")
def get_trending_news(db: Session = Depends(get_db)):
    """Return top 10 news articles by impact_score in the last 24 hours."""
    cutoff = datetime.now(UTC) - timedelta(hours=24)
    articles = (
        db.query(NewsArticle)
        .filter(
            NewsArticle.published_at >= cutoff,
            NewsArticle.impact_score.isnot(None),
        )
        .order_by(desc(NewsArticle.impact_score))
        .limit(10)
        .all()
    )

    return [NewsArticleSchema.model_validate(a) for a in articles]


# ── News Sources ──────────────────────────────────────────────────────────────
# NOTE: registered BEFORE /{article_id} to avoid path capture


@router.get("/sources", response_model=list[NewsSourceSchema])
@cached(
    module="news",
    endpoint="sources",
    trading_ttl=300,
    off_hours_ttl=600,
    tags=["news"],
)
@handle_api_errors("Failed to fetch news sources")
def get_news_sources(db: Session = Depends(get_db)):
    """Return distinct news sources with article counts."""
    rows = (
        db.query(
            NewsArticle.source,
            NewsArticle.source_type,
            func.count(NewsArticle.id).label("count"),
        )
        .group_by(NewsArticle.source, NewsArticle.source_type)
        .order_by(desc("count"))
        .all()
    )

    return [
        NewsSourceSchema(source=r.source, source_type=r.source_type, count=r.count)
        for r in rows
    ]


# ── Single Article ────────────────────────────────────────────────────────────


@router.get("/{article_id}", response_model=NewsArticleSchema)
@cached(
    module="news",
    endpoint="detail",
    trading_ttl=60,
    off_hours_ttl=120,
    tags=["news"],
)
@handle_api_errors("Failed to fetch news article")
def get_news_article(article_id: int, db: Session = Depends(get_db)):
    """Return a single news article by ID."""
    article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="News article not found")

    return NewsArticleSchema.model_validate(article)


# ── Mark as Read ──────────────────────────────────────────────────────────────


@router.post("/{article_id}/read")
@handle_api_errors("Failed to mark article as read")
def mark_article_read(article_id: int, db: Session = Depends(get_db)):
    """Mark a news article as read."""
    article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="News article not found")

    article.is_read = True
    db.commit()

    return {"success": True, "article_id": article_id, "is_read": True}
