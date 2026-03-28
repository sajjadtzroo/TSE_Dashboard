"""add portfolio tables

Revision ID: 8c84bceabc1a
Revises: 028_gin_trgm_symbol
Create Date: 2026-03-28 12:17:20.133641

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c84bceabc1a'
down_revision: Union[str, Sequence[str], None] = '028_gin_trgm_symbol'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create portfolios, portfolio_transactions, portfolio_goals, portfolio_alerts."""
    # -- portfolios
    op.create_table(
        'portfolios',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False, server_default='سبد اصلی'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='IRR'),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.CheckConstraint("currency IN ('IRR', 'USD')", name='ck_portfolios_currency'),
    )
    op.create_index('idx_portfolios_user_default', 'portfolios', ['user_id', 'is_default'])
    op.create_index(op.f('ix_portfolios_user_id'), 'portfolios', ['user_id'])

    # -- portfolio_transactions
    op.create_table(
        'portfolio_transactions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('portfolio_id', sa.Integer(), nullable=False),
        sa.Column('symbol', sa.String(30), nullable=False),
        sa.Column('market_type', sa.String(10), nullable=False, server_default='tse'),
        sa.Column('tx_type', sa.String(20), nullable=False),
        sa.Column('quantity', sa.Numeric(18, 8), nullable=False, server_default='0'),
        sa.Column('price', sa.Numeric(18, 4), nullable=False, server_default='0'),
        sa.Column('fee', sa.Numeric(18, 4), nullable=False, server_default='0'),
        sa.Column('executed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['portfolio_id'], ['portfolios.id'], ondelete='CASCADE'),
        sa.CheckConstraint(
            "tx_type IN ('buy', 'sell', 'dividend', 'fee', 'deposit', 'withdrawal')",
            name='ck_ptx_tx_type',
        ),
        sa.CheckConstraint("market_type IN ('tse', 'crypto')", name='ck_ptx_market_type'),
    )
    op.create_index('idx_ptx_portfolio_date', 'portfolio_transactions', ['portfolio_id', 'executed_at'])
    op.create_index('idx_ptx_portfolio_symbol', 'portfolio_transactions', ['portfolio_id', 'symbol'])
    op.create_index(op.f('ix_portfolio_transactions_portfolio_id'), 'portfolio_transactions', ['portfolio_id'])

    # -- portfolio_goals
    op.create_table(
        'portfolio_goals',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('portfolio_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('target_value', sa.Numeric(18, 2), nullable=False),
        sa.Column('target_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['portfolio_id'], ['portfolios.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_portfolio_goals_portfolio_id'), 'portfolio_goals', ['portfolio_id'])

    # -- portfolio_alerts
    op.create_table(
        'portfolio_alerts',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('portfolio_id', sa.Integer(), nullable=False),
        sa.Column('alert_type', sa.String(30), nullable=False),
        sa.Column('symbol', sa.String(30), nullable=True),
        sa.Column('threshold', sa.Numeric(18, 4), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('triggered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['portfolio_id'], ['portfolios.id'], ondelete='CASCADE'),
        sa.CheckConstraint(
            "alert_type IN ('price_above', 'price_below', 'drawdown', 'stop_loss', 'rebalance')",
            name='ck_palert_type',
        ),
    )
    op.create_index('idx_palert_portfolio_active', 'portfolio_alerts', ['portfolio_id', 'is_active'])
    op.create_index(op.f('ix_portfolio_alerts_portfolio_id'), 'portfolio_alerts', ['portfolio_id'])


def downgrade() -> None:
    """Drop portfolio tables."""
    op.drop_table('portfolio_alerts')
    op.drop_table('portfolio_goals')
    op.drop_table('portfolio_transactions')
    op.drop_table('portfolios')
