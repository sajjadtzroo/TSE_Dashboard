"""Add subscriptions table

Revision ID: 022_subscriptions
Revises: 021_user_roles_trader
Create Date: 2026-03-14

Creates the subscriptions table for tracking user plan membership.
Supports monthly, 3-month, 6-month, and yearly plans at pro/enterprise tiers.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "022_subscriptions"
down_revision: Union[str, None] = "021_user_roles_trader"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plan_type", sa.String(10), nullable=False),
        sa.Column("tier", sa.String(20), nullable=False, server_default="pro"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("activated_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "plan_type IN ('monthly', '3month', '6month', 'yearly')",
            name="ck_subscriptions_plan_type",
        ),
        sa.CheckConstraint(
            "tier IN ('pro', 'enterprise')",
            name="ck_subscriptions_tier",
        ),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_is_active", "subscriptions", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_subscriptions_is_active", "subscriptions")
    op.drop_index("ix_subscriptions_user_id", "subscriptions")
    op.drop_table("subscriptions")
