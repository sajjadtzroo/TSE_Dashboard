"""Drop surrogate PK on daily_ohlcv, promote natural key to PK

Revision ID: 026_drop_ohlcv_surrogate_pk
Revises: 025_enable_pg_stat_statements
Create Date: 2026-03-14

Critical Issue #4 — 69 MB unused index:

daily_ohlcv has an id BIGSERIAL PRIMARY KEY that:
  - No query ever filters or joins on (0 scans in pg_stat_user_indexes)
  - Has no FK references from any other table
  - Costs 69 MB of index storage + write amplification on every insert

Fix:
  1. Drop the 69 MB daily_ohlcv_pkey index (DROP CONSTRAINT)
  2. Drop the id column (catalog-only in PG 11+, no row rewrite)
  3. Promote the existing uq_daily_ohlcv_sec_date unique index to PK
     (USING INDEX — no index rebuild, instant)

All three DDL steps avoid a full table rewrite on PG 16.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "026_drop_ohlcv_surrogate_pk"
down_revision: Union[str, None] = "025_enable_pg_stat_statements"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop the surrogate PK (drops the 69 MB index)
    op.drop_constraint("daily_ohlcv_pkey", "daily_ohlcv", type_="primary")

    # 2. Drop the id column — catalog-only in PG 11+, no rewrite
    op.drop_column("daily_ohlcv", "id")

    # 3. Drop the unique constraint (uq_daily_ohlcv_sec_date is a CONSTRAINT,
    #    not a plain index, so USING INDEX won't work on it directly).
    op.drop_constraint("uq_daily_ohlcv_sec_date", "daily_ohlcv", type_="unique")

    # 4. Recreate as PRIMARY KEY — builds one index that serves both roles
    op.create_primary_key("uq_daily_ohlcv_sec_date", "daily_ohlcv", ["security_id", "date"])


def downgrade() -> None:
    # Drop the composite PK, restore unique constraint + surrogate id PK
    op.drop_constraint("uq_daily_ohlcv_sec_date", "daily_ohlcv", type_="primary")
    op.create_unique_constraint("uq_daily_ohlcv_sec_date", "daily_ohlcv", ["security_id", "date"])

    op.add_column(
        "daily_ohlcv",
        sa.Column("id", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
    )
    op.execute(sa.text("CREATE SEQUENCE IF NOT EXISTS daily_ohlcv_id_seq OWNED BY daily_ohlcv.id"))
    op.execute(sa.text("ALTER TABLE daily_ohlcv ALTER COLUMN id SET DEFAULT nextval('daily_ohlcv_id_seq')"))
    op.create_primary_key("daily_ohlcv_pkey", "daily_ohlcv", ["id"])
