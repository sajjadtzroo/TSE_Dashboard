"""TimescaleDB: create crypto_trades hypertable with continuous aggregates

Revision ID: 030_crypto_trades_hypertable
Revises: 029_news_articles
Create Date: 2026-03-31

What this migration does
------------------------
1. Create crypto_trades table for raw Binance WebSocket trade data.
2. Convert crypto_trades to a TimescaleDB hypertable partitioned by trade_time
   (1-day chunks — matches tick_trades pattern).
3. Add compression policy (compress chunks older than 7 days).
4. Add retention policy (drop raw trade chunks older than 90 days).
5. Create crypto_ohlcv_1min continuous aggregate with 1-minute refresh.
6. Create crypto_ohlcv_5min continuous aggregate (hierarchical, from 1min).

This mirrors the stock tick_trades hypertable setup in migration 007,
adapted for 24/7 crypto markets (no trading-hours filter).

Downgrade
---------
Drops continuous aggregates, policies, and the crypto_trades table.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "030_crypto_trades_hypertable"
down_revision: Union[str, None] = "029_news_articles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Ensure TimescaleDB extension (idempotent) ─────────────────────────
    conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))

    # ── 2. Create crypto_trades table ────────────────────────────────────────
    op.create_table(
        "crypto_trades",
        sa.Column("trade_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "security_id",
            sa.Integer,
            sa.ForeignKey("securities.security_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("price", sa.Numeric(20, 8), nullable=False),
        sa.Column("quantity", sa.Numeric(30, 8), nullable=False),
        sa.Column("quote_volume", sa.Numeric(30, 8), nullable=False,
                  comment="price * quantity in quote asset (USDT)"),
        sa.Column("is_buyer_maker", sa.Boolean, default=False),
        sa.Column("binance_trade_id", sa.BigInteger),
    )

    # ── 3. Convert to TimescaleDB hypertable ─────────────────────────────────
    conn.execute(sa.text("""
        SELECT create_hypertable(
            'crypto_trades',
            'trade_time',
            chunk_time_interval => INTERVAL '1 day',
            if_not_exists       => TRUE
        );
    """))

    # ── 4. Indexes ───────────────────────────────────────────────────────────
    op.create_index(
        "idx_crypto_trades_sec_time",
        "crypto_trades",
        ["security_id", "trade_time"],
    )

    # ── 5. Compression policy ────────────────────────────────────────────────
    conn.execute(sa.text("""
        ALTER TABLE crypto_trades SET (
            timescaledb.compress          = true,
            timescaledb.compress_segmentby = 'security_id',
            timescaledb.compress_orderby   = 'trade_time DESC'
        );
    """))
    conn.execute(sa.text("""
        SELECT add_compression_policy(
            'crypto_trades',
            compress_after  => INTERVAL '7 days',
            if_not_exists   => TRUE
        );
    """))

    # ── 6. Retention policy ──────────────────────────────────────────────────
    conn.execute(sa.text("""
        SELECT add_retention_policy(
            'crypto_trades',
            drop_after    => INTERVAL '90 days',
            if_not_exists => TRUE
        );
    """))

    # ── 7. crypto_ohlcv_1min continuous aggregate ────────────────────────────
    conn.execute(sa.text("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS crypto_ohlcv_1min
        WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
        SELECT
            time_bucket('1 minute', trade_time) AS bucket,
            security_id,
            FIRST(price, trade_time)            AS open,
            MAX(price)                          AS high,
            MIN(price)                          AS low,
            LAST(price, trade_time)             AS close,
            SUM(quote_volume)                   AS volume,
            COUNT(*)                            AS trades
        FROM crypto_trades
        GROUP BY bucket, security_id
        WITH NO DATA;
    """))

    conn.execute(sa.text("""
        SELECT add_continuous_aggregate_policy(
            'crypto_ohlcv_1min',
            start_offset      => INTERVAL '1 hour',
            end_offset        => INTERVAL '1 minute',
            schedule_interval => INTERVAL '1 minute',
            if_not_exists     => TRUE
        );
    """))

    # ── 8. crypto_ohlcv_5min continuous aggregate (hierarchical) ─────────────
    conn.execute(sa.text("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS crypto_ohlcv_5min
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
        FROM crypto_ohlcv_1min
        GROUP BY 1, 2
        WITH NO DATA;
    """))

    conn.execute(sa.text("""
        SELECT add_continuous_aggregate_policy(
            'crypto_ohlcv_5min',
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
        "DROP MATERIALIZED VIEW IF EXISTS crypto_ohlcv_5min CASCADE;"
    ))
    conn.execute(sa.text(
        "DROP MATERIALIZED VIEW IF EXISTS crypto_ohlcv_1min CASCADE;"
    ))

    # Remove compression and retention policies
    conn.execute(sa.text(
        "SELECT remove_compression_policy('crypto_trades', if_exists => TRUE);"
    ))
    conn.execute(sa.text(
        "SELECT remove_retention_policy('crypto_trades', if_exists => TRUE);"
    ))

    # Drop the table entirely (hypertable + chunks)
    op.drop_index("idx_crypto_trades_sec_time", table_name="crypto_trades")
    op.drop_table("crypto_trades")
