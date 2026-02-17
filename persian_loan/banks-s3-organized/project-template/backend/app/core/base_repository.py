"""
Base Repository

Provides common database operations and utilities for all repositories.
"""

from typing import Any, Dict, List, Optional, TypeVar, Generic
from abc import ABC

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection

from app.core.logger import get_logger

logger = get_logger(__name__)

T = TypeVar('T')


class BaseRepository(ABC, Generic[T]):
    """
    Base repository with common MongoDB operations.

    Provides:
    - Document ID conversion (_id to id)
    - Common CRUD operations
    - Query utilities
    - Error handling
    """

    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str):
        """
        Initialize repository.

        Args:
            db: MongoDB database instance
            collection_name: Name of the collection
        """
        self.db = db
        self.collection: AsyncIOMotorCollection = db[collection_name]
        self.collection_name = collection_name

    @staticmethod
    def _convert_id(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Convert MongoDB _id to string id field.

        Args:
            doc: Document from MongoDB

        Returns:
            Document with id field instead of _id, or None
        """
        if not doc:
            return None

        if "_id" in doc:
            # Only convert _id to id if there's no custom id field
            if "id" not in doc:
                doc["id"] = str(doc["_id"])
            # Always remove _id to prevent conflicts
            del doc["_id"]

        return doc

    @staticmethod
    def _convert_ids(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Convert MongoDB _id to string id for list of documents.

        Args:
            docs: List of documents from MongoDB

        Returns:
            List of documents with id fields
        """
        result = []
        for doc in docs:
            if "_id" in doc:
                # Only convert _id to id if there's no custom id field
                if "id" not in doc:
                    doc["id"] = str(doc["_id"])
                # Always remove _id to prevent conflicts
                del doc["_id"]
            result.append(doc)
        return result

    @staticmethod
    def _to_object_id(id_str: str) -> ObjectId:
        """
        Convert string ID to MongoDB ObjectId.

        Args:
            id_str: String representation of ObjectId

        Returns:
            ObjectId instance

        Raises:
            ValueError: If string is not a valid ObjectId
        """
        try:
            return ObjectId(id_str)
        except Exception as e:
            logger.error(f"Invalid ObjectId format: {id_str}")
            raise ValueError(f"Invalid ID format: {id_str}") from e

    async def find_one(
        self,
        query: Dict[str, Any],
        projection: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Find a single document.

        Args:
            query: MongoDB query
            projection: Fields to include/exclude

        Returns:
            Document or None
        """
        doc = await self.collection.find_one(query, projection)
        return self._convert_id(doc)

    async def find_many(
        self,
        query: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        sort: Optional[List[tuple]] = None,
        projection: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Find multiple documents.

        Args:
            query: MongoDB query
            skip: Number of documents to skip
            limit: Maximum number of documents to return
            sort: Sort specification (list of (field, direction) tuples)
            projection: Fields to include/exclude

        Returns:
            List of documents
        """
        cursor = self.collection.find(query, projection)

        if sort:
            cursor = cursor.sort(sort)

        cursor = cursor.skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)

        return self._convert_ids(docs)

    async def insert_one(self, document: Dict[str, Any]) -> str:
        """
        Insert a single document.

        Args:
            document: Document to insert

        Returns:
            Inserted document ID as string
        """
        result = await self.collection.insert_one(document)
        logger.info(f"Inserted document in {self.collection_name}: {result.inserted_id}")
        return str(result.inserted_id)

    async def insert_many(self, documents: List[Dict[str, Any]]) -> List[str]:
        """
        Insert multiple documents.

        Args:
            documents: List of documents to insert

        Returns:
            List of inserted document IDs as strings
        """
        if not documents:
            return []

        result = await self.collection.insert_many(documents)
        logger.info(f"Inserted {len(result.inserted_ids)} documents in {self.collection_name}")
        return [str(id) for id in result.inserted_ids]

    async def update_one(
        self,
        query: Dict[str, Any],
        update: Dict[str, Any]
    ) -> bool:
        """
        Update a single document.

        Args:
            query: Query to find document
            update: Update operations

        Returns:
            True if document was modified
        """
        result = await self.collection.update_one(query, update)
        return result.modified_count > 0

    async def update_many(
        self,
        query: Dict[str, Any],
        update: Dict[str, Any]
    ) -> int:
        """
        Update multiple documents.

        Args:
            query: Query to find documents
            update: Update operations

        Returns:
            Number of documents modified
        """
        result = await self.collection.update_many(query, update)
        return result.modified_count

    async def delete_one(self, query: Dict[str, Any]) -> bool:
        """
        Delete a single document.

        Args:
            query: Query to find document

        Returns:
            True if document was deleted
        """
        result = await self.collection.delete_one(query)
        return result.deleted_count > 0

    async def delete_many(self, query: Dict[str, Any]) -> int:
        """
        Delete multiple documents.

        Args:
            query: Query to find documents

        Returns:
            Number of documents deleted
        """
        result = await self.collection.delete_many(query)
        return result.deleted_count

    async def count(self, query: Optional[Dict[str, Any]] = None) -> int:
        """
        Count documents matching query.

        Args:
            query: MongoDB query (empty dict for all documents)

        Returns:
            Count of matching documents
        """
        return await self.collection.count_documents(query or {})

    async def exists(self, query: Dict[str, Any]) -> bool:
        """
        Check if document exists.

        Args:
            query: MongoDB query

        Returns:
            True if at least one document matches
        """
        count = await self.collection.count_documents(query, limit=1)
        return count > 0

    async def aggregate(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Execute aggregation pipeline.

        Args:
            pipeline: MongoDB aggregation pipeline

        Returns:
            List of aggregation results
        """
        cursor = self.collection.aggregate(pipeline)
        return await cursor.to_list(length=None)

    async def bulk_find_by_ids(self, ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch multiple documents by IDs efficiently.

        Args:
            ids: List of document IDs as strings

        Returns:
            Dictionary mapping ID to document
        """
        if not ids:
            return {}

        object_ids = [self._to_object_id(id_str) for id_str in ids]
        cursor = self.collection.find({"_id": {"$in": object_ids}})
        docs = await cursor.to_list(length=len(ids))

        result = {}
        for doc in docs:
            doc_id = str(doc["_id"])
            doc["id"] = doc_id
            del doc["_id"]
            result[doc_id] = doc

        return result
