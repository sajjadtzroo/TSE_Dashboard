"""Add loan_chunks table with pgvector embeddings for Persian Loan RAG

Revision ID: 029_loan_chunks_vectors
Revises: 028_gin_trgm_symbol
Create Date: 2026-03-28

Stores one vector embedding per loan product (43 rows total) from the
Persian_Loan repo. Pre-filter columns (min_credit_score, has_guarantor,
max_amount) let us narrow the candidate set via SQL before the HNSW cosine
distance search, ensuring accurate credit-aware loan recommendations.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "029_loan_chunks_vectors"
down_revision: Union[str, None] = "028_gin_trgm_symbol"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "loan_chunks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "loan_product_id",
            sa.Integer(),
            sa.ForeignKey("loan_products.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "bank_id",
            sa.Integer(),
            sa.ForeignKey("loan_banks.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=True),   # replaced by vector below
        sa.Column("credit_ratings", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("min_credit_score", sa.Integer(), nullable=True),
        sa.Column("max_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("interest_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("has_guarantor", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("calculation_method", sa.String(50), nullable=True),
        sa.Column("bank_name_fa", sa.String(150), nullable=True),
        sa.Column("loan_name_fa", sa.String(250), nullable=True),
        sa.Column("loan_slug", sa.String(100), nullable=True, unique=True),
        sa.Column("extra_meta", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )

    # Replace text embedding column with native vector(1536)
    op.execute("ALTER TABLE loan_chunks DROP COLUMN embedding")
    op.execute("ALTER TABLE loan_chunks ADD COLUMN embedding vector(1536)")

    # Supporting indexes
    op.create_index("idx_loan_chunks_loan_product", "loan_chunks", ["loan_product_id"])
    op.create_index("idx_loan_chunks_bank", "loan_chunks", ["bank_id"])
    op.create_index("idx_loan_chunks_min_score", "loan_chunks", ["min_credit_score"])
    op.create_index("idx_loan_chunks_slug", "loan_chunks", ["loan_slug"])

    # HNSW index for cosine similarity (no CONCURRENTLY — 43-row table, no contention risk)
    op.execute(sa.text(
        "CREATE INDEX idx_loan_chunks_embedding_hnsw"
        " ON loan_chunks USING hnsw (embedding vector_cosine_ops)"
        " WITH (m = 16, ef_construction = 64)"
    ))


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_loan_chunks_embedding_hnsw")
    op.drop_index("idx_loan_chunks_slug", table_name="loan_chunks")
    op.drop_index("idx_loan_chunks_min_score", table_name="loan_chunks")
    op.drop_index("idx_loan_chunks_bank", table_name="loan_chunks")
    op.drop_index("idx_loan_chunks_loan_product", table_name="loan_chunks")
    op.drop_table("loan_chunks")
