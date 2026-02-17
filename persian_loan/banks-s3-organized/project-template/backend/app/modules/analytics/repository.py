"""
Analytics Repository
"""

from typing import Any, Dict, List

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.base_repository import BaseRepository
from app.core.constants import Collections, QueryLimits
from app.core.logger import get_logger

logger = get_logger(__name__)


class AnalyticsRepository(BaseRepository):
    """Repository for analytics database operations."""

    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, Collections.BANKS)

    async def get_all_banks(self) -> List[Dict[str, Any]]:
        """
        Get all banks for analytics.

        Returns:
            List of bank documents
        """
        return await self.find_many({}, limit=QueryLimits.MAX_BANKS)

    async def count_by_category(self) -> Dict[str, int]:
        """
        Count banks by category using aggregation.

        Returns:
            Dictionary mapping category to count
        """
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        ]
        results = await self.aggregate(pipeline)
        return {r["_id"]: r["count"] for r in results}

    async def get_calculation_method_distribution(self) -> Dict[str, int]:
        """
        Get calculation method distribution using aggregation.

        More efficient than loading all banks and counting in Python.

        Returns:
            Dictionary mapping calculation method to count
        """
        pipeline = [
            {
                "$group": {
                    "_id": {"$ifNull": ["$calculationMethod", "unknown"]},
                    "count": {"$sum": 1}
                }
            }
        ]
        results = await self.aggregate(pipeline)
        return {r["_id"]: r["count"] for r in results}

    async def get_analytics_summary(self) -> Dict[str, Any]:
        """
        Get comprehensive analytics summary using single aggregation pipeline.

        This is much more efficient than multiple separate queries.

        Returns:
            Dictionary with all analytics data
        """
        pipeline = [
            {
                "$facet": {
                    # Total counts
                    "total_banks": [
                        {"$count": "count"}
                    ],
                    # Banks by category
                    "by_category": [
                        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
                    ],
                    # Total loans
                    "total_loans": [
                        {"$group": {"_id": None, "total": {"$sum": "$loansCount"}}}
                    ],
                    # Calculation methods
                    "calc_methods": [
                        {
                            "$group": {
                                "_id": {"$ifNull": ["$calculationMethod", "unknown"]},
                                "count": {"$sum": 1}
                            }
                        }
                    ]
                }
            }
        ]

        results = await self.aggregate(pipeline)
        if not results:
            return {}

        result = results[0]

        return {
            "total_banks": result["total_banks"][0]["count"] if result["total_banks"] else 0,
            "by_category": {r["_id"]: r["count"] for r in result["by_category"]},
            "total_loans": result["total_loans"][0]["total"] if result["total_loans"] else 0,
            "calculation_methods": {r["_id"]: r["count"] for r in result["calc_methods"]}
        }
