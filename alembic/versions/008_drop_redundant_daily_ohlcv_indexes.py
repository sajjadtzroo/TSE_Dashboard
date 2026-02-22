"""Drop redundant indexes on daily_ohlcv

Revision ID: 008_drop_ohlcv_indexes
Revises: 007_timescaledb_tick_hypertable
Create Date: 2026-02-22

Three indexes are fully covered by existing ones and waste ~240 MB:

  idx_daily_ohlcv_sec_date   -- plain btree (security_id, date)
                                 redundant with uq_daily_ohlcv_sec_date
  ix_daily_ohlcv_date        -- btree (date), duplicate of idx_daily_ohlcv_date
  ix_daily_ohlcv_security_id -- btree (security_id) alone, subsumed by
                                 uq_daily_ohlcv_sec_date (security_id, date)

Kept:
  daily_ohlcv_pkey           -- PRIMARY KEY (id)
  uq_daily_ohlcv_sec_date    -- UNIQUE (security_id, date) — integrity + queries
  idx_daily_ohlcv_date       -- btree (date) — market-wide date scans
  idx_daily_ohlcv_sec_date   -- dropped (was duplicate of unique constraint)
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008_drop_ohlcv_indexes"
down_revision: Union[str, None] = "007_timescaledb_tick_hypertable"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Redundant: plain (security_id, date) — uq_daily_ohlcv_sec_date covers this
    op.drop_index("idx_daily_ohlcv_sec_date", table_name="daily_ohlcv")

    # Redundant: duplicate of idx_daily_ohlcv_date (same columns, both btree)
    op.drop_index("ix_daily_ohlcv_date", table_name="daily_ohlcv")

    # Redundant: (security_id) alone is a prefix of uq_daily_ohlcv_sec_date
    op.drop_index("ix_daily_ohlcv_security_id", table_name="daily_ohlcv")


def downgrade() -> None:
    op.create_index("ix_daily_ohlcv_security_id", "daily_ohlcv", ["security_id"])
    op.create_index("ix_daily_ohlcv_date", "daily_ohlcv", ["date"])
    op.create_index("idx_daily_ohlcv_sec_date", "daily_ohlcv", ["security_id", "date"])
