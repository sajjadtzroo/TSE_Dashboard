"""
Loans Router

Tier 2 caching (180s TTL) for filtered loan queries.
Cache invalidation is inherited from bank mutations (loans are embedded in banks).

Rate limits: 200 req/min (RATE_LIMIT_READ) on all GET endpoints.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.common.decorators.cache import cached
from app.common.middleware.rate_limit import RATE_LIMIT_READ, limiter
from app.common.responses import ApiResponse
from app.core.database import get_db
from app.modules.loans.schemas import LoanCompareResponse, LoanListResponse
from app.modules.loans.service import LoanService

router = APIRouter()


def get_loan_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> LoanService:
    """Dependency to get loan service."""
    return LoanService(db)


@router.get("/", response_model=ApiResponse[List[Dict[str, Any]]])
@limiter.limit(RATE_LIMIT_READ)
@cached(module="loans", endpoint="get_all", ttl=180, tags=["loans"])
async def get_all_loans(
    request: Request,
    no_guarantor: Optional[bool] = Query(None, description="Filter no guarantor loans"),
    calculation_method: Optional[str] = Query(None, description="Filter by calculation method"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    service: LoanService = Depends(get_loan_service),
) -> ApiResponse[List[Dict[str, Any]]]:
    """
    Get all loans with optional filtering and pagination.

    Performance: Filtering happens in MongoDB for 8-10x faster response time.

    Returns:
        Standardized API response with pagination metadata:
        - success: true
        - data: List of loan objects
        - meta.pagination: Pagination information (total, page, page_size, has_next, has_prev)
    """
    # Convert page/page_size to skip/limit for service layer
    skip = (page - 1) * page_size
    limit = page_size

    result = await service.get_all_loans(
        no_guarantor=no_guarantor,
        calculation_method=calculation_method,
        skip=skip,
        limit=limit,
    )

    return ApiResponse.paginated(
        items=result["loans"],
        total=result["total"],
        page=page,
        page_size=page_size
    )


@router.get("/no-guarantor/", response_model=ApiResponse[List[Dict[str, Any]]])
@limiter.limit(RATE_LIMIT_READ)
@cached(module="loans", endpoint="no_guarantor", ttl=180, tags=["loans"])
async def get_no_guarantor_loans(
    request: Request,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    service: LoanService = Depends(get_loan_service),
) -> ApiResponse[List[Dict[str, Any]]]:
    """Get all loans without guarantor requirement."""
    skip = (page - 1) * page_size
    limit = page_size
    result = await service.get_no_guarantor_loans(skip=skip, limit=limit)
    return ApiResponse.paginated(
        items=result["loans"],
        total=result["total"],
        page=page,
        page_size=page_size
    )


@router.get("/by-method/{method}/", response_model=ApiResponse[List[Dict[str, Any]]])
@limiter.limit(RATE_LIMIT_READ)
@cached(module="loans", endpoint="by_method", ttl=180, tags=["loans"])
async def get_loans_by_method(
    request: Request,
    method: str,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    service: LoanService = Depends(get_loan_service),
) -> ApiResponse[List[Dict[str, Any]]]:
    """Get loans by calculation method."""
    skip = (page - 1) * page_size
    limit = page_size
    result = await service.get_loans_by_method(method, skip=skip, limit=limit)
    return ApiResponse.paginated(
        items=result["loans"],
        total=result["total"],
        page=page,
        page_size=page_size
    )


@router.get("/compare/", response_model=ApiResponse[LoanCompareResponse])
@limiter.limit(RATE_LIMIT_READ)
@cached(module="loans", endpoint="compare", ttl=120, tags=["loans"])
async def compare_loans(
    request: Request,
    loan_ids: str = Query(
        ..., description="Comma-separated loan IDs (format: bankId:loanId)"
    ),
    service: LoanService = Depends(get_loan_service),
) -> ApiResponse[LoanCompareResponse]:
    """Compare multiple loans."""
    loan_id_list = [lid.strip() for lid in loan_ids.split(",")]
    result = await service.compare_loans(loan_id_list)
    comparison_data = LoanCompareResponse(
        comparison=result.get("comparison", []),
        total_compared=result.get("totalCompared", len(result.get("comparison", [])))
    )
    return ApiResponse.ok(data=comparison_data)


@router.get("/deposits/rates", response_model=ApiResponse[List[Dict[str, Any]]])
@limiter.limit(RATE_LIMIT_READ)
@cached(module="loans", endpoint="deposit_rates", ttl=300, tags=["loans"])
async def get_deposit_rates(
    request: Request,
    service: LoanService = Depends(get_loan_service),
) -> ApiResponse[List[Dict[str, Any]]]:
    """
    Get all deposit rate multipliers across banks.

    Returns coefficient table data for all loans that have deposit-based calculations.
    Useful for comparing deposit-to-loan ratios across different banks and loan products.
    """
    result = await service.get_deposit_rates()
    return ApiResponse.ok(data=result)


@router.get("/deposits/calculator", response_model=ApiResponse[Dict[str, Any]])
@limiter.limit(RATE_LIMIT_READ)
async def calculate_deposit_loan(
    request: Request,
    deposit_amount: int = Query(..., description="Deposit amount in Rials", ge=1000000),
    deposit_months: int = Query(..., description="Deposit duration in months", ge=1, le=60),
    bank_id: Optional[str] = Query(None, description="Specific bank ID (optional)"),
    service: LoanService = Depends(get_loan_service),
) -> ApiResponse[Dict[str, Any]]:
    """
    Calculate loan amount based on deposit.

    Uses coefficient tables to compute maximum loan amount based on:
    - Deposit amount
    - Deposit duration (months)
    - Bank-specific multipliers

    If bank_id is provided, calculates for that specific bank.
    Otherwise, returns calculations for all banks with deposit-based loans.
    """
    result = await service.calculate_deposit_loan(
        deposit_amount=deposit_amount,
        deposit_months=deposit_months,
        bank_id=bank_id
    )
    return ApiResponse.ok(data=result)
