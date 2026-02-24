"""Add dollar_rates hypertable for Telegram USD/IRR feed

Revision ID: 017_add_dollar_rates
Revises: 016_add_minio_storage
Create Date: 2026-02-24
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "017_add_dollar_rates"
down_revision: Union[str, None] = "016_add_minio_storage"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "dollar_rates",
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=False,
                  comment="Telegram message timestamp (UTC)"),
        sa.Column("msg_id", sa.Integer(), nullable=False,
                  comment="Telegram message ID (unique within channel)"),
        sa.Column("channel", sa.String(100), nullable=False, server_default="dollar_tehran3bze",
                  comment="Telegram channel username"),
        sa.Column("rate_type", sa.String(20), nullable=False,
                  comment="'spot' (نقدی) or 'forward' (فردایی)"),
        sa.Column("side", sa.String(20), nullable=False,
                  comment="'buy' (خرید), 'sell' (فروش), or 'traded' (معامله شد)"),
        sa.Column("price", sa.BigInteger(), nullable=False,
                  comment="Price in Iranian Toman (no decimals)"),
        sa.Column("raw_text", sa.Text(), nullable=True,
                  comment="Original message text for auditing"),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()"),
                  comment="When this row was inserted"),
        sa.PrimaryKeyConstraint("posted_at", "msg_id", "channel", name="pk_dollar_rates"),
    )

    op.create_index("idx_dollar_rates_time", "dollar_rates", ["posted_at"])
    op.create_index("idx_dollar_rates_type_time", "dollar_rates", ["rate_type", "posted_at"])

    # Convert to TimescaleDB hypertable — 7-day chunks (same pattern as tick_trades)
    op.execute("""
        SELECT create_hypertable(
            'dollar_rates',
            'posted_at',
            chunk_time_interval => INTERVAL '7 days',
            if_not_exists => TRUE
        )
    """)

    # Compress chunks older than 30 days
    op.execute("""
        ALTER TABLE dollar_rates SET (
            timescaledb.compress,
            timescaledb.compress_orderby = 'posted_at DESC',
            timescaledb.compress_segmentby = 'rate_type, channel'
        )
    """)

    op.execute("""
        SELECT add_compression_policy(
            'dollar_rates',
            INTERVAL '30 days',
            if_not_exists => TRUE
        )
    """)


def downgrade() -> None:
    # Remove compression policy first, then drop table
    op.execute("""
        SELECT remove_compression_policy('dollar_rates', if_not_exists => TRUE)
    """)
    op.drop_table("dollar_rates")
