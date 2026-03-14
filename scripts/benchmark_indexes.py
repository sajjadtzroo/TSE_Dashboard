"""
Index Benchmark — Before / After duplicate index removal.

Run BEFORE migration 023:
    python scripts/benchmark_indexes.py --phase before

Run AFTER migration 023:
    python scripts/benchmark_indexes.py --phase after

Results saved to: scripts/benchmark_results/
Compare with:    python scripts/benchmark_indexes.py --compare
"""

import argparse
import json
import os
import sys
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from statistics import mean, median, stdev

import psycopg2

# ── Connection ────────────────────────────────────────────────────────────────

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:HamedAghasi!@#$%6@localhost:5432/tsetmc",
)

RESULTS_DIR = Path(__file__).parent / "benchmark_results"
RESULTS_DIR.mkdir(exist_ok=True)


def get_conn():
    return psycopg2.connect(DB_URL)


# ── Helpers ───────────────────────────────────────────────────────────────────

def timeit(fn, runs=5):
    """Run fn() `runs` times, return (mean_ms, median_ms, min_ms, max_ms, stdev_ms)."""
    times = []
    for _ in range(runs):
        t0 = time.perf_counter()
        fn()
        times.append((time.perf_counter() - t0) * 1000)
    return {
        "mean_ms":   round(mean(times), 3),
        "median_ms": round(median(times), 3),
        "min_ms":    round(min(times), 3),
        "max_ms":    round(max(times), 3),
        "stdev_ms":  round(stdev(times) if len(times) > 1 else 0, 3),
        "runs":      runs,
    }


def explain_analyze(conn, sql, params=None):
    """Return actual total time from EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)."""
    with conn.cursor() as cur:
        cur.execute(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) {sql}", params)
        rows = cur.fetchall()
    for row in rows:
        line = row[0]
        if "Execution Time:" in line:
            return float(line.strip().replace("Execution Time:", "").replace("ms", "").strip())
    return None


def run_explain_batch(conn, sql, params=None, runs=5):
    """Run EXPLAIN ANALYZE multiple times, return timing stats."""
    times = []
    for _ in range(runs):
        t = explain_analyze(conn, sql, params)
        if t is not None:
            times.append(t)
    if not times:
        return None
    return {
        "mean_ms":   round(mean(times), 3),
        "median_ms": round(median(times), 3),
        "min_ms":    round(min(times), 3),
        "max_ms":    round(max(times), 3),
        "stdev_ms":  round(stdev(times) if len(times) > 1 else 0, 3),
        "runs":      len(times),
    }


# ── Index inventory ───────────────────────────────────────────────────────────

def count_indexes(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM pg_indexes
            WHERE schemaname = 'public'
        """)
        return cur.fetchone()[0]


def total_index_size(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT pg_size_pretty(SUM(pg_relation_size(indexrelid)))
            FROM pg_stat_user_indexes
            WHERE schemaname = 'public'
        """)
        return cur.fetchone()[0]


def index_size_bytes(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COALESCE(SUM(pg_relation_size(indexrelid)), 0)
            FROM pg_stat_user_indexes
            WHERE schemaname = 'public'
        """)
        return cur.fetchone()[0]


def zero_scan_indexes(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM pg_stat_user_indexes
            WHERE schemaname = 'public' AND idx_scan = 0
              AND indexrelname NOT LIKE 'pg_%'
        """)
        return cur.fetchone()[0]


# ── READ benchmarks ───────────────────────────────────────────────────────────

