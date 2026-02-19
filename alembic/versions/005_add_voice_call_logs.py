"""add voice_call_logs table

Revision ID: 005_voice_call_logs
Revises: 004_crypto_tables
Create Date: 2026-02-19
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "005_voice_call_logs"
down_revision: Union[str, None] = "004_crypto_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "voice_call_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("model_id", sa.String(50), nullable=False, comment="gemini-live, grok-voice, gpt-realtime"),
        sa.Column("voice", sa.String(50), comment="Selected voice name"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True)),
        sa.Column("duration_seconds", sa.Integer()),
        sa.Column("tool_calls_count", sa.Integer(), server_default="0"),
        sa.Column("tools_used", JSONB()),
        sa.Column("end_reason", sa.String(50), comment="user_hangup, timeout, error"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_voice_call_logs_user", "voice_call_logs", ["user_id"])
    op.create_index("idx_voice_call_logs_started", "voice_call_logs", ["started_at"])


def downgrade() -> None:
    op.drop_index("idx_voice_call_logs_started", table_name="voice_call_logs")
    op.drop_index("idx_voice_call_logs_user", table_name="voice_call_logs")
    op.drop_table("voice_call_logs")
