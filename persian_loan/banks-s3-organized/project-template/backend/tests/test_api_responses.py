"""
Tests for API Response Models

Tests the standardized API response format including:
- ApiResponse.ok() for success responses
- ApiResponse.error() for error responses
- ApiResponse.paginated() for paginated list responses
- PaginationMetadata calculation logic
"""

import pytest
from datetime import datetime
from typing import List, Dict, Any

from app.common.responses import (
    ApiResponse,
    ErrorDetail,
    PaginationMetadata,
    ResponseMeta,
)


class TestErrorDetail:
    """Test ErrorDetail model."""

    def test_error_detail_basic(self):
        """Test basic error detail creation."""
        error = ErrorDetail(
            code="BANK_NOT_FOUND",
            message="Bank with id 'xyz' not found"
        )

        assert error.code == "BANK_NOT_FOUND"
        assert error.message == "Bank with id 'xyz' not found"
        assert error.field is None
        assert error.details is None

    def test_error_detail_with_field(self):
        """Test error detail with field for validation errors."""
        error = ErrorDetail(
            code="VALIDATION_ERROR",
            message="Interest rate must be positive",
            field="interest_rate"
        )

        assert error.code == "VALIDATION_ERROR"
        assert error.field == "interest_rate"

    def test_error_detail_with_details(self):
        """Test error detail with additional context."""
        error = ErrorDetail(
            code="INVALID_INPUT",
            message="Invalid loan parameters",
            details={"min": 0, "max": 100, "provided": 150}
        )

        assert error.code == "INVALID_INPUT"
        assert error.details is not None
        assert error.details["provided"] == 150


class TestPaginationMetadata:
    """Test PaginationMetadata model and calculations."""

    def test_pagination_metadata_basic(self):
        """Test basic pagination metadata creation."""
        meta = PaginationMetadata(
            total=100,
            page=1,
            page_size=20,
            total_pages=5,
            has_next=True,
            has_prev=False
        )

        assert meta.total == 100
        assert meta.page == 1
        assert meta.page_size == 20
        assert meta.total_pages == 5
        assert meta.has_next is True
        assert meta.has_prev is False

    def test_pagination_create_first_page(self):
        """Test pagination calculation for first page."""
        meta = PaginationMetadata.create(total=100, page=1, page_size=20)

        assert meta.total == 100
        assert meta.page == 1
        assert meta.page_size == 20
        assert meta.total_pages == 5
        assert meta.has_next is True
        assert meta.has_prev is False

    def test_pagination_create_middle_page(self):
        """Test pagination calculation for middle page."""
        meta = PaginationMetadata.create(total=100, page=3, page_size=20)

        assert meta.total == 100
        assert meta.page == 3
        assert meta.page_size == 20
        assert meta.total_pages == 5
        assert meta.has_next is True
        assert meta.has_prev is True

    def test_pagination_create_last_page(self):
        """Test pagination calculation for last page."""
        meta = PaginationMetadata.create(total=100, page=5, page_size=20)

        assert meta.total == 100
        assert meta.page == 5
        assert meta.page_size == 20
        assert meta.total_pages == 5
        assert meta.has_next is False
        assert meta.has_prev is True

    def test_pagination_create_partial_last_page(self):
        """Test pagination calculation when last page is partial."""
        meta = PaginationMetadata.create(total=95, page=5, page_size=20)

        assert meta.total == 95
        assert meta.page == 5
        assert meta.page_size == 20
        assert meta.total_pages == 5  # (95 + 20 - 1) // 20 = 5
        assert meta.has_next is False
        assert meta.has_prev is True

    def test_pagination_create_single_page(self):
        """Test pagination when all items fit on one page."""
        meta = PaginationMetadata.create(total=15, page=1, page_size=20)

        assert meta.total == 15
        assert meta.page == 1
        assert meta.page_size == 20
        assert meta.total_pages == 1
        assert meta.has_next is False
        assert meta.has_prev is False

    def test_pagination_create_empty_result(self):
        """Test pagination with zero items."""
        meta = PaginationMetadata.create(total=0, page=1, page_size=20)

        assert meta.total == 0
        assert meta.page == 1
        assert meta.page_size == 20
        assert meta.total_pages == 0
        assert meta.has_next is False
        assert meta.has_prev is False

    def test_pagination_create_edge_case_exact_multiple(self):
        """Test pagination when total is exact multiple of page_size."""
        meta = PaginationMetadata.create(total=100, page=4, page_size=25)

        assert meta.total == 100
        assert meta.page == 4
        assert meta.page_size == 25
        assert meta.total_pages == 4  # Exactly 4 pages
        assert meta.has_next is False
        assert meta.has_prev is True

    def test_pagination_validation_page_must_be_positive(self):
        """Test that page number must be >= 1."""
        with pytest.raises(ValueError):
            PaginationMetadata(
                total=100,
                page=0,  # Invalid
                page_size=20,
                total_pages=5,
                has_next=True,
                has_prev=False
            )

    def test_pagination_validation_page_size_positive(self):
        """Test that page_size must be >= 1."""
        with pytest.raises(ValueError):
            PaginationMetadata(
                total=100,
                page=1,
                page_size=0,  # Invalid
                total_pages=5,
                has_next=True,
                has_prev=False
            )

    def test_pagination_validation_total_non_negative(self):
        """Test that total must be >= 0."""
        with pytest.raises(ValueError):
            PaginationMetadata(
                total=-1,  # Invalid
                page=1,
                page_size=20,
                total_pages=5,
                has_next=True,
                has_prev=False
            )


