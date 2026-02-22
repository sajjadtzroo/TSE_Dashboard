"""Add risk profiling tables: user_risk_profiles, suggested_portfolios

Revision ID: 014_add_risk_profiling
Revises: 013_add_perf_indexes
Create Date: 2026-02-22
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "014_add_risk_profiling"
down_revision: Union[str, None] = "013_add_perf_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_risk_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("questionnaire_version", sa.SmallInteger(), nullable=False, server_default="1"),
        sa.Column("answers", postgresql.JSONB(), nullable=False),
        sa.Column("composite_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("ability_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("willingness_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("final_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("profile_category", sa.String(30), nullable=False),
        sa.Column("target_allocation", postgresql.JSONB(), nullable=False),
        sa.Column("risk_constraints", postgresql.JSONB(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_user_risk_profiles_user", "user_risk_profiles", ["user_id"])
    op.create_index(
        "idx_user_risk_profiles_active",
        "user_risk_profiles",
        ["user_id"],
        postgresql_where=sa.text("is_active = true"),
    )

    op.create_table(
        "suggested_portfolios",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("risk_profile_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("holdings", postgresql.JSONB(), nullable=False),
        sa.Column("target_allocation", postgresql.JSONB(), nullable=False),
        sa.Column("expected_metrics", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="suggested"),
        sa.Column("market_snapshot", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["risk_profile_id"], ["user_risk_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_suggested_portfolios_profile", "suggested_portfolios", ["risk_profile_id"])
    op.create_index("idx_suggested_portfolios_user", "suggested_portfolios", ["user_id"])


def downgrade() -> None:
    op.drop_table("suggested_portfolios")
    op.drop_table("user_risk_profiles")
