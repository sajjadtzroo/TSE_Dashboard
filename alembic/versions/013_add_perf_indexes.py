"""Add performance indexes: sector filtering + document chunk ordering

Revision ID: 013_add_perf_indexes
Revises: 012_chunk_created_at_idx
Create Date: 2026-02-22
"""

from typing import Sequence, Union

from alembic import op

revision: str = "013_add_perf_indexes"
down_revision: Union[str, None] = "012_chunk_created_at_idx"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_securities_sector "
        "ON securities (sector_name_fa) WHERE is_active = true"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc_idx "
        "ON document_chunks (document_id, chunk_index)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_doc_chunks_doc_idx")
    op.execute("DROP INDEX IF EXISTS idx_securities_sector")
