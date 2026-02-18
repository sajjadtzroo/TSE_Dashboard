"""add crypto tables (ohlcv, tickers, global metrics) and seed 30 securities

Revision ID: 004_crypto_tables
Revises: 003_extra_bank_data
Create Date: 2026-02-18
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_crypto_tables"
down_revision: Union[str, None] = "003_extra_bank_data"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Top 30 crypto coins to seed
CRYPTO_COINS = [
    ("BTC", "بیت‌کوین", "Bitcoin"),
    ("ETH", "اتریوم", "Ethereum"),
    ("BNB", "بایننس کوین", "BNB"),
    ("SOL", "سولانا", "Solana"),
    ("XRP", "ریپل", "XRP"),
    ("ADA", "کاردانو", "Cardano"),
    ("DOGE", "دوج‌کوین", "Dogecoin"),
    ("AVAX", "آوالانچ", "Avalanche"),
    ("DOT", "پولکادات", "Polkadot"),
    ("LINK", "چین‌لینک", "Chainlink"),
    ("MATIC", "پلیگان", "Polygon"),
    ("UNI", "یونی‌سواپ", "Uniswap"),
    ("ATOM", "کازماس", "Cosmos"),
    ("LTC", "لایت‌کوین", "Litecoin"),
    ("FIL", "فایل‌کوین", "Filecoin"),
    ("NEAR", "نیر", "NEAR Protocol"),
    ("APT", "آپتوس", "Aptos"),
    ("ARB", "آربیتروم", "Arbitrum"),
    ("OP", "آپتیمیزم", "Optimism"),
    ("INJ", "اینجکتیو", "Injective"),
    ("SUI", "سویی", "Sui"),
    ("TIA", "سلستیا", "Celestia"),
    ("SEI", "سی", "Sei"),
    ("PEPE", "پپه", "Pepe"),
    ("WLD", "ورلدکوین", "Worldcoin"),
    ("JUP", "ژوپیتر", "Jupiter"),
    ("RENDER", "رندر", "Render"),
    ("FET", "فچ", "Fetch.ai"),
    ("TAO", "بیت‌تنسور", "Bittensor"),
    ("AAVE", "آوه", "Aave"),
]


def upgrade() -> None:
    # 1. Create crypto_ohlcv table
    op.create_table(
        "crypto_ohlcv",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "security_id",
            sa.Integer,
            sa.ForeignKey("securities.security_id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("interval", sa.String(10), nullable=False),
        sa.Column("open_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("open", sa.Numeric(20, 8)),
        sa.Column("high", sa.Numeric(20, 8)),
        sa.Column("low", sa.Numeric(20, 8)),
        sa.Column("close", sa.Numeric(20, 8)),
        sa.Column("volume", sa.Numeric(30, 8)),
        sa.Column("turnover", sa.Numeric(30, 4)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint(
            "security_id", "interval", "open_time", name="uq_crypto_ohlcv_sec_interval_time"
        ),
    )
    op.create_index(
        "idx_crypto_ohlcv_sec_interval_time",
        "crypto_ohlcv",
        ["security_id", "interval", "open_time"],
        if_not_exists=True,
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_crypto_ohlcv_time_brin "
        "ON crypto_ohlcv USING brin (open_time) WITH (pages_per_range = 128)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_crypto_ohlcv_daily_covering "
        "ON crypto_ohlcv (security_id, open_time) "
        "INCLUDE (\"open\", high, low, \"close\", volume) "
        "WHERE interval = '1day'"
    )

    # 2. Create crypto_tickers table
    op.create_table(
        "crypto_tickers",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "security_id",
            sa.Integer,
            sa.ForeignKey("securities.security_id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("snapshot_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_price", sa.Numeric(20, 8)),
        sa.Column("price_change_24h", sa.Numeric(20, 8)),
        sa.Column("price_change_pct_24h", sa.Numeric(10, 4)),
        sa.Column("high_24h", sa.Numeric(20, 8)),
        sa.Column("low_24h", sa.Numeric(20, 8)),
        sa.Column("volume_24h", sa.Numeric(30, 8)),
        sa.Column("turnover_24h", sa.Numeric(30, 4)),
        sa.Column("best_bid", sa.Numeric(20, 8)),
        sa.Column("best_ask", sa.Numeric(20, 8)),
        sa.Column("market_cap_usd", sa.Numeric(30, 2)),
        sa.Column("price_toman", sa.Numeric(30, 2)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(
        "idx_crypto_tickers_sec_time",
        "crypto_tickers",
        ["security_id", "snapshot_time"],
        if_not_exists=True,
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_crypto_tickers_time_brin "
        "ON crypto_tickers USING brin (snapshot_time) WITH (pages_per_range = 128)"
    )

    # 3. Create crypto_global_metrics table
    op.create_table(
        "crypto_global_metrics",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("date", sa.Date, unique=True, nullable=False, index=True),
        sa.Column("total_market_cap_usd", sa.Numeric(30, 2)),
        sa.Column("total_volume_24h_usd", sa.Numeric(30, 2)),
        sa.Column("btc_dominance_pct", sa.Numeric(6, 2)),
        sa.Column("eth_dominance_pct", sa.Numeric(6, 2)),
        sa.Column("active_coins", sa.Integer),
        sa.Column("fear_greed_value", sa.Integer),
        sa.Column("fear_greed_label", sa.String(20)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 4. Seed 30 crypto securities
    securities = sa.table(
        "securities",
        sa.column("symbol", sa.String),
        sa.column("name_fa", sa.String),
        sa.column("name_en", sa.String),
        sa.column("market_type", sa.String),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        securities,
        [
            {
                "symbol": symbol,
                "name_fa": name_fa,
                "name_en": name_en,
                "market_type": "crypto",
                "is_active": True,
            }
            for symbol, name_fa, name_en in CRYPTO_COINS
        ],
    )


def downgrade() -> None:
    # Remove seeded crypto securities
    op.execute("DELETE FROM securities WHERE market_type = 'crypto'")
    op.drop_table("crypto_global_metrics")
    op.drop_table("crypto_tickers")
    op.drop_table("crypto_ohlcv")
