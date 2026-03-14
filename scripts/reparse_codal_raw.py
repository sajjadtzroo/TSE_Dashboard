"""
scripts/reparse_codal_raw.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Re-parse already-downloaded Codal HTML files from data/codal_raw/ and
populate financial_statements without any network access.

This is useful after fixing parser bugs (e.g. Arabic yaa matching) to
recover data from files that were previously fetched but not parsed.

Usage:
    python scripts/reparse_codal_raw.py
    python scripts/reparse_codal_raw.py --dry-run          # parse only, no DB writes
    python scripts/reparse_codal_raw.py --force            # re-parse already-processed too
    python scripts/reparse_codal_raw.py --limit 100        # process at most N announcements
"""

import argparse
import gzip
import logging
import re
import sys
from pathlib import Path

import jdatetime
from parsel import Selector
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from urllib.parse import quote_plus

from database.models import CodalAnnouncement, FinancialStatement

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("reparse_codal")

RAW_DIR = ROOT / "data" / "codal_raw"

# ── Persian/Arabic normalization ─────────────────────────────────────────────

def normalize_persian(text):
    """Normalize Arabic/Persian character variants for consistent matching."""
    text = text.replace("\u064a", "\u06cc")  # Arabic yaa → Persian yaa
    text = text.replace("\u0643", "\u06a9")  # Arabic kaf → Persian kaf
    text = text.replace("\u200c", " ")       # ZWNJ → space
    return " ".join(text.split())


# ── Statement type identification ────────────────────────────────────────────
# IMPORTANT: more specific patterns must come before shorter ones

STATEMENT_TYPE_MAP = [
    ("صورت سود و زیان جامع", "comprehensive_income"),
    ("سود و زیان جامع", "comprehensive_income"),
    ("صورت تغییرات در حقوق مالکانه", "equity_changes"),
    ("تغییرات در حقوق مالکانه", "equity_changes"),
    ("صورت جریانهای نقدی", "cash_flow"),    # fused form (no ZWNJ)
    ("جریانهای نقدی", "cash_flow"),          # fused form (no ZWNJ)
    ("صورت جریان های نقدی", "cash_flow"),   # modern term (after ZWNJ→space)
    ("جریان های نقدی", "cash_flow"),
    ("صورت جریان وجوه نقد", "cash_flow"),
    ("جریان وجوه نقد", "cash_flow"),
    ("صورت وضعیت مالی", "balance_sheet"),
    ("ترازنامه", "balance_sheet"),
    ("صورت سود و زیان", "income_statement"),
    ("سود و زیان", "income_statement"),
]

# ── Hot field mapping ─────────────────────────────────────────────────────────

HOT_FIELD_MAP = {
    "درآمدهای عملیاتی": "revenue",
    "درآمد عملیاتی": "revenue",
    "جمع درآمدهای عملیاتی": "revenue",
    "جمع درآمدها": "revenue",
    "بهای تمام شده درآمدهای عملیاتی": "cost_of_revenue",
    "بهای تمام شده": "cost_of_revenue",
    "سود (زیان) ناخالص": "gross_profit",
    "سود ناخالص": "gross_profit",
    "سود(زیان) ناخالص": "gross_profit",
    "سود (زیان) عملیاتی": "operating_income",
    "سود عملیاتی": "operating_income",
    "سود(زیان) عملیاتی": "operating_income",
    "سود (زیان) خالص": "net_income",
    "سود خالص": "net_income",
    "سود(زیان) خالص": "net_income",
    "سود (زیان) پایه هر سهم": "eps",
    "سود پایه هر سهم": "eps",
    "جمع دارایی ها": "total_assets",
    "جمع داراییها": "total_assets",
    "جمع بدهی ها": "total_liabilities",
    "جمع بدهیها": "total_liabilities",
    "جمع حقوق مالکانه": "total_equity",
    "جمع حقوق صاحبان سهام": "total_equity",
}

# ── Parser helpers ────────────────────────────────────────────────────────────

def _identify_table_type(table):
    parent = table.xpath('./ancestor::div[contains(@class, "table-containet")]')
    if parent:
        title_div = normalize_persian(" ".join(parent.css(".table-title ::text").getall()))
        for persian_name, stmt_type in STATEMENT_TYPE_MAP:
            if persian_name in title_div:
                return stmt_type

    headers = table.css("th span::text, thead span::text").getall()
    header_text = normalize_persian(" ".join(headers).strip())
    for persian_name, stmt_type in STATEMENT_TYPE_MAP:
        if persian_name in header_text:
            return stmt_type

    return None


