"""Enable pg_stat_statements extension for query performance monitoring

Revision ID: 025_enable_pg_stat_statements
Revises: 024_covering_indexes
Create Date: 2026-03-14

pg_stat_statements tracks execution statistics for every SQL query:
- call counts, mean/total execution time, rows returned
- I/O timing, cache hit ratio per query shape

The extension binary is already preloaded via shared_preload_libraries
in postgresql.conf. This migration simply runs CREATE EXTENSION so the
pg_stat_statements view becomes accessible.

Usage after migration:
  -- Top 10 slowest queries by total CPU time
  SELECT query, calls, round(mean_exec_time::numeric,2) mean_ms,
         round(total_exec_time::numeric,2) total_ms
  FROM pg_stat_statements
  ORDER BY total_exec_time DESC
  LIMIT 10;
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "025_enable_pg_stat_statements"
down_revision: Union[str, None] = "024_covering_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS pg_stat_statements"))


def downgrade() -> None:
    op.execute(sa.text("DROP EXTENSION IF EXISTS pg_stat_statements"))
