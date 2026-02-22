"""Add index on document_chunks.created_at for recency-ordered queries

Revision ID: 012_chunk_created_at_idx
Revises: 011_add_tsvector_gin
Create Date: 2026-02-22
"""

from typing import Sequence, Union

from alembic import op

revision: str = "012_chunk_created_at_idx"
down_revision: Union[str, None] = "011_add_tsvector_gin"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_document_chunks_created_at "
        "ON document_chunks (created_at)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_document_chunks_created_at")
