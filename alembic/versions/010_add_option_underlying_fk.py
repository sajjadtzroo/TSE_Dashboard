"""Add underlying_security_id FK to options table

Revision ID: 010_add_option_fk
Revises: 009_add_doc_category
Create Date: 2026-02-22

Adds a foreign key from options.underlying_security_id to securities.security_id,
then backfills by matching options.underlying to securities.symbol.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "010_add_option_fk"
down_revision: Union[str, None] = "009_add_doc_category"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "options",
        sa.Column(
            "underlying_security_id",
            sa.Integer(),
            sa.ForeignKey("securities.security_id", ondelete="SET NULL"),
            nullable=True,
            comment="FK to securities for underlying asset",
        ),
    )

    # Backfill from existing underlying symbol column
    op.execute(
        "UPDATE options o "
        "SET underlying_security_id = s.security_id "
        "FROM securities s "
        "WHERE o.underlying = s.symbol "
        "AND o.underlying_security_id IS NULL"
    )

    op.create_index(
        "idx_options_underlying_security_id",
        "options",
        ["underlying_security_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_options_underlying_security_id", table_name="options")
    op.drop_column("options", "underlying_security_id")