class TestResponseMeta:
    """Test ResponseMeta model."""

    def test_response_meta_default_timestamp(self):
        """Test that timestamp is auto-generated."""
        meta = ResponseMeta()

        assert meta.timestamp is not None
        assert meta.timestamp.endswith("Z")
        assert meta.pagination is None
        assert meta.cached is False
        assert meta.cache_ttl is None

    def test_response_meta_with_pagination(self):
        """Test response meta with pagination."""
        pagination = PaginationMetadata.create(total=100, page=1, page_size=20)
        meta = ResponseMeta(pagination=pagination)

        assert meta.pagination is not None
        assert meta.pagination.total == 100

    def test_response_meta_with_cache_info(self):
        """Test response meta with cache information."""
        meta = ResponseMeta(cached=True, cache_ttl=300)

        assert meta.cached is True
        assert meta.cache_ttl == 300


class TestApiResponseOk:
    """Test ApiResponse.ok() method for success responses."""

    def test_api_response_ok_simple(self):
        """Test simple success response."""
        data = {"id": "bank-melli", "name": "Bank Melli"}
        response = ApiResponse.ok(data=data)

        assert response.success is True
        assert response.data == data
        assert response.errors is None
        assert response.meta is not None
        assert response.meta.timestamp is not None

    def test_api_response_ok_with_list(self):
        """Test success response with list data."""
        data = [
            {"id": "1", "name": "Item 1"},
            {"id": "2", "name": "Item 2"},
        ]
        response = ApiResponse.ok(data=data)

        assert response.success is True
        assert len(response.data) == 2
        assert response.data[0]["id"] == "1"

    def test_api_response_ok_with_cache_info(self):
        """Test success response with cache metadata."""
        data = {"id": "123"}
        response = ApiResponse.ok(data=data, cached=True, cache_ttl=300)

        assert response.success is True
        assert response.meta.cached is True
        assert response.meta.cache_ttl == 300

    def test_api_response_ok_serialization(self):
        """Test that success response can be serialized."""
        data = {"id": "123", "value": 456}
        response = ApiResponse.ok(data=data)

        serialized = response.model_dump()
        assert serialized["success"] is True
        assert serialized["data"]["id"] == "123"
        assert serialized["errors"] is None


