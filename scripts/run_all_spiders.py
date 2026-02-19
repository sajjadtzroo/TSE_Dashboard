"""
scripts/run_all_spiders.py
~~~~~~~~~~~~~~~~~~~~~~~~~~
Run every spider sequentially, then create a compressed pg_dump snapshot.

Usage:
    python scripts/run_all_spiders.py                 # all spiders
    python scripts/run_all_spiders.py --skip-slow     # skip history_backfill,
                                                      # codal_financials_detail (each ~30 min)
    python scripts/run_all_spiders.py --dump-only     # skip spiders, just dump

Output:
    data/backups/full_run_<YYYYMMDD_HHMMSS>.sql.gz
"""

import argparse
import gzip
import logging
import os
import shutil
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

# ── project root ──────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("run_all_spiders")

# ── spider order & timeouts (seconds) ────────────────────────────────────────
# Ordered: fast metadata first, then market data, then heavy backfills last.
SPIDERS = [
    # (name,               timeout,  slow?)
    ("instrument_details",    600,   False),
    ("market_indices",        300,   False),
    ("market_prices",         300,   False),
    ("etf_nav",               300,   False),
    ("market_watch",          300,   False),
    ("options",               300,   False),
    ("ime_options",           300,   False),
    ("ime_futures",           300,   False),
    ("ime_forwards",          300,   False),
    ("ime_certificates",      300,   False),
    ("ime_funds",             300,   False),
    ("ime_physical",          300,   False),
    ("codal",                 600,   False),
    ("codal_financial",      None,   False),  # no timeout — paginates back to 1395
    ("shareholders",         None,   False),  # no timeout — all securities
    ("tick_trades",          None,   False),  # no timeout — all securities
    ("history_backfill",     None,   True),   # no timeout — 500+ securities
    ("codal_financials_detail", None, True),  # no timeout — batch Excel fetching
]


def _find_pg_dump() -> str:
    found = shutil.which("pg_dump")
    if found:
        return found
    import glob as _glob
    patterns = [
        r"C:\Program Files\PostgreSQL\*\bin\pg_dump.exe",
        r"C:\Program Files (x86)\PostgreSQL\*\bin\pg_dump.exe",
    ]
    candidates = []
    for pat in patterns:
        candidates.extend(_glob.glob(pat))
    if candidates:
        return sorted(candidates)[-1]
    raise FileNotFoundError(
        "pg_dump not found. Add PostgreSQL bin to PATH."
    )


def run_spider(name: str, timeout: int) -> bool:
    log.info(f"▶  Starting spider: {name}")
    start = time.monotonic()
    try:
        result = subprocess.run(
            [sys.executable, "-m", "scrapy", "crawl", name, "-s", "LOG_LEVEL=WARNING"],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        elapsed = time.monotonic() - start
        if result.returncode == 0:
            log.info(f"✓  {name} finished in {elapsed:.0f}s")
            return True
        else:
            log.error(f"✗  {name} failed (rc={result.returncode}) in {elapsed:.0f}s")
            if result.stderr:
                # Show last 300 chars of stderr
                log.error(f"   stderr: ...{result.stderr[-300:]}")
            return False
    except subprocess.TimeoutExpired:
        elapsed = time.monotonic() - start
        log.error(f"✗  {name} timed out after {elapsed:.0f}s")
        return False
    except Exception as e:
        log.error(f"✗  {name} error: {e}")
        return False


def dump_database(output_path: Path) -> bool:
    from config.settings import DATABASE_URL

    sql_tmp = output_path.with_suffix("")  # strip .gz → .sql

    parsed = urlparse(DATABASE_URL)
    env = os.environ.copy()
    if parsed.password:
        env["PGPASSWORD"] = parsed.password

    pg_args = [_find_pg_dump()]
    if parsed.hostname:
        pg_args.extend(["-h", parsed.hostname])
    if parsed.port:
        pg_args.extend(["-p", str(parsed.port)])
    if parsed.username:
        pg_args.extend(["-U", parsed.username])
    db_name = parsed.path.lstrip("/")
    if db_name:
        pg_args.extend(["-d", db_name])
    pg_args.extend(["-f", str(sql_tmp)])

    log.info(f"Running pg_dump → {sql_tmp.name} ...")
    result = subprocess.run(pg_args, capture_output=True, text=True, timeout=600, env=env)

    if result.returncode != 0:
        log.error(f"pg_dump failed: {result.stderr}")
        sql_tmp.unlink(missing_ok=True)
        return False

    log.info(f"Compressing → {output_path.name} ...")
    with sql_tmp.open("rb") as f_in, gzip.open(output_path, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)
    sql_tmp.unlink()

    size_mb = output_path.stat().st_size / (1024 * 1024)
    log.info(f"✓  Dump saved: {output_path}  ({size_mb:.1f} MB)")
    return True


def main():
    parser = argparse.ArgumentParser(description="Run all spiders then dump DB")
    parser.add_argument("--skip-slow", action="store_true",
                        help="Skip slow spiders (history_backfill, codal_financials_detail)")
    parser.add_argument("--dump-only", action="store_true",
                        help="Skip all spiders, just create the dump")
    args = parser.parse_args()

    wall_start = time.monotonic()
    results = {}

    if not args.dump_only:
        spiders_to_run = [
            (name, timeout)
            for name, timeout, slow in SPIDERS
            if not (args.skip_slow and slow)
        ]

        total = len(spiders_to_run)
        log.info(f"{'='*60}")
        log.info(f"Running {total} spiders  (skip_slow={args.skip_slow})")
        log.info(f"{'='*60}")

        for i, (name, timeout) in enumerate(spiders_to_run, 1):
            log.info(f"[{i}/{total}]")
            ok = run_spider(name, timeout)
            results[name] = ok

        # Summary
        passed = sum(v for v in results.values())
        failed = [k for k, v in results.items() if not v]
        log.info(f"{'='*60}")
        log.info(f"Spiders done — {passed}/{total} succeeded")
        if failed:
            log.warning(f"Failed: {', '.join(failed)}")
        log.info(f"{'='*60}")

    # Dump
    backup_dir = ROOT / "data" / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    dump_path = backup_dir / f"full_run_{timestamp}.sql.gz"

    dump_ok = dump_database(dump_path)

    total_elapsed = time.monotonic() - wall_start
    log.info(f"Total time: {total_elapsed/60:.1f} min")

    if not dump_ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
