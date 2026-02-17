"""
Common Response Schemas
"""

from typing import Generic, List, TypeVar
from pydantic import BaseModel

T = TypeVar('T')


class ListResponse(BaseModel, Generic[T]):
    """Generic list response wrapper."""

    items: List[T]
    total: int

    class Config:
        populate_by_name = True


class PaginatedListResponse(BaseModel, Generic[T]):
    """Paginated list response wrapper."""

    items: List[T]
    total: int
    skip: int
    limit: int
    has_more: bool

    class Config:
        populate_by_name = True
