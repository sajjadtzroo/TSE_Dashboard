"""Add currency_rates and gold_prices hypertables, link to securities

Revision ID: 018_currency_gold
Revises: 017_add_dollar_rates
Create Date: 2026-02-24
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "018_currency_gold"
down_revision: Union[str, None] = "017_add_dollar_rates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1a. Insert 10 new securities rows (WHERE NOT EXISTS — no unique on symbol) ──
    op.execute("""
        INSERT INTO securities
            (symbol, name_fa, name_en, type, market_type, is_active, created_at, updated_at)
        SELECT v.symbol, v.name_fa, v.name_en, v.type, v.market_type, v.is_active, now(), now()
        FROM (VALUES
          ('USD',           'دلار آمریکا',                   'US Dollar',              'currency',  'currency',  true),
          ('COIN_FULL_NEW', 'سکه تمام بهار آزادی طرح جدید', 'New Bahar Azadi Coin',   'commodity', 'commodity', true),
          ('COIN_FULL_OLD', 'سکه تمام بهار آزادی طرح قدیم', 'Old Bahar Azadi Coin',   'commodity', 'commodity', true),
          ('COIN_HALF',     'نیم سکه',                       'Half Coin',              'commodity', 'commodity', true),
          ('COIN_QUARTER',  'ربع سکه',                       'Quarter Coin',           'commodity', 'commodity', true),
          ('COIN_GRAM',     'سکه گرمی',                      'Gram Coin',              'commodity', 'commodity', true),
          ('XAU_OZ',        'طلای جهانی (انس)',              'Gold Ounce (Intl)',       'commodity', 'gold',      true),
          ('XAU_TEHRAN',    'قیمت مرجع طلای تهران',          'Tehran Reference Price',  'commodity', 'gold',      true),
          ('GOLD_18K',      'طلای ۱۸ عیار',                  '18K Gold',               'commodity', 'gold',      true),
          ('GOLD_24K',      'طلای ۲۴ عیار',                  '24K Gold',               'commodity', 'gold',      true)
        ) AS v(symbol, name_fa, name_en, type, market_type, is_active)
        WHERE NOT EXISTS (SELECT 1 FROM securities WHERE symbol = v.symbol)
    """)

    # ── 1b. Create currency_rates TimescaleDB hypertable (IF NOT EXISTS) ──────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS currency_rates (
            security_id  INTEGER      NOT NULL
                         REFERENCES securities(security_id) ON DELETE RESTRICT,
            posted_at    TIMESTAMPTZ  NOT NULL,
            msg_id       INTEGER      NOT NULL,
            channel      VARCHAR(100) NOT NULL,
            rate_type    VARCHAR(20)  NOT NULL,
            side         VARCHAR(20)  NOT NULL,
            price        BIGINT       NOT NULL,
            raw_text     TEXT,
            scraped_at   TIMESTAMPTZ  DEFAULT now(),
            CONSTRAINT pk_currency_rates PRIMARY KEY (posted_at, msg_id, channel)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_currency_rates_sec_time
        ON currency_rates (security_id, posted_at)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_currency_rates_security_id
        ON currency_rates (security_id)
    """)
    op.execute("""
        SELECT create_hypertable('currency_rates', 'posted_at',
            chunk_time_interval => INTERVAL '7 days',
            if_not_exists => TRUE)
    """)
    op.execute("""
        ALTER TABLE currency_rates SET (
            timescaledb.compress,
            timescaledb.compress_orderby = 'posted_at DESC',
            timescaledb.compress_segmentby = 'security_id,rate_type'
        )
    """)
    op.execute("""
        SELECT add_compression_policy('currency_rates', INTERVAL '30 days',
            if_not_exists => TRUE)
    """)

    # ── 1c. Migrate dollar_rates → currency_rates ──────────────────────────────
    op.execute("""
        INSERT INTO currency_rates
            (security_id, posted_at, msg_id, channel,
             rate_type, side, price, raw_text, scraped_at)
        SELECT s.security_id,
               d.posted_at, d.msg_id, d.channel,
               d.rate_type, d.side, d.price, d.raw_text, d.scraped_at
        FROM dollar_rates d
        JOIN securities s ON s.symbol = 'USD'
              AND s.market_type = 'currency'
        WHERE NOT EXISTS (
            SELECT 1 FROM currency_rates cr
            WHERE cr.posted_at = d.posted_at
              AND cr.msg_id    = d.msg_id
              AND cr.channel   = d.channel
        )
    """)

    # ── 1d. Drop dollar_rates ───────────────────────────────────────────────────
    # remove_compression_policy(hypertable regclass, if_exists boolean)
    op.execute(
        "SELECT remove_compression_policy('dollar_rates'::regclass, true)"
    )
    op.drop_table("dollar_rates")

    # ── 1e. Create gold_prices TimescaleDB hypertable (IF NOT EXISTS) ────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS gold_prices (
            security_id  INTEGER      NOT NULL
                         REFERENCES securities(security_id) ON DELETE RESTRICT,
            scraped_at   TIMESTAMPTZ  NOT NULL,
            price_irr    BIGINT,
            price_usd    NUMERIC(20, 4),
            source       VARCHAR(100) NOT NULL DEFAULT 'estjt.ir',
            CONSTRAINT pk_gold_prices PRIMARY KEY (security_id, scraped_at)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_gold_prices_sec_time
        ON gold_prices (security_id, scraped_at)
    """)
    op.execute("""
        SELECT create_hypertable('gold_prices', 'scraped_at',
            chunk_time_interval => INTERVAL '1 day',
            if_not_exists => TRUE)
    """)
    op.execute("""
        ALTER TABLE gold_prices SET (
            timescaledb.compress,
            timescaledb.compress_orderby = 'scraped_at DESC',
            timescaledb.compress_segmentby = 'security_id'
        )
    """)
    op.execute("""
        SELECT add_compression_policy('gold_prices', INTERVAL '7 days',
            if_not_exists => TRUE)
    """)


def downgrade() -> None:
    # Drop gold_prices first
    op.execute(
        "SELECT remove_compression_policy('gold_prices'::regclass, true)"
    )
    op.drop_table("gold_prices")

    # Re-create dollar_rates (plain table, not hypertable — restore TimescaleDB separately)
    op.create_table(
        "dollar_rates",
        sa.Column("posted_at",  sa.DateTime(timezone=True), nullable=False),
        sa.Column("msg_id",     sa.Integer(),   nullable=False),
        sa.Column("channel",    sa.String(100), nullable=False,
                  server_default="dollar_tehran3bze"),
        sa.Column("rate_type",  sa.String(20),  nullable=False),
        sa.Column("side",       sa.String(20),  nullable=False),
        sa.Column("price",      sa.BigInteger(), nullable=False),
        sa.Column("raw_text",   sa.Text(),      nullable=True),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("posted_at", "msg_id", "channel",
                                name="pk_dollar_rates"),
    )
    op.execute("""
        INSERT INTO dollar_rates
            (posted_at, msg_id, channel, rate_type, side, price, raw_text, scraped_at)
        SELECT cr.posted_at, cr.msg_id, cr.channel,
               cr.rate_type, cr.side, cr.price, cr.raw_text, cr.scraped_at
        FROM currency_rates cr
        JOIN securities s ON s.security_id = cr.security_id AND s.symbol = 'USD'
    """)
    op.execute("""
        SELECT create_hypertable('dollar_rates', 'posted_at',
            chunk_time_interval => INTERVAL '7 days',
            if_not_exists => TRUE)
    """)

    # Drop currency_rates
    op.execute(
        "SELECT remove_compression_policy('currency_rates'::regclass, true)"
    )
    op.drop_table("currency_rates")

    # Remove inserted securities
    op.execute("""
        DELETE FROM securities
        WHERE symbol IN (
            'USD','COIN_FULL_NEW','COIN_FULL_OLD','COIN_HALF','COIN_QUARTER',
            'COIN_GRAM','XAU_OZ','XAU_TEHRAN','GOLD_18K','GOLD_24K'
        )
    """)
