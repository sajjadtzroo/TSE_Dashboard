"""add news_articles table

Revision ID: 029_news_articles
Revises: 8c84bceabc1a
Create Date: 2026-03-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "029_news_articles"
down_revision = "8c84bceabc1a"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "news_articles",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("source", sa.String(100), nullable=False),
        sa.Column("source_type", sa.String(20), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("url", sa.String(500), nullable=True, unique=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("language", sa.String(5), nullable=False, server_default="fa"),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("tags", JSONB, server_default="[]"),
        sa.Column("sentiment_score", sa.Numeric(4, 3), nullable=True),
        sa.Column("sentiment_label", sa.String(10), nullable=True),
        sa.Column("impact_score", sa.SmallInteger(), nullable=True),
        sa.Column("related_symbols", JSONB, server_default="[]"),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "source_type IN ('telegram', 'rss', 'cryptopanic', 'newsapi')",
            name="ck_news_source_type",
        ),
    )

    # Add pgvector embedding column
    op.execute(
        "ALTER TABLE news_articles ADD COLUMN embedding vector(1536)"
    )

    # Indexes
    op.create_index("idx_news_published_at", "news_articles", ["published_at"], postgresql_using="brin")
    op.create_index("idx_news_source_type", "news_articles", ["source_type"])
    op.create_index("idx_news_category", "news_articles", ["category"])
    op.create_index("idx_news_impact", "news_articles", ["impact_score"])
    op.create_index("idx_news_language", "news_articles", ["language"])
    op.create_index("idx_news_tags", "news_articles", ["tags"], postgresql_using="gin")
    op.create_index("idx_news_symbols", "news_articles", ["related_symbols"], postgresql_using="gin")

    # HNSW vector index for semantic search
    op.execute(
        "CREATE INDEX idx_news_embedding ON news_articles "
        "USING hnsw (embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )


def downgrade():
    op.drop_table("news_articles")
