"""Create two missing covering/partial indexes and run ANALYZE

Revision ID: 024_covering_indexes
Revises: 023_drop_duplicate_indexes
Create Date: 2026-03-14

Fixes Critical Issue #2 — schema drift: two indexes defined in models.py
that were never included in any Alembic migration:

1. idx_daily_ohlcv_date_covering
   - Covering index on daily_ohlcv(date, security_id)
   - INCLUDE columns: all columns needed by the market-watch API query
   - Enables index-only scans: zero heap fetches for dashboard queries
   - Replaces the plain idx_daily_ohlcv_date index after creation

2. idx_securities_active
   - Partial index on securities WHERE is_active = true
   - Covers (security_id, symbol, market_type, sector_name_fa)
   - Enables index-only scans for the active securities list
   - Replaces the useless plain btree(is_active) index

Also runs ANALYZE on both tables so the planner has accurate statistics
and will actually choose these new indexes.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "024_covering_indexes"
down_revision: Union[str, None] = "023_drop_duplicate_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Covering index on daily_ohlcv ─────────────────────────────────────
    # postgresql_include lists columns stored in the index leaf pages —
    # they are not part of the B-tree key but are returned in index-only scans,
    # eliminating all heap fetches for the market-watch query pattern.
    op.create_index(
        "idx_daily_ohlcv_date_covering",
        "daily_ohlcv",
        ["date", "security_id"],
        postgresql_include=[
            "close", "last", "open", "high", "low",
            "volume", "value", "trades",
            "close_change", "close_change_pct",
            "last_change", "last_change_pct",
            "pe_ratio", "eps", "market_cap",
        ],
    )

    # Drop the now-redundant plain date index — the covering index
    # covers all date-only lookups (leftmost prefix rule) plus more.
    op.drop_index("idx_daily_ohlcv_date", table_name="daily_ohlcv", if_exists=True)

    # ── 2. Partial covering index on securities ───────────────────────────────
    # Only indexes rows where is_active = true (the overwhelming majority
    # of queries). Carries the four columns needed for list/search APIs,
    # enabling index-only scans.
    op.create_index(
        "idx_securities_active",
        "securities",
        ["security_id", "symbol", "market_type", "sector_name_fa"],
        postgresql_where=sa.text("is_active = true"),
    )

    # Drop the now-redundant plain is_active index (0 scans, boolean column)
    op.drop_index("ix_securities_is_active", table_name="securities", if_exists=True)

    # ── 3. ANALYZE both tables ────────────────────────────────────────────────
    # Tables were bulk-loaded — autovacuum has not yet collected statistics.
    # Without ANALYZE the planner may not choose the new indexes.
    conn.execute(sa.text("ANALYZE daily_ohlcv"))
    conn.execute(sa.text("ANALYZE securities"))


def downgrade() -> None:
    conn = op.get_bind()

    op.drop_index("idx_daily_ohlcv_date_covering", table_name="daily_ohlcv", if_exists=True)
    op.drop_index("idx_securities_active", table_name="securities", if_exists=True)

    # Restore removed indexes
    op.create_index("idx_daily_ohlcv_date", "daily_ohlcv", ["date"])
    op.create_index("ix_securities_is_active", "securities", ["is_active"])

    conn.execute(sa.text("ANALYZE daily_ohlcv"))
    conn.execute(sa.text("ANALYZE securities"))
