"""
Common Response Models

Standardized response formats for API endpoints.
This module provides unified API response envelopes to ensure consistency
across all endpoints, supporting success, error, and paginated responses.
"""

from typing import Generic, TypeVar, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


T = TypeVar('T')


class ErrorDetail(BaseModel):
    """
    Individual error detail for structured error reporting.

    Attributes:
        code: Machine-readable error code (e.g., "BANK_NOT_FOUND", "VALIDATION_ERROR")
        message: Human-readable error message for display
        field: Optional field name for validation errors
        details: Optional additional context or metadata
    """
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    field: Optional[str] = Field(None, description="Field name for validation errors")
    details: Optional[dict] = Field(None, description="Additional error context")


class PaginationMetadata(BaseModel):
    """
    Pagination metadata for list endpoints.

    Provides comprehensive pagination information including current position,
    total counts, and navigation helpers.

    Attributes:
        total: Total number of items across all pages
        page: Current page number (1-indexed)
        page_size: Number of items per page
        total_pages: Total number of pages available
        has_next: Whether there is a next page available
        has_prev: Whether there is a previous page available
    """
    total: int = Field(..., description="Total number of items across all pages", ge=0)
    page: int = Field(..., description="Current page number (1-indexed)", ge=1)
    page_size: int = Field(..., description="Items per page", ge=1, le=1000)
    total_pages: int = Field(..., description="Total number of pages", ge=0)
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")

    @classmethod
    def create(cls, total: int, page: int, page_size: int) -> "PaginationMetadata":
        """
        Create pagination metadata with calculated values.

        Args:
            total: Total number of items across all pages
            page: Current page number (1-indexed)
            page_size: Number of items per page

        Returns:
            PaginationMetadata instance with calculated total_pages, has_next, has_prev

        Example:
            >>> meta = PaginationMetadata.create(total=100, page=2, page_size=20)
            >>> meta.total_pages
            5
            >>> meta.has_next
            True
            >>> meta.has_prev
            True
        """
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0

        return cls(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )


class ResponseMeta(BaseModel):
    """
    Response metadata container.

    Contains optional metadata about the response such as timestamps,
    pagination info, and caching details.

    Attributes:
        timestamp: ISO 8601 formatted UTC timestamp of response generation
        pagination: Optional pagination metadata for list responses
        cached: Whether this response was served from cache
        cache_ttl: Optional TTL in seconds for cached responses
    """
    timestamp: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat() + "Z",
        description="Response timestamp (ISO 8601 UTC)"
    )
    pagination: Optional[PaginationMetadata] = Field(None, description="Pagination metadata")
    cached: bool = Field(False, description="Whether response was cached")
    cache_ttl: Optional[int] = Field(None, description="Cache TTL in seconds", ge=0)


class ApiResponse(BaseModel, Generic[T]):
    """
    Standard API response envelope for all endpoints.

    This is the unified response format that wraps all API responses,
    providing consistent structure for success and error cases.

    Attributes:
        success: Whether the request was successful
        data: The actual response data (None for errors)
        meta: Optional metadata (pagination, timestamps, caching info)
        errors: Optional list of error details (None for success)

    Example success response:
        {
            "success": true,
            "data": [...],
            "meta": {
                "timestamp": "2026-02-05T10:00:00Z",
                "pagination": {...}
            },
            "errors": null
        }

    Example error response:
        {
            "success": false,
            "data": null,
            "meta": {"timestamp": "2026-02-05T10:00:00Z"},
            "errors": [
                {
                    "code": "BANK_NOT_FOUND",
                    "message": "Bank with id 'xyz' not found"
                }
            ]
        }
    """
    success: bool = Field(..., description="Whether the request was successful")
    data: Optional[T] = Field(None, description="Response data payload")
    meta: ResponseMeta = Field(default_factory=ResponseMeta, description="Response metadata")
    errors: Optional[List[ErrorDetail]] = Field(None, description="Error details if failed")

    @classmethod
    def ok(cls, data: T, **meta_kwargs) -> "ApiResponse[T]":
        """
        Create a successful response.

        Args:
            data: The response data payload
            **meta_kwargs: Optional metadata fields (cached, cache_ttl, etc.)

        Returns:
            ApiResponse with success=True and provided data

        Example:
            >>> response = ApiResponse.ok(data={"id": "123", "name": "Bank Melli"})
            >>> response.success
            True
        """
        return cls(
            success=True,
            data=data,
            meta=ResponseMeta(**meta_kwargs),
            errors=None
        )

    @classmethod
    def paginated(
        cls,
        items: List[T],
        total: int,
        page: int,
        page_size: int,
        **meta_kwargs
    ) -> "ApiResponse[List[T]]":
        """
        Create a paginated successful response.

        Args:
            items: List of items for the current page
            total: Total number of items across all pages
            page: Current page number (1-indexed)
            page_size: Number of items per page
            **meta_kwargs: Optional additional metadata fields

        Returns:
            ApiResponse with pagination metadata

        Example:
            >>> response = ApiResponse.paginated(
            ...     items=[{"id": "1"}, {"id": "2"}],
            ...     total=100,
            ...     page=1,
            ...     page_size=20
            ... )
            >>> response.meta.pagination.total_pages
            5
        """
        pagination = PaginationMetadata.create(total, page, page_size)
        return cls(
            success=True,
            data=items,
            meta=ResponseMeta(pagination=pagination, **meta_kwargs),
            errors=None
        )

    @classmethod
    def error(
        cls,
        code: str,
        message: str,
        field: Optional[str] = None,
        details: Optional[dict] = None,
        **meta_kwargs
    ) -> "ApiResponse[None]":
        """
        Create an error response.

        Args:
            code: Machine-readable error code (e.g., "BANK_NOT_FOUND")
            message: Human-readable error message
            field: Optional field name for validation errors
            details: Optional additional error context
            **meta_kwargs: Optional metadata fields

        Returns:
            ApiResponse with success=False and error details

        Example:
            >>> response = ApiResponse.error(
            ...     code="BANK_NOT_FOUND",
            ...     message="Bank with id 'xyz' not found"
            ... )
            >>> response.success
            False
        """
        return cls(
            success=False,
            data=None,
            meta=ResponseMeta(**meta_kwargs),
            errors=[ErrorDetail(code=code, message=message, field=field, details=details)]
        )


# Legacy response models (kept for backward compatibility)
class SuccessResponse(BaseModel):
    """Legacy success response format. Use ApiResponse.ok() instead."""
    success: bool = True
    message: str
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    """Legacy error response format. Use ApiResponse.error() instead."""
    error: bool = True
    message: str
    details: Optional[dict] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Legacy paginated response format. Use ApiResponse.paginated() instead.

    Kept for backward compatibility with existing code.
    """
    items: List[T] = Field(..., description="List of items")
    pagination: PaginationMetadata = Field(..., description="Pagination information")

    @classmethod
    def create(
        cls,
        items: List[T],
        total: int,
        page: int = 1,
        page_size: int = 100
    ) -> "PaginatedResponse[T]":
        """Create paginated response with calculated metadata."""
        pagination = PaginationMetadata.create(total, page, page_size)
        return cls(items=items, pagination=pagination)


class CountResponse(BaseModel):
    """Response with count information."""
    count: int = Field(..., description="Number of items")
    category: Optional[str] = Field(None, description="Category name")


class HealthCheckResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Health status")
    database: str = Field(..., description="Database connection status")
    scheduler: Optional[str] = Field(None, description="Scheduler status")
    timestamp: str = Field(..., description="Check timestamp")
    version: str = Field(..., description="Application version")
