"""
Pydantic response schemas for news API endpoints.
"""

import datetime as _dt
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class NewsArticleSchema(BaseModel):
    """Single news article response schema."""

    id: int
    source: str = Field(max_length=100)
    source_type: str = Field(max_length=20)
    title: str
    body: Optional[str] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    published_at: _dt.datetime
    fetched_at: Optional[_dt.datetime] = None
    language: str = Field(default="fa", max_length=5)
    category: Optional[str] = Field(default=None, max_length=50)
    tags: list = Field(default_factory=list)
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = Field(default=None, max_length=10)
    impact_score: Optional[int] = None
    related_symbols: list = Field(default_factory=list)
    is_read: bool = False
    created_at: Optional[_dt.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NewsListResponse(BaseModel):
    """Paginated news list response."""

    total: int
    articles: list[NewsArticleSchema]


class NewsSourceSchema(BaseModel):
    """News source with article count."""

    source: str
    source_type: str
    count: int
