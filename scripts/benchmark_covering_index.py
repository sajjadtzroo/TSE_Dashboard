"""
Covering Index Benchmark — Before / After migration 024.

Tests the two missing indexes:
  1. idx_daily_ohlcv_date_covering  — covering index on daily_ohlcv
  2. idx_securities_active          — partial index on securities

Run BEFORE migration 024:
    python scripts/benchmark_covering_index.py --phase before

Run AFTER migration 024:
    python scripts/benchmark_covering_index.py --phase after

Compare:
    python scripts/benchmark_covering_index.py --compare
"""

import argparse
import json
import os
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from statistics import mean, median, stdev

import psycopg2

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:HamedAghasi!@#$%6@localhost:5432/tsetmc",
)

RESULTS_DIR = Path(__file__).parent / "benchmark_results"
RESULTS_DIR.mkdir(exist_ok=True)


def get_conn():
    return psycopg2.connect(DB_URL)


# ── Core timing helpers ───────────────────────────────────────────────────────

def explain_analyze(conn, sql, params=None):
    """Return (execution_ms, plan_text, used_index_only_scan)."""
    with conn.cursor() as cur:
        cur.execute(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) {sql}", params)
        rows = [r[0] for r in cur.fetchall()]
    plan_text = "\n".join(rows)
    exec_time = None
    for line in rows:
        if "Execution Time:" in line:
            exec_time = float(line.strip().replace("Execution Time:", "").replace("ms", "").strip())
    index_only = "Index Only Scan" in plan_text
    heap_fetches = None
    for line in rows:
        if "Heap Fetches:" in line:
            try:
                heap_fetches = int(line.strip().split(":")[-1].strip())
            except ValueError:
                pass
    return exec_time, plan_text, index_only, heap_fetches


def run_batch(conn, sql, params=None, runs=10):
    """Run query `runs` times, return timing + plan info from first run."""
    times = []
    first_plan = None
    first_index_only = None
    first_heap_fetches = None

    for i in range(runs):
        t, plan, ios, hf = explain_analyze(conn, sql, params)
        if t is not None:
            times.append(t)
        if i == 0:
            first_plan = plan
            first_index_only = ios
            first_heap_fetches = hf

    if not times:
        return None

    return {
        "mean_ms":        round(mean(times), 3),
        "median_ms":      round(median(times), 3),
        "min_ms":         round(min(times), 3),
        "max_ms":         round(max(times), 3),
        "stdev_ms":       round(stdev(times) if len(times) > 1 else 0, 3),
        "runs":           len(times),
        "index_only_scan": first_index_only,
        "heap_fetches":   first_heap_fetches,
        "plan_snippet":   first_plan[:400] if first_plan else None,
    }


# ── Benchmark queries ─────────────────────────────────────────────────────────

def bench(conn):
    results = {}

    # Get the latest date that has data
    with conn.cursor() as cur:
        cur.execute("SELECT MAX(date) FROM daily_ohlcv")
        latest_date = cur.fetchone()[0]
        cur.execute("SELECT date FROM daily_ohlcv GROUP BY date ORDER BY date DESC LIMIT 1 OFFSET 5")
        row = cur.fetchone()
        date_5ago = row[0] if row else latest_date

    print(f"  Latest date in daily_ohlcv: {latest_date}")
    print(f"  Date 5 trading days ago:    {date_5ago}")

    # ── Test 1: Full market-watch query for ONE date ──────────────────────────
    # This is the dashboard's primary query — all stocks for today
    print("\n  [1/6] Market-watch: all stocks for latest date...")
    results["market_watch_one_day"] = run_batch(
        conn,
        """
        SELECT security_id, close, last, volume, value, trades,
               close_change, close_change_pct, high, low, pe_ratio, eps, market_cap
        FROM daily_ohlcv
        WHERE date = %s
        ORDER BY value DESC
        """,
        (latest_date,), runs=10
    )

    # ── Test 2: Same query but fetching more columns (stress test) ────────────
    print("  [2/6] Market-watch: all columns for latest date...")
    results["market_watch_all_cols"] = run_batch(
        conn,
        """
        SELECT *
        FROM daily_ohlcv
        WHERE date = %s
        """,
        (latest_date,), runs=10
    )

    # ── Test 3: Top gainers — filtered + sorted ───────────────────────────────
    print("  [3/6] Top gainers query...")
    results["top_gainers"] = run_batch(
        conn,
        """
        SELECT security_id, close, close_change_pct, volume, market_cap
        FROM daily_ohlcv
        WHERE date = %s AND close_change_pct > 0
        ORDER BY close_change_pct DESC
        LIMIT 20
        """,
        (latest_date,), runs=10
    )

    # ── Test 4: Date range — last 5 trading days for all stocks ──────────────
    print("  [4/6] Last 5 days range query...")
    results["five_day_range"] = run_batch(
        conn,
        """
        SELECT security_id, date, close, volume, value
        FROM daily_ohlcv
        WHERE date >= %s AND date <= %s
        ORDER BY date DESC, value DESC
        """,
        (date_5ago, latest_date), runs=10
    )

    # ── Test 5: Single stock history (uses uq_daily_ohlcv_sec_date) ──────────
    # This should NOT change — uses different index
    print("  [5/6] Single stock 1-year history...")
    with conn.cursor() as cur:
        cur.execute("SELECT security_id FROM daily_ohlcv GROUP BY security_id ORDER BY COUNT(*) DESC LIMIT 1")
        top_sec = cur.fetchone()[0]
    results["single_stock_history"] = run_batch(
        conn,
        """
        SELECT date, close, volume, close_change_pct
        FROM daily_ohlcv
        WHERE security_id = %s
        ORDER BY date DESC
        LIMIT 250
        """,
        (top_sec,), runs=10
    )

    # ── Test 6: securities — active list ─────────────────────────────────────
    # Uses the partial index after migration
    print("  [6/6] Securities: list all active...")
    results["securities_active_list"] = run_batch(
        conn,
        """
        SELECT security_id, symbol, market_type, sector_name_fa
        FROM securities
        WHERE is_active = true
        ORDER BY symbol
        """,
        runs=10
    )

    return results, latest_date


