"""
Banks Router - API Endpoints

Tier 1 caching (300s TTL) for bank list endpoints.
Tier 2 caching (180s TTL) for individual bank lookups.
Cache invalidation on POST/DELETE mutations via "banks" tag.

Rate limits:
- GET endpoints: 200 req/min (RATE_LIMIT_READ)
- POST/DELETE endpoints: 20 req/min (RATE_LIMIT_WRITE)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.common.decorators.cache import cached, invalidate_cache
from app.common.middleware.rate_limit import RATE_LIMIT_READ, RATE_LIMIT_WRITE, limiter
from app.common.responses import ApiResponse
from app.core.database import get_db
from app.core.schemas import ListResponse
from app.modules.banks.schemas import BankCreate, BankSummary
from app.modules.banks.service import BankService

router = APIRouter()


def get_bank_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> BankService:
    """Dependency to get bank service."""
    return BankService(db)


@router.get("/", response_model=ApiResponse[List[BankSummary]])
@limiter.limit(RATE_LIMIT_READ)
@cached(module="banks", endpoint="get_all", ttl=300, tags=["banks"])
async def get_all_banks(
    request: Request,
    category: Optional[str] = Query(None, description="Filter by category"),
    type: Optional[str] = Query(None, description="Filter by type"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    service: BankService = Depends(get_bank_service),
) -> ApiResponse[List[BankSummary]]:
    """
    Get all banks with optional filtering and pagination.

    Returns:
        Standardized API response with pagination metadata:
        - success: true
        - data: List of bank summary objects
        - meta.pagination: Pagination information (total, page, page_size, has_next, has_prev)
    """
    # Convert page/page_size to skip/limit for service layer
    skip = (page - 1) * page_size
    limit = page_size

    banks = await service.get_all_banks(
        category=category,
        bank_type=type,
        skip=skip,
        limit=limit,
    )

    # Note: Currently using len(banks) as total. In production, should get actual count from DB
    # TODO: Update service to return total count from MongoDB aggregation
    return ApiResponse.paginated(
        items=banks,
        total=len(banks),
        page=page,
        page_size=page_size
    )


@router.get("/traditional", response_model=ApiResponse[List[BankSummary]])
@limiter.limit(RATE_LIMIT_READ)
@cached(module="banks", endpoint="traditional", ttl=300, tags=["banks"])
async def get_traditional_banks(
    request: Request,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    service: BankService = Depends(get_bank_service),
) -> ApiResponse[List[BankSummary]]:
    """Get all traditional banks."""
    banks = await service.get_traditional_banks()
    # Apply pagination manually since we have all results
    start = (page - 1) * page_size
    end = start + page_size
    paginated_banks = banks[start:end]
    return ApiResponse.paginated(
        items=paginated_banks,
        total=len(banks),
        page=page,
        page_size=page_size
    )


@router.get("/digital", response_model=ApiResponse[List[BankSummary]])
@limiter.limit(RATE_LIMIT_READ)
@cached(module="banks", endpoint="digital", ttl=300, tags=["banks"])
async def get_digital_banks(
    request: Request,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    service: BankService = Depends(get_bank_service),
) -> ApiResponse[List[BankSummary]]:
    """Get all digital banks."""
    banks = await service.get_digital_banks()
    # Apply pagination manually since we have all results
    start = (page - 1) * page_size
    end = start + page_size
    paginated_banks = banks[start:end]
    return ApiResponse.paginated(
        items=paginated_banks,
        total=len(banks),
        page=page,
        page_size=page_size
    )


@router.get("/{bank_id}", response_model=ApiResponse[dict])
@limiter.limit(RATE_LIMIT_READ)
@cached(module="banks", endpoint="by_id", ttl=180, tags=["banks"])
async def get_bank_by_id(
    request: Request,
    bank_id: str,
    service: BankService = Depends(get_bank_service),
) -> ApiResponse[dict]:
    """Get a specific bank by ID."""
    bank = await service.get_bank_by_id(bank_id)
    return ApiResponse.ok(data=bank)


@router.get("/{bank_id}/loans", response_model=ApiResponse[dict])
@limiter.limit(RATE_LIMIT_READ)
@cached(module="banks", endpoint="bank_loans", ttl=180, tags=["banks", "loans"])
async def get_bank_loans(
    request: Request,
    bank_id: str,
    service: BankService = Depends(get_bank_service),
) -> ApiResponse[dict]:
    """Get all loans for a specific bank."""
    loans = await service.get_bank_loans(bank_id)
    return ApiResponse.ok(data=loans)


@router.post("/", response_model=ApiResponse[dict])
@limiter.limit(RATE_LIMIT_WRITE)
@invalidate_cache(tags=["banks", "analytics"])
async def create_bank(
    request: Request,
    bank: BankCreate,
    service: BankService = Depends(get_bank_service),
) -> ApiResponse[dict]:
    """Create a new bank."""
    result = await service.create_bank(bank)
    return ApiResponse.ok(data=result)


@router.delete("/{bank_id}", response_model=ApiResponse[dict])
@limiter.limit(RATE_LIMIT_WRITE)
@invalidate_cache(tags=["banks", "analytics"])
async def delete_bank(
    request: Request,
    bank_id: str,
    service: BankService = Depends(get_bank_service),
) -> ApiResponse[dict]:
    """Delete a bank."""
    result = await service.delete_bank(bank_id)
    return ApiResponse.ok(data=result)
