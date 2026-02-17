"""
Import Data Service
"""

import tempfile
import atexit
import os
from contextlib import contextmanager
from pathlib import Path
from typing import List, Optional

from fastapi import UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.logger import get_logger
from app.modules.import_data.ocr_service import OCRService
from app.modules.import_data.repository import ImportRepository
from app.modules.import_data.schemas import (
    ImportStatus,
    ImportType,
    OCRLanguage,
    OCRResult,
    WebScrapingRequest,
)
from app.modules.scraper.scraper_service import ScraperService

logger = get_logger(__name__)


class ImportService:
    """Service for import operations with automatic temp file cleanup."""

    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize service."""
        self.repository = ImportRepository(db)
        self.ocr_service = OCRService()
        self.scraper_service = ScraperService()
        self.temp_files: List[str] = []

        # Register cleanup on exit
        atexit.register(self.cleanup_temp_files)

    @contextmanager
    def temp_file_context(self, suffix: str = ""):
        """Context manager for temporary file cleanup.

        Args:
            suffix: File suffix for the temporary file

        Yields:
            str: Path to temporary file

        Example:
            with service.temp_file_context(suffix=".pdf") as temp_path:
                # Use temp_path
                ...
            # File automatically cleaned up after context
        """
        temp_path = None
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            temp_path = temp_file.name
            temp_file.close()
            self.temp_files.append(temp_path)

            yield temp_path
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                    if temp_path in self.temp_files:
                        self.temp_files.remove(temp_path)
                    logger.debug(f"Cleaned up temp file: {temp_path}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp file {temp_path}: {e}")

    def cleanup_temp_files(self):
        """Cleanup all tracked temporary files."""
        for temp_path in self.temp_files[:]:
            if os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                    self.temp_files.remove(temp_path)
                    logger.debug(f"Cleaned up tracked temp file: {temp_path}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup tracked file {temp_path}: {e}")

    async def upload_file(self, file: UploadFile) -> dict:
        """
        Handle file upload.

        Args:
            file: Uploaded file

        Returns:
            File metadata
        """
        logger.info(f"Uploading file: {file.filename}")

        # Read file content
        content = await file.read()

        # Create import log
        import_id = await self.repository.create_import_log(
            import_type=ImportType.OCR,
            source=file.filename,
            data={
                "filename": file.filename,
                "content_type": file.content_type,
                "size": len(content),
            },
        )

        # Store file temporarily (in production, use S3 or similar)
        with self.temp_file_context(suffix=Path(file.filename).suffix) as temp_path:
            with open(temp_path, 'wb') as temp_file:
                temp_file.write(content)

            # Update import log with file path
            await self.repository.update_import_status(
                import_id=import_id,
                status=ImportStatus.PENDING,
                data={
                    "filename": file.filename,
                    "content_type": file.content_type,
                    "size": len(content),
                    "temp_path": temp_path,
                },
            )

            logger.success(f"File uploaded successfully: {import_id}")

        return {
            "file_id": import_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(content),
        }

    async def process_ocr(
        self, file_id: str, language: OCRLanguage = OCRLanguage.PERSIAN_ENGLISH
    ) -> OCRResult:
        """
        Process file with OCR.

        Args:
            file_id: Import log ID (file ID)
            language: OCR language

        Returns:
            OCR processing result
        """
        logger.info(f"Processing OCR for file: {file_id}")

        # Get import log
        import_log = await self.repository.get_import_log(file_id)
        if not import_log:
            raise ValueError(f"File not found: {file_id}")

        # Update status to processing
        await self.repository.update_import_status(
            import_id=file_id,
            status=ImportStatus.PROCESSING,
        )

        try:
            # Get file data
            temp_path = import_log["data"].get("temp_path")
            content_type = import_log["data"].get("content_type")

            if not temp_path:
                raise ValueError("File path not found in import log")

            # Read file
            with open(temp_path, "rb") as f:
                file_bytes = f.read()

            # Process OCR
            ocr_result = await self.ocr_service.process_file(
                file_bytes=file_bytes,
                content_type=content_type,
                language=language,
            )

            # Extract loan data
            loan_data = self.ocr_service.extract_loan_data(ocr_result.text)

            # Update import log with results
            await self.repository.update_import_status(
                import_id=file_id,
                status=ImportStatus.COMPLETED,
                data={
                    **import_log["data"],
                    "ocr_result": {
                        "text": ocr_result.text,
                        "confidence": ocr_result.confidence,
                        "language": ocr_result.language,
                        "page_count": ocr_result.page_count,
                    },
                    "extracted_data": loan_data,
                },
            )

            logger.success(f"OCR processing completed for file: {file_id}")

            return ocr_result

        except Exception as e:
            logger.error(f"OCR processing failed: {e}")

            # Update status to failed
            await self.repository.update_import_status(
                import_id=file_id,
                status=ImportStatus.FAILED,
                error=str(e),
            )

            raise

    async def scrape_web(self, request: WebScrapingRequest) -> dict:
        """
        Scrape web URLs for loan data.

        Args:
            request: Web scraping request

        Returns:
            Scraping results
        """
        logger.info(f"Starting web scraping for {len(request.urls)} URLs")

        # Create import log
        import_id = await self.repository.create_import_log(
            import_type=ImportType.WEB_SCRAPING,
            source=", ".join(request.urls[:3]) + ("..." if len(request.urls) > 3 else ""),
            data={
                "urls": request.urls,
                "bank_id": request.bank_id,
                "deep_scrape": request.deep_scrape,
            },
        )

        # Update status to processing
        await self.repository.update_import_status(
            import_id=import_id,
            status=ImportStatus.PROCESSING,
        )

        try:
            # Scrape URLs
            results = await self.scraper_service.scrape_multiple_urls(
                urls=request.urls,
                deep_scrape=request.deep_scrape,
            )

            # Update import log with results
            await self.repository.update_import_status(
                import_id=import_id,
                status=ImportStatus.COMPLETED,
                data={
                    "urls": request.urls,
                    "bank_id": request.bank_id,
                    "deep_scrape": request.deep_scrape,
                    "results": results,
                },
            )

            logger.success(f"Web scraping completed: {import_id}")

            return {
                "import_id": import_id,
                "results": results,
            }

        except Exception as e:
            logger.error(f"Web scraping failed: {e}")

            # Update status to failed
            await self.repository.update_import_status(
                import_id=import_id,
                status=ImportStatus.FAILED,
                error=str(e),
            )

            raise

    async def get_import_status(self, import_id: str) -> Optional[dict]:
        """
        Get import status.

        Args:
            import_id: Import log ID

        Returns:
            Import log details
        """
        return await self.repository.get_import_log(import_id)

    async def get_all_imports(
        self, limit: int = 50, import_type: Optional[ImportType] = None
    ) -> dict:
        """
        Get all imports.

        Args:
            limit: Maximum number of imports to return
            import_type: Filter by import type

        Returns:
            List of imports
        """
        imports = await self.repository.get_all_import_logs(
            limit=limit, import_type=import_type
        )

        return {
            "total": len(imports),
            "imports": imports,
        }

    async def get_import_stats(self) -> dict:
        """
        Get import statistics.

        Returns:
            Import statistics
        """
        return await self.repository.get_import_stats()