def _parse_number(text):
    if not text:
        return None
    text = text.strip()
    if text in ("-", "--", "", "—"):
        return None
    is_negative = False
    if text.startswith("(") and text.endswith(")"):
        is_negative = True
        text = text[1:-1]
    text = text.replace(",", "").replace(" ", "").replace("\u200c", "")
    try:
        value = int(float(text))
        return -value if is_negative else value
    except (ValueError, TypeError):
        return None


def _extract_table_data(table):
    rows = table.css("tbody tr")
    line_items = {}
    hot_fields = {}

    for row in rows:
        cells = row.css("td")
        if len(cells) < 2:
            continue
        label = cells[0].css("span::text").get("").strip()
        if not label:
            label = cells[0].css("::text").get("").strip()
        if not label:
            continue

        value_text = cells[1].css("span::text").get("").strip()
        if not value_text:
            value_text = cells[1].css("::text").get("").strip()

        # Convert Persian/Arabic digits to ASCII
        for fa, en in zip("۰۱۲۳۴۵۶۷۸۹", "0123456789"):
            value_text = value_text.replace(fa, en)
        for fa, en in zip("٠١٢٣٤٥٦٧٨٩", "0123456789"):
            value_text = value_text.replace(fa, en)

        value = _parse_number(value_text)
        normalized_label = normalize_persian(label)

        hot_field_name = HOT_FIELD_MAP.get(normalized_label)
        if hot_field_name:
            hot_fields[hot_field_name] = value

        if value is not None:
            line_items[normalized_label] = value

    return line_items, hot_fields


def _extract_period_info(title):
    info = {
        "period_end_date": None,
        "period_end_jalali": "",
        "fiscal_year_end": None,
        "fiscal_year_end_jalali": None,
        "period_months": None,
    }
    if not title:
        return info

    # Convert Persian digits in title
    for fa, en in zip("۰۱۲۳۴۵۶۷۸۹", "0123456789"):
        title = title.replace(fa, en)

    date_pattern = r"(\d{4})/(\d{1,2})/(\d{1,2})"
    dates = re.findall(date_pattern, title)

    if dates:
        year, month, day = int(dates[0][0]), int(dates[0][1]), int(dates[0][2])
        info["period_end_jalali"] = f"{year:04d}/{month:02d}/{day:02d}"
        try:
            jd = jdatetime.date(year, month, day)
            info["period_end_date"] = jd.togregorian()
        except (ValueError, OverflowError):
            pass

        if len(dates) > 1:
            fy_year, fy_month, fy_day = int(dates[1][0]), int(dates[1][1]), int(dates[1][2])
            info["fiscal_year_end_jalali"] = f"{fy_year:04d}/{fy_month:02d}/{fy_day:02d}"
            try:
                jd2 = jdatetime.date(fy_year, fy_month, fy_day)
                info["fiscal_year_end"] = jd2.togregorian()
            except (ValueError, OverflowError):
                pass

    if any(x in title for x in ("3 ماهه", "سه ماهه", "۳ ماهه")):
        info["period_months"] = 3
    elif any(x in title for x in ("6 ماهه", "شش ماهه", "۶ ماهه")):
        info["period_months"] = 6
    elif any(x in title for x in ("9 ماهه", "نه ماهه", "۹ ماهه")):
        info["period_months"] = 9
    elif any(x in title for x in ("12 ماهه", "دوازده ماهه", "سالانه", "سال مالی")):
        info["period_months"] = 12
    elif any(x in title for x in ("میاندوره", "میان دوره")):
        info["period_months"] = 6

    return info


