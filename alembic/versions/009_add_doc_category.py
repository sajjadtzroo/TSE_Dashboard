"""Add doc_category column to pdf_documents

Revision ID: 009_add_doc_category
Revises: 008_drop_ohlcv_indexes
Create Date: 2026-02-22

Adds a doc_category column to distinguish CFA documents from Codal filings.
Backfills existing CFA-related documents based on title matching.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009_add_doc_category"
down_revision: Union[str, None] = "008_drop_ohlcv_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "pdf_documents",
        sa.Column(
            "doc_category",
            sa.String(30),
            nullable=False,
            server_default="codal",
            comment="Document category: codal, cfa, research, other",
        ),
    )
    op.create_index(
        "idx_pdf_documents_doc_category",
        "pdf_documents",
        ["doc_category"],
    )

    # Backfill: tag existing CFA curriculum documents
    op.execute(
        "UPDATE pdf_documents SET doc_category = 'cfa' "
        "WHERE LOWER(title) LIKE '%cfa%' "
        "OR LOWER(title) LIKE '%chartered financial%'"
    )


def downgrade() -> None:
    op.drop_index("idx_pdf_documents_doc_category", table_name="pdf_documents")
    op.drop_column("pdf_documents", "doc_category")
