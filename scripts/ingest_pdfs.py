#!/usr/bin/env python3
"""
Bulk PDF ingestion script — ingest all PDFs in docs/pdf/ into pgvector.

Usage (inside docker):
    docker compose exec app python scripts/ingest_pdfs.py

Usage (local, with correct DATABASE_URL from .env):
    DATABASE_URL=postgresql://postgres:<password>@localhost:5432/tsetmc \
        python scripts/ingest_pdfs.py [--dry-run] [--symbol SYMBOL] [--reset-failed]

Options:
    --dry-run        Print what would be ingested without touching the DB
    --symbol SYMBOL  Only process PDFs with this symbol tag
    --reset-failed   Re-try documents previously marked as failed
"""

import argparse
import hashlib
import logging
import sys
import time
from pathlib import Path

# ── Make project root importable ────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from config.settings import DATABASE_URL  # noqa: E402 — must be after sys.path
from database.connection import DatabaseManager  # noqa: E402
from database.models import PDFDocument  # noqa: E402
from rag.pipeline import process_single_document  # noqa: E402

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ingest_pdfs")

# ── PDF manifest: (relative path inside docs/pdf/, symbol, human title) ──────
PDF_DIR = ROOT / "docs" / "pdf"

MANIFEST = [
    # ── CFA Level 1 (2025) ───────────────────────────────────────────────────
    ("2025_CFA_L1V1_Quant.pdf",         "CFA_L1", "CFA L1 2025 Vol 1 – Quantitative Methods"),
    ("2025_CFA_L1V2_Econ.pdf",          "CFA_L1", "CFA L1 2025 Vol 2 – Economics"),
    ("2025_CFA_L1V3_CI.pdf",            "CFA_L1", "CFA L1 2025 Vol 3 – Corporate Issuers"),
    ("2025_CFA_L1V4-FSA.pdf",           "CFA_L1", "CFA L1 2025 Vol 4 – Financial Statement Analysis"),
    ("2025_CFA_L1V5-Equity.pdf",        "CFA_L1", "CFA L1 2025 Vol 5 – Equity"),
    ("2025_CFA_L1V6_FI.pdf",            "CFA_L1", "CFA L1 2025 Vol 6 – Fixed Income"),
    ("2025_CFA_L1V7-Deriv.pdf",         "CFA_L1", "CFA L1 2025 Vol 7 – Derivatives"),
    ("2025_CFA_L1V8_Alts.pdf",          "CFA_L1", "CFA L1 2025 Vol 8 – Alternative Investments"),
    ("2025_CFA_L1V9_PM.pdf",            "CFA_L1", "CFA L1 2025 Vol 9 – Portfolio Management"),
    ("2025_CFA_L1V10_Ethics.pdf",       "CFA_L1", "CFA L1 2025 Vol 10 – Ethics & Professional Standards"),

    # ── CFA Level 2 (2025) ───────────────────────────────────────────────────
    ("2025 CFA INSTITUTE LEVEL 2 VOLUME 1 - QUANTITATIVE METHODS.pdf",
                                         "CFA_L2", "CFA L2 2025 Vol 1 – Quantitative Methods"),
    ("2025 CFA INSTITUTE LEVEL 2 VOLUME 2 - ECONOMICS.pdf",
                                         "CFA_L2", "CFA L2 2025 Vol 2 – Economics"),
    ("2025_CFA_INSTITUTE_LEVEL_2_VOLUME_3_FINANCIAL_STATEMENT_ANALYSIS.pdf",
                                         "CFA_L2", "CFA L2 2025 Vol 3 – Financial Statement Analysis"),
    ("2025 CFA INSTITUTE LEVEL 2 VOLUME 4 - CORPORATE ISSUERS.pdf",
                                         "CFA_L2", "CFA L2 2025 Vol 4 – Corporate Issuers"),
    ("2025 CFA INSTITUTE LEVEL 2 VOLUME 5 - EQUITY VALUATION.pdf",
                                         "CFA_L2", "CFA L2 2025 Vol 5 – Equity Valuation"),
    ("2025 CFA INSTITUTE LEVEL 2 VOLUME 6 - FIXED INCOME.pdf",
                                         "CFA_L2", "CFA L2 2025 Vol 6 – Fixed Income"),
    ("2025 CFA INSTITUTE LEVEL 2 VOLUME 7 - DERIVATIVES.pdf",
                                         "CFA_L2", "CFA L2 2025 Vol 7 – Derivatives"),
    ("2025_CFA_INSTITUTE_LEVEL_2_VOLUME_8_ALTERNATIVE_INVESTMENTS.pdf",
                                         "CFA_L2", "CFA L2 2025 Vol 8 – Alternative Investments"),
    ("2025 CFA INSTITUTE LEVEL 2 VOLUME 9 - PORTFOLIO MANAGEMENT.pdf",
                                         "CFA_L2", "CFA L2 2025 Vol 9 – Portfolio Management"),
    ("2025_CFA_INSTITUTE_LEVEL_2_VOLUME_10_ETHICAL_AND_PROFESSIONAL_STANDARDS.pdf",
                                         "CFA_L2", "CFA L2 2025 Vol 10 – Ethics & Professional Standards"),

    # ── CFA Level 3 (2025) — assumed from Vol 1-6 naming ───────────────────
    ("Vol 1.pdf",  "CFA_L3", "CFA L3 2025 Vol 1"),
    ("Vol 2.pdf",  "CFA_L3", "CFA L3 2025 Vol 2"),
    ("Vol 3.pdf",  "CFA_L3", "CFA L3 2025 Vol 3"),
    ("Vol 4.pdf",  "CFA_L3", "CFA L3 2025 Vol 4"),
    ("Vol 5.pdf",  "CFA_L3", "CFA L3 2025 Vol 5"),
    ("Vol 6.pdf",  "CFA_L3", "CFA L3 2025 Vol 6"),

    # ── FRM Part I (2024, Schweser) ──────────────────────────────────────────
    ("FRM_2024_Part_I_Schweser_Notes_Foundations_of_Risk_Management.pdf",
                                         "FRM_P1", "FRM 2024 Part I – Foundations of Risk Management"),
    ("FRM 2024 Part I - Schweser Notes - Quantitative Analysis.pdf",
                                         "FRM_P1", "FRM 2024 Part I – Quantitative Analysis"),
    ("FRM_2024_Part_I_Schweser_Notes_Financial_Markets_and_Products.pdf",
                                         "FRM_P1", "FRM 2024 Part I – Financial Markets and Products"),
    ("FRM 2024 Part I - Schweser Notes -Valuation and Risk Models.pdf",
                                         "FRM_P1", "FRM 2024 Part I – Valuation and Risk Models"),
    ("FRM 2024 Part I - Schweser Quicksheet.pdf",
                                         "FRM_P1", "FRM 2024 Part I – Schweser Quicksheet"),

    # ── Derivatives textbook ─────────────────────────────────────────────────
    ("John_Hull_Options,_Futures,_and_Other_Derivatives,_Global_Edition.pdf",
                                         "DERIVATIVES", "Options, Futures & Other Derivatives – John Hull"),
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def sha256_of_path(path: Path) -> str:
    """Return SHA256 hex digest of the file's absolute path string (fast, unique)."""
    return hashlib.sha256(str(path.resolve()).encode()).hexdigest()


def fmt_mb(path: Path) -> str:
    return f"{path.stat().st_size / 1_048_576:.1f} MB"


def fmt_dur(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    return f"{m}m {s}s" if m else f"{s}s"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Bulk PDF → pgvector ingestion")
    parser.add_argument("--dry-run", action="store_true", help="Print plan without writing to DB")
    parser.add_argument("--symbol", help="Only ingest PDFs with this symbol (e.g. CFA_L1)")
    parser.add_argument("--reset-failed", action="store_true",
                        help="Re-queue documents previously marked failed")
    args = parser.parse_args()

    # Filter manifest by symbol if requested
    manifest = MANIFEST
    if args.symbol:
        manifest = [(f, s, t) for f, s, t in MANIFEST if s == args.symbol]
        if not manifest:
            log.error(f"No PDFs found for symbol '{args.symbol}'")
            sys.exit(1)

    # Validate all files exist before touching the DB
    missing = []
    for filename, _sym, _title in manifest:
        p = PDF_DIR / filename
        if not p.exists():
            missing.append(str(p))

    if missing:
        log.error(f"{len(missing)} PDF(s) not found:")
        for m in missing:
            log.error(f"  {m}")
        sys.exit(1)

    total_size = sum((PDF_DIR / f).stat().st_size for f, _, _ in manifest)
    log.info(
        f"Found {len(manifest)} PDFs  |  "
        f"total size: {total_size / 1_048_576:.0f} MB  |  "
        f"dry_run={args.dry_run}"
    )

    if args.dry_run:
        log.info("── DRY RUN — no DB writes ──────────────────────────────────")
        for filename, symbol, title in manifest:
            p = PDF_DIR / filename
            log.info(f"  [{symbol}]  {fmt_mb(p):>8}  {title}")
        return

    # Connect to DB
    db = DatabaseManager(DATABASE_URL)
    db.initialize()

    results = {"skipped": 0, "ok": 0, "failed": 0}
    grand_start = time.time()

    with db.get_session() as session:
        for idx, (filename, symbol, title) in enumerate(manifest, 1):
            path = PDF_DIR / filename
            file_hash = sha256_of_path(path)

            log.info(
                f"[{idx:02d}/{len(manifest)}] {symbol}  {fmt_mb(path):>8}  {title}"
            )

            # Check for existing record
            existing = (
                session.query(PDFDocument)
                .filter(PDFDocument.download_hash == file_hash)
                .first()
            )

            if existing:
                if existing.status == "embedded":
                    log.info(f"  ↳ already embedded (doc_id={existing.id}), skipping")
                    results["skipped"] += 1
                    continue
                elif existing.status == "failed" and args.reset_failed:
                    log.info(f"  ↳ resetting failed doc_id={existing.id}")
                    existing.status = "downloaded"
                    existing.error_message = None
                    existing.retry_count = 0
                    session.flush()
                    doc_id = existing.id
                elif existing.status in ("extracting", "embedding", "extracted", "downloaded"):
                    log.info(f"  ↳ resuming from status={existing.status} (doc_id={existing.id})")
                    doc_id = existing.id
                else:
                    log.info(
                        f"  ↳ status={existing.status} (doc_id={existing.id}), skipping"
                        + (" (use --reset-failed to retry)" if existing.status == "failed" else "")
                    )
                    results["skipped"] += 1
                    continue
            else:
                doc = PDFDocument(
                    title=title,
                    symbol=symbol,
                    source_url=f"file://{path.resolve()}",
                    file_path=str(path.resolve()),
                    file_size_bytes=path.stat().st_size,
                    status="downloaded",
                    source="upload",
                    download_hash=file_hash,
                )
                session.add(doc)
                session.flush()
                doc_id = doc.id
                log.info(f"  ↳ created doc_id={doc_id}")

            # Run extract → embed pipeline
            t0 = time.time()
            result = process_single_document(session, doc_id)
            elapsed = time.time() - t0

            if result.get("status") == "embedded":
                log.info(f"  ↳ done in {fmt_dur(elapsed)}  chunks={result.get('stats', {})}")
                results["ok"] += 1
            else:
                log.error(
                    f"  ↳ FAILED in {fmt_dur(elapsed)}: {result.get('message', result)}"
                )
                results["failed"] += 1

    total_elapsed = time.time() - grand_start
    log.info("─" * 60)
    log.info(
        f"Done in {fmt_dur(total_elapsed)}  |  "
        f"embedded={results['ok']}  skipped={results['skipped']}  failed={results['failed']}"
    )
    if results["failed"]:
        log.warning("Re-run with --reset-failed to retry failed documents.")
        sys.exit(2)


if __name__ == "__main__":
    main()
