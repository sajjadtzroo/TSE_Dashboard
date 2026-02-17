"""add performance indexes

Revision ID: 002_add_indexes
Revises: 001_baseline
Create Date: 2026-02-17

Ports migrations/001_add_indexes.sql into Alembic.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "002_add_indexes"
down_revision: Union[str, None] = "001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "idx_options_underlying_date",
        "options",
        ["underlying", "date"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_codal_symbol_date_publish",
        "codal_announcements",
        ["symbol", "date_publish"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_ime_physical_symbol",
        "ime_physical_trades",
        ["symbol"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_shareholders_shareholder_id",
        "shareholders",
        ["shareholder_id"],
        if_not_exists=True,
    )
    # HNSW index for pgvector cosine similarity
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw "
        "ON document_chunks "
        "USING hnsw (embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_document_chunks_embedding_hnsw")
    op.drop_index("idx_shareholders_shareholder_id", table_name="shareholders")
    op.drop_index("idx_ime_physical_symbol", table_name="ime_physical_trades")
    op.drop_index("idx_codal_symbol_date_publish", table_name="codal_announcements")
    op.drop_index("idx_options_underlying_date", table_name="options")
