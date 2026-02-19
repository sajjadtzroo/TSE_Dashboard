-- Migration 002: Performance indexes
-- Run: psql -U postgres -d tsetmc -f scripts/002_performance_indexes.sql
-- All CREATE INDEX use CONCURRENTLY — no table locks, safe on live database.

-- ── Phase 1: High impact ──────────────────────────────────────────────────────

-- Partial index on securities WHERE is_active = true
-- Skips inactive rows entirely for every API query that filters is_active = true
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_securities_active
    ON securities (security_id, symbol, market_type, sector_name_fa)
    WHERE is_active = true;

-- Covering index on daily_ohlcv (date, security_id) INCLUDE (...)
-- Turns market-overview join into an index-only scan (no heap fetches)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_ohlcv_date_covering
    ON daily_ohlcv (date, security_id)
    INCLUDE (close, last, close_change, close_change_pct,
             volume, value, trades, low, high, pe_ratio, eps, market_cap);

-- Composite index on market_indices (name, date DESC)
-- Queries filter by name then ORDER BY date DESC; replaces single-column date index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_indices_name_date
    ON market_indices (name, date DESC);

-- ── Phase 2: Medium impact ────────────────────────────────────────────────────

-- Options chain sort composite index
-- Eliminates in-memory sort for chain queries filtered by underlying + date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_options_chain_sort
    ON options (date, underlying, expiry_date, strike_price, option_type);

-- financial_statements index via security_id (FK path)
-- Scraper and RAG tools query via security_id FK; existing idx_fs_symbol_type_period
-- uses the text symbol column and cannot be used for these lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fs_security_type_period
    ON financial_statements (security_id, statement_type, period_end_date DESC);

-- BRIN index on order_book (append-only, written in snapshot_time order)
-- ~1000x smaller than B-tree; sufficient for range scans on sequential data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_book_snapshot_time_brin
    ON order_book USING brin (snapshot_time) WITH (pages_per_range = 128);

-- BRIN index on tick_trades (append-only, written in date order)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tick_trades_date_brin
    ON tick_trades USING brin (date) WITH (pages_per_range = 128);

-- ── Update planner statistics after index creation ────────────────────────────
ANALYZE securities;
ANALYZE daily_ohlcv;
ANALYZE market_indices;
ANALYZE options;
ANALYZE financial_statements;
ANALYZE order_book;
ANALYZE tick_trades;
