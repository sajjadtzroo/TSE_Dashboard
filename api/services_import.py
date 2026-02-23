"""
Service layer for loan import operations (OCR, web scraping).
"""

import ipaddress
import logging
import uuid
from pathlib import Path
from urllib.parse import urlparse

from fastapi import UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from config.settings import DATA_DIR
from database.models import FileUpload, ImportStatus, ImportType, LoanImport

logger = logging.getLogger(__name__)

# Upload directory
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/pdf",
}


def save_upload(
    db: Session, file: UploadFile, user_id: int | None = None
) -> FileUpload:
    """Save an uploaded file to disk and create a FileUpload record."""
    # Validate content type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(
            f"Unsupported file type: {content_type}. "
            f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
        )

    # Read file content
    content = file.file.read()
    size = len(content)

    if size > MAX_FILE_SIZE:
        raise ValueError(
            f"File too large: {size} bytes. Maximum: {MAX_FILE_SIZE} bytes (10MB)"
        )

    if size == 0:
        raise ValueError("Empty file")

    # Generate UUID filename, preserve extension
    file_id = str(uuid.uuid4())
    original_name = file.filename or "unknown"
    ext = Path(original_name).suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg", ".pdf"}:
        ext = ".bin"
    safe_filename = f"{file_id}{ext}"
    file_path = UPLOAD_DIR / safe_filename

    # Write to disk
    file_path.write_bytes(content)

    # Upload to MinIO (non-fatal — failure just leaves minio_key as None)
    minio_key = None
    try:
        from api.services_storage import upload_key, storage as _storage
        minio_key = _storage.upload(
            upload_key(file_id, original_name),
            content,
            content_type=content_type,
        )
    except Exception as _exc:
        import logging as _log
        _log.getLogger(__name__).warning(f"MinIO upload failed for {file_id}: {_exc}")

    # Create DB record
    record = FileUpload(
        id=file_id,
        filename=original_name,
        content_type=content_type,
        size=size,
        file_path=str(file_path),
        minio_key=minio_key,
        uploaded_by=user_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def run_ocr(
    db: Session, file_id: str, language: str = "fas+eng", user_id: int | None = None
) -> dict:
    """Run OCR on an uploaded file and create a LoanImport record."""
    # Validate file exists
    upload = db.query(FileUpload).filter(FileUpload.id == file_id).first()
    if not upload:
        raise ValueError(f"File not found: {file_id}")

    file_path = Path(upload.file_path)
    if not file_path.exists():
        raise ValueError(f"File missing from disk: {file_path}")

    # Validate language
    valid_languages = {"fas", "eng", "fas+eng"}
    if language not in valid_languages:
        raise ValueError(
            f"Unsupported language: {language}. Allowed: {', '.join(valid_languages)}"
        )

    # Create import record
    import_id = str(uuid.uuid4())
    loan_import = LoanImport(
        id=import_id,
        import_type=ImportType.ocr,
        status=ImportStatus.processing,
        source=upload.filename,
        file_id=file_id,
        user_id=user_id,
    )
    db.add(loan_import)
    db.commit()

    # Run OCR
    try:
        import pytesseract
        from PIL import Image

        text = ""
        confidence = 0.0
        page_count = 1

        if upload.content_type == "application/pdf":
            try:
                from pdf2image import convert_from_path

                images = convert_from_path(str(file_path))
                page_count = len(images)
                texts = []
                confidences = []
                for img in images:
                    data = pytesseract.image_to_data(
                        img, lang=language, output_type=pytesseract.Output.DICT
                    )
                    page_text = pytesseract.image_to_string(img, lang=language)
                    texts.append(page_text)
                    confs = [
                        int(c)
                        for c in data["conf"]
                        if str(c).lstrip("-").isdigit() and int(c) > 0
                    ]
                    if confs:
                        confidences.append(sum(confs) / len(confs))
                text = "\n\n".join(texts)
                confidence = sum(confidences) / len(confidences) if confidences else 0
            except ImportError:
                raise RuntimeError(
                    "pdf2image is required for PDF OCR. Install with: pip install pdf2image"
                ) from None
        else:
            img = Image.open(file_path)
            text = pytesseract.image_to_string(img, lang=language)
            data = pytesseract.image_to_data(
                img, lang=language, output_type=pytesseract.Output.DICT
            )
            confs = [
                int(c)
                for c in data["conf"]
                if str(c).lstrip("-").isdigit() and int(c) > 0
            ]
            confidence = sum(confs) / len(confs) if confs else 0

        # Update import record
        loan_import.status = ImportStatus.completed
        loan_import.results = {
            "file_id": file_id,
            "language": language,
            "text": text,
            "confidence": round(confidence, 2),
            "page_count": page_count,
        }
        db.commit()

        return loan_import.results

    except ImportError:
        loan_import.status = ImportStatus.failed
        loan_import.error = (
            "pytesseract is not installed. Install with: pip install pytesseract"
        )
        db.commit()
        raise RuntimeError(loan_import.error) from None

    except Exception as e:
        loan_import.status = ImportStatus.failed
        loan_import.error = str(e)
        db.commit()
        raise


def run_web_scrape(
    db: Session,
    urls: list[str],
    deep_scrape: bool = False,
    bank_id: str | None = None,
    user_id: int | None = None,
) -> dict:
    """Fetch URLs and extract text content. Returns import record with results."""
    import_id = str(uuid.uuid4())
    loan_import = LoanImport(
        id=import_id,
        import_type=ImportType.web_scraping,
        status=ImportStatus.processing,
        source=", ".join(urls[:5]),  # Store first 5 URLs as source
        user_id=user_id,
    )
    db.add(loan_import)
    db.commit()

    results = []
    try:
        import socket

        import httpx
        from bs4 import BeautifulSoup

        for url in urls:
            # Validate URL scheme and block private/internal IPs
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                results.append(
                    {
                        "url": url,
                        "status": "error",
                        "error": "Only http/https URLs allowed",
                    }
                )
                continue
            try:
                resolved = socket.getaddrinfo(parsed.hostname, None)
                for _family, _type, _proto, _canonname, sockaddr in resolved:
                    ip = ipaddress.ip_address(sockaddr[0])
                    if (
                        ip.is_private
                        or ip.is_loopback
                        or ip.is_reserved
                        or ip.is_link_local
                    ):
                        raise ValueError(f"Blocked private/internal IP: {ip}")
            except (socket.gaierror, ValueError) as dns_err:
                results.append({"url": url, "status": "error", "error": str(dns_err)})
                continue
            try:
                resp = httpx.get(url, timeout=30, follow_redirects=True)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")

                # Remove script/style elements
                for tag in soup(["script", "style", "nav", "footer", "header"]):
                    tag.decompose()

                text = soup.get_text(separator="\n", strip=True)
                # Trim excessive whitespace
                lines = [line.strip() for line in text.splitlines() if line.strip()]
                cleaned = "\n".join(lines)

                results.append(
                    {
                        "url": url,
                        "status": "success",
                        "data": {
                            "text": cleaned[:50000],  # Cap at 50k chars
                            "title": soup.title.string if soup.title else None,
                            "content_length": len(cleaned),
                        },
                    }
                )
            except Exception as e:
                results.append(
                    {
                        "url": url,
                        "status": "error",
                        "error": str(e),
                    }
                )

        loan_import.status = ImportStatus.completed
        loan_import.results = results
        db.commit()

        return {"importId": import_id, "results": results}

    except ImportError as e:
        loan_import.status = ImportStatus.failed
        loan_import.error = (
            f"Missing dependency: {e}. Install httpx and beautifulsoup4."
        )
        db.commit()
        raise RuntimeError(loan_import.error) from None

    except Exception as e:
        loan_import.status = ImportStatus.failed
        loan_import.error = str(e)
        db.commit()
        raise


def get_import_status(db: Session, import_id: str) -> dict | None:
    """Get a single import job's status."""
    record = db.query(LoanImport).filter(LoanImport.id == import_id).first()
    if not record:
        return None
    return _import_to_dict(record)


def list_imports(
    db: Session,
    limit: int = 50,
    import_type: str | None = None,
    user_id: int | None = None,
) -> dict:
    """List import jobs with optional filters."""
    query = db.query(LoanImport)

    if import_type:
        try:
            it = ImportType(import_type)
            query = query.filter(LoanImport.import_type == it)
        except ValueError:
            pass  # Ignore invalid filter

    if user_id is not None:
        query = query.filter(LoanImport.user_id == user_id)

    total = query.count()
    records = query.order_by(LoanImport.created_at.desc()).limit(min(limit, 200)).all()

    return {
        "total": total,
        "imports": [_import_to_dict(r) for r in records],
    }


def get_import_stats(db: Session, user_id: int | None = None) -> dict:
    """Aggregate import counts by type and status."""
    query = db.query(LoanImport)
    if user_id is not None:
        query = query.filter(LoanImport.user_id == user_id)

    total = query.count()

    # Group by type
    type_rows = (
        query.with_entities(LoanImport.import_type, func.count())
        .group_by(LoanImport.import_type)
        .all()
    )
    by_type = {row[0].value: row[1] for row in type_rows}

    # Group by status
    status_rows = (
        query.with_entities(LoanImport.status, func.count())
        .group_by(LoanImport.status)
        .all()
    )
    by_status = {row[0].value: row[1] for row in status_rows}

    return {"total": total, "byType": by_type, "byStatus": by_status}


def _import_to_dict(record: LoanImport) -> dict:
    """Convert a LoanImport record to a dict matching ImportStatusResponse."""
    return {
        "id": record.id,
        "type": record.import_type.value,
        "status": record.status.value,
        "source": record.source,
        "results": record.results,
        "error": record.error,
    }
