"""add extra_bank_data and parent_bank to loan_banks

Revision ID: 003_extra_bank_data
Revises: 002_add_indexes
Create Date: 2026-02-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "003_extra_bank_data"
down_revision: Union[str, None] = "002_add_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "loan_banks",
        sa.Column("parent_bank", sa.String(200), comment="Parent bank name for digital banks"),
    )
    op.add_column(
        "loan_banks",
        sa.Column("extra_bank_data", JSONB, comment="All additional bank-level data (varies per bank)"),
    )


def downgrade() -> None:
    op.drop_column("loan_banks", "extra_bank_data")
    op.drop_column("loan_banks", "parent_bank")
