"""
Import Data Schemas
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ImportStatus(str, Enum):
    """Import status enumeration."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ImportType(str, Enum):
    """Import type enumeration."""

    OCR = "ocr"
    WEB_SCRAPING = "web_scraping"
    MANUAL = "manual"


class OCRLanguage(str, Enum):
    """OCR language enumeration."""

    PERSIAN = "fas"
    ENGLISH = "eng"
    PERSIAN_ENGLISH = "fas+eng"


class FileUploadResponse(BaseModel):
    """File upload response schema."""

    file_id: str = Field(..., alias="fileId")
    filename: str
    content_type: str = Field(..., alias="contentType")
    size: int
    uploaded_at: datetime = Field(..., alias="uploadedAt")

    class Config:
        populate_by_name = True


class OCRRequest(BaseModel):
    """OCR processing request schema."""

    file_id: str = Field(..., alias="fileId")
    language: OCRLanguage = OCRLanguage.PERSIAN_ENGLISH

    class Config:
        populate_by_name = True


class OCRResult(BaseModel):
    """OCR processing result schema."""

    text: str
    confidence: Optional[float] = None
    language: str
    page_count: int = Field(1, alias="pageCount")

    class Config:
        populate_by_name = True


class WebScrapingRequest(BaseModel):
    """Web scraping request schema."""

    urls: List[str]
    bank_id: Optional[str] = Field(None, alias="bankId")
    deep_scrape: bool = Field(False, alias="deepScrape")

    class Config:
        populate_by_name = True


class WebScrapingResult(BaseModel):
    """Web scraping result schema."""

    url: str
    status: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    class Config:
        populate_by_name = True


class ImportLog(BaseModel):
    """Import log schema."""

    id: Optional[str] = Field(None, alias="_id")
    import_type: ImportType = Field(..., alias="importType")
    status: ImportStatus
    source: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")

    class Config:
        populate_by_name = True


class ImportStatusResponse(BaseModel):
    """Import status response schema."""

    import_id: str = Field(..., alias="importId")
    import_type: ImportType = Field(..., alias="importType")
    status: ImportStatus
    source: str
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    error: Optional[str] = None

    class Config:
        populate_by_name = True


class ImportListResponse(BaseModel):
    """Import list response schema."""

    total: int
    imports: List[ImportStatusResponse]

    class Config:
        populate_by_name = True
