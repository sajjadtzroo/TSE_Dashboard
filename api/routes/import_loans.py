"""
Loan import API endpoints — file upload, OCR, web scraping.
Router prefix: /api/loans/import
"""

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from api import services_import as svc
from api.auth import require_role
from api.deps import get_db
from api.utils import wrap_response as _wrap

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/loans/import", tags=["loans-import"])


# ── POST /upload — file upload for OCR ───────────────────────────────────────


@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    user=Depends(require_role("trader")),
    db: Session = Depends(get_db),
):
    """Upload a file (PNG/JPEG/PDF, max 10MB) for OCR processing."""
    try:
        record = svc.save_upload(db, file, user_id=user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None

    return _wrap(
        {
            "fileId": record.id,
            "filename": record.filename,
            "contentType": record.content_type,
            "size": record.size,
        }
    )


# ── POST /ocr/{file_id} — run OCR on uploaded file ──────────────────────────


@router.post("/ocr/{file_id}")
def process_ocr(
    file_id: str,
    language: str = Form(default="fas+eng"),
    user=Depends(require_role("trader")),
    db: Session = Depends(get_db),
):
    """Run Tesseract OCR on a previously uploaded file."""
    try:
        result = svc.run_ocr(db, file_id, language=language, user_id=user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from None

    return _wrap(result)


# ── POST /web — web scraping ────────────────────────────────────────────────


@router.post("/web")
def scrape_web(
    body: dict,
    user=Depends(require_role("trader")),
    db: Session = Depends(get_db),
):
    """Fetch URLs and extract text content for loan data import."""
    urls = body.get("urls", [])
    if not urls or not isinstance(urls, list):
        raise HTTPException(status_code=400, detail="'urls' must be a non-empty list")
    if len(urls) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 URLs per request")

    deep_scrape = body.get("deepScrape", False)
    bank_id = body.get("bankId")

    try:
        result = svc.run_web_scrape(
            db, urls=urls, deep_scrape=deep_scrape, bank_id=bank_id, user_id=user.id
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from None

    return _wrap(result)


# ── GET /status/{import_id} — single import status ──────────────────────────


@router.get("/status/{import_id}")
def get_import_status(
    import_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_role("viewer")),
):
    """Get the status and results of an import job."""
    result = svc.get_import_status(db, import_id)
    if not result:
        raise HTTPException(status_code=404, detail="Import not found")
    return _wrap(result)


# ── GET /list — list imports ─────────────────────────────────────────────────


@router.get("/list")
def list_imports(
    limit: int = Query(default=50, ge=1, le=200),
    import_type: str = Query(default=None, alias="import_type"),
    db: Session = Depends(get_db),
    _user=Depends(require_role("viewer")),
):
    """List import jobs with optional type filter."""
    result = svc.list_imports(db, limit=limit, import_type=import_type)
    return _wrap(result)


# ── GET /stats — aggregate statistics ────────────────────────────────────────


@router.get("/stats")
def get_import_stats(
    db: Session = Depends(get_db),
    _user=Depends(require_role("viewer")),
):
    """Get aggregate import statistics by type and status."""
    result = svc.get_import_stats(db)
    return _wrap(result)
