"""add index on securities.type

Revision ID: 019
Revises: 018_currency_gold
Create Date: 2026-02-25

The type column ('stock'/'fund') is filtered in GET /api/companies?type=...
but had no index. Adding a B-tree index improves filter queries.
"""
from alembic import op

revision = "019"
down_revision = "018_currency_gold"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index("idx_securities_type", "securities", ["type"])


def downgrade():
    op.drop_index("idx_securities_type", table_name="securities")
