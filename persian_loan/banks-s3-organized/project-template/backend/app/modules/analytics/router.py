"""
Analytics Router

Tier 1 caching (300s TTL): Analytics endpoints are read-heavy, rarely mutated,
and serve aggregated data that is expensive to compute.
"""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.common.decorators.cache import cached
from app.common.responses import ApiResponse
from app.core.database import get_db
from app.modules.analytics.service import AnalyticsService
from app.modules.analytics.schemas import (
    SummaryResponse,
    ByCategoryResponse,
    InterestRatesResponse,
    LoanAmountsResponse,
    RequirementsMatrixResponse,
)

router = APIRouter()


def get_analytics_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> AnalyticsService:
    """Dependency to get analytics service."""
    return AnalyticsService(db)


@router.get("/summary/", response_model=ApiResponse[SummaryResponse])
@cached(module="analytics", endpoint="summary", ttl=300, tags=["analytics", "banks"])
async def get_summary(
    service: AnalyticsService = Depends(get_analytics_service),
) -> ApiResponse[SummaryResponse]:
    """
    Get overall summary statistics (overview).

    Returns:
        Standardized API response:
        - success: true
        - data: Summary statistics object with bank and loan counts
        - meta.timestamp: Response generation time
    """
    summary = await service.get_summary()
    return ApiResponse.ok(data=summary)


@router.get("/by-category/", response_model=ApiResponse[ByCategoryResponse])
@cached(module="analytics", endpoint="by_category", ttl=300, tags=["analytics", "banks"])
async def get_by_category(
    service: AnalyticsService = Depends(get_analytics_service),
) -> ApiResponse[ByCategoryResponse]:
    """Get banks grouped by category."""
    result = await service.get_by_category()
    data = ByCategoryResponse(
        traditional_banks=result.get("traditional-banks", []),
        digital_banks=result.get("digital-banks", [])
    )
    return ApiResponse.ok(data=data)


@router.get("/interest-rates/", response_model=ApiResponse[InterestRatesResponse])
@cached(module="analytics", endpoint="interest_rates", ttl=300, tags=["analytics", "loans"])
async def get_interest_rates(
    service: AnalyticsService = Depends(get_analytics_service),
) -> ApiResponse[InterestRatesResponse]:
    """Get interest rates distribution."""
    result = await service.get_interest_rates()
    data = InterestRatesResponse(
        distribution=result["distribution"],
        avg_rate=result["avgRate"],
        min_rate=result["minRate"],
        max_rate=result["maxRate"]
    )
    return ApiResponse.ok(data=data)


@router.get("/loan-amounts/", response_model=ApiResponse[LoanAmountsResponse])
@cached(module="analytics", endpoint="loan_amounts", ttl=300, tags=["analytics", "loans"])
async def get_loan_amounts(
    service: AnalyticsService = Depends(get_analytics_service),
) -> ApiResponse[LoanAmountsResponse]:
    """Get loan amounts range for each bank."""
    result = await service.get_loan_amounts()
    data = LoanAmountsResponse(
        banks=result["banks"],
        total_banks=result["totalBanks"]
    )
    return ApiResponse.ok(data=data)


@router.get("/requirements-matrix/", response_model=ApiResponse[RequirementsMatrixResponse])
@cached(module="analytics", endpoint="requirements_matrix", ttl=300, tags=["analytics", "banks"])
async def get_requirements_matrix(
    service: AnalyticsService = Depends(get_analytics_service),
) -> ApiResponse[RequirementsMatrixResponse]:
    """Get requirements matrix for all banks."""
    result = await service.get_requirements_matrix()
    data = RequirementsMatrixResponse(
        matrix=result["matrix"],
        total_banks=result["totalBanks"]
    )
    return ApiResponse.ok(data=data)