# ── Index inventory ───────────────────────────────────────────────────────────

def collect_meta(conn, latest_date):
    with conn.cursor() as cur:
        # Check which target indexes exist
        cur.execute("""
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'daily_ohlcv' AND schemaname = 'public'
        """)
        ohlcv_indexes = [r[0] for r in cur.fetchall()]

        cur.execute("""
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'securities' AND schemaname = 'public'
        """)
        sec_indexes = [r[0] for r in cur.fetchall()]

        cur.execute("SELECT COUNT(*) FROM daily_ohlcv WHERE date = %s", (latest_date,))
        row_count_today = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM securities WHERE is_active = true")
        active_securities = cur.fetchone()[0]

    return {
        "timestamp":                  datetime.now(UTC).isoformat(),
        "latest_date":                str(latest_date),
        "rows_for_latest_date":       row_count_today,
        "active_securities":          active_securities,
        "covering_index_exists":      "idx_daily_ohlcv_date_covering" in ohlcv_indexes,
        "partial_index_exists":       "idx_securities_active" in sec_indexes,
        "daily_ohlcv_indexes":        ohlcv_indexes,
        "securities_indexes":         sec_indexes,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def run_benchmark(phase: str):
    print(f"\n{'='*60}")
    print(f"  COVERING INDEX BENCHMARK — Phase: {phase.upper()}")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    conn = get_conn()
    conn.autocommit = True

    print("Running queries (10 runs each)...")
    results, latest_date = bench(conn)
    meta = collect_meta(conn, latest_date)

    print(f"\n  Covering index exists: {meta['covering_index_exists']}")
    print(f"  Partial index exists:  {meta['partial_index_exists']}")
    print(f"  Stocks for today:      {meta['rows_for_latest_date']}")
    print(f"  Active securities:     {meta['active_securities']}")

    print(f"\n  {'Query':<30}  {'Mean ms':>8}  {'Min ms':>7}  {'Max ms':>7}  {'IOS?':>6}  {'Heap':>6}")
    print("  " + "-"*72)
    for name, r in results.items():
        if r:
            ios = "YES" if r["index_only_scan"] else "no"
            hf  = str(r["heap_fetches"]) if r["heap_fetches"] is not None else "?"
            print(f"  {name:<30}  {r['mean_ms']:>8.3f}  {r['min_ms']:>7.3f}  {r['max_ms']:>7.3f}  {ios:>6}  {hf:>6}")

    conn.close()

    out = {"phase": phase, "meta": meta, "results": results}
    path = RESULTS_DIR / f"benchmark_covering_{phase}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, default=str)
    print(f"\nResults saved -> {path}")
    return out


def compare():
    bp = RESULTS_DIR / "benchmark_covering_before.json"
    ap = RESULTS_DIR / "benchmark_covering_after.json"
    if not bp.exists() or not ap.exists():
        print("Need both benchmark_covering_before.json and benchmark_covering_after.json")
        sys.exit(1)

    with open(bp) as f: before = json.load(f)
    with open(ap) as f: after  = json.load(f)

    bm, am = before["meta"], after["meta"]
    br, ar = before["results"], after["results"]

    print(f"\n{'='*78}")
    print("  COVERING INDEX BENCHMARK — Before vs After")
    print(f"{'='*78}\n")

    print("INDEXES")
    print(f"  Covering index (daily_ohlcv):  {bm['covering_index_exists']} -> {am['covering_index_exists']}")
    print(f"  Partial index  (securities):   {bm['partial_index_exists']}  -> {am['partial_index_exists']}")
    print(f"  Stocks benchmarked:            {bm['rows_for_latest_date']}")
    print(f"  Active securities:             {bm['active_securities']}")

    print(f"\n{'Query':<30}  {'BEFORE ms':>10}  {'AFTER ms':>10}  {'DELTA':>8}  {'CHANGE':>10}  {'IOS before':>10}  {'IOS after':>10}  {'Heap B':>7}  {'Heap A':>7}")
    print("-"*120)

    for key in br:
        b = br.get(key)
        a = ar.get(key)
        if not b or not a:
            continue
        delta = a["mean_ms"] - b["mean_ms"]
        pct   = (delta / b["mean_ms"] * 100) if b["mean_ms"] else 0
        arrow = "^ SLOWER" if pct > 5 else ("v FASTER" if pct < -5 else "~ same")
        ios_b = "YES" if b.get("index_only_scan") else "no"
        ios_a = "YES" if a.get("index_only_scan") else "no"
        hf_b  = str(b.get("heap_fetches", "?"))
        hf_a  = str(a.get("heap_fetches", "?"))
        print(f"{key:<30}  {b['mean_ms']:>10.3f}  {a['mean_ms']:>10.3f}  {delta:>+8.3f}  {arrow:>10} ({pct:+.1f}%)  {ios_b:>10}  {ios_a:>10}  {hf_b:>7}  {hf_a:>7}")

    print(f"\n{'='*78}")
    print("IOS = Index Only Scan (no heap access)  |  Heap = heap fetches counted by planner")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", choices=["before", "after"])
    parser.add_argument("--compare", action="store_true")
    args = parser.parse_args()

    if args.compare:
        compare()
    elif args.phase:
        run_benchmark(args.phase)
    else:
        parser.print_help()