def parse_html_file(html_content, announcement_id, symbol, company_name, title):
    """Parse financial tables from HTML. Returns list of row dicts or []."""
    sel = Selector(text=html_content)
    period_info = _extract_period_info(title)
    is_audited = bool(title and ("حسابرسی شده" in title or "حسابرسي شده" in title))
    is_consolidated = bool(title and ("تلفیقی" in title or "تلفيقي" in title))

    best_by_type = {}
    for table in sel.css("table"):
        stmt_type = _identify_table_type(table)
        if not stmt_type:
            continue
        line_items, hot_fields = _extract_table_data(table)
        if not line_items and not hot_fields:
            continue
        existing = best_by_type.get(stmt_type)
        if existing is None or len(line_items) > len(existing[0]):
            best_by_type[stmt_type] = (line_items, hot_fields)

    rows = []
    for stmt_type, (line_items, hot_fields) in best_by_type.items():
        if period_info["period_end_date"] is None:
            continue  # can't store without a date

        row = {
            "codal_announcement_id": announcement_id,
            "symbol": symbol,
            "company_name": company_name,
            "statement_type": stmt_type,
            "period_end_date": period_info["period_end_date"],
            "period_end_jalali": period_info["period_end_jalali"],
            "fiscal_year_end": period_info["fiscal_year_end"],
            "fiscal_year_end_jalali": period_info["fiscal_year_end_jalali"],
            "is_audited": is_audited,
            "is_consolidated": is_consolidated,
            "period_months": period_info["period_months"],
            "line_items": line_items,
        }
        for field in ("revenue", "cost_of_revenue", "gross_profit", "operating_income",
                      "net_income", "total_assets", "total_liabilities", "total_equity", "eps"):
            row[field] = hot_fields.get(field)

        rows.append(row)

    return rows


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Re-parse local Codal HTML files")
    parser.add_argument("--dry-run", action="store_true", help="Parse only, no DB writes")
    parser.add_argument("--force", action="store_true",
                        help="Re-parse already-processed announcements too")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max announcements to process (0=all)")
    args = parser.parse_args()

    # Build DB engine
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    password = quote_plus("HamedAghasi!@#$%6")
    from config.settings import DATABASE_URL
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)

    with Session() as session:
        # Load all announcements with excel + letter_serial
        q = session.query(CodalAnnouncement).filter(
            CodalAnnouncement.has_excel == True,
            CodalAnnouncement.letter_serial.isnot(None),
        )
        if not args.force:
            q = q.filter(CodalAnnouncement.is_processed == False)

        announcements = q.order_by(CodalAnnouncement.id.desc()).all()
        log.info(f"Queried {len(announcements)} announcements from DB")

        if args.limit:
            announcements = announcements[: args.limit]
            log.info(f"Limited to {len(announcements)} (--limit {args.limit})")

        # Index flat files only (not recursive) — flat originals are always kept
        # so all unique files are in the root dir. Organized subfolders are
        # hardlinks to those same inodes and don't need to be scanned.
        raw_files = {
            f.stem.replace(".html", ""): f
            for f in RAW_DIR.glob("*.html.gz")
        }

        log.info(f"Found {len(raw_files)} raw files in {RAW_DIR}")

        processed = 0
        skipped_no_file = 0
        skipped_no_date = 0
        error_count = 0
        stmt_count = 0

        for ann in announcements:
            # Derive expected filename using same sanitization as spider
            safe_serial = re.sub(r"[^a-zA-Z0-9_=+\-]", "_", ann.letter_serial)
            raw_path = raw_files.get(safe_serial)

            if raw_path is None:
                skipped_no_file += 1
                continue

            try:
                with gzip.open(raw_path, "rb") as gz:
                    html_content = gz.read().decode("utf-8", errors="replace")
            except Exception as e:
                log.warning(f"Failed to read {raw_path}: {e}")
                error_count += 1
                continue

            try:
                rows = parse_html_file(
                    html_content,
                    ann.id,
                    ann.symbol or "",
                    ann.company_name or "",
                    ann.title or "",
                )
            except Exception as e:
                log.warning(f"Parse error for ann {ann.id} ({ann.symbol}): {e}")
                error_count += 1
                continue

            if not rows:
                skipped_no_date += 1
                continue

            if not args.dry_run:
                try:
                    for row in rows:
                        stmt = (
                            insert(FinancialStatement.__table__)
                            .values(**row)
                            .on_conflict_do_update(
                                constraint="uq_fs_announcement_type",
                                set_={
                                    k: row[k]
                                    for k in row
                                    if k not in ("codal_announcement_id", "statement_type")
                                },
                            )
                        )
                        session.execute(stmt)

                    session.query(CodalAnnouncement).filter(
                        CodalAnnouncement.id == ann.id
                    ).update(
                        {
                            "is_processed": True,
                            "is_failed": False,
                            "retry_count": 0,
                            "parse_errors": None,
                        }
                    )
                    session.commit()
                    stmt_count += len(rows)
                    processed += 1

                    if processed % 50 == 0:
                        log.info(
                            f"  Processed {processed} announcements, "
                            f"{stmt_count} statements written so far"
                        )

                except Exception as e:
                    session.rollback()
                    log.warning(f"DB write error for ann {ann.id}: {e}")
                    error_count += 1
            else:
                stmt_count += len(rows)
                processed += 1

        log.info("=" * 60)
        log.info("Re-parse complete")
        log.info(f"  Parsed+written : {processed}")
        log.info(f"  Statements     : {stmt_count}")
        log.info(f"  No local file  : {skipped_no_file}")
        log.info(f"  No date/tables : {skipped_no_date}")
        log.info(f"  Errors         : {error_count}")
        if args.dry_run:
            log.info("  (dry-run — no DB changes were committed)")


if __name__ == "__main__":
    main()
