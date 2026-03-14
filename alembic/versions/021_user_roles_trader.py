"""Rename analyst role to trader and add role check constraint

Revision ID: 021_user_roles_trader
Revises: 020_dollar_eod
Create Date: 2026-03-12

- Renames all existing 'analyst' rows to 'trader'
- Adds CHECK constraint on users.role: ('viewer', 'trader', 'admin')
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "021_user_roles_trader"
down_revision: Union[str, None] = "020_dollar_eod"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Migrate existing analyst users to trader
    op.execute("UPDATE users SET role = 'trader' WHERE role = 'analyst'")

    # Add check constraint
    op.create_check_constraint(
        "ck_users_role",
        "users",
        "role IN ('viewer', 'trader', 'admin')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_role", "users", type_="check")

    # Revert trader back to analyst
    op.execute("UPDATE users SET role = 'analyst' WHERE role = 'trader'")
