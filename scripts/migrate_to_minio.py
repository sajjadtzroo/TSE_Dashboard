"""
One-time migration: upload existing local files to MinIO and record their keys in the DB.

Migrates three categories:
  1. Codal raw HTML/PDF snapshots  (data/codal_raw/*.html.gz / *.pdf.gz)
  2. RAG pipeline PDFs             (data/pdfs/{symbol}/*.pdf)
  3. User uploads                  (data/uploads/*)

Usage:
  python scripts/migrate_to_minio.py              # migrate all
  python scripts/migrate_to_minio.py --dry-run    # report without uploading
  python scripts/migrate_to_minio.py --category codal_raw
  python scripts/migrate_to_minio.py --category rag_pdfs
  python scripts/migrate_to_minio.py --category uploads
  python scripts/migrate_to_minio.py --batch 200  # default 100
"""

import argparse
import logging
import os
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)


def _get_db():
    from database.connection import get_db_manager
    from config.settings import DATABASE_URL
    mgr = get_db_manager(DATABASE_URL)
    return mgr.get_scoped_session()


def _storage():
    from api.services_storage import storage
    storage.ensure_bucket()
    return storage


# ── 1. Codal raw responses ────────────────────────────────────────────────────

def migrate_codal_raw(dry_run: bool, batch: int):
    from database.models import CodalAnnouncement, CodalRawResponse
    from api.services_storage import codal_raw_key

    session = _get_db()
    store = _storage()

    try:
        rows = (
            session.query(CodalRawResponse)
            .filter(CodalRawResponse.minio_key == None)  # noqa: E711
            .limit(batch)
            .all()
        )
        logger.info(f"[codal_raw] {len(rows)} rows to migrate (batch={batch})")

        ok = fail = skip = 0
        for row in rows:
            # Determine local file path
            local_path = None
            if row.storage_path:
                candidate = project_root / row.storage_path
                if candidate.exists():
                    local_path = candidate

            if local_path is None:
                # Try the flat codal_raw directory
                # storage_path may be "codal/raw/FILE" or "data/codal_raw/FILE"
                filename = Path(row.storage_path or "").name if row.storage_path else None
                if filename:
                    candidate = project_root / "data" / "codal_raw" / filename
                    if candidate.exists():
                        local_path = candidate

            if local_path is None:
                logger.warning(f"  [skip] id={row.id} serial={row.letter_serial} — file not found on disk")
                skip += 1
                continue

            # Determine symbol
            symbol = None
            if row.announcement:
                symbol = row.announcement.symbol
            elif row.codal_announcement_id:
                ann = session.query(CodalAnnouncement).get(row.codal_announcement_id)
                if ann:
                    symbol = ann.symbol
            if not symbol:
                symbol = "unknown"

            ext = "".join(local_path.suffixes).lstrip(".")  # e.g. "html.gz" or "pdf.gz"
            key = codal_raw_key(symbol, row.letter_serial, ext)

            if dry_run:
                logger.info(f"  [dry] {local_path.name} → {key}")
                ok += 1
                continue

            result = store.upload_file(key, str(local_path), content_type="application/gzip")
            if result:
                row.minio_key = result
                ok += 1
                if ok % 50 == 0:
                    session.commit()
                    logger.info(f"  ... {ok} uploaded so far")
            else:
                fail += 1

        if not dry_run:
            session.commit()

        logger.info(f"[codal_raw] done: ok={ok}, fail={fail}, skip={skip}")
    finally:
        session.close()


# ── 2. RAG PDFs ───────────────────────────────────────────────────────────────

def migrate_rag_pdfs(dry_run: bool, batch: int):
    from database.models import PDFDocument
    from api.services_storage import rag_pdf_key

    session = _get_db()
    store = _storage()

    try:
        rows = (
            session.query(PDFDocument)
            .filter(PDFDocument.minio_key == None)  # noqa: E711
            .filter(PDFDocument.file_path != None)  # noqa: E711
            .filter(PDFDocument.status == "downloaded")
            .limit(batch)
            .all()
        )
        logger.info(f"[rag_pdfs] {len(rows)} rows to migrate (batch={batch})")

        ok = fail = skip = 0
        for doc in rows:
            local_path = Path(doc.file_path)
            if not local_path.exists():
                logger.warning(f"  [skip] id={doc.id} — file not found: {doc.file_path}")
                skip += 1
                continue

            hash16 = doc.download_hash[:16] if doc.download_hash else local_path.stem
            key = rag_pdf_key(doc.symbol or "unknown", hash16)

            if dry_run:
                logger.info(f"  [dry] {local_path.name} → {key}")
                ok += 1
                continue

            result = store.upload_file(key, str(local_path), content_type="application/pdf")
            if result:
                doc.minio_key = result
                ok += 1
                if ok % 50 == 0:
                    session.commit()
                    logger.info(f"  ... {ok} uploaded so far")
            else:
                fail += 1

        if not dry_run:
            session.commit()

        logger.info(f"[rag_pdfs] done: ok={ok}, fail={fail}, skip={skip}")
    finally:
        session.close()


# ── 3. User uploads ───────────────────────────────────────────────────────────

def migrate_uploads(dry_run: bool, batch: int):
    from database.models import FileUpload
    from api.services_storage import upload_key

    session = _get_db()
    store = _storage()

    try:
        rows = (
            session.query(FileUpload)
            .filter(FileUpload.minio_key == None)  # noqa: E711
            .limit(batch)
            .all()
        )
        logger.info(f"[uploads] {len(rows)} rows to migrate (batch={batch})")

        ok = fail = skip = 0
        for fu in rows:
            local_path = Path(fu.file_path)
            if not local_path.exists():
                logger.warning(f"  [skip] id={fu.id} — file not found: {fu.file_path}")
                skip += 1
                continue

            key = upload_key(fu.id, fu.filename)

            if dry_run:
                logger.info(f"  [dry] {local_path.name} → {key}")
                ok += 1
                continue

            result = store.upload_file(key, str(local_path), content_type=fu.content_type or "application/octet-stream")
            if result:
                fu.minio_key = result
                ok += 1
                if ok % 50 == 0:
                    session.commit()
                    logger.info(f"  ... {ok} uploaded so far")
            else:
                fail += 1

        if not dry_run:
            session.commit()

        logger.info(f"[uploads] done: ok={ok}, fail={fail}, skip={skip}")
    finally:
        session.close()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Migrate local files to MinIO")
    parser.add_argument("--dry-run", action="store_true", help="Report only, no uploads")
    parser.add_argument("--batch", type=int, default=100, help="Max rows per category (default 100)")
    parser.add_argument(
        "--category",
        choices=["codal_raw", "rag_pdfs", "uploads"],
        default=None,
        help="Migrate only this category (default: all)",
    )
    args = parser.parse_args()

    if args.dry_run:
        logger.info("DRY RUN — no files will be uploaded or DB rows updated")

    categories = [args.category] if args.category else ["codal_raw", "rag_pdfs", "uploads"]

    for cat in categories:
        if cat == "codal_raw":
            migrate_codal_raw(args.dry_run, args.batch)
        elif cat == "rag_pdfs":
            migrate_rag_pdfs(args.dry_run, args.batch)
        elif cat == "uploads":
            migrate_uploads(args.dry_run, args.batch)

    logger.info("Migration complete.")


if __name__ == "__main__":
    main()