def bench_reads(conn):
    results = {}

    # 1. codal_announcements — symbol lookup (duplicate: idx_codal_symbol + ix_codal_announcements_symbol)
    results["codal_by_symbol"] = run_explain_batch(
        conn,
        "SELECT id, title, date_publish FROM codal_announcements WHERE symbol = %s LIMIT 20",
        ("فولاد",), runs=7
    )

    # 2. codal_announcements — symbol + date range (uses idx_codal_symbol_date_publish)
    results["codal_by_symbol_date"] = run_explain_batch(
        conn,
        "SELECT id, title FROM codal_announcements WHERE symbol = %s AND date_publish > %s ORDER BY date_publish DESC LIMIT 10",
        ("فولاد", "1402/01/01"), runs=7
    )

    # 3. market_prices — security_id + date (duplicate: uq_market_prices_sec_date + idx_market_prices_sec_date)
    results["market_prices_lookup"] = run_explain_batch(
        conn,
        "SELECT * FROM market_prices WHERE security_id = %s ORDER BY date DESC LIMIT 1",
        (1,), runs=7
    )

    # 4. order_book — security_id + time (duplicate: uq_order_book_sec_time + idx_order_book_sec_time)
    results["order_book_lookup"] = run_explain_batch(
        conn,
        "SELECT * FROM order_book WHERE security_id = %s ORDER BY snapshot_time DESC LIMIT 5",
        (1,), runs=7
    )

    # 5. options — underlying (duplicate: idx_options_underlying + ix_options_underlying)
    results["options_by_underlying"] = run_explain_batch(
        conn,
        "SELECT * FROM options WHERE underlying = %s ORDER BY date DESC LIMIT 10",
        ("فولاد",), runs=7
    )

    # 6. market_indices — date range (duplicate: idx_market_indices_date + ix_market_indices_date)
    results["market_indices_date"] = run_explain_batch(
        conn,
        "SELECT * FROM market_indices WHERE date >= %s ORDER BY date DESC LIMIT 30",
        (datetime.now(UTC) - timedelta(days=90),), runs=7
    )

    # 7. financial_statements — symbol + type (uses idx_fs_symbol_type_period)
    results["financial_statements_lookup"] = run_explain_batch(
        conn,
        "SELECT * FROM financial_statements WHERE symbol = %s AND statement_type = %s ORDER BY period_end_date DESC LIMIT 5",
        ("فولاد", "income_statement"), runs=7
    )

    # 8. loan_products — bank_id (duplicate: idx_loan_products_bank + ix_loan_products_bank_id)
    results["loan_products_by_bank"] = run_explain_batch(
        conn,
        "SELECT * FROM loan_products WHERE bank_id = %s AND is_active = true",
        (1,), runs=7
    )

    # 9. securities — symbol lookup
    results["securities_by_symbol"] = run_explain_batch(
        conn,
        "SELECT * FROM securities WHERE symbol = %s",
        ("فولاد",), runs=7
    )

    # 10. Full market scan (most common query — all active prices for latest date)
    results["market_prices_full_scan"] = run_explain_batch(
        conn,
        "SELECT security_id, price, change_pct FROM market_prices ORDER BY date DESC LIMIT 500",
        runs=7
    )

    return results


# ── WRITE benchmarks ──────────────────────────────────────────────────────────

BATCH_SIZE = 200  # rows per INSERT batch


