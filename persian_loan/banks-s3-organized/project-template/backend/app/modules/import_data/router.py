"""
Import Data Router
"""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.common.responses import ApiResponse
from app.common.validators.file_upload import validate_file_upload
from app.core.database import get_db
from app.modules.import_data.schemas import (
    ImportListResponse,
    ImportStatusResponse,
    ImportType,
    OCRLanguage,
    WebScrapingRequest,
)
from app.modules.import_data.service import ImportService

router = APIRouter()


def get_import_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> ImportService:
    """Dependency to get import service."""
    return ImportService(db)


@router.post("/upload", response_model=ApiResponse[dict])
async def upload_file(
    file: UploadFile = File(..., description="File to upload for OCR processing"),
    service: ImportService = Depends(get_import_service),
) -> ApiResponse[dict]:
    """
    Upload a file for OCR processing.

    Supported file types:
    - Images: PNG, JPEG, JPG
    - Documents: PDF

    Maximum file size: 10MB

    The file will be stored temporarily and can be processed with OCR.
    """
    # Validate file (size, type, and content)
    await validate_file_upload(file)

    try:
        result = await service.upload_file(file)
        return ApiResponse.ok(data=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@router.post("/ocr/{file_id}", response_model=ApiResponse[dict])
async def process_ocr(
    file_id: str,
    language: OCRLanguage = Form(OCRLanguage.PERSIAN_ENGLISH, description="OCR language"),
    service: ImportService = Depends(get_import_service),
) -> ApiResponse[dict]:
    """
    Process uploaded file with OCR.

    Languages:
    - fas: Persian/Farsi only
    - eng: English only
    - fas+eng: Persian and English (default)

    Returns extracted text and confidence score.
    """
    try:
        result = await service.process_ocr(file_id, language)
        data = {
            "file_id": file_id,
            "language": result.language,
            "text": result.text,
            "confidence": result.confidence,
            "page_count": result.page_count,
        }
        return ApiResponse.ok(data=data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@router.post("/web", response_model=ApiResponse[dict])
async def scrape_web(
    request: WebScrapingRequest,
    service: ImportService = Depends(get_import_service),
) -> ApiResponse[dict]:
    """
    Scrape web URLs for loan data.

    Provide a list of URLs to scrape. The service will:
    1. Fetch each URL
    2. Parse HTML content
    3. Extract loan-related information
    4. Optionally follow links for deep scraping

    Returns:
    - Import ID for tracking
    - Scraping results for each URL
    """
    if not request.urls:
        raise HTTPException(status_code=400, detail="No URLs provided")

    if len(request.urls) > 10:
        raise HTTPException(
            status_code=400, detail="Maximum 10 URLs allowed per request"
        )

    try:
        result = await service.scrape_web(request)
        return ApiResponse.ok(data=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Web scraping failed: {str(e)}")


@router.get("/status/{import_id}", response_model=ApiResponse[dict])
async def get_import_status(
    import_id: str,
    service: ImportService = Depends(get_import_service),
) -> ApiResponse[dict]:
    """
    Get import status by ID.

    Returns:
    - Import type (ocr, web_scraping, manual)
    - Status (pending, processing, completed, failed)
    - Source information
    - Results (if completed)
    - Error message (if failed)
    """
    result = await service.get_import_status(import_id)

    if not result:
        raise HTTPException(status_code=404, detail="Import not found")

    return ApiResponse.ok(data=result)


@router.get("/list", response_model=ApiResponse[dict])
async def get_imports(
    limit: int = 50,
    import_type: Optional[ImportType] = None,
    service: ImportService = Depends(get_import_service),
) -> ApiResponse[dict]:
    """
    Get list of all imports.

    Query parameters:
    - limit: Maximum number of imports to return (default: 50)
    - import_type: Filter by import type (ocr, web_scraping, manual)

    Returns paginated list of imports sorted by creation date (newest first).
    """
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=400, detail="Limit must be between 1 and 100"
        )

    try:
        result = await service.get_all_imports(limit=limit, import_type=import_type)
        return ApiResponse.ok(data=result)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve imports: {str(e)}"
        )


@router.get("/stats", response_model=ApiResponse[dict])
async def get_import_stats(
    service: ImportService = Depends(get_import_service),
) -> ApiResponse[dict]:
    """
    Get import statistics.

    Returns:
    - Total number of imports
    - Breakdown by import type
    - Breakdown by status
    """
    try:
        stats = await service.get_import_stats()
        return ApiResponse.ok(data=stats)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve stats: {str(e)}"
        )
