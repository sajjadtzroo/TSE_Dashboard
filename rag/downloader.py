"""
PDF Downloader — downloads Codal report PDFs to local filesystem.
Scans codal_announcements for new PDFs not yet in pdf_documents.
"""

import hashlib
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from sqlalchemy.orm import Session

from config.settings import PDF_DIR, PDF_DOWNLOAD_CONCURRENCY
from database.models import CodalAnnouncement, PDFDocument

logger = logging.getLogger(__name__)

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
DOWNLOAD_DELAY = 3
DOWNLOAD_TIMEOUT = 120
MAX_RETRIES = 3


def _url_hash(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


def scan_new_announcements(session: Session, batch_size: int = 50) -> list[PDFDocument]:
    """Find codal_announcements with link_pdf not yet tracked in pdf_documents."""
    tracked_ids_subq = (
        session.query(PDFDocument.announcement_id)
        .filter(PDFDocument.announcement_id.isnot(None))
        .subquery()
    )

    announcements = (
        session.query(CodalAnnouncement)
        .filter(CodalAnnouncement.link_pdf.isnot(None))
        .filter(CodalAnnouncement.link_pdf != "")
        .filter(
            ~CodalAnnouncement.id.in_(session.query(tracked_ids_subq.c.announcement_id))
        )
        .order_by(CodalAnnouncement.id.desc())
        .limit(batch_size)
        .all()
    )

    new_docs = []
    for ann in announcements:
        url_hash = _url_hash(ann.link_pdf)
        # Check hash doesn't already exist (handles duplicate PDF URLs)
        exists = session.query(
            session.query(PDFDocument)
            .filter(PDFDocument.download_hash == url_hash)
            .exists()
        ).scalar()
        if exists:
            continue

        doc = PDFDocument(
            announcement_id=ann.id,
            security_id=ann.security_id,
            symbol=ann.symbol,
            title=ann.title,
            source_url=ann.link_pdf,
            download_hash=url_hash,
            status="pending",
        )
        session.add(doc)
        new_docs.append(doc)

    if new_docs:
        session.flush()
        logger.info(f"Scanned {len(new_docs)} new PDF announcements")

    return new_docs


def _download_one(source_url: str, symbol: str, download_hash: str) -> dict:
    """Download a single PDF in a thread-safe way (no ORM mutations).

    Returns a result dict with success status and file info.
    """
    symbol_dir = PDF_DIR / (symbol or "unknown")
    symbol_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{download_hash[:16]}.pdf"
    file_path = symbol_dir / filename

    # Normalize relative Codal URLs to absolute
    if source_url and not source_url.startswith("http"):
        source_url = f"https://codal.ir/{source_url.lstrip('/')}"

    try:
        with requests.get(
            source_url,
            headers={"User-Agent": BROWSER_UA},
            timeout=DOWNLOAD_TIMEOUT,
            stream=True,
        ) as resp:
            resp.raise_for_status()
            with open(file_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)

        return {
            "success": True,
            "file_path": str(file_path),
            "file_size_bytes": file_path.stat().st_size,
            "error": None,
        }
    except Exception as e:
        return {
            "success": False,
            "file_path": None,
            "file_size_bytes": None,
            "error": str(e),
        }


def download_pdf(doc: PDFDocument, session: Session) -> bool:
    """Download a single PDF. Returns True on success."""
    doc.status = "downloading"
    session.flush()

    result = _download_one(doc.source_url, doc.symbol, doc.download_hash)

    if result["success"]:
        doc.file_path = result["file_path"]
        doc.file_size_bytes = result["file_size_bytes"]
        doc.status = "downloaded"
        logger.info(
            f"Downloaded: {doc.symbol} - {doc.download_hash[:16]}.pdf ({doc.file_size_bytes} bytes)"
        )
        # Upload to MinIO (non-fatal if unavailable)
        try:
            from api.services_storage import rag_pdf_key, storage as _storage
            key = _storage.upload_file(
                rag_pdf_key(doc.symbol, doc.download_hash[:16]),
                result["file_path"],
                content_type="application/pdf",
            )
            if key:
                doc.minio_key = key
        except Exception as _exc:
            logger.warning(f"MinIO upload failed for {doc.download_hash[:16]}.pdf: {_exc}")
        return True
    else:
        doc.retry_count = (doc.retry_count or 0) + 1
        if doc.retry_count >= MAX_RETRIES:
            doc.status = "failed"
            doc.error_message = f"Download failed after {MAX_RETRIES} retries: {result['error']}"
            logger.error(f"Download permanently failed: {doc.source_url} - {result['error']}")
        else:
            doc.status = "pending"
            doc.error_message = result["error"]
            logger.warning(
                f"Download attempt {doc.retry_count} failed: {doc.source_url} - {result['error']}"
            )
        return False


def download_pending(session: Session, batch_size: int = 100) -> int:
    """Download pending PDFs concurrently with a thread pool.

    Downloads are performed in threads; ORM updates happen in the main thread
    after all downloads complete (SQLAlchemy sessions aren't thread-safe).
    """
    pending = (
        session.query(PDFDocument)
        .filter(PDFDocument.status == "pending")
        .filter(
            (PDFDocument.retry_count == None) | (PDFDocument.retry_count < MAX_RETRIES)
        )
        .order_by(PDFDocument.id)
        .limit(batch_size)
        .all()
    )

    if not pending:
        logger.info("No pending PDFs to download")
        return 0

    # Mark all as downloading
    for doc in pending:
        doc.status = "downloading"
    session.flush()

    # Submit downloads to thread pool
    max_workers = min(PDF_DOWNLOAD_CONCURRENCY, len(pending))
    success_count = 0

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_doc = {
            executor.submit(
                _download_one, doc.source_url, doc.symbol, doc.download_hash
            ): doc
            for doc in pending
        }

        for future in as_completed(future_to_doc):
            doc = future_to_doc[future]
            try:
                result = future.result()
            except Exception as e:
                result = {"success": False, "file_path": None, "file_size_bytes": None, "error": str(e)}

            # Apply ORM updates in main thread
            if result["success"]:
                doc.file_path = result["file_path"]
                doc.file_size_bytes = result["file_size_bytes"]
                doc.status = "downloaded"
                success_count += 1
                logger.info(
                    f"Downloaded: {doc.symbol} - {doc.download_hash[:16]}.pdf ({doc.file_size_bytes} bytes)"
                )
            else:
                doc.retry_count = (doc.retry_count or 0) + 1
                if doc.retry_count >= MAX_RETRIES:
                    doc.status = "failed"
                    doc.error_message = f"Download failed after {MAX_RETRIES} retries: {result['error']}"
                    logger.error(f"Download permanently failed: {doc.source_url} - {result['error']}")
                else:
                    doc.status = "pending"
                    doc.error_message = result["error"]
                    logger.warning(
                        f"Download attempt {doc.retry_count} failed: {doc.source_url} - {result['error']}"
                    )

    session.flush()
    logger.info(f"Downloaded {success_count}/{len(pending)} PDFs")
    return success_count
