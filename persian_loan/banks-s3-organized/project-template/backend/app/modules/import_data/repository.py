"""
Import Data Repository
"""

from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logger import get_logger
from app.modules.import_data.schemas import ImportLog, ImportStatus, ImportType

logger = get_logger(__name__)


class ImportRepository:
    """Repository for import data operations."""

    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize repository."""
        self.db = db
        self.collection = db["import_logs"]

    async def create_import_log(
        self, import_type: ImportType, source: str, data: Optional[dict] = None
    ) -> str:
        """
        Create a new import log entry.

        Args:
            import_type: Type of import operation
            source: Source of the import (URL, file name, etc.)
            data: Optional data associated with the import

        Returns:
            Import log ID
        """
        logger.info(f"Creating import log: {import_type.value} - {source}")

        import_log = {
            "importType": import_type.value,
            "status": ImportStatus.PENDING.value,
            "source": source,
            "data": data,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }

        result = await self.collection.insert_one(import_log)
        log_id = str(result.inserted_id)

        logger.success(f"Created import log: {log_id}")
        return log_id

    async def update_import_status(
        self,
        import_id: str,
        status: ImportStatus,
        data: Optional[dict] = None,
        error: Optional[str] = None,
    ) -> bool:
        """
        Update import log status.

        Args:
            import_id: Import log ID
            status: New status
            data: Updated data
            error: Error message if failed

        Returns:
            True if updated successfully
        """
        logger.info(f"Updating import log {import_id} to status: {status.value}")

        update_data = {
            "status": status.value,
            "updatedAt": datetime.utcnow(),
        }

        if data is not None:
            update_data["data"] = data

        if error is not None:
            update_data["error"] = error

        if status == ImportStatus.COMPLETED:
            update_data["completedAt"] = datetime.utcnow()

        result = await self.collection.update_one(
            {"_id": ObjectId(import_id)}, {"$set": update_data}
        )

        return result.modified_count > 0

    async def get_import_log(self, import_id: str) -> Optional[dict]:
        """
        Get import log by ID.

        Args:
            import_id: Import log ID

        Returns:
            Import log document or None
        """
        logger.debug(f"Getting import log: {import_id}")

        import_log = await self.collection.find_one({"_id": ObjectId(import_id)})

        if import_log:
            import_log["importId"] = str(import_log["_id"])
            del import_log["_id"]

        return import_log

    async def get_all_import_logs(
        self, limit: int = 50, import_type: Optional[ImportType] = None
    ) -> List[dict]:
        """
        Get all import logs.

        Args:
            limit: Maximum number of logs to return
            import_type: Filter by import type

        Returns:
            List of import logs
        """
        logger.debug(f"Getting import logs (limit: {limit})")

        query = {}
        if import_type:
            query["importType"] = import_type.value

        cursor = self.collection.find(query).sort("createdAt", -1).limit(limit)

        import_logs = []
        async for log in cursor:
            log["importId"] = str(log["_id"])
            del log["_id"]
            import_logs.append(log)

        logger.info(f"Retrieved {len(import_logs)} import logs")
        return import_logs

    async def get_recent_imports(
        self, limit: int = 10, status: Optional[ImportStatus] = None
    ) -> List[dict]:
        """
        Get recent import logs.

        Args:
            limit: Maximum number of logs to return
            status: Filter by status

        Returns:
            List of recent import logs
        """
        logger.debug(f"Getting recent imports (limit: {limit})")

        query = {}
        if status:
            query["status"] = status.value

        cursor = self.collection.find(query).sort("createdAt", -1).limit(limit)

        imports = []
        async for log in cursor:
            log["importId"] = str(log["_id"])
            del log["_id"]
            imports.append(log)

        return imports

    async def delete_import_log(self, import_id: str) -> bool:
        """
        Delete import log.

        Args:
            import_id: Import log ID

        Returns:
            True if deleted successfully
        """
        logger.info(f"Deleting import log: {import_id}")

        result = await self.collection.delete_one({"_id": ObjectId(import_id)})
        return result.deleted_count > 0

    async def get_import_stats(self) -> dict:
        """
        Get import statistics.

        Returns:
            Dictionary with import statistics
        """
        logger.debug("Getting import statistics")

        pipeline = [
            {
                "$group": {
                    "_id": {
                        "type": "$importType",
                        "status": "$status",
                    },
                    "count": {"$sum": 1},
                }
            }
        ]

        cursor = self.collection.aggregate(pipeline)

        stats = {
            "total": 0,
            "by_type": {},
            "by_status": {},
        }

        async for result in cursor:
            import_type = result["_id"]["type"]
            status = result["_id"]["status"]
            count = result["count"]

            stats["total"] += count

            if import_type not in stats["by_type"]:
                stats["by_type"][import_type] = 0
            stats["by_type"][import_type] += count

            if status not in stats["by_status"]:
                stats["by_status"][status] = 0
            stats["by_status"][status] += count

        return stats