class TestApiResponseError:
    """Test ApiResponse.error() method for error responses."""

    def test_api_response_error_basic(self):
        """Test basic error response."""
        response = ApiResponse.error(
            code="BANK_NOT_FOUND",
            message="Bank with id 'xyz' not found"
        )

        assert response.success is False
        assert response.data is None
        assert response.errors is not None
        assert len(response.errors) == 1
        assert response.errors[0].code == "BANK_NOT_FOUND"
        assert response.errors[0].message == "Bank with id 'xyz' not found"

    def test_api_response_error_with_field(self):
        """Test error response with field for validation."""
        response = ApiResponse.error(
            code="VALIDATION_ERROR",
            message="Interest rate must be positive",
            field="interest_rate"
        )

        assert response.success is False
        assert response.errors[0].field == "interest_rate"

    def test_api_response_error_with_details(self):
        """Test error response with additional details."""
        response = ApiResponse.error(
            code="INVALID_RANGE",
            message="Value out of range",
            details={"min": 0, "max": 100, "provided": 150}
        )

        assert response.success is False
        assert response.errors[0].details is not None
        assert response.errors[0].details["provided"] == 150

    def test_api_response_error_serialization(self):
        """Test that error response can be serialized."""
        response = ApiResponse.error(
            code="TEST_ERROR",
            message="Test error message"
        )

        serialized = response.model_dump()
        assert serialized["success"] is False
        assert serialized["data"] is None
        assert len(serialized["errors"]) == 1
        assert serialized["errors"][0]["code"] == "TEST_ERROR"


class TestApiResponsePaginated:
    """Test ApiResponse.paginated() method for paginated list responses."""

    def test_api_response_paginated_first_page(self):
        """Test paginated response for first page."""
        items = [{"id": str(i)} for i in range(20)]
        response = ApiResponse.paginated(
            items=items,
            total=100,
            page=1,
            page_size=20
        )

        assert response.success is True
        assert len(response.data) == 20
        assert response.meta.pagination is not None
        assert response.meta.pagination.total == 100
        assert response.meta.pagination.page == 1
        assert response.meta.pagination.total_pages == 5
        assert response.meta.pagination.has_next is True
        assert response.meta.pagination.has_prev is False

    def test_api_response_paginated_middle_page(self):
        """Test paginated response for middle page."""
        items = [{"id": str(i)} for i in range(20, 40)]
        response = ApiResponse.paginated(
            items=items,
            total=100,
            page=2,
            page_size=20
        )

        assert response.success is True
        assert len(response.data) == 20
        assert response.meta.pagination.page == 2
        assert response.meta.pagination.has_next is True
        assert response.meta.pagination.has_prev is True

    def test_api_response_paginated_last_page(self):
        """Test paginated response for last page."""
        items = [{"id": str(i)} for i in range(80, 100)]
        response = ApiResponse.paginated(
            items=items,
            total=100,
            page=5,
            page_size=20
        )

        assert response.success is True
        assert len(response.data) == 20
        assert response.meta.pagination.page == 5
        assert response.meta.pagination.has_next is False
        assert response.meta.pagination.has_prev is True

    def test_api_response_paginated_partial_last_page(self):
        """Test paginated response when last page is partial."""
        items = [{"id": str(i)} for i in range(80, 95)]
        response = ApiResponse.paginated(
            items=items,
            total=95,
            page=5,
            page_size=20
        )

        assert response.success is True
        assert len(response.data) == 15  # Only 15 items on last page
        assert response.meta.pagination.total == 95
        assert response.meta.pagination.total_pages == 5
        assert response.meta.pagination.has_next is False

    def test_api_response_paginated_empty_result(self):
        """Test paginated response with no items."""
        response = ApiResponse.paginated(
            items=[],
            total=0,
            page=1,
            page_size=20
        )

        assert response.success is True
        assert len(response.data) == 0
        assert response.meta.pagination.total == 0
        assert response.meta.pagination.total_pages == 0
        assert response.meta.pagination.has_next is False
        assert response.meta.pagination.has_prev is False

    def test_api_response_paginated_single_page(self):
        """Test paginated response when all items fit on one page."""
        items = [{"id": str(i)} for i in range(10)]
        response = ApiResponse.paginated(
            items=items,
            total=10,
            page=1,
            page_size=20
        )

        assert response.success is True
        assert len(response.data) == 10
        assert response.meta.pagination.total == 10
        assert response.meta.pagination.total_pages == 1
        assert response.meta.pagination.has_next is False
        assert response.meta.pagination.has_prev is False

    def test_api_response_paginated_with_cache_info(self):
        """Test paginated response with cache metadata."""
        items = [{"id": "1"}, {"id": "2"}]
        response = ApiResponse.paginated(
            items=items,
            total=100,
            page=1,
            page_size=20,
            cached=True,
            cache_ttl=300
        )

        assert response.success is True
        assert response.meta.cached is True
        assert response.meta.cache_ttl == 300
        assert response.meta.pagination is not None

    def test_api_response_paginated_serialization(self):
        """Test that paginated response can be serialized."""
        items = [{"id": "1"}, {"id": "2"}]
        response = ApiResponse.paginated(
            items=items,
            total=100,
            page=1,
            page_size=20
        )

        serialized = response.model_dump()
        assert serialized["success"] is True
        assert len(serialized["data"]) == 2
        assert serialized["meta"]["pagination"]["total"] == 100
        assert serialized["meta"]["pagination"]["page"] == 1
        assert serialized["meta"]["pagination"]["total_pages"] == 5