def bench_writes(conn):
    results = {}
    conn.autocommit = False

    # ── 1. codal_announcements INSERT (has 2 duplicate symbol indexes + 2 GIN indexes)
    # Insert into a staging area then delete — we need a valid-ish row
    with conn.cursor() as cur:
        cur.execute("SELECT MAX(id) FROM codal_announcements")
        max_id = cur.fetchone()[0] or 0

    def insert_codal():
        with conn.cursor() as cur:
            for i in range(BATCH_SIZE):
                cur.execute("""
                    INSERT INTO codal_announcements
                        (symbol, title, date_publish, code)
                    VALUES (%s, %s, %s, %s)
                """, (
                    f"BENCH_{i % 10:03d}",
                    f"Benchmark announcement {i}",
                    "1403/01/01",
                    f"BCODE{i:06d}{int(time.time())}",
                ))
        conn.rollback()  # don't persist

    results["codal_insert_200rows"] = timeit(insert_codal, runs=5)

    # ── 2. loan_products INSERT (has 6 duplicate/redundant indexes)
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM loan_banks LIMIT 1")
        row = cur.fetchone()
        _bank_id = row[0] if row else None

    if _bank_id:
        def insert_loan_products():
            with conn.cursor() as cur:
                for i in range(BATCH_SIZE):
                    cur.execute("""
                        INSERT INTO loan_products
                            (bank_id, loan_slug, name_fa, calculation_method, is_active)
                        VALUES (%s, %s, %s, %s, true)
                    """, (
                        _bank_id,
                        f"bench-slug-{i}-{int(time.time())}",
                        f"محصول آزمایشی {i}",
                        "installment",
                    ))
            conn.rollback()

        results["loan_products_insert_200rows"] = timeit(insert_loan_products, runs=5)
    else:
        results["loan_products_insert_200rows"] = {"skipped": "no loan_banks rows"}

    # ── 3. options INSERT (has 3 duplicate/redundant indexes)
    def insert_options():
        with conn.cursor() as cur:
            today = datetime.now(UTC).date()
            for i in range(BATCH_SIZE):
                cur.execute("""
                    INSERT INTO options
                        (ins_code, symbol, underlying, date, strike_price, expiry_date, option_type)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    9_000_000_000 + i,
                    f"BOPT{i:04d}",
                    "فولاد",
                    today,
                    5000.0,
                    str(today + timedelta(days=30)),
                    "call",
                ))
        conn.rollback()

    results["options_insert_200rows"] = timeit(insert_options, runs=5)

    # ── 4. UPDATE on market_prices (has duplicate unique+plain index)
    with conn.cursor() as cur:
        cur.execute("SELECT security_id, date FROM market_prices LIMIT 1")
        row = cur.fetchone()

    if row:
        sec_id, dt = row

        def update_market_prices():
            with conn.cursor() as cur:
                for _ in range(50):
                    cur.execute(
                        "UPDATE market_prices SET price = price + 0.01 WHERE security_id = %s AND date = %s",
                        (sec_id, dt)
                    )
            conn.rollback()

        results["market_prices_update_50x"] = timeit(update_market_prices, runs=5)

    conn.autocommit = True
    return results


# ── DB meta stats ─────────────────────────────────────────────────────────────

def collect_meta(conn):
    return {
        "total_indexes":     count_indexes(conn),
        "total_index_size":  total_index_size(conn),
        "index_size_bytes":  index_size_bytes(conn),
        "zero_scan_indexes": zero_scan_indexes(conn),
        "timestamp":         datetime.now(UTC).isoformat(),
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def run_benchmark(phase: str):
    print(f"\n{'='*60}")
    print(f"  INDEX BENCHMARK — Phase: {phase.upper()}")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    conn = get_conn()
    conn.autocommit = True

    print("Collecting DB metadata...")
    meta = collect_meta(conn)
    print(f"  Total indexes:      {meta['total_indexes']}")
    print(f"  Total index size:   {meta['total_index_size']}")
    print(f"  Zero-scan indexes:  {meta['zero_scan_indexes']}")

    print("\nRunning READ benchmarks (7 runs each, EXPLAIN ANALYZE)...")
    reads = bench_reads(conn)
    print("\n  Query                          Mean(ms)  Median(ms)  Min(ms)  Max(ms)")
    print("  " + "-"*70)
    for name, r in reads.items():
        if r:
            print(f"  {name:<30}  {r['mean_ms']:>8.3f}  {r['median_ms']:>10.3f}  {r['min_ms']:>7.3f}  {r['max_ms']:>7.3f}")
        else:
            print(f"  {name:<30}  {'N/A':>8}")

    print("\nRunning WRITE benchmarks (5 runs each, 200 rows/batch, rolled back)...")
    writes = bench_writes(conn)
    print("\n  Operation                      Mean(ms)  Median(ms)  Min(ms)  Max(ms)")
    print("  " + "-"*70)
    for name, r in writes.items():
        if "mean_ms" in r:
            print(f"  {name:<30}  {r['mean_ms']:>8.3f}  {r['median_ms']:>10.3f}  {r['min_ms']:>7.3f}  {r['max_ms']:>7.3f}")
        else:
            print(f"  {name:<30}  {'SKIPPED':>8}")

    conn.close()

    result = {"phase": phase, "meta": meta, "reads": reads, "writes": writes}
    out_path = RESULTS_DIR / f"benchmark_{phase}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, default=str)
    print(f"\nResults saved → {out_path}")
    return result


def compare():
    before_path = RESULTS_DIR / "benchmark_before.json"
    after_path  = RESULTS_DIR / "benchmark_after.json"

    if not before_path.exists() or not after_path.exists():
        print("ERROR: Need both benchmark_before.json and benchmark_after.json")
        sys.exit(1)

    with open(before_path) as f:
        before = json.load(f)
    with open(after_path) as f:
        after = json.load(f)

    print(f"\n{'='*70}")
    print("  BENCHMARK COMPARISON — Before vs After Index Cleanup")
    print(f"{'='*70}\n")

    bm = before["meta"]
    am = after["meta"]
    saved_bytes = int(bm["index_size_bytes"]) - int(am["index_size_bytes"])
    print("DATABASE METADATA")
    print(f"  {'':30}  {'BEFORE':>12}  {'AFTER':>12}  {'CHANGE':>12}")
    print("  " + "-"*70)
    print(f"  {'Total indexes':30}  {bm['total_indexes']:>12}  {am['total_indexes']:>12}  {am['total_indexes']-bm['total_indexes']:>+12}")
    print(f"  {'Total index size':30}  {bm['total_index_size']:>12}  {am['total_index_size']:>12}")
    print(f"  {'Space freed':30}  {'':>12}  {'':>12}  {saved_bytes/1024/1024:>+10.1f} MB")
    print(f"  {'Zero-scan indexes':30}  {bm['zero_scan_indexes']:>12}  {am['zero_scan_indexes']:>12}  {am['zero_scan_indexes']-bm['zero_scan_indexes']:>+12}")

    print("\nREAD PERFORMANCE (mean ms — lower is better)")
    print(f"  {'Query':30}  {'BEFORE':>10}  {'AFTER':>10}  {'DELTA':>10}  {'CHANGE':>8}")
    print("  " + "-"*72)
    all_keys = set(before["reads"]) | set(after["reads"])
    for key in sorted(all_keys):
        b = before["reads"].get(key)
        a = after["reads"].get(key)
        if b and a:
            delta = a["mean_ms"] - b["mean_ms"]
            pct   = (delta / b["mean_ms"] * 100) if b["mean_ms"] else 0
            arrow = "^ SLOWER" if delta > 0.5 else ("v faster" if delta < -0.5 else "~ same")
            print(f"  {key:<30}  {b['mean_ms']:>10.3f}  {a['mean_ms']:>10.3f}  {delta:>+10.3f}  {arrow:>8}  ({pct:+.1f}%)")
        else:
            print(f"  {key:<30}  {'N/A':>10}  {'N/A':>10}")

    print("\nWRITE PERFORMANCE (mean ms — lower is better)")
    print(f"  {'Operation':30}  {'BEFORE':>10}  {'AFTER':>10}  {'DELTA':>10}  {'CHANGE':>8}")
    print("  " + "-"*72)
    all_wkeys = set(before["writes"]) | set(after["writes"])
    for key in sorted(all_wkeys):
        b = before["writes"].get(key)
        a = after["writes"].get(key)
        if b and a and "mean_ms" in b and "mean_ms" in a:
            delta = a["mean_ms"] - b["mean_ms"]
            pct   = (delta / b["mean_ms"] * 100) if b["mean_ms"] else 0
            arrow = "^ SLOWER" if delta > 1 else ("v faster" if delta < -1 else "~ same")
            print(f"  {key:<30}  {b['mean_ms']:>10.3f}  {a['mean_ms']:>10.3f}  {delta:>+10.3f}  {arrow:>8}  ({pct:+.1f}%)")
        else:
            print(f"  {key:<30}  {'SKIPPED':>10}  {'SKIPPED':>10}")

    print(f"\n{'='*70}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Index benchmark tool")
    parser.add_argument("--phase", choices=["before", "after"], help="Run benchmark phase")
    parser.add_argument("--compare", action="store_true", help="Compare before vs after")
    args = parser.parse_args()

    if args.compare:
        compare()
    elif args.phase:
        run_benchmark(args.phase)
    else:
        parser.print_help()
