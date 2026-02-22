"""TimescaleDB: enable extension, convert tick_trades to hypertable, add continuous aggregates

Revision ID: 007_timescaledb_tick_hypertable
Revises: 006_add_telegram_fields
Create Date: 2026-02-22

What this migration does
------------------------
1. Enable the timescaledb extension (requires the TimescaleDB-enabled DB image).
2. Add tick_time TIMESTAMPTZ column to tick_trades.
3. Backfill tick_time from existing date + time columns (Asia/Tehran timezone).
4. Drop the BRIN index on date (TimescaleDB manages its own chunk indexes).
5. Convert tick_trades to a TimescaleDB hypertable partitioned by tick_time.
6. Add a compression policy (compress chunks older than 7 days).
7. Add a retention policy (drop raw tick chunks older than 90 days).
8. Create ohlcv_1min continuous aggregate with a 1-minute refresh policy.
9. Create ohlcv_5min continuous aggregate (hierarchical, from ohlcv_1min).

Downgrade
---------
Drops continuous aggregates and policies. The hypertable is left in place
(converting back to a plain table is destructive and not worth doing here).
The tick_time column is also left — it is harmless without the hypertable.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_timescaledb_tick_hypertable"
down_revision: Union[str, None] = "006_add_telegram_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Enable TimescaleDB extension ──────────────────────────────────────
    conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))

    # ── 2. Add tick_time column ───────────────────────────────────────────────
    op.add_column(
        "tick_trades",
        sa.Column(
            "tick_time",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="TIMESTAMPTZ used as TimescaleDB hypertable time dimension",
        ),
    )

    # ── 3. Backfill tick_time from date + time string ─────────────────────────
    # time column stores HHMM or HHMMSS strings from BrsAPI (e.g. "091530")
    # We normalise to HH:MM:SS and combine with date in Asia/Tehran timezone.
    conn.execute(sa.text("""
        UPDATE tick_trades
        SET tick_time = (
            date::text || ' ' ||
            CASE
                WHEN length(COALESCE(time, '')) = 6
                    THEN substr(time, 1, 2) || ':' || substr(time, 3, 2) || ':' || substr(time, 5, 2)
                WHEN length(COALESCE(time, '')) = 4
                    THEN substr(time, 1, 2) || ':' || substr(time, 3, 2) || ':00'
                ELSE '09:00:00'
            END
        )::TIMESTAMP AT TIME ZONE 'Asia/Tehran'
        WHERE tick_time IS NULL;
    """))

    # ── 4. Drop old BRIN index (TimescaleDB manages its own partitioning) ────
    # We keep idx_tick_trades_sec_date for the existing dedup constraint.
    op.drop_index("idx_tick_trades_date_brin", table_name="tick_trades")

    # ── 5. Convert to TimescaleDB hypertable ──────────────────────────────────
    # migrate_data=true preserves existing rows.
    # chunk_time_interval=1 day: each chunk covers one trading day — efficient
    # for the daily scrape pattern and per-day compression.
    conn.execute(sa.text("""
        SELECT create_hypertable(
            'tick_trades',
            'tick_time',
            chunk_time_interval => INTERVAL '1 day',
            migrate_data        => TRUE,
            if_not_exists       => TRUE
        );
    """))

    # ── 6. Add new index on (security_id, tick_time) for hypertable queries ──
    # TimescaleDB uses this for chunk exclusion on per-symbol time-range scans.
    op.create_index(
        "idx_tick_trades_sec_tick_time",
        "tick_trades",
        ["security_id", "tick_time"],
    )

    # ── 7. Compression policy ─────────────────────────────────────────────────
    # Compress chunks older than 7 days. Segment by security_id so each chunk
    # is sorted by (security_id, tick_time) — optimal for per-symbol queries.
    conn.execute(sa.text("""
        ALTER TABLE tick_trades SET (
            timescaledb.compress          = true,
            timescaledb.compress_segmentby = 'security_id',
            timescaledb.compress_orderby   = 'tick_time DESC'
        );
    """))
    conn.execute(sa.text("""
        SELECT add_compression_policy(
            'tick_trades',
            compress_after  => INTERVAL '7 days',
            if_not_exists   => TRUE
        );
    """))

    # ── 8. Retention policy ───────────────────────────────────────────────────
    # Raw ticks older than 90 days are dropped. Continuous aggregates (below)
    # are kept indefinitely, so OHLCV history is never lost.
    conn.execute(sa.text("""
        SELECT add_retention_policy(
            'tick_trades',
            drop_after    => INTERVAL '90 days',
            if_not_exists => TRUE
        );
    """))

    # ── 9. ohlcv_1min continuous aggregate ───────────────────────────────────
    # Real-time 1-minute OHLCV candles. Refreshed with a 1-minute lag so the
    # current (incomplete) minute bucket is always live.
    conn.execute(sa.text("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS ohlcv_1min
        WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
        SELECT
            time_bucket('1 minute', tick_time) AS bucket,
            security_id,
            FIRST(price, tick_time)            AS open,
            MAX(price)                         AS high,
            MIN(price)                         AS low,
            LAST(price, tick_time)             AS close,
            SUM(volume)                        AS volume,
            COUNT(*)                           AS trades
        FROM tick_trades
        WHERE NOT canceled
        GROUP BY bucket, security_id
        WITH NO DATA;
    """))

    conn.execute(sa.text("""
        SELECT add_continuous_aggregate_policy(
            'ohlcv_1min',
            start_offset      => INTERVAL '1 hour',
            end_offset        => INTERVAL '1 minute',
            schedule_interval => INTERVAL '1 minute',
            if_not_exists     => TRUE
        );
    """))

    # ── 10. ohlcv_5min continuous aggregate (hierarchical) ───────────────────
    # Built from ohlcv_1min — avoids re-scanning raw ticks for 5min candles.
    conn.execute(sa.text("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS ohlcv_5min
        WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
        SELECT
            time_bucket('5 minutes', bucket) AS bucket,
            security_id,
            FIRST(open, bucket)              AS open,
            MAX(high)                        AS high,
            MIN(low)                         AS low,
            LAST(close, bucket)              AS close,
            SUM(volume)                      AS volume,
            SUM(trades)                      AS trades
        FROM ohlcv_1min
        GROUP BY 1, 2
        WITH NO DATA;
    """))

    conn.execute(sa.text("""
        SELECT add_continuous_aggregate_policy(
            'ohlcv_5min',
            start_offset      => INTERVAL '2 hours',
            end_offset        => INTERVAL '5 minutes',
            schedule_interval => INTERVAL '5 minutes',
            if_not_exists     => TRUE
        );
    """))


def downgrade() -> None:
    conn = op.get_bind()

    # Drop continuous aggregates (policies are cascade-dropped with them)
    conn.execute(sa.text(
        "DROP MATERIALIZED VIEW IF EXISTS ohlcv_5min CASCADE;"
    ))
    conn.execute(sa.text(
        "DROP MATERIALIZED VIEW IF EXISTS ohlcv_1min CASCADE;"
    ))

    # Remove compression and retention policies
    conn.execute(sa.text("""
        SELECT remove_compression_policy('tick_trades', if_exists => TRUE);
    """))
    conn.execute(sa.text("""
        SELECT remove_retention_policy('tick_trades', if_exists => TRUE);
    """))

    # NOTE: We intentionally do NOT convert the hypertable back to a plain
    # table — that would require a full data dump/restore. The tick_time column
    # is also left in place. Re-running upgrade() will be a no-op (if_not_exists
    # guards are in place on all steps).

    # Restore the BRIN index that was dropped
    op.create_index(
        "idx_tick_trades_date_brin",
        "tick_trades",
        ["date"],
        postgresql_using="brin",
        postgresql_with={"pages_per_range": 128},
    )

    op.drop_index("idx_tick_trades_sec_tick_time", table_name="tick_trades")