class TestApiResponseIntegration:
    """Integration tests for API response models."""

    def test_response_format_consistency(self):
        """Test that all response types have consistent structure."""
        # Success response
        ok_response = ApiResponse.ok(data={"test": "data"})
        ok_dict = ok_response.model_dump()

        # Error response
        error_response = ApiResponse.error(code="TEST", message="Test error")
        error_dict = error_response.model_dump()

        # Paginated response
        paginated_response = ApiResponse.paginated(
            items=[{"id": "1"}], total=1, page=1, page_size=20
        )
        paginated_dict = paginated_response.model_dump()

        # All should have these top-level keys
        for response_dict in [ok_dict, error_dict, paginated_dict]:
            assert "success" in response_dict
            assert "data" in response_dict
            assert "meta" in response_dict
            assert "errors" in response_dict

    def test_success_response_never_has_errors(self):
        """Test that success responses never have errors field populated."""
        response = ApiResponse.ok(data={"test": "data"})
        assert response.success is True
        assert response.errors is None

    def test_error_response_never_has_data(self):
        """Test that error responses never have data field populated."""
        response = ApiResponse.error(code="TEST", message="Test")
        assert response.success is False
        assert response.data is None

    def test_paginated_response_has_both_data_and_pagination(self):
        """Test that paginated responses have both data and pagination."""
        response = ApiResponse.paginated(
            items=[{"id": "1"}], total=10, page=1, page_size=20
        )
        assert response.success is True
        assert response.data is not None
        assert response.meta.pagination is not None

    def test_response_type_hints_work(self):
        """Test that generic type hints work correctly."""
        # String data
        str_response: ApiResponse[str] = ApiResponse.ok(data="test")
        assert isinstance(str_response.data, str)

        # Dict data
        dict_response: ApiResponse[Dict[str, Any]] = ApiResponse.ok(data={"key": "value"})
        assert isinstance(dict_response.data, dict)

        # List data
        list_response: ApiResponse[List[Dict[str, Any]]] = ApiResponse.paginated(
            items=[{"id": "1"}], total=1, page=1, page_size=20
        )
        assert isinstance(list_response.data, list)
