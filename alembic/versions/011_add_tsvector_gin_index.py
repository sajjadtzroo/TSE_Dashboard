"""Add GIN index on document_chunks content for BM25 full-text search

Revision ID: 011_add_tsvector_gin
Revises: 010_add_option_fk
Create Date: 2026-02-22

Functional GIN index using to_tsvector('simple', content) to support
hybrid BM25+vector search via ts_rank_cd.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "011_add_tsvector_gin"
down_revision: Union[str, None] = "010_add_option_fk"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_document_chunks_content_fts "
        "ON document_chunks USING gin (to_tsvector('simple', content))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_document_chunks_content_fts")
