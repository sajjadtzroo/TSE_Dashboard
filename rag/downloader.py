"""
PDF Downloader — downloads Codal report PDFs to local filesystem.
Scans codal_announcements for new PDFs not yet in pdf_documents.
"""
import hashlib
import logging
import time
from pathlib import Path

import requests
from sqlalchemy.orm import Session

from config.settings import PDF_DIR
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
    # Get all announcement IDs already tracked
    existing_hashes = set(
        h for (h,) in session.query(PDFDocument.download_hash).all()
    )

    announcements = (
        session.query(CodalAnnouncement)
        .filter(CodalAnnouncement.link_pdf.isnot(None))
        .filter(CodalAnnouncement.link_pdf != '')
        .order_by(CodalAnnouncement.id.desc())
        .all()
    )

    new_docs = []
    for ann in announcements:
        url_hash = _url_hash(ann.link_pdf)
        if url_hash in existing_hashes:
            continue

        doc = PDFDocument(
            announcement_id=ann.id,
            security_id=ann.security_id,
            symbol=ann.symbol,
            title=ann.title,
            source_url=ann.link_pdf,
            download_hash=url_hash,
            status='pending',
        )
        session.add(doc)
        existing_hashes.add(url_hash)
        new_docs.append(doc)

        if len(new_docs) >= batch_size:
            break

    if new_docs:
        session.flush()
        logger.info(f"Scanned {len(new_docs)} new PDF announcements")

    return new_docs


def download_pdf(doc: PDFDocument, session: Session) -> bool:
    """Download a single PDF. Returns True on success."""
    symbol_dir = PDF_DIR / (doc.symbol or 'unknown')
    symbol_dir.mkdir(parents=True, exist_ok=True)

    # Use announcement code or doc id for filename
    filename = f"{doc.download_hash[:16]}.pdf"
    file_path = symbol_dir / filename

    doc.status = 'downloading'
    session.flush()

    try:
        resp = requests.get(
            doc.source_url,
            headers={'User-Agent': BROWSER_UA},
            timeout=DOWNLOAD_TIMEOUT,
            stream=True,
        )
        resp.raise_for_status()

        with open(file_path, 'wb') as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

        doc.file_path = str(file_path)
        doc.file_size_bytes = file_path.stat().st_size
        doc.status = 'downloaded'
        logger.info(f"Downloaded: {doc.symbol} - {filename} ({doc.file_size_bytes} bytes)")
        return True

    except Exception as e:
        doc.retry_count = (doc.retry_count or 0) + 1
        if doc.retry_count >= MAX_RETRIES:
            doc.status = 'failed'
            doc.error_message = f"Download failed after {MAX_RETRIES} retries: {e}"
            logger.error(f"Download permanently failed: {doc.source_url} - {e}")
        else:
            doc.status = 'pending'
            doc.error_message = str(e)
            logger.warning(f"Download attempt {doc.retry_count} failed: {doc.source_url} - {e}")
        return False


def download_pending(session: Session, batch_size: int = 20) -> int:
    """Download all pending PDFs with delay between requests."""
    pending = (
        session.query(PDFDocument)
        .filter(PDFDocument.status == 'pending')
        .filter(PDFDocument.retry_count < MAX_RETRIES)
        .order_by(PDFDocument.id)
        .limit(batch_size)
        .all()
    )

    if not pending:
        logger.info("No pending PDFs to download")
        return 0

    success_count = 0
    for i, doc in enumerate(pending):
        if i > 0:
            time.sleep(DOWNLOAD_DELAY)
        if download_pdf(doc, session):
            success_count += 1

    session.flush()
    logger.info(f"Downloaded {success_count}/{len(pending)} PDFs")
    return success_count
