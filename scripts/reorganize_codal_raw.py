"""
Reorganize data/codal_raw/ from flat to symbol/duration/type structure.

Creates hardlinks (zero extra disk usage) so each raw file appears at:
    data/codal_raw/{SYMBOL}/{DURATION}/{STATEMENT_TYPE}/{safe_serial}.html.gz

Flat originals are kept untouched — DB storage_path remains valid.
Files with multiple statement types get a hardlink per type (same inode).

Usage:
    python scripts/reorganize_codal_raw.py
    python scripts/reorganize_codal_raw.py --dry-run
    python scripts/reorganize_codal_raw.py --symbol IKCO
    python scripts/reorganize_codal_raw.py --limit 50
"""

import argparse
import logging
import os
import re
import shutil
import sys
from collections import defaultdict
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

try:
    from dotenv import load_dotenv
    load_dotenv(project_root / ".env")
except ImportError:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
log = logging.getLogger("reorganize_codal_raw")

RAW_DIR = project_root / "data" / "codal_raw"

DURATION_MAP = {
    3:  "3month",
    6:  "6month",
    9:  "9month",
    12: "annual",
}


# ── Public helper — also imported by the spider ───────────────────────────────

def link_file(src: Path, symbol: str, period_months: int | None, stmt_type: str, dry_run: bool = False) -> bool:
    """
    Create a hardlink (or copy fallback) in the organized structure.

    Returns True if a new link was created, False if it already existed.
    """
    if not src.exists():
        return False

    duration = DURATION_MAP.get(period_months, "unknown_period")
    dest = RAW_DIR / symbol / duration / stmt_type / src.name

    if dest.exists():
        return False

    if dry_run:
        log.info(f"  [dry-run] {src.name} → {dest.relative_to(RAW_DIR)}")
        return True

    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.link(src, dest)
    except FileExistsError:
        return False  # race: another process created it between the check and link
    except OSError:
        # Cross-device or unsupported FS — fall back to copy
        try:
            shutil.copy2(src, dest)
            log.debug(f"  [copy fallback] {dest.relative_to(RAW_DIR)}")
        except shutil.SameFileError:
            return False  # already a hardlink to the same inode
    return True


def link_unprocessed(src: Path, symbol: str | None, dry_run: bool = False) -> bool:
    """Link a not-yet-parsed file into the {symbol}/unprocessed/ folder."""
    if not src.exists():
        return False

    folder = symbol or "unknown"
    dest = RAW_DIR / folder / "unprocessed" / src.name

    if dest.exists():
        return False

    if dry_run:
        log.info(f"  [dry-run] {src.name} → {dest.relative_to(RAW_DIR)}")
        return True

    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.link(src, dest)
    except FileExistsError:
        return False
    except OSError:
        try:
            shutil.copy2(src, dest)
        except shutil.SameFileError:
            return False
    return True


# ── Filename → safe_serial helper ─────────────────────────────────────────────

def _safe_serial(letter_serial: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_=+\-]", "_", letter_serial)


# ── Main migration ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Reorganize codal_raw/ flat files into symbol/duration/type subfolders")
    parser.add_argument("--dry-run", action="store_true", help="Print actions, no filesystem changes")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N raw response rows")
    parser.add_argument("--symbol", type=str, default=None, help="Only process one symbol")
    args = parser.parse_args()

    if args.dry_run:
        log.info("DRY-RUN mode — no files will be touched")

    # ── DB connection ──────────────────────────────────────────────────────────
    from config.settings import DATABASE_URL
    from database.connection import get_db_manager

    db_manager = get_db_manager(DATABASE_URL)
    session = db_manager.get_scoped_session()

    try:
        from database.models import CodalAnnouncement, CodalRawResponse, FinancialStatement

        # Build query: raw responses with their announcement symbol
        query = (
            session.query(
                CodalRawResponse.letter_serial,
                CodalAnnouncement.symbol,
                CodalAnnouncement.id.label("ann_id"),
            )
            .join(CodalAnnouncement, CodalRawResponse.codal_announcement_id == CodalAnnouncement.id)
        )
        if args.symbol:
            query = query.filter(CodalAnnouncement.symbol == args.symbol)
        if args.limit:
            query = query.limit(args.limit)

        rows = query.all()
        log.info(f"Found {len(rows)} raw response rows to process")

        # Build map: ann_id → list of (statement_type, period_months)
        # financial_statements is small (~3K rows) — fetch all to avoid huge IN clause
        fs_rows = (
            session.query(
                FinancialStatement.codal_announcement_id,
                FinancialStatement.statement_type,
                FinancialStatement.period_months,
            )
            .all()
        )
        fs_map = defaultdict(list)
        for fs in fs_rows:
            fs_map[fs.codal_announcement_id].append((fs.statement_type, fs.period_months))

    finally:
        session.close()

    # ── Index flat files once for O(1) lookup (avoids 100K+ stat() calls) ──────
    flat_files = {f.name: f for f in RAW_DIR.glob("*.html.gz")}
    log.info(f"Indexed {len(flat_files)} flat .html.gz files in {RAW_DIR}")

    # ── Process files ──────────────────────────────────────────────────────────
    linked = 0
    skipped_missing = 0
    skipped_exists = 0

    for row in rows:
        safe = _safe_serial(row.letter_serial)
        src = flat_files.get(f"{safe}.html.gz")

        if src is None:
            skipped_missing += 1
            continue

        types = fs_map.get(row.ann_id, [])

        if not types:
            # Not yet parsed — put in unprocessed
            created = link_unprocessed(src, row.symbol, dry_run=args.dry_run)
            if created:
                linked += 1
            else:
                skipped_exists += 1
        else:
            for stmt_type, period_months in types:
                created = link_file(src, row.symbol, period_months, stmt_type, dry_run=args.dry_run)
                if created:
                    linked += 1
                else:
                    skipped_exists += 1

    log.info("=" * 60)
    log.info(f"  Rows processed   : {len(rows)}")
    log.info(f"  Links created    : {linked}")
    log.info(f"  Already existed  : {skipped_exists}")
    log.info(f"  Missing flat file: {skipped_missing}")
    if args.dry_run:
        log.info("  (dry-run — no changes made)")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
