"""Add GIN trigram index on securities.symbol for LIKE/ILIKE search

Revision ID: 028_gin_trigram_securities_symbol
Revises: 027_dollar_eod_chunk_interval
Create Date: 2026-03-14

securities.symbol has only a B-tree index (ix_securities_symbol) which
is useless for mid-string LIKE '%keyword%' and ILIKE searches — PostgreSQL
falls back to a full sequential scan on every search keystroke.

pg_trgm + GIN index decomposes strings into overlapping 3-char trigrams
and indexes them, enabling O(log n) lookup for any LIKE/ILIKE/~/~* pattern.

pg_trgm extension and GIN indexes already exist on codal_announcements
(idx_codal_title_trgm, idx_codal_company_name_trgm) — this migration adds
the missing index for securities.symbol only.

Before: Seq Scan, 0.69 ms (LIKE) / 1.63 ms (ILIKE) — scans all 4,618 rows
After:  Bitmap Index Scan using GIN trigram index
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "028_gin_trgm_symbol"
down_revision: Union[str, None] = "027_dollar_eod_chunk_interval"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # pg_trgm is already loaded (used by codal indexes) — no need to CREATE EXTENSION
    op.create_index(
        "idx_securities_symbol_trgm",
        "securities",
        ["symbol"],
        postgresql_using="gin",
        postgresql_ops={"symbol": "gin_trgm_ops"},
    )


def downgrade() -> None:
    op.drop_index("idx_securities_symbol_trgm", table_name="securities")
