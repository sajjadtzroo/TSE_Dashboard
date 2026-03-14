"""
SQLAlchemy ORM models for TSETMC data
PostgreSQL schema with pgvector support
"""

import enum
from datetime import UTC, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    PrimaryKeyConstraint,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None

Base = declarative_base()


def _utcnow():
    return datetime.now(UTC)


class User(Base):
    """Application users for authentication and authorization"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(
        String(20),
        nullable=False,
        default="viewer",
        comment="viewer, trader, or admin",
    )
    api_key = Column(
        String(64),
        unique=True,
        nullable=True,
        index=True,
        comment="Optional API key for programmatic access",
    )
    telegram_id = Column(
        BigInteger,
        unique=True,
        nullable=True,
        index=True,
        comment="Telegram user ID for Mini App login",
    )
    telegram_username = Column(String(64), nullable=True, comment="Telegram @username")
    telegram_first_name = Column(String(64), nullable=True, comment="Telegram display name")
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        CheckConstraint("role IN ('viewer', 'trader', 'admin')", name="ck_users_role"),
    )

    subscriptions = relationship(
        "Subscription",
        foreign_keys="Subscription.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="raise",
    )

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"


# Plan durations in days
PLAN_DURATIONS: dict[str, int] = {
    "monthly": 30,
    "3month": 90,
    "6month": 180,
    "yearly": 365,
}


class Subscription(Base):
    """User subscription records — tracks plan, tier, and expiry"""

    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    plan_type = Column(
        String(10),
        nullable=False,
        comment="monthly | 3month | 6month | yearly",
    )
    tier = Column(
        String(20),
        nullable=False,
        default="pro",
        comment="pro | enterprise",
    )
    started_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    activated_by_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        comment="Admin user who activated this subscription",
    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="subscriptions")
    activated_by = relationship("User", foreign_keys=[activated_by_id])

    __table_args__ = (
        CheckConstraint(
            "plan_type IN ('monthly', '3month', '6month', 'yearly')",
            name="ck_subscriptions_plan_type",
        ),
        CheckConstraint(
            "tier IN ('pro', 'enterprise')",
            name="ck_subscriptions_tier",
        ),
    )

    def __repr__(self):
        return f"<Subscription(id={self.id}, user_id={self.user_id}, plan={self.plan_type}, tier={self.tier}, expires={self.expires_at})>"


class Security(Base):
    """Universal entity registry (stocks, funds, gold, currency, commodity, crypto)"""

    __tablename__ = "securities"

    security_id = Column(Integer, primary_key=True, autoincrement=True)
    ins_code = Column(
        BigInteger,
        unique=True,
        nullable=True,
        index=True,
        comment="BrsApi instrument code (NULL for non-TSE)",
    )
    symbol = Column(String(50), nullable=False, index=True)
    name_fa = Column(String(200))
    name_en = Column(String(200))
    isin = Column(String(20), unique=True)
    type = Column(String(10), index=True, comment="stock or fund")
    market_type = Column(
        String(20),
        nullable=False,
        default="tse",
        index=True,
        comment="tse, gold, currency, commodity, crypto",
    )
    sector_id = Column(Integer, comment="cs_id from BrsApi")
    sector_name_fa = Column(String(100), index=True)
    sector_name_en = Column(String(100))
    base_volume = Column(BigInteger, comment="bvol from BrsApi")
    total_shares = Column(BigInteger, comment="z from BrsApi")
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    # Relationships — heavy tables use lazy='raise' to prevent accidental full-table loads
    daily_ohlcv = relationship(
        "DailyOHLCV",
        back_populates="security",
        cascade="all, delete-orphan",
        lazy="raise",
    )
    order_books = relationship(
        "OrderBook",
        back_populates="security",
        cascade="all, delete-orphan",
        lazy="raise",
    )
    intraday_snapshots = relationship(
        "IntradaySnapshot",
        back_populates="security",
        cascade="all, delete-orphan",
        lazy="raise",
    )
    tick_trades = relationship(
        "TickTrade",
        back_populates="security",
        cascade="all, delete-orphan",
        lazy="raise",
    )
    shareholders = relationship(
        "Shareholder",
        back_populates="security",
        cascade="all, delete-orphan",
        lazy="raise",
    )
    # Smaller/pipeline-used relationships keep default lazy='select'
    etf_navs = relationship(
        "ETFNav", back_populates="security", cascade="all, delete-orphan", lazy="raise"
    )
    codal_announcements = relationship(
        "CodalAnnouncement",
        back_populates="security",
        cascade="all, delete-orphan",
        lazy="raise",
    )
    market_prices = relationship(
        "MarketPrice",
        back_populates="security",
        cascade="all, delete-orphan",
        lazy="select",
    )
    crypto_ohlcv = relationship(
        "CryptoOHLCV",
        back_populates="security",
        cascade="all, delete-orphan",
        lazy="raise",
    )
    crypto_tickers = relationship(
        "CryptoTicker",
        back_populates="security",
        cascade="all, delete-orphan",
        lazy="raise",
    )

    daily_prices = relationship("DailyPrices", back_populates="security", lazy="raise", cascade="all, delete-orphan")
    daily_fundamentals = relationship("DailyFundamentals", back_populates="security", lazy="raise", cascade="all, delete-orphan")
    daily_client_type = relationship("DailyClientType", back_populates="security", lazy="raise", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_securities_symbol_market", "symbol", "market_type"),
        Index(
            "idx_securities_active",
            "security_id",
            "symbol",
            "market_type",
            "sector_name_fa",
            postgresql_where=text("is_active = true"),
        ),
    )

    def __repr__(self):
        return f"<Security(ins_code={self.ins_code}, symbol='{self.symbol}', market='{self.market_type}')>"


class DailyOHLCV(Base):
    """Merged daily prices + financials + client type"""

    __tablename__ = "daily_ohlcv"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date = Column(Date, nullable=False, index=True)

    # OHLCV
    open = Column(Numeric(18, 2), comment="pf (price_first)")
    high = Column(Numeric(18, 2), comment="pmax")
    low = Column(Numeric(18, 2), comment="pmin")
    close = Column(Numeric(18, 2), comment="pc (final/close price)")
    last = Column(Numeric(18, 2), comment="pl (last traded price)")
    volume = Column(BigInteger, comment="tvol")
    value = Column(BigInteger, comment="tval")
    trades = Column(Integer, comment="tno")
    adj_close = Column(Numeric(18, 2))

    # Price context
    price_yesterday = Column(Numeric(18, 2), comment="py")
    close_change = Column(Numeric(18, 2), comment="pcc")
    close_change_pct = Column(Numeric(18, 4), comment="pcp")
    last_change = Column(Numeric(18, 2), comment="plc")
    last_change_pct = Column(Numeric(18, 4), comment="plp")
    threshold_min = Column(Numeric(18, 2), comment="tmin")
    threshold_max = Column(Numeric(18, 2), comment="tmax")

    # Fundamentals
    eps = Column(Numeric(18, 2))
    pe_ratio = Column(Numeric(18, 2), comment="pe")
    market_cap = Column(BigInteger, comment="mv")
    nav = Column(Numeric(18, 2))
    estimated_eps = Column(Numeric(18, 2))

    # Client type
    real_buy_count = Column(Integer, comment="Buy_CountI")
    real_buy_volume = Column(BigInteger, comment="Buy_I_Volume")
    real_sell_count = Column(Integer, comment="Sell_CountI")
    real_sell_volume = Column(BigInteger, comment="Sell_I_Volume")
    legal_buy_count = Column(Integer, comment="Buy_CountN")
    legal_buy_volume = Column(BigInteger, comment="Buy_N_Volume")
    legal_sell_count = Column(Integer, comment="Sell_CountN")
    legal_sell_volume = Column(BigInteger, comment="Sell_N_Volume")

    # Meta
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    # Relationships
    security = relationship("Security", back_populates="daily_ohlcv")

    __table_args__ = (
        UniqueConstraint("security_id", "date", name="uq_daily_ohlcv_sec_date"),
        Index("idx_daily_ohlcv_date", "date"),
        Index("idx_daily_ohlcv_sec_date", "security_id", "date"),
        Index(
            "idx_daily_ohlcv_date_covering",
            "date",
            "security_id",
            postgresql_include=[
                "close",
                "last",
                "close_change",
                "close_change_pct",
                "volume",
                "value",
                "trades",
                "low",
                "high",
                "pe_ratio",
                "eps",
                "market_cap",
            ],
        ),
    )

    def __repr__(self):
        return f"<DailyOHLCV(security_id={self.security_id}, date={self.date}, close={self.close})>"



class DailyPrices(Base):
    """OHLCV + price context. Partitioned by year (done in migration 005)."""
    __tablename__ = "daily_prices"
    __table_args__ = (
        # Partitioned tables require partition column in PK and unique constraints
        PrimaryKeyConstraint("id", "date"),
        UniqueConstraint("security_id", "date", name="uq_daily_prices_sec_date"),
        {"postgresql_partition_by": "RANGE (date)"},
    )

    id = Column(BigInteger, autoincrement=True)
    security_id = Column(
        Integer, ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    date = Column(Date, nullable=False, index=True)
    open = Column(Numeric(18, 2))
    high = Column(Numeric(18, 2))
    low = Column(Numeric(18, 2))
    close = Column(Numeric(18, 2))
    last = Column(Numeric(18, 2))
    adj_close = Column(Numeric(18, 2))
    price_yesterday = Column(Numeric(18, 2))
    close_change = Column(Numeric(18, 2))
    close_change_pct = Column(Numeric(18, 4))
    last_change = Column(Numeric(18, 2))
    last_change_pct = Column(Numeric(18, 4))
    threshold_min = Column(Numeric(18, 2))
    threshold_max = Column(Numeric(18, 2))
    volume = Column(BigInteger)
    value = Column(BigInteger)
    trades = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    security = relationship("Security", back_populates="daily_prices", lazy="raise")


class DailyFundamentals(Base):
    """EPS, PE ratio, market cap, NAV — updated less frequently than prices."""
    __tablename__ = "daily_fundamentals"
    __table_args__ = (
        UniqueConstraint("security_id", "date", name="uq_daily_fundamentals_sec_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer, ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    date = Column(Date, nullable=False, index=True)
    eps = Column(Numeric(18, 2))
    pe_ratio = Column(Numeric(18, 2))
    market_cap = Column(BigInteger)
    nav = Column(Numeric(18, 2))
    estimated_eps = Column(Numeric(18, 2))
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    security = relationship("Security", back_populates="daily_fundamentals", lazy="raise")


class DailyClientType(Base):
    """Real vs legal investor buy/sell counts and volumes."""
    __tablename__ = "daily_client_type"
    __table_args__ = (
        UniqueConstraint("security_id", "date", name="uq_daily_client_type_sec_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer, ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    date = Column(Date, nullable=False, index=True)
    real_buy_count = Column(Integer)
    real_buy_volume = Column(BigInteger)
    real_sell_count = Column(Integer)
    real_sell_volume = Column(BigInteger)
    legal_buy_count = Column(Integer)
    legal_buy_volume = Column(BigInteger)
    legal_sell_count = Column(Integer)
    legal_sell_volume = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    security = relationship("Security", back_populates="daily_client_type", lazy="raise")

class OrderBook(Base):
    """5-level bid/ask snapshots, appended every 2.5 min"""

    __tablename__ = "order_book"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_time = Column(DateTime(timezone=True), nullable=False)

    # Bid levels 1-5
    bid_price_1 = Column(Numeric(18, 2))
    bid_vol_1 = Column(BigInteger)
    bid_count_1 = Column(Integer)
    bid_price_2 = Column(Numeric(18, 2))
    bid_vol_2 = Column(BigInteger)
    bid_count_2 = Column(Integer)
    bid_price_3 = Column(Numeric(18, 2))
    bid_vol_3 = Column(BigInteger)
    bid_count_3 = Column(Integer)
    bid_price_4 = Column(Numeric(18, 2))
    bid_vol_4 = Column(BigInteger)
    bid_count_4 = Column(Integer)
    bid_price_5 = Column(Numeric(18, 2))
    bid_vol_5 = Column(BigInteger)
    bid_count_5 = Column(Integer)

    # Ask levels 1-5
    ask_price_1 = Column(Numeric(18, 2))
    ask_vol_1 = Column(BigInteger)
    ask_count_1 = Column(Integer)
    ask_price_2 = Column(Numeric(18, 2))
    ask_vol_2 = Column(BigInteger)
    ask_count_2 = Column(Integer)
    ask_price_3 = Column(Numeric(18, 2))
    ask_vol_3 = Column(BigInteger)
    ask_count_3 = Column(Integer)
    ask_price_4 = Column(Numeric(18, 2))
    ask_vol_4 = Column(BigInteger)
    ask_count_4 = Column(Integer)
    ask_price_5 = Column(Numeric(18, 2))
    ask_vol_5 = Column(BigInteger)
    ask_count_5 = Column(Integer)

    # Meta
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    security = relationship("Security", back_populates="order_books")

    __table_args__ = (
        UniqueConstraint("security_id", "snapshot_time", name="uq_order_book_sec_time"),
        Index("idx_order_book_sec_time", "security_id", "snapshot_time"),
        Index(
            "idx_order_book_snapshot_time_brin",
            "snapshot_time",
            postgresql_using="brin",
            postgresql_with={"pages_per_range": 128},
        ),
    )

    def __repr__(self):
        return f"<OrderBook(security_id={self.security_id}, time={self.snapshot_time})>"


class IntradaySnapshot(Base):
    """Historical intraday data (one-time backfill from TSETMC)"""

    __tablename__ = "intraday_snapshots"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    timestamp = Column(DateTime(timezone=True), nullable=False)
    price = Column(Numeric(18, 2))
    volume = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    security = relationship("Security", back_populates="intraday_snapshots")

    __table_args__ = (
        UniqueConstraint("security_id", "timestamp", name="uq_intraday_sec_ts"),
        Index("idx_intraday_sec_ts", "security_id", "timestamp"),
    )

    def __repr__(self):
        return (
            f"<IntradaySnapshot(security_id={self.security_id}, ts={self.timestamp})>"
        )


class Option(Base):
    """Options contracts from TSETMC Market Watch"""

    __tablename__ = "options"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ins_code = Column(
        BigInteger, nullable=False, index=True, comment="TSETMC instrument code"
    )
    isin = Column(String(20))
    symbol = Column(String(50), nullable=False, index=True)
    name_fa = Column(String(200))
    option_type = Column(String(4), nullable=False, comment="call or put")
    underlying = Column(String(100), index=True, comment="Underlying asset name")
    underlying_security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK to securities for underlying asset",
    )
    strike_price = Column(Numeric(18, 2))
    expiry_date = Column(String(20), comment="Shamsi date string")
    date = Column(Date, nullable=False, index=True, comment="Trading date")

    # OHLCV
    open = Column(Numeric(18, 2))
    high = Column(Numeric(18, 2))
    low = Column(Numeric(18, 2))
    close = Column(Numeric(18, 2))
    last = Column(Numeric(18, 2))
    yesterday = Column(Numeric(18, 2))
    close_change = Column(Numeric(18, 2))
    volume = Column(BigInteger)
    value = Column(BigInteger)
    trades = Column(Integer)

    # Limits
    threshold_min = Column(Numeric(18, 2))
    threshold_max = Column(Numeric(18, 2))
    base_volume = Column(BigInteger)

    # Best bid/ask (level 1)
    bid_price_1 = Column(Numeric(18, 2))
    bid_vol_1 = Column(BigInteger)
    bid_count_1 = Column(Integer)
    ask_price_1 = Column(Numeric(18, 2))
    ask_vol_1 = Column(BigInteger)
    ask_count_1 = Column(Integer)

    # Meta
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    underlying_security = relationship(
        "Security", foreign_keys=[underlying_security_id]
    )

    __table_args__ = (
        UniqueConstraint("ins_code", "date", name="uq_options_ins_code_date"),
        Index("idx_options_ins_date", "ins_code", "date"),
        Index("idx_options_underlying", "underlying"),
        Index("idx_options_underlying_date", "underlying", "date"),
        Index(
            "idx_options_chain_sort",
            "date",
            "underlying",
            "expiry_date",
            "strike_price",
            "option_type",
        ),
    )

    def __repr__(self):
        return f"<Option(symbol='{self.symbol}', type={self.option_type}, strike={self.strike_price})>"


class IMEOption(Base):
    """IME commodity options contracts"""

    __tablename__ = "ime_options"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    date_shamsi = Column(String(20))
    contract_category = Column(String(200))
    contract_category_sub = Column(String(50))
    commodity = Column(String(20))
    option_type = Column(String(4), nullable=False, comment="call or put")
    price_strike = Column(BigInteger)
    level_strike = Column(Integer)
    contract_id = Column(Integer)
    contract_code = Column(String(50), nullable=False)
    contract_description = Column(String(500))
    contract_size = Column(Integer)
    date_end = Column(String(20))
    day_remain = Column(Integer)
    margin_initial = Column(BigInteger)
    margin_required = Column(BigInteger)
    interest_open = Column(Integer)
    interest_open_change = Column(Integer)
    interest_open_change_pct = Column(Numeric(10, 2))
    settlement_price = Column(BigInteger, comment="py")
    open = Column(BigInteger, comment="pf")
    high = Column(BigInteger, comment="pmax")
    low = Column(BigInteger, comment="pmin")
    last = Column(BigInteger, comment="pl")
    last_change = Column(BigInteger, comment="plc")
    last_change_pct = Column(Numeric(10, 2), comment="plp")
    trades = Column(Integer, comment="tno")
    volume = Column(Integer, comment="tvol")
    value = Column(BigInteger, comment="tval")

    bid_price_1 = Column(BigInteger)
    bid_vol_1 = Column(Integer)
    ask_price_1 = Column(BigInteger)
    ask_vol_1 = Column(Integer)
    bid_price_2 = Column(BigInteger)
    bid_vol_2 = Column(Integer)
    ask_price_2 = Column(BigInteger)
    ask_vol_2 = Column(Integer)
    bid_price_3 = Column(BigInteger)
    bid_vol_3 = Column(Integer)
    ask_price_3 = Column(BigInteger)
    ask_vol_3 = Column(Integer)

    created_at = Column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        UniqueConstraint("contract_code", "date", name="uq_ime_options_code_date"),
        Index("idx_ime_options_date", "date"),
        Index("idx_ime_options_commodity", "commodity"),
    )

    def __repr__(self):
        return f"<IMEOption(code='{self.contract_code}', type={self.option_type}, strike={self.price_strike})>"


class IMEFuture(Base):
    """IME commodity futures contracts"""

    __tablename__ = "ime_futures"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    date_shamsi = Column(String(20))
    contract_code = Column(String(50), nullable=False)
    contract_description = Column(String(500))
    contract_size = Column(Integer)
    contract_size_unit = Column(String(50))
    date_end = Column(String(20))
    day_remain = Column(Integer)
    margin_initial = Column(BigInteger)
    margin_maintenance = Column(BigInteger)
    interest_open = Column(Integer)
    interest_open_change = Column(Integer)
    interest_open_change_pct = Column(Numeric(10, 2))
    settlement_price = Column(BigInteger, comment="py")
    open = Column(BigInteger, comment="pf")
    high = Column(BigInteger, comment="pmax")
    low = Column(BigInteger, comment="pmin")
    last = Column(BigInteger, comment="pl")
    last_change = Column(BigInteger, comment="plc")
    last_change_pct = Column(Numeric(10, 2), comment="plp")
    instant_settlement = Column(Numeric(18, 4), comment="pls")
    trades = Column(Integer)
    volume = Column(Integer)
    value = Column(BigInteger)
    real_buy_count = Column(Integer)
    legal_buy_count = Column(Integer)
    real_sell_count = Column(Integer)
    legal_sell_count = Column(Integer)

    bid_price_1 = Column(BigInteger)
    bid_vol_1 = Column(Integer)
    ask_price_1 = Column(BigInteger)
    ask_vol_1 = Column(Integer)
    bid_price_2 = Column(BigInteger)
    bid_vol_2 = Column(Integer)
    ask_price_2 = Column(BigInteger)
    ask_vol_2 = Column(Integer)
    bid_price_3 = Column(BigInteger)
    bid_vol_3 = Column(Integer)
    ask_price_3 = Column(BigInteger)
    ask_vol_3 = Column(Integer)

    created_at = Column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        UniqueConstraint("contract_code", "date", name="uq_ime_futures_code_date"),
        Index("idx_ime_futures_date", "date"),
    )

    def __repr__(self):
        return f"<IMEFuture(code='{self.contract_code}', last={self.last})>"


# ─── NEW TABLES ───────────────────────────────────────────────────────────────


class ETFNav(Base):
    """ETF Net Asset Value snapshots"""

    __tablename__ = "etf_nav"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date = Column(Date, nullable=False, index=True)
    time = Column(String(10))
    nav_issuance = Column(Numeric(18, 2), comment="psubtran")
    nav_redemption = Column(Numeric(18, 2), comment="predtran")
    last_price = Column(Numeric(18, 2), comment="pl")
    bubble_pct = Column(Numeric(10, 4))
    fund_type = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    security = relationship("Security", back_populates="etf_navs")

    __table_args__ = (
        UniqueConstraint("security_id", "date", name="uq_etf_nav_sec_date"),
        Index("idx_etf_nav_sec_date", "security_id", "date"),
    )


class TickTrade(Base):
    """Individual trades (tick data) per stock.

    tick_time is the TimescaleDB hypertable dimension — partitioned by day.
    Continuous aggregates ohlcv_1min and ohlcv_5min are maintained automatically.
    """

    __tablename__ = "tick_trades"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # tick_time: canonical TIMESTAMPTZ used as the TimescaleDB time dimension.
    # Backfilled from (date + time) during migration 007.
    tick_time = Column(DateTime(timezone=True), nullable=True, index=True)
    # Kept for backward compatibility with the Scrapy spider and dedup key
    date = Column(Date, nullable=False, index=True)
    row_num = Column(Integer, nullable=False)
    time = Column(String(10))
    price = Column(Numeric(18, 2))
    volume = Column(BigInteger)
    canceled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    security = relationship("Security", back_populates="tick_trades")

    __table_args__ = (
        UniqueConstraint(
            "security_id", "date", "row_num", name="uq_tick_trades_sec_date_row"
        ),
        Index("idx_tick_trades_sec_date", "security_id", "date"),
        # tick_time index — used by TimescaleDB for chunk exclusion and
        # continuous aggregate queries (security_id, tick_time DESC)
        Index("idx_tick_trades_sec_tick_time", "security_id", "tick_time"),
    )


class Shareholder(Base):
    """Major shareholders snapshot"""

    __tablename__ = "shareholders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date = Column(Date, nullable=False, index=True)
    shareholder_id = Column(String(50))
    name = Column(String(500))
    volume = Column(BigInteger)
    percent = Column(Numeric(10, 4))
    change = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    security = relationship("Security", back_populates="shareholders")

    __table_args__ = (
        UniqueConstraint(
            "security_id", "name", "date", name="uq_shareholders_sec_name_date"
        ),
        Index("idx_shareholders_sec_date", "security_id", "date"),
        Index("idx_shareholders_shareholder_id", "shareholder_id"),
    )


class CodalAnnouncement(Base):
    """Codal/TSETMC announcements"""

    __tablename__ = "codal_announcements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    symbol = Column(String(100), index=True)
    company_name = Column(String(300))
    title = Column(String(1000))
    code = Column(String(200), nullable=False, unique=True)
    category = Column(Integer)
    date_title = Column(String(100))
    date_send = Column(String(20))
    time_send = Column(String(10))
    date_publish = Column(String(20))
    time_publish = Column(String(10))
    link = Column(Text)
    link_pdf = Column(Text)
    link_excel = Column(Text)
    link_attachment = Column(Text)

    # MinIO object storage keys (nullable until file is uploaded)
    minio_pdf_key = Column(Text, nullable=True, comment="MinIO object key for PDF file")
    minio_excel_key = Column(Text, nullable=True, comment="MinIO object key for Excel file")
    minio_attachment_key = Column(Text, nullable=True, comment="MinIO object key for attachment")

    # Financial statement scraper fields
    letter_type = Column(Integer, comment="Codal letter type (6=financial statement)")
    letter_serial = Column(Text, comment="Codal LetterSerial for Excel download")
    has_excel = Column(Boolean, default=False)
    has_pdf = Column(Boolean, default=False)
    is_processed = Column(
        Boolean, default=False, comment="True when financial data extracted"
    )
    is_failed = Column(
        Boolean, default=False, comment="True after max retries exhausted"
    )
    retry_count = Column(SmallInteger, default=0)
    parse_errors = Column(Text, comment="Last parse error message")

    created_at = Column(DateTime(timezone=True), default=_utcnow)

    security = relationship("Security", back_populates="codal_announcements")
    financial_statements = relationship(
        "FinancialStatement",
        back_populates="announcement",
        cascade="all, delete-orphan",
        lazy="select",
    )
    raw_responses = relationship(
        "CodalRawResponse",
        back_populates="announcement",
        cascade="all, delete-orphan",
        lazy="select",
    )

    __table_args__ = (
        Index("idx_codal_symbol", "symbol"),
        Index("idx_codal_date_publish", "date_publish"),
        Index("idx_codal_symbol_date_publish", "symbol", "date_publish"),
        Index(
            "idx_codal_unprocessed",
            "id",
            postgresql_where=text(
                "has_excel = true AND is_processed = false AND is_failed = false"
            ),
        ),
        # pg_trgm GIN indexes for fast ILIKE search
        Index(
            "idx_codal_title_trgm",
            "title",
            postgresql_using="gin",
            postgresql_ops={"title": "gin_trgm_ops"},
        ),
        Index(
            "idx_codal_company_name_trgm",
            "company_name",
            postgresql_using="gin",
            postgresql_ops={"company_name": "gin_trgm_ops"},
        ),
    )


class MarketPrice(Base):
    """Gold, currency, commodity, crypto prices"""

    __tablename__ = "market_prices"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date = Column(Date, nullable=False, index=True)
    time = Column(String(10))
    price = Column(Numeric(20, 4))
    price_toman = Column(Numeric(20, 2), comment="crypto/currency only")
    change_value = Column(Numeric(20, 4))
    change_pct = Column(Numeric(10, 4))
    unit = Column(String(20))
    market_cap = Column(Numeric(30, 2), comment="crypto only")
    icon_url = Column(Text)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    security = relationship("Security", back_populates="market_prices")

    __table_args__ = (
        UniqueConstraint("security_id", "date", name="uq_market_prices_sec_date"),
        Index("idx_market_prices_sec_date", "security_id", "date"),
    )


class MarketIndex(Base):
    """TSE market indices"""

    __tablename__ = "market_indices"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    time = Column(String(10))
    name = Column(String(200), nullable=False)
    index_value = Column(Numeric(20, 2))
    index_change = Column(Numeric(20, 2))
    index_change_pct = Column(Numeric(10, 4))
    min_value = Column(Numeric(20, 2))
    max_value = Column(Numeric(20, 2))
    market_value = Column(Numeric(30, 2), comment="mv")
    trades = Column(BigInteger)
    volume = Column(BigInteger)
    value = Column(Numeric(30, 2))
    state = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        UniqueConstraint("name", "date", name="uq_market_indices_name_date"),
        Index("idx_market_indices_date", "date"),
        Index("idx_market_indices_name_date", "name", "date"),
    )


class IMECertificate(Base):
    """IME deposit certificates (general + coin/saffron)"""

    __tablename__ = "ime_certificates"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    date_shamsi = Column(String(20))
    cert_type = Column(Integer, nullable=False, comment="1=general, 2=coin/saffron")
    commodity = Column(String(100))
    contract_code = Column(String(50), nullable=False)
    contract_description = Column(String(500))
    contract_size = Column(Integer)
    contract_size_unit = Column(String(50))
    isin = Column(String(20))
    symbol = Column(String(50))
    name = Column(String(200))
    settlement_price = Column(BigInteger)
    open = Column(BigInteger)
    high = Column(BigInteger)
    low = Column(BigInteger)
    last = Column(BigInteger)
    last_change = Column(BigInteger)
    last_change_pct = Column(Numeric(10, 2))
    close = Column(BigInteger)
    trades = Column(Integer)
    volume = Column(Integer)
    value = Column(BigInteger)

    # 5-level order book
    bid_price_1 = Column(BigInteger)
    bid_vol_1 = Column(Integer)
    ask_price_1 = Column(BigInteger)
    ask_vol_1 = Column(Integer)
    bid_price_2 = Column(BigInteger)
    bid_vol_2 = Column(Integer)
    ask_price_2 = Column(BigInteger)
    ask_vol_2 = Column(Integer)
    bid_price_3 = Column(BigInteger)
    bid_vol_3 = Column(Integer)
    ask_price_3 = Column(BigInteger)
    ask_vol_3 = Column(Integer)
    bid_price_4 = Column(BigInteger)
    bid_vol_4 = Column(Integer)
    ask_price_4 = Column(BigInteger)
    ask_vol_4 = Column(Integer)
    bid_price_5 = Column(BigInteger)
    bid_vol_5 = Column(Integer)
    ask_price_5 = Column(BigInteger)
    ask_vol_5 = Column(Integer)

    # Client type (type=2 only)
    real_buy_count = Column(Integer)
    real_buy_volume = Column(BigInteger)
    real_sell_count = Column(Integer)
    real_sell_volume = Column(BigInteger)
    legal_buy_count = Column(Integer)
    legal_buy_volume = Column(BigInteger)
    legal_sell_count = Column(Integer)
    legal_sell_volume = Column(BigInteger)

    created_at = Column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        UniqueConstraint("contract_code", "date", name="uq_ime_certificates_code_date"),
        Index("idx_ime_certificates_date", "date"),
    )


class IMEFund(Base):
    """IME commodity funds"""

    __tablename__ = "ime_funds"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    date_shamsi = Column(String(20))
    isin = Column(String(20), nullable=False)
    symbol = Column(String(50))
    name = Column(String(200))
    settlement_price = Column(BigInteger)
    open = Column(BigInteger)
    high = Column(BigInteger)
    low = Column(BigInteger)
    last = Column(BigInteger)
    last_change = Column(BigInteger)
    last_change_pct = Column(Numeric(10, 2))
    close = Column(BigInteger)
    trades = Column(Integer)
    volume = Column(Integer)
    value = Column(BigInteger)

    # Client type
    real_buy_count = Column(Integer)
    real_buy_volume = Column(BigInteger)
    real_sell_count = Column(Integer)
    real_sell_volume = Column(BigInteger)
    legal_buy_count = Column(Integer)
    legal_buy_volume = Column(BigInteger)
    legal_sell_count = Column(Integer)
    legal_sell_volume = Column(BigInteger)

    # 5-level order book
    bid_price_1 = Column(BigInteger)
    bid_vol_1 = Column(Integer)
    ask_price_1 = Column(BigInteger)
    ask_vol_1 = Column(Integer)
    bid_price_2 = Column(BigInteger)
    bid_vol_2 = Column(Integer)
    ask_price_2 = Column(BigInteger)
    ask_vol_2 = Column(Integer)
    bid_price_3 = Column(BigInteger)
    bid_vol_3 = Column(Integer)
    ask_price_3 = Column(BigInteger)
    ask_vol_3 = Column(Integer)
    bid_price_4 = Column(BigInteger)
    bid_vol_4 = Column(Integer)
    ask_price_4 = Column(BigInteger)
    ask_vol_4 = Column(Integer)
    bid_price_5 = Column(BigInteger)
    bid_vol_5 = Column(Integer)
    ask_price_5 = Column(BigInteger)
    ask_vol_5 = Column(Integer)

    created_at = Column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        UniqueConstraint("isin", "date", name="uq_ime_funds_isin_date"),
        Index("idx_ime_funds_date", "date"),
    )


class IMEForward(Base):
    """IME forward contracts"""

    __tablename__ = "ime_forwards"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    date_shamsi = Column(String(20))
    ins_code = Column(String(50))
    isin = Column(String(20), nullable=False)
    symbol = Column(String(50))
    name = Column(String(200))
    settlement_price = Column(BigInteger)
    open = Column(BigInteger)
    high = Column(BigInteger)
    low = Column(BigInteger)
    last = Column(BigInteger)
    last_change = Column(BigInteger)
    last_change_pct = Column(Numeric(10, 2))
    close = Column(BigInteger)
    trades = Column(Integer)
    volume = Column(Integer)
    value = Column(BigInteger)

    # Client type
    real_buy_count = Column(Integer)
    real_buy_volume = Column(BigInteger)
    real_sell_count = Column(Integer)
    real_sell_volume = Column(BigInteger)
    legal_buy_count = Column(Integer)
    legal_buy_volume = Column(BigInteger)
    legal_sell_count = Column(Integer)
    legal_sell_volume = Column(BigInteger)

    # 5-level order book
    bid_price_1 = Column(BigInteger)
    bid_vol_1 = Column(Integer)
    ask_price_1 = Column(BigInteger)
    ask_vol_1 = Column(Integer)
    bid_price_2 = Column(BigInteger)
    bid_vol_2 = Column(Integer)
    ask_price_2 = Column(BigInteger)
    ask_vol_2 = Column(Integer)
    bid_price_3 = Column(BigInteger)
    bid_vol_3 = Column(Integer)
    ask_price_3 = Column(BigInteger)
    ask_vol_3 = Column(Integer)
    bid_price_4 = Column(BigInteger)
    bid_vol_4 = Column(Integer)
    ask_price_4 = Column(BigInteger)
    ask_vol_4 = Column(Integer)
    bid_price_5 = Column(BigInteger)
    bid_vol_5 = Column(Integer)
    ask_price_5 = Column(BigInteger)
    ask_vol_5 = Column(Integer)

    created_at = Column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        UniqueConstraint("isin", "date", name="uq_ime_forwards_isin_date"),
        Index("idx_ime_forwards_date", "date"),
    )


class PDFDocument(Base):
    """Tracks PDF download and processing status for RAG pipeline"""

    __tablename__ = "pdf_documents"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    announcement_id = Column(
        BigInteger,
        ForeignKey("codal_announcements.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    symbol = Column(String(50), index=True)
    title = Column(String(1000))
    source_url = Column(Text, nullable=False)
    file_path = Column(Text)
    minio_key = Column(Text, nullable=True, comment="MinIO object key for this PDF")
    file_size_bytes = Column(BigInteger)
    page_count = Column(Integer)
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
        comment="pending/downloading/downloaded/extracting/extracted/embedding/embedded/failed",
    )
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    download_hash = Column(
        String(64),
        unique=True,
        nullable=False,
        comment="SHA256 of source_url for dedup",
    )
    source = Column(
        String(20),
        default="codal",
        nullable=False,
        comment="Document origin: codal or upload",
    )
    doc_category = Column(
        String(30),
        default="codal",
        nullable=False,
        comment="Document category: codal, cfa, research, other",
    )
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    chunks = relationship(
        "DocumentChunk", back_populates="document", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_pdf_documents_status", "status"),
        Index("idx_pdf_documents_symbol", "symbol"),
        Index("idx_pdf_documents_doc_category", "doc_category"),
    )

    def __repr__(self):
        return f"<PDFDocument(id={self.id}, symbol='{self.symbol}', status='{self.status}')>"


class DocumentChunk(Base):
    """Text chunks with vector embeddings for RAG semantic search"""

    __tablename__ = "document_chunks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    document_id = Column(
        BigInteger,
        ForeignKey("pdf_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    content_tokens = Column(Integer)
    page_numbers = Column(String(100), comment="Comma-separated page numbers")
    section_title = Column(String(500))
    # NOTE: HNSW index for cosine similarity search created via migration SQL:
    #   CREATE INDEX CONCURRENTLY idx_document_chunks_embedding_hnsw
    #   ON document_chunks USING hnsw (embedding vector_cosine_ops)
    #   WITH (m = 16, ef_construction = 64);
    embedding = Column(Vector(1536)) if Vector else Column(Text)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    document = relationship("PDFDocument", back_populates="chunks")

    __table_args__ = (
        (
            Index(
                "idx_document_chunks_embedding_hnsw",
                "embedding",
                postgresql_using="hnsw",
                postgresql_with={"m": 16, "ef_construction": 64},
                postgresql_ops={"embedding": "vector_cosine_ops"},
            ),
        )
        if Vector
        else (Index("idx_document_chunks_doc", "document_id"),)
    )

    def __repr__(self):
        return f"<DocumentChunk(id={self.id}, doc={self.document_id}, idx={self.chunk_index})>"


class FinancialStatement(Base):
    """Parsed financial statement data from Codal Excel reports"""

    __tablename__ = "financial_statements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    codal_announcement_id = Column(
        BigInteger,
        ForeignKey("codal_announcements.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    symbol = Column(String(50), nullable=False, index=True)
    company_name = Column(String(300))
    statement_type = Column(
        String(30),
        nullable=False,
        comment="income_statement, balance_sheet, comprehensive_income, equity_changes",
    )

    # Dates: Gregorian for queries, Jalali for display
    period_end_date = Column(
        Date, nullable=False, comment="Gregorian (for range queries, sorting)"
    )
    period_end_jalali = Column(String(12), nullable=False, comment="e.g. 1404/09/30")
    fiscal_year_end = Column(Date)
    fiscal_year_end_jalali = Column(String(12))

    is_audited = Column(Boolean, default=False)
    is_consolidated = Column(Boolean, default=False)
    period_months = Column(
        SmallInteger,
        CheckConstraint("period_months IN (3, 6, 9, 12)", name="ck_period_months"),
    )

    # Hot fields — top queried/sorted metrics (million Rials)
    revenue = Column(BigInteger, comment="درآمد عملیاتی")
    cost_of_revenue = Column(BigInteger, comment="بهای تمام شده")
    gross_profit = Column(BigInteger, comment="سود ناخالص")
    operating_income = Column(BigInteger, comment="سود عملیاتی")
    net_income = Column(BigInteger, comment="سود خالص")
    total_assets = Column(BigInteger, comment="جمع دارایی‌ها")
    total_liabilities = Column(BigInteger, comment="جمع بدهی‌ها")
    total_equity = Column(BigInteger, comment="جمع حقوق مالکانه")
    eps = Column(Numeric(20, 2), comment="سود هر سهم")

    # Long tail of less-queried line items
    line_items = Column(JSONB, nullable=False, server_default="{}")

    created_at = Column(DateTime(timezone=True), default=_utcnow)

    announcement = relationship(
        "CodalAnnouncement", back_populates="financial_statements"
    )

    __table_args__ = (
        # Primary lookup: all income statements for symbol X, newest first
        Index(
            "idx_fs_symbol_type_period",
            "symbol",
            "statement_type",
            period_end_date.desc(),
        ),
        # Dedup: one statement type per announcement
        UniqueConstraint(
            "codal_announcement_id", "statement_type", name="uq_fs_announcement_type"
        ),
        # Period range scans
        Index("idx_fs_period_type", period_end_date.desc(), "statement_type"),
        # FK path lookup via security_id (scraper + RAG tools)
        Index(
            "idx_fs_security_type_period",
            "security_id",
            "statement_type",
            "period_end_date",
        ),
    )

    def __repr__(self):
        return (
            f"<FinancialStatement(symbol='{self.symbol}', type='{self.statement_type}', "
            f"period={self.period_end_jalali})>"
        )


class CodalRawResponse(Base):
    """Metadata for raw HTML stored on the local filesystem (Docker volume ./data:/app/data)"""

    __tablename__ = "codal_raw_responses"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    codal_announcement_id = Column(
        BigInteger,
        ForeignKey("codal_announcements.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    letter_serial = Column(Text, nullable=False)
    storage_path = Column(Text, nullable=True, comment="Local filesystem path relative to BASE_DIR (e.g. data/codal_raw/file.html.gz)")
    minio_key = Column(Text, nullable=True, comment="MinIO object key for this raw file")
    size_bytes = Column(Integer, comment="Original size before gzip")
    fetched_at = Column(DateTime(timezone=True), default=_utcnow)

    announcement = relationship("CodalAnnouncement", back_populates="raw_responses")

    __table_args__ = (UniqueConstraint("letter_serial", name="uq_raw_letter_serial"),)

    def __repr__(self):
        return f"<CodalRawResponse(serial='{self.letter_serial}', path='{self.storage_path}')>"


class IMEPhysicalTrade(Base):
    """IME physical commodity trades"""

    __tablename__ = "ime_physical_trades"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    date_trade = Column(Date, nullable=False, index=True)
    date_trade_shamsi = Column(String(20))
    symbol = Column(String(50))
    name = Column(String(300))
    category_id = Column(Integer)
    code_offer = Column(String(50), nullable=False)
    market_hall = Column(String(100))
    producer = Column(String(300))
    supplier = Column(String(300))
    broker = Column(String(300))
    contract_type = Column(String(100))
    settlement_type = Column(String(100))
    date_settlement = Column(String(20))
    date_delivery = Column(String(20))
    location_delivery = Column(String(300))
    price_base_offer = Column(BigInteger)
    price_min = Column(BigInteger)
    price_max = Column(BigInteger)
    price_last = Column(BigInteger)
    volume_offer = Column(BigInteger)
    volume_contract = Column(BigInteger)
    demand = Column(BigInteger)
    value = Column(BigInteger)
    currency = Column(String(20))
    packaging_type = Column(String(100))
    unit = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        UniqueConstraint("code_offer", "date_trade", name="uq_ime_physical_code_date"),
        Index("idx_ime_physical_date", "date_trade"),
        Index("idx_ime_physical_symbol", "symbol"),
    )


# ─── MONITORING ──────────────────────────────────────────────────────────────


class SpiderRun(Base):
    """Spider execution tracking for monitoring and debugging"""

    __tablename__ = "spider_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    spider_name = Column(
        String(100), nullable=False, index=True, comment="Name of the Scrapy spider"
    )
    start_time = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="Spider execution start time",
    )
    end_time = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Spider execution end time (NULL if running)",
    )
    duration_seconds = Column(
        Integer, nullable=True, comment="Execution duration in seconds"
    )
    status = Column(
        String(20),
        nullable=False,
        index=True,
        comment="running, success, failed, cancelled",
    )
    items_scraped = Column(
        Integer, default=0, comment="Number of items successfully scraped"
    )
    items_dropped = Column(
        Integer, default=0, comment="Number of items dropped by pipeline"
    )
    error_count = Column(Integer, default=0, comment="Number of errors encountered")
    error_message = Column(Text, nullable=True, comment="Error message if failed")
    log_file = Column(String(500), nullable=True, comment="Path to detailed log file")

    # Spider-specific metadata (JSON-serializable)
    # Can store spider args, configs, etc.
    run_metadata = Column(Text, nullable=True, comment="JSON metadata about spider run")

    created_at = Column(
        DateTime(timezone=True), default=_utcnow, comment="Record creation timestamp"
    )

    __table_args__ = (
        Index("idx_spider_runs_name_start", "spider_name", "start_time"),
        Index("idx_spider_runs_status", "status"),
    )

    def __repr__(self):
        return f"<SpiderRun(id={self.id}, spider='{self.spider_name}', status='{self.status}')>"


# ─── LOAN IMPORT ─────────────────────────────────────────────────────────────


class ImportType(enum.Enum):
    ocr = "ocr"
    web_scraping = "web_scraping"
    manual = "manual"


class ImportStatus(enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class FileUpload(Base):
    """Uploaded files for loan import (OCR source images/PDFs)"""

    __tablename__ = "file_uploads"

    id = Column(String(36), primary_key=True, comment="UUID")
    filename = Column(String(500), nullable=False)
    content_type = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False, comment="File size in bytes")
    file_path = Column(String(1000), nullable=False, comment="Server file path")
    minio_key = Column(Text, nullable=True, comment="MinIO object key for this upload")
    uploaded_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    def __repr__(self):
        return f"<FileUpload(id={self.id}, filename='{self.filename}')>"


class LoanImport(Base):
    """Loan data import jobs (OCR, web scraping, manual)"""

    __tablename__ = "loan_imports"

    id = Column(String(36), primary_key=True, comment="UUID")
    import_type = Column(Enum(ImportType), nullable=False, index=True)
    status = Column(
        Enum(ImportStatus), nullable=False, default=ImportStatus.pending, index=True
    )
    source = Column(String(1000), nullable=False, comment="Filename or URL")
    file_id = Column(
        String(36), ForeignKey("file_uploads.id", ondelete="SET NULL"), nullable=True
    )
    results = Column(JSONB, nullable=True)
    error = Column(Text, nullable=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        Index("idx_loan_imports_type", "import_type"),
        Index("idx_loan_imports_status", "status"),
        Index("idx_loan_imports_user", "user_id"),
    )

    def __repr__(self):
        return (
            f"<LoanImport(id={self.id}, type={self.import_type}, status={self.status})>"
        )


# ─── LOAN MODULE ─────────────────────────────────────────────────────────────


class BankCategory(enum.Enum):
    traditional = "traditional"
    digital = "digital"


class LoanCalculationMethod(enum.Enum):
    zero_interest = "zero_interest"
    average_based = "average_based"
    gold_backed = "gold_backed"
    credit_card = "credit_card"
    pos_based = "pos_based"
    installment = "installment"
    other = "other"


class LoanRequirementType(enum.Enum):
    document = "document"
    financial = "financial"
    collateral = "collateral"
    credit_rating = "credit_rating"
    other = "other"


class LoanBank(Base):
    """Banks offering loan products"""

    __tablename__ = "loan_banks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bank_slug = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="URL-friendly identifier e.g. bank-meli",
    )
    name_fa = Column(String(200), nullable=False)
    name_en = Column(String(200))
    category = Column(Enum(BankCategory), nullable=False, index=True)
    bank_type = Column(String(50), comment="state-owned, private, etc.")
    website = Column(String(500))
    description = Column(Text)
    description_fa = Column(Text)
    parent_bank = Column(String(200), comment="Parent bank name for digital banks")
    scoring_system = Column(JSONB, comment="Varies per bank - display only")
    digital_branch = Column(JSONB, comment="Associated digital branch info")
    extra_bank_data = Column(
        JSONB, comment="All additional bank-level data (varies per bank)"
    )
    logo_url = Column(String(500))
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    products = relationship(
        "LoanProduct",
        back_populates="bank",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self):
        return (
            f"<LoanBank(id={self.id}, slug='{self.bank_slug}', name='{self.name_fa}')>"
        )


class LoanProduct(Base):
    """Individual loan products offered by banks"""

    __tablename__ = "loan_products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bank_id = Column(
        Integer,
        ForeignKey("loan_banks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    loan_slug = Column(
        String(100), nullable=False, comment="URL-friendly identifier e.g. mehrabani"
    )
    name_fa = Column(String(300), nullable=False)
    name_en = Column(String(300))
    category = Column(String(100), comment="zero-interest, average-based, etc.")
    category_fa = Column(String(100))
    calculation_method = Column(
        Enum(LoanCalculationMethod),
        nullable=False,
        default=LoanCalculationMethod.other,
        index=True,
    )
    interest_rate_min = Column(Numeric(6, 2), comment="Minimum interest rate %")
    interest_rate_max = Column(Numeric(6, 2), comment="Maximum interest rate %")
    fee_min = Column(Numeric(6, 2), comment="Minimum fee %")
    fee_max = Column(Numeric(6, 2), comment="Maximum fee %")
    max_amount = Column(BigInteger, comment="Maximum loan amount in Rials")
    max_amount_display = Column(String(100), comment="Formatted display string")
    loan_multiplier = Column(String(50), comment="e.g. 370%")
    deposit_to_facility_ratio = Column(String(50), comment="e.g. 1:3.7")
    repayment_period_min = Column(Integer, comment="Min months")
    repayment_period_max = Column(Integer, comment="Max months")
    guarantor_required = Column(Boolean, default=False, index=True)
    guarantor_description = Column(Text)
    description = Column(Text)
    description_fa = Column(Text)
    extra_data = Column(JSONB, comment="Catch-all for display-only fields")
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    bank = relationship("LoanBank", back_populates="products")
    coefficients = relationship(
        "LoanCoefficient",
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="select",
    )
    requirements = relationship(
        "LoanRequirement",
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="select",
    )

    __table_args__ = (
        UniqueConstraint("bank_id", "loan_slug", name="uq_loan_products_bank_slug"),
        Index("idx_loan_products_bank", "bank_id"),
        Index("idx_loan_products_method", "calculation_method"),
        Index("idx_loan_products_guarantor", "guarantor_required"),
    )

    def __repr__(self):
        return f"<LoanProduct(id={self.id}, slug='{self.loan_slug}', name='{self.name_fa}')>"


class LoanCoefficient(Base):
    """Coefficient tables for loan calculations (normalized for querying)"""

    __tablename__ = "loan_coefficients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(
        Integer,
        ForeignKey("loan_products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fee_percent = Column(Numeric(6, 2), nullable=False, comment="Fee percentage")
    deposit_months = Column(
        Integer, nullable=False, comment="Deposit duration in months"
    )
    repayment_months = Column(
        Integer, nullable=False, comment="Repayment duration in months"
    )
    ratio_percent = Column(
        String(20), nullable=False, comment="Loan-to-deposit ratio e.g. 370%"
    )
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    product = relationship("LoanProduct", back_populates="coefficients")

    __table_args__ = (
        Index("idx_loan_coefficients_product", "product_id"),
        Index("idx_loan_coefficients_duration", "product_id", "repayment_months"),
    )

    def __repr__(self):
        return f"<LoanCoefficient(product={self.product_id}, fee={self.fee_percent}%, ratio={self.ratio_percent})>"


class LoanRequirement(Base):
    """Requirements for loan applications (normalized for filtering)"""

    __tablename__ = "loan_requirements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(
        Integer,
        ForeignKey("loan_products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requirement_type = Column(Enum(LoanRequirementType), nullable=False, index=True)
    description = Column(Text, nullable=False)
    description_fa = Column(Text)
    is_mandatory = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    product = relationship("LoanProduct", back_populates="requirements")

    __table_args__ = (
        Index("idx_loan_requirements_product", "product_id"),
        Index("idx_loan_requirements_type", "requirement_type"),
    )

    def __repr__(self):
        return f"<LoanRequirement(product={self.product_id}, type={self.requirement_type})>"


class UserLoan(Base):
    """User tracked/bookmarked loans"""

    __tablename__ = "user_loans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id = Column(
        Integer,
        ForeignKey("loan_products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    loan_amount = Column(BigInteger, comment="Requested amount in Rials")
    duration_months = Column(Integer, comment="Selected duration")
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    user = relationship("User")
    product = relationship("LoanProduct")
    payment_schedules = relationship(
        "PaymentSchedule",
        back_populates="user_loan",
        cascade="all, delete-orphan",
        lazy="select",
    )
    alerts = relationship(
        "PaymentAlert",
        back_populates="user_loan",
        cascade="all, delete-orphan",
        lazy="select",
    )

    __table_args__ = (
        Index("idx_user_loans_user", "user_id"),
        Index("idx_user_loans_product", "product_id"),
    )

    def __repr__(self):
        return (
            f"<UserLoan(id={self.id}, user={self.user_id}, product={self.product_id})>"
        )


class PaymentSchedule(Base):
    """Installment payment schedules"""

    __tablename__ = "payment_schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_loan_id = Column(
        Integer,
        ForeignKey("user_loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    installment_number = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    amount = Column(BigInteger, nullable=False, comment="Amount in Rials")
    principal = Column(BigInteger, comment="Principal portion")
    interest = Column(BigInteger, comment="Interest portion")
    status = Column(String(20), default="pending", comment="pending, paid, overdue")
    paid_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    user_loan = relationship("UserLoan", back_populates="payment_schedules")

    __table_args__ = (
        UniqueConstraint(
            "user_loan_id", "installment_number", name="uq_payment_schedules_loan_num"
        ),
        Index("idx_payment_schedules_loan", "user_loan_id"),
        Index("idx_payment_schedules_due", "due_date"),
    )

    def __repr__(self):
        return f"<PaymentSchedule(loan={self.user_loan_id}, num={self.installment_number})>"


class PaymentAlert(Base):
    """Payment reminder alerts"""

    __tablename__ = "payment_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_loan_id = Column(
        Integer,
        ForeignKey("user_loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alert_type = Column(
        String(50), nullable=False, comment="upcoming, overdue, reminder"
    )
    message = Column(Text)
    is_read = Column(Boolean, default=False, index=True)
    scheduled_for = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    user = relationship("User")
    user_loan = relationship("UserLoan", back_populates="alerts")

    __table_args__ = (
        Index("idx_payment_alerts_user", "user_id"),
        Index("idx_payment_alerts_loan", "user_loan_id"),
        Index("idx_payment_alerts_unread", "user_id", "is_read"),
    )


# ─── CRYPTO MODELS ──────────────────────────────────────────────────────────


class CryptoOHLCV(Base):
    """Crypto OHLCV candlestick data (1day, 1hour, etc.)"""

    __tablename__ = "crypto_ohlcv"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    interval = Column(String(10), nullable=False)
    open_time = Column(DateTime(timezone=True), nullable=False)
    open = Column(Numeric(20, 8))
    high = Column(Numeric(20, 8))
    low = Column(Numeric(20, 8))
    close = Column(Numeric(20, 8))
    volume = Column(Numeric(30, 8))
    turnover = Column(Numeric(30, 4))
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    security = relationship("Security", back_populates="crypto_ohlcv")

    __table_args__ = (
        UniqueConstraint(
            "security_id", "interval", "open_time", name="uq_crypto_ohlcv_sec_interval_time"
        ),
        Index("idx_crypto_ohlcv_sec_interval_time", "security_id", "interval", "open_time"),
    )

    def __repr__(self):
        return f"<CryptoOHLCV(security_id={self.security_id}, interval={self.interval}, time={self.open_time})>"


class CryptoTicker(Base):
    """Crypto ticker snapshots (price, volume, market cap)"""

    __tablename__ = "crypto_tickers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_time = Column(DateTime(timezone=True), nullable=False)
    last_price = Column(Numeric(20, 8))
    price_change_24h = Column(Numeric(20, 8))
    price_change_pct_24h = Column(Numeric(10, 4))
    high_24h = Column(Numeric(20, 8))
    low_24h = Column(Numeric(20, 8))
    volume_24h = Column(Numeric(30, 8))
    turnover_24h = Column(Numeric(30, 4))
    best_bid = Column(Numeric(20, 8))
    best_ask = Column(Numeric(20, 8))
    market_cap_usd = Column(Numeric(30, 2))
    price_toman = Column(Numeric(30, 2))
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    security = relationship("Security", back_populates="crypto_tickers")

    __table_args__ = (
        Index("idx_crypto_tickers_sec_time", "security_id", "snapshot_time"),
    )

    def __repr__(self):
        return f"<CryptoTicker(security_id={self.security_id}, time={self.snapshot_time}, price={self.last_price})>"


class CryptoGlobalMetrics(Base):
    """Daily global crypto market metrics (market cap, dominance, fear/greed)"""

    __tablename__ = "crypto_global_metrics"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    total_market_cap_usd = Column(Numeric(30, 2))
    total_volume_24h_usd = Column(Numeric(30, 2))
    btc_dominance_pct = Column(Numeric(6, 2))
    eth_dominance_pct = Column(Numeric(6, 2))
    active_coins = Column(Integer)
    fear_greed_value = Column(Integer)
    fear_greed_label = Column(String(20))
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    def __repr__(self):
        return f"<CryptoGlobalMetrics(date={self.date}, mcap={self.total_market_cap_usd})>"


# ─── CHAT SESSION MODELS ────────────────────────────────────────────────────


class ChatSession(Base):
    """Chat sessions for persistent conversation history"""

    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(200), default="New Chat")
    model = Column(String(100), nullable=True)
    symbol = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    user = relationship("User", backref="chat_sessions")
    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )


class ChatMessage(Base):
    """Individual messages within a chat session"""

    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(
        Integer,
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=True)
    sources = Column(JSONB, nullable=True)
    tools_used = Column(JSONB, nullable=True)
    model = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    session = relationship("ChatSession", back_populates="messages")


# ─── VOICE CALL MODELS ──────────────────────────────────────────────────────


class VoiceCallLog(Base):
    """Voice call session logs for tracking usage and diagnostics"""

    __tablename__ = "voice_call_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    model_id = Column(String(50), nullable=False, comment="gemini-live, grok-voice, gpt-realtime")
    voice = Column(String(50), comment="Selected voice name")
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    tool_calls_count = Column(Integer, default=0)
    tools_used = Column(JSONB)
    end_reason = Column(String(50), comment="user_hangup, timeout, error")
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    user = relationship("User")

    __table_args__ = (
        Index("idx_voice_call_logs_user", "user_id"),
        Index("idx_voice_call_logs_started", "started_at"),
    )


# ─── RISK PROFILING MODELS ────────────────────────────────────────────────


class UserRiskProfile(Base):
    """CFA L3 IPS-based risk profile from questionnaire"""

    __tablename__ = "user_risk_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    questionnaire_version = Column(SmallInteger, nullable=False, default=1)
    answers = Column(JSONB, nullable=False, comment='{"q1": 8, "q2": 6, ...}')
    composite_score = Column(Numeric(5, 2), nullable=False)
    ability_score = Column(Numeric(5, 2), nullable=False)
    willingness_score = Column(Numeric(5, 2), nullable=False)
    final_score = Column(Numeric(5, 2), nullable=False)
    profile_category = Column(
        String(30),
        nullable=False,
        comment="conservative/moderate_conservative/moderate/moderate_aggressive/aggressive",
    )
    target_allocation = Column(JSONB, nullable=False)
    risk_constraints = Column(JSONB, nullable=True)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, comment="Annual re-assessment")
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    user = relationship("User")
    suggestions = relationship(
        "SuggestedPortfolio",
        back_populates="risk_profile",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "idx_user_risk_profiles_active",
            "user_id",
            postgresql_where=text("is_active = true"),
        ),
    )


class SuggestedPortfolio(Base):
    """AI-generated portfolio suggestion linked to a risk profile"""

    __tablename__ = "suggested_portfolios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    risk_profile_id = Column(
        Integer,
        ForeignKey("user_risk_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    holdings = Column(
        JSONB,
        nullable=False,
        comment='[{symbol, asset_class, weight, sector, rationale}]',
    )
    target_allocation = Column(JSONB, nullable=False)
    expected_metrics = Column(JSONB, nullable=True)
    status = Column(
        String(20),
        nullable=False,
        default="suggested",
        comment="suggested/accepted/rejected/expired",
    )
    market_snapshot = Column(
        JSONB,
        nullable=True,
        comment="TEDPIX value, date, risk-free rate at generation time",
    )
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    user = relationship("User")
    risk_profile = relationship("UserRiskProfile", back_populates="suggestions")


# ─── CURRENCY RATE MODELS ─────────────────────────────────────────────────────


class CurrencyRate(Base):
    """Live currency rates scraped from Telegram (USD and future currencies).

    TimescaleDB hypertable partitioned by posted_at (7-day chunks),
    compressed after 30 days.  Linked to the securities table via security_id
    so the same table can hold multiple currencies in the future.
    """

    __tablename__ = "currency_rates"

    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK to securities (e.g. USD)",
    )
    posted_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Telegram message timestamp (UTC)",
    )
    msg_id = Column(
        Integer,
        nullable=False,
        comment="Telegram message ID (unique within channel)",
    )
    channel = Column(
        String(100),
        nullable=False,
        default="dollar_tehran3bze",
        comment="Telegram channel username",
    )
    rate_type = Column(
        String(20),
        nullable=False,
        comment="'spot' (نقدی) or 'forward' (فردایی)",
    )
    side = Column(
        String(20),
        nullable=False,
        comment="'buy' (خرید), 'sell' (فروش), or 'traded' (معامله شد)",
    )
    price = Column(
        BigInteger,
        nullable=False,
        comment="Price in Iranian Toman (no decimals)",
    )
    raw_text = Column(Text, nullable=True, comment="Original message text for auditing")
    scraped_at = Column(
        DateTime(timezone=True),
        default=_utcnow,
        comment="When this row was inserted",
    )

    __table_args__ = (
        PrimaryKeyConstraint("posted_at", "msg_id", "channel", name="pk_currency_rates"),
        Index("idx_currency_rates_sec_time", "security_id", "posted_at"),
    )

    def __repr__(self):
        return (
            f"<CurrencyRate(sec={self.security_id}, type={self.rate_type}, "
            f"side={self.side}, price={self.price}, at={self.posted_at})>"
        )


class GoldPrice(Base):
    """Gold and coin prices scraped from estjt.ir every 30 seconds.

    TimescaleDB hypertable partitioned by scraped_at (1-day chunks),
    compressed after 7 days.  Each row stores a single security's price
    at a given scrape timestamp.
    """

    __tablename__ = "gold_prices"

    security_id = Column(
        Integer,
        ForeignKey("securities.security_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK to securities (XAU_OZ, XAU_TEHRAN, GOLD_18K, etc.)",
    )
    scraped_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="When this row was inserted (UTC)",
    )
    price_irr = Column(
        BigInteger,
        nullable=True,
        comment="Price in Iranian Toman (NULL for international ounce)",
    )
    price_usd = Column(
        Numeric(20, 4),
        nullable=True,
        comment="Price in USD (XAU_OZ only)",
    )
    source = Column(
        String(100),
        nullable=False,
        server_default="estjt.ir",
        comment="Data source",
    )

    __table_args__ = (
        PrimaryKeyConstraint("security_id", "scraped_at", name="pk_gold_prices"),
        Index("idx_gold_prices_sec_time", "security_id", "scraped_at"),
    )

    def __repr__(self):
        return (
            f"<GoldPrice(sec={self.security_id}, irr={self.price_irr}, "
            f"usd={self.price_usd}, at={self.scraped_at})>"
        )
