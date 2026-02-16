"""
SQLAlchemy ORM models for TSETMC data
17-table PostgreSQL schema
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, BigInteger, String, Numeric, Date, DateTime,
    Boolean, ForeignKey, Index, UniqueConstraint, Text
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _utcnow():
    return datetime.now(timezone.utc)


class Security(Base):
    """Universal entity registry (stocks, funds, gold, currency, commodity, crypto)"""
    __tablename__ = 'securities'

    security_id = Column(Integer, primary_key=True, autoincrement=True)
    ins_code = Column(BigInteger, unique=True, nullable=True, index=True,
                      comment='BrsApi instrument code (NULL for non-TSE)')
    symbol = Column(String(50), nullable=False, index=True)
    name_fa = Column(String(200))
    name_en = Column(String(200))
    isin = Column(String(20), unique=True)
    type = Column(String(10), comment='stock or fund')
    market_type = Column(String(20), nullable=False, default='tse', index=True,
                         comment='tse, gold, currency, commodity, crypto')
    sector_id = Column(Integer, comment='cs_id from BrsApi')
    sector_name_fa = Column(String(100), index=True)
    sector_name_en = Column(String(100))
    base_volume = Column(BigInteger, comment='bvol from BrsApi')
    total_shares = Column(BigInteger, comment='z from BrsApi')
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    # Relationships
    daily_ohlcv = relationship('DailyOHLCV', back_populates='security', cascade='all, delete-orphan')
    order_books = relationship('OrderBook', back_populates='security', cascade='all, delete-orphan')
    intraday_snapshots = relationship('IntradaySnapshot', back_populates='security', cascade='all, delete-orphan')
    etf_navs = relationship('ETFNav', back_populates='security', cascade='all, delete-orphan')
    tick_trades = relationship('TickTrade', back_populates='security', cascade='all, delete-orphan')
    shareholders = relationship('Shareholder', back_populates='security', cascade='all, delete-orphan')
    codal_announcements = relationship('CodalAnnouncement', back_populates='security', cascade='all, delete-orphan')
    market_prices = relationship('MarketPrice', back_populates='security', cascade='all, delete-orphan')

    __table_args__ = (
        Index('idx_securities_symbol_market', 'symbol', 'market_type'),
    )

    def __repr__(self):
        return f"<Security(ins_code={self.ins_code}, symbol='{self.symbol}', market='{self.market_type}')>"


class DailyOHLCV(Base):
    """Merged daily prices + financials + client type"""
    __tablename__ = 'daily_ohlcv'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(Integer, ForeignKey('securities.security_id', ondelete='CASCADE'),
                         nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)

    # OHLCV
    open = Column(Numeric(18, 2), comment='pf (price_first)')
    high = Column(Numeric(18, 2), comment='pmax')
    low = Column(Numeric(18, 2), comment='pmin')
    close = Column(Numeric(18, 2), comment='pc (final/close price)')
    last = Column(Numeric(18, 2), comment='pl (last traded price)')
    volume = Column(BigInteger, comment='tvol')
    value = Column(BigInteger, comment='tval')
    trades = Column(Integer, comment='tno')
    adj_close = Column(Numeric(18, 2))

    # Price context
    price_yesterday = Column(Numeric(18, 2), comment='py')
    close_change = Column(Numeric(18, 2), comment='pcc')
    close_change_pct = Column(Numeric(18, 4), comment='pcp')
    last_change = Column(Numeric(18, 2), comment='plc')
    last_change_pct = Column(Numeric(18, 4), comment='plp')
    threshold_min = Column(Numeric(18, 2), comment='tmin')
    threshold_max = Column(Numeric(18, 2), comment='tmax')

    # Fundamentals
    eps = Column(Numeric(18, 2))
    pe_ratio = Column(Numeric(18, 2), comment='pe')
    market_cap = Column(BigInteger, comment='mv')
    nav = Column(Numeric(18, 2))
    estimated_eps = Column(Numeric(18, 2))

    # Client type
    real_buy_count = Column(Integer, comment='Buy_CountI')
    real_buy_volume = Column(BigInteger, comment='Buy_I_Volume')
    real_sell_count = Column(Integer, comment='Sell_CountI')
    real_sell_volume = Column(BigInteger, comment='Sell_I_Volume')
    legal_buy_count = Column(Integer, comment='Buy_CountN')
    legal_buy_volume = Column(BigInteger, comment='Buy_N_Volume')
    legal_sell_count = Column(Integer, comment='Sell_CountN')
    legal_sell_volume = Column(BigInteger, comment='Sell_N_Volume')

    # Meta
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    # Relationships
    security = relationship('Security', back_populates='daily_ohlcv')

    __table_args__ = (
        UniqueConstraint('security_id', 'date', name='uq_daily_ohlcv_sec_date'),
        Index('idx_daily_ohlcv_date', 'date'),
        Index('idx_daily_ohlcv_sec_date', 'security_id', 'date'),
    )

    def __repr__(self):
        return f"<DailyOHLCV(security_id={self.security_id}, date={self.date}, close={self.close})>"


class OrderBook(Base):
    """5-level bid/ask snapshots, appended every 2.5 min"""
    __tablename__ = 'order_book'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(Integer, ForeignKey('securities.security_id', ondelete='CASCADE'),
                         nullable=False, index=True)
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
    security = relationship('Security', back_populates='order_books')

    __table_args__ = (
        UniqueConstraint('security_id', 'snapshot_time', name='uq_order_book_sec_time'),
        Index('idx_order_book_sec_time', 'security_id', 'snapshot_time'),
    )

    def __repr__(self):
        return f"<OrderBook(security_id={self.security_id}, time={self.snapshot_time})>"


class IntradaySnapshot(Base):
    """Historical intraday data (one-time backfill from TSETMC)"""
    __tablename__ = 'intraday_snapshots'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(Integer, ForeignKey('securities.security_id', ondelete='CASCADE'),
                         nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    price = Column(Numeric(18, 2))
    volume = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    security = relationship('Security', back_populates='intraday_snapshots')

    __table_args__ = (
        UniqueConstraint('security_id', 'timestamp', name='uq_intraday_sec_ts'),
        Index('idx_intraday_sec_ts', 'security_id', 'timestamp'),
    )

    def __repr__(self):
        return f"<IntradaySnapshot(security_id={self.security_id}, ts={self.timestamp})>"


class Option(Base):
    """Options contracts from TSETMC Market Watch"""
    __tablename__ = 'options'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ins_code = Column(BigInteger, nullable=False, index=True,
                      comment='TSETMC instrument code')
    isin = Column(String(20))
    symbol = Column(String(50), nullable=False, index=True)
    name_fa = Column(String(200))
    option_type = Column(String(4), nullable=False, comment='call or put')
    underlying = Column(String(100), index=True, comment='Underlying asset name')
    strike_price = Column(Numeric(18, 2))
    expiry_date = Column(String(20), comment='Shamsi date string')
    date = Column(Date, nullable=False, index=True, comment='Trading date')

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

    __table_args__ = (
        UniqueConstraint('ins_code', 'date', name='uq_options_ins_code_date'),
        Index('idx_options_ins_date', 'ins_code', 'date'),
        Index('idx_options_underlying', 'underlying'),
    )

    def __repr__(self):
        return f"<Option(symbol='{self.symbol}', type={self.option_type}, strike={self.strike_price})>"


class IMEOption(Base):
    """IME commodity options contracts"""
    __tablename__ = 'ime_options'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    date_shamsi = Column(String(20))
    contract_category = Column(String(200))
    contract_category_sub = Column(String(50))
    commodity = Column(String(20))
    option_type = Column(String(4), nullable=False, comment='call or put')
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
    settlement_price = Column(BigInteger, comment='py')
    open = Column(BigInteger, comment='pf')
    high = Column(BigInteger, comment='pmax')
    low = Column(BigInteger, comment='pmin')
    last = Column(BigInteger, comment='pl')
    last_change = Column(BigInteger, comment='plc')
    last_change_pct = Column(Numeric(10, 2), comment='plp')
    trades = Column(Integer, comment='tno')
    volume = Column(Integer, comment='tvol')
    value = Column(BigInteger, comment='tval')

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
        UniqueConstraint('contract_code', 'date', name='uq_ime_options_code_date'),
        Index('idx_ime_options_date', 'date'),
        Index('idx_ime_options_commodity', 'commodity'),
    )

    def __repr__(self):
        return f"<IMEOption(code='{self.contract_code}', type={self.option_type}, strike={self.price_strike})>"


class IMEFuture(Base):
    """IME commodity futures contracts"""
    __tablename__ = 'ime_futures'

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
    settlement_price = Column(BigInteger, comment='py')
    open = Column(BigInteger, comment='pf')
    high = Column(BigInteger, comment='pmax')
    low = Column(BigInteger, comment='pmin')
    last = Column(BigInteger, comment='pl')
    last_change = Column(BigInteger, comment='plc')
    last_change_pct = Column(Numeric(10, 2), comment='plp')
    instant_settlement = Column(Numeric(18, 4), comment='pls')
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
        UniqueConstraint('contract_code', 'date', name='uq_ime_futures_code_date'),
        Index('idx_ime_futures_date', 'date'),
    )

    def __repr__(self):
        return f"<IMEFuture(code='{self.contract_code}', last={self.last})>"


# ─── NEW TABLES ───────────────────────────────────────────────────────────────


class ETFNav(Base):
    """ETF Net Asset Value snapshots"""
    __tablename__ = 'etf_nav'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(Integer, ForeignKey('securities.security_id', ondelete='CASCADE'),
                         nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    time = Column(String(10))
    nav_issuance = Column(Numeric(18, 2), comment='psubtran')
    nav_redemption = Column(Numeric(18, 2), comment='predtran')
    last_price = Column(Numeric(18, 2), comment='pl')
    bubble_pct = Column(Numeric(10, 4))
    fund_type = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    security = relationship('Security', back_populates='etf_navs')

    __table_args__ = (
        UniqueConstraint('security_id', 'date', name='uq_etf_nav_sec_date'),
        Index('idx_etf_nav_sec_date', 'security_id', 'date'),
    )


class TickTrade(Base):
    """Individual trades (tick data) per stock"""
    __tablename__ = 'tick_trades'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(Integer, ForeignKey('securities.security_id', ondelete='CASCADE'),
                         nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    row_num = Column(Integer, nullable=False)
    time = Column(String(10))
    price = Column(Numeric(18, 2))
    volume = Column(BigInteger)
    canceled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    security = relationship('Security', back_populates='tick_trades')

    __table_args__ = (
        UniqueConstraint('security_id', 'date', 'row_num', name='uq_tick_trades_sec_date_row'),
        Index('idx_tick_trades_sec_date', 'security_id', 'date'),
    )


class Shareholder(Base):
    """Major shareholders snapshot"""
    __tablename__ = 'shareholders'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(Integer, ForeignKey('securities.security_id', ondelete='CASCADE'),
                         nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    shareholder_id = Column(String(50))
    name = Column(String(500))
    volume = Column(BigInteger)
    percent = Column(Numeric(10, 4))
    change = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    security = relationship('Security', back_populates='shareholders')

    __table_args__ = (
        UniqueConstraint('security_id', 'name', 'date', name='uq_shareholders_sec_name_date'),
        Index('idx_shareholders_sec_date', 'security_id', 'date'),
    )


class CodalAnnouncement(Base):
    """Codal/TSETMC announcements"""
    __tablename__ = 'codal_announcements'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(Integer, ForeignKey('securities.security_id', ondelete='SET NULL'),
                         nullable=True, index=True)
    symbol = Column(String(50), index=True)
    company_name = Column(String(300))
    title = Column(String(1000))
    code = Column(String(50), nullable=False, unique=True)
    category = Column(Integer)
    date_title = Column(String(50))
    date_send = Column(String(20))
    time_send = Column(String(10))
    date_publish = Column(String(20))
    time_publish = Column(String(10))
    link = Column(Text)
    link_pdf = Column(Text)
    link_excel = Column(Text)
    link_attachment = Column(Text)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    security = relationship('Security', back_populates='codal_announcements')

    __table_args__ = (
        Index('idx_codal_symbol', 'symbol'),
        Index('idx_codal_date_publish', 'date_publish'),
    )


class MarketPrice(Base):
    """Gold, currency, commodity, crypto prices"""
    __tablename__ = 'market_prices'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(Integer, ForeignKey('securities.security_id', ondelete='CASCADE'),
                         nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    time = Column(String(10))
    price = Column(Numeric(20, 4))
    price_toman = Column(Numeric(20, 2), comment='crypto/currency only')
    change_value = Column(Numeric(20, 4))
    change_pct = Column(Numeric(10, 4))
    unit = Column(String(20))
    market_cap = Column(Numeric(30, 2), comment='crypto only')
    icon_url = Column(Text)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    security = relationship('Security', back_populates='market_prices')

    __table_args__ = (
        UniqueConstraint('security_id', 'date', name='uq_market_prices_sec_date'),
        Index('idx_market_prices_sec_date', 'security_id', 'date'),
    )


class MarketIndex(Base):
    """TSE market indices"""
    __tablename__ = 'market_indices'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    time = Column(String(10))
    name = Column(String(200), nullable=False)
    index_value = Column(Numeric(20, 2))
    index_change = Column(Numeric(20, 2))
    index_change_pct = Column(Numeric(10, 4))
    min_value = Column(Numeric(20, 2))
    max_value = Column(Numeric(20, 2))
    market_value = Column(Numeric(30, 2), comment='mv')
    trades = Column(BigInteger)
    volume = Column(BigInteger)
    value = Column(Numeric(30, 2))
    state = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        UniqueConstraint('name', 'date', name='uq_market_indices_name_date'),
        Index('idx_market_indices_date', 'date'),
    )


class IMECertificate(Base):
    """IME deposit certificates (general + coin/saffron)"""
    __tablename__ = 'ime_certificates'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    date_shamsi = Column(String(20))
    cert_type = Column(Integer, nullable=False, comment='1=general, 2=coin/saffron')
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
        UniqueConstraint('contract_code', 'date', name='uq_ime_certificates_code_date'),
        Index('idx_ime_certificates_date', 'date'),
    )


class IMEFund(Base):
    """IME commodity funds"""
    __tablename__ = 'ime_funds'

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
        UniqueConstraint('isin', 'date', name='uq_ime_funds_isin_date'),
        Index('idx_ime_funds_date', 'date'),
    )


class IMEForward(Base):
    """IME forward contracts"""
    __tablename__ = 'ime_forwards'

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
        UniqueConstraint('isin', 'date', name='uq_ime_forwards_isin_date'),
        Index('idx_ime_forwards_date', 'date'),
    )


class IMEPhysicalTrade(Base):
    """IME physical commodity trades"""
    __tablename__ = 'ime_physical_trades'

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
        UniqueConstraint('code_offer', 'date_trade', name='uq_ime_physical_code_date'),
        Index('idx_ime_physical_date', 'date_trade'),
    )
