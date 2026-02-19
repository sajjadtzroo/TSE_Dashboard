"""add telegram fields to users

Revision ID: 006_add_telegram_fields
Revises: 005_voice_call_logs
Create Date: 2026-02-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_add_telegram_fields"
down_revision: Union[str, None] = "005_voice_call_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "telegram_id",
            sa.BigInteger(),
            nullable=True,
            comment="Telegram user ID for Mini App login",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "telegram_username",
            sa.String(64),
            nullable=True,
            comment="Telegram @username",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "telegram_first_name",
            sa.String(64),
            nullable=True,
            comment="Telegram display name",
        ),
    )
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_telegram_id", table_name="users")
    op.drop_column("users", "telegram_first_name")
    op.drop_column("users", "telegram_username")
    op.drop_column("users", "telegram_id")
