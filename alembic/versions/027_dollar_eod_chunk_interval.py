"""Fix dollar_eod TimescaleDB chunk interval from 1 day to 7 days

Revision ID: 027_dollar_eod_chunk_interval
Revises: 026_drop_ohlcv_surrogate_pk
Create Date: 2026-03-14

dollar_eod was created with a 1-day chunk interval, producing 470 chunks
for 470 rows (1 row per chunk). This causes:
  - Planning time ~250 ms for a single-row lookup (planner visits all 470 chunk
    metadata entries even when chunk exclusion drops them at runtime)
  - 470 separate autovacuum targets, index entries, and toast tables
  - EXPLAIN output 900 KB+ for simple queries

Fix: set chunk interval to 7 days going forward.
Existing chunks are not rewritten — they remain 1-day until they age out
or are compressed. New data lands in properly-sized 7-day chunks.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "027_dollar_eod_chunk_interval"
down_revision: Union[str, None] = "026_drop_ohlcv_surrogate_pk"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text(
        "SELECT set_chunk_time_interval('dollar_eod', INTERVAL '7 days')"
    ))


def downgrade() -> None:
    op.execute(sa.text(
        "SELECT set_chunk_time_interval('dollar_eod', INTERVAL '1 day')"
    ))
