"""
Query Parameter Validators
Validation for common query parameters like pagination, dates, etc.
"""

from datetime import datetime
from typing import Annotated, Optional

from fastapi import HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator


class PaginationParams(BaseModel):
    """Pagination parameters with validation."""

    skip: Annotated[int, Query(ge=0, description="Number of items to skip")] = 0
    limit: Annotated[
        int, Query(ge=1, le=1000, description="Maximum number of items to return")
    ] = 100

    @field_validator("limit")
    @classmethod
    def validate_limit(cls, v: int) -> int:
        """Ensure limit is reasonable."""
        if v > 1000:
            raise ValueError("Limit cannot exceed 1000")
        return v


def validate_skip_limit(skip: int = 0, limit: int = 100) -> dict:
    """
    Validate skip and limit parameters.

    Args:
        skip: Number of items to skip
        limit: Maximum items to return

    Returns:
        Dictionary with validated skip and limit

    Raises:
        HTTPException: If validation fails
    """
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="skip parameter must be non-negative",
        )

    if limit < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit parameter must be at least 1",
        )

    if limit > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit parameter cannot exceed 1000",
        )

    return {"skip": skip, "limit": limit}


def validate_date_range(
    start_date: Optional[str] = None, end_date: Optional[str] = None
) -> dict:
    """
    Validate date range parameters.

    Args:
        start_date: Start date in ISO format (YYYY-MM-DD)
        end_date: End date in ISO format (YYYY-MM-DD)

    Returns:
        Dictionary with validated start_date and end_date as datetime objects

    Raises:
        HTTPException: If validation fails
    """
    result = {}

    if start_date:
        try:
            result["start_date"] = datetime.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_date must be in ISO format (YYYY-MM-DD)",
            )

    if end_date:
        try:
            result["end_date"] = datetime.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_date must be in ISO format (YYYY-MM-DD)",
            )

    if result.get("start_date") and result.get("end_date"):
        if result["start_date"] > result["end_date"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_date must be before end_date",
            )

    return result


def validate_percentage(value: float, field_name: str = "value") -> float:
    """
    Validate percentage value (0-100).

    Args:
        value: Percentage value
        field_name: Name of the field for error messages

    Returns:
        Validated percentage

    Raises:
        HTTPException: If validation fails
    """
    if value < 0 or value > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be between 0 and 100",
        )
    return value


def validate_positive_number(value: float, field_name: str = "value") -> float:
    """
    Validate positive number.

    Args:
        value: Number value
        field_name: Name of the field for error messages

    Returns:
        Validated number

    Raises:
        HTTPException: If validation fails
    """
    if value <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be greater than 0",
        )
    return value
