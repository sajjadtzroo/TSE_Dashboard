"""initial baseline

Revision ID: 001_baseline
Revises:
Create Date: 2026-02-17

Baseline migration: represents the existing schema created by Base.metadata.create_all().
This migration is stamped (not run) on existing databases.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline: all tables already exist via create_all().
    # On a fresh DB, run create_all() first, then stamp this revision.
    pass


def downgrade() -> None:
    # Cannot downgrade the baseline — would need to drop all tables.
    raise RuntimeError("Cannot downgrade past the baseline migration.")
