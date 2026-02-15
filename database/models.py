"""
SQLAlchemy ORM models for TSETMC data
4-table PostgreSQL schema: securities, daily_ohlcv, order_book, intraday_snapshots
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, BigInteger, String, Numeric, Date, DateTime,
    Boolean, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _utcnow():
    return datetime.now(timezone.utc)


class Security(Base):
    """Master instrument registry"""
    __tablename__ = 'securities'

    security_id = Column(Integer, primary_key=True, autoincrement=True)
    ins_code = Column(BigInteger, unique=True, nullable=False, index=True,
                      comment='BrsApi instrument code')
    symbol = Column(String(50), nullable=False, index=True)
    name_fa = Column(String(200))
    name_en = Column(String(200))
    isin = Column(String(20), unique=True)
    type = Column(String(10), comment='stock or fund')
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

    def __repr__(self):
        return f"<Security(ins_code={self.ins_code}, symbol='{self.symbol}')>"


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
