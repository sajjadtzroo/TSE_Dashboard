"""Add dollar_eod hypertable and 1-day retention on currency_rates

Revision ID: 020_dollar_eod
Revises: 019
Create Date: 2026-02-25

dollar_eod: TimescaleDB hypertable partitioned by trade_date (1-day chunks).
Stores end-of-day OHLC for each USD rate type. Compress after 30 days.

currency_rates: add a 1-day retention policy — live intraday ticks are only
needed for the current trading day. Historical OHLC lives in dollar_eod.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "020_dollar_eod"
down_revision: Union[str, None] = "019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create dollar_eod as a plain table first ───────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS dollar_eod (
            security_id  INTEGER      NOT NULL
                         REFERENCES securities(security_id) ON DELETE RESTRICT,
            trade_date   TIMESTAMPTZ  NOT NULL,
            rate_type    VARCHAR(20)  NOT NULL,
            open         BIGINT,
            high         BIGINT,
            low          BIGINT,
            close        BIGINT,
            msg_id       INTEGER,
            channel      VARCHAR(100),
            posted_at    TIMESTAMPTZ
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_dollar_eod_sec_date
        ON dollar_eod (security_id, trade_date DESC)
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uidx_dollar_eod_key
        ON dollar_eod (security_id, trade_date, rate_type)
    """)

    # ── 2. Convert to TimescaleDB hypertable (1-day chunks) ───────────────────
    op.execute("""
        SELECT create_hypertable('dollar_eod', 'trade_date',
            chunk_time_interval => INTERVAL '1 day',
            if_not_exists => TRUE)
    """)

    # ── 3. Compression — compress after 30 days ───────────────────────────────
    op.execute("""
        ALTER TABLE dollar_eod SET (
            timescaledb.compress,
            timescaledb.compress_orderby   = 'trade_date DESC',
            timescaledb.compress_segmentby = 'security_id, rate_type'
        )
    """)
    op.execute("""
        SELECT add_compression_policy('dollar_eod', INTERVAL '30 days',
            if_not_exists => TRUE)
    """)

    # ── 4. currency_rates: drop live ticks after 1 day ────────────────────────
    # Historical OHLC is preserved in dollar_eod; the raw tick feed only
    # needs to be queryable for the current trading day.
    op.execute("""
        SELECT add_retention_policy('currency_rates', INTERVAL '1 day',
            if_not_exists => TRUE)
    """)


def downgrade() -> None:
    op.execute(
        "SELECT remove_retention_policy('currency_rates', if_not_exists => TRUE)"
    )
    op.execute(
        "SELECT remove_compression_policy('dollar_eod'::regclass, true)"
    )
    op.drop_table("dollar_eod")
