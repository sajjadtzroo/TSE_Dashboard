"""
SQLAlchemy ORM models for TSETMC data
Defines all database tables for storing stock market data
"""
from datetime import datetime
from sqlalchemy import Column, Integer, BigInteger, String, Numeric, DateTime, Boolean, ForeignKey, Index, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Company(Base):
    """Master instrument registry - stores all companies/instruments"""
    __tablename__ = 'companies'

    id = Column(Integer, primary_key=True, autoincrement=True)
    ins_code = Column(BigInteger, unique=True, nullable=False, index=True, comment='Unique instrument identifier')
    symbol = Column(String(50), nullable=False, index=True, comment='Trading symbol')
    name_fa = Column(String(200), comment='Persian name')
    name_en = Column(String(200), comment='English name')
    isin = Column(String(20), unique=True, comment='International Securities ID')
    sector_name_fa = Column(String(100), index=True, comment='Industry sector (Persian)')
    sector_name_en = Column(String(100), comment='Industry sector (English)')
    is_active = Column(Boolean, default=True, index=True, comment='Trading status')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    daily_prices = relationship('DailyPrice', back_populates='company', cascade='all, delete-orphan')
    financial_indicators = relationship('FinancialIndicator', back_populates='company', cascade='all, delete-orphan')
    intraday_trades = relationship('IntradayTrade', back_populates='company', cascade='all, delete-orphan')
    order_books = relationship('OrderBook', back_populates='company', cascade='all, delete-orphan')
    client_types = relationship('ClientType', back_populates='company', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Company(ins_code={self.ins_code}, symbol='{self.symbol}', name='{self.name_fa}')>"


class DailyPrice(Base):
    """Daily OHLCV data - historical and real-time price data"""
    __tablename__ = 'daily_prices'

    id = Column(Integer, primary_key=True, autoincrement=True)
    ins_code = Column(BigInteger, ForeignKey('companies.ins_code', ondelete='CASCADE'), nullable=False, index=True)
    d_even = Column(Integer, nullable=False, index=True, comment='Date as YYYYMMDD')

    # OHLC prices
    price_first = Column(Numeric(18, 2), comment='Opening price')
    price_last = Column(Numeric(18, 2), comment='Closing price')
    price_min = Column(Numeric(18, 2), comment='Low price')
    price_max = Column(Numeric(18, 2), comment='High price')

    # Price changes
    price_yesterday = Column(Numeric(18, 2), comment='Previous closing price')
    price_change = Column(Numeric(18, 2), comment='Absolute price change')
    price_change_percent = Column(Numeric(10, 4), comment='Percentage price change')

    # Volume and value
    q_tot_tran_5j = Column(BigInteger, comment='Total volume')
    q_tot_cap = Column(BigInteger, comment='Total value')
    z_tot_tran = Column(Integer, comment='Number of trades')

    # Additional metrics
    adj_close = Column(Numeric(18, 2), comment='Adjusted closing price')

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship('Company', back_populates='daily_prices')

    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint('ins_code', 'd_even', name='uq_daily_price_ins_date'),
        Index('idx_daily_price_date', 'd_even'),
        Index('idx_daily_price_ins_date', 'ins_code', 'd_even'),
        Index('idx_daily_price_volume', 'q_tot_tran_5j'),
    )

    def __repr__(self):
        return f"<DailyPrice(ins_code={self.ins_code}, date={self.d_even}, last={self.price_last})>"


class FinancialIndicator(Base):
    """Financial metrics and valuation indicators"""
    __tablename__ = 'financial_indicators'

    id = Column(Integer, primary_key=True, autoincrement=True)
    ins_code = Column(BigInteger, ForeignKey('companies.ins_code', ondelete='CASCADE'), nullable=False, index=True)
    d_even = Column(Integer, nullable=False, index=True, comment='Date as YYYYMMDD')

    # Valuation metrics
    market_cap = Column(BigInteger, comment='Market capitalization')
    pe_ratio = Column(Numeric(10, 2), comment='Price to earnings ratio')
    eps = Column(Numeric(18, 2), comment='Earnings per share')
    estimated_eps = Column(Numeric(18, 2), comment='Estimated EPS')

    # Price ranges
    min_week = Column(Numeric(18, 2), comment='52-week low')
    max_week = Column(Numeric(18, 2), comment='52-week high')
    min_year = Column(Numeric(18, 2), comment='Yearly low')
    max_year = Column(Numeric(18, 2), comment='Yearly high')

    # Daily price limits (price band)
    price_threshold_min = Column(Numeric(18, 2), comment='Daily minimum price threshold')
    price_threshold_max = Column(Numeric(18, 2), comment='Daily maximum price threshold')

    # Additional metrics
    nav = Column(Numeric(18, 2), comment='Net Asset Value (for funds)')
    total_shares = Column(BigInteger, comment='Total outstanding shares')

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship('Company', back_populates='financial_indicators')

    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint('ins_code', 'd_even', name='uq_financial_ind_ins_date'),
        Index('idx_financial_ind_pe', 'pe_ratio'),
        Index('idx_financial_ind_market_cap', 'market_cap'),
    )

    def __repr__(self):
        return f"<FinancialIndicator(ins_code={self.ins_code}, date={self.d_even}, pe={self.pe_ratio})>"


class IntradayTrade(Base):
    """Tick-by-tick intraday trade data (optional, high volume)"""
    __tablename__ = 'intraday_trades'

    id = Column(Integer, primary_key=True, autoincrement=True)
    ins_code = Column(BigInteger, ForeignKey('companies.ins_code', ondelete='CASCADE'), nullable=False, index=True)
    d_even = Column(Integer, nullable=False, index=True, comment='Date as YYYYMMDD')
    trade_time = Column(String(8), nullable=False, comment='Trade time as HHMMSS')

    price = Column(Numeric(18, 2), nullable=False, comment='Trade price')
    volume = Column(BigInteger, comment='Trade volume')
    value = Column(BigInteger, comment='Trade value')

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    company = relationship('Company', back_populates='intraday_trades')

    # Constraints and indexes
    __table_args__ = (
        Index('idx_intraday_ins_date_time', 'ins_code', 'd_even', 'trade_time'),
        Index('idx_intraday_date', 'd_even'),
    )

    def __repr__(self):
        return f"<IntradayTrade(ins_code={self.ins_code}, time={self.trade_time}, price={self.price})>"


class OrderBook(Base):
    """5-level bid/ask order book depth (optional)"""
    __tablename__ = 'order_book'

    id = Column(Integer, primary_key=True, autoincrement=True)
    ins_code = Column(BigInteger, ForeignKey('companies.ins_code', ondelete='CASCADE'), nullable=False, index=True)
    d_even = Column(Integer, nullable=False, index=True, comment='Date as YYYYMMDD')
    snapshot_time = Column(DateTime, nullable=False, comment='Snapshot timestamp')

    # Buy side (demand) - 5 levels
    buy_price_1 = Column(Numeric(18, 2))
    buy_volume_1 = Column(BigInteger)
    buy_count_1 = Column(Integer)

    buy_price_2 = Column(Numeric(18, 2))
    buy_volume_2 = Column(BigInteger)
    buy_count_2 = Column(Integer)

    buy_price_3 = Column(Numeric(18, 2))
    buy_volume_3 = Column(BigInteger)
    buy_count_3 = Column(Integer)

    buy_price_4 = Column(Numeric(18, 2))
    buy_volume_4 = Column(BigInteger)
    buy_count_4 = Column(Integer)

    buy_price_5 = Column(Numeric(18, 2))
    buy_volume_5 = Column(BigInteger)
    buy_count_5 = Column(Integer)

    # Sell side (supply) - 5 levels
    sell_price_1 = Column(Numeric(18, 2))
    sell_volume_1 = Column(BigInteger)
    sell_count_1 = Column(Integer)

    sell_price_2 = Column(Numeric(18, 2))
    sell_volume_2 = Column(BigInteger)
    sell_count_2 = Column(Integer)

    sell_price_3 = Column(Numeric(18, 2))
    sell_volume_3 = Column(BigInteger)
    sell_count_3 = Column(Integer)

    sell_price_4 = Column(Numeric(18, 2))
    sell_volume_4 = Column(BigInteger)
    sell_count_4 = Column(Integer)

    sell_price_5 = Column(Numeric(18, 2))
    sell_volume_5 = Column(BigInteger)
    sell_count_5 = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    company = relationship('Company', back_populates='order_books')

    # Constraints and indexes
    __table_args__ = (
        Index('idx_order_book_ins_time', 'ins_code', 'snapshot_time'),
        Index('idx_order_book_date', 'd_even'),
    )

    def __repr__(self):
        return f"<OrderBook(ins_code={self.ins_code}, time={self.snapshot_time})>"


class ClientType(Base):
    """Legal vs. Real trader activity data"""
    __tablename__ = 'client_type'

    id = Column(Integer, primary_key=True, autoincrement=True)
    ins_code = Column(BigInteger, ForeignKey('companies.ins_code', ondelete='CASCADE'), nullable=False, index=True)
    d_even = Column(Integer, nullable=False, index=True, comment='Date as YYYYMMDD')

    # Real (individual) buyers
    real_buyer_count = Column(Integer, comment='Number of individual buyers')
    real_buyer_volume = Column(BigInteger, comment='Individual buy volume')
    real_buyer_value = Column(BigInteger, comment='Individual buy value')

    # Real (individual) sellers
    real_seller_count = Column(Integer, comment='Number of individual sellers')
    real_seller_volume = Column(BigInteger, comment='Individual sell volume')
    real_seller_value = Column(BigInteger, comment='Individual sell value')

    # Legal (institutional) buyers
    legal_buyer_count = Column(Integer, comment='Number of institutional buyers')
    legal_buyer_volume = Column(BigInteger, comment='Institutional buy volume')
    legal_buyer_value = Column(BigInteger, comment='Institutional buy value')

    # Legal (institutional) sellers
    legal_seller_count = Column(Integer, comment='Number of institutional sellers')
    legal_seller_volume = Column(BigInteger, comment='Institutional sell volume')
    legal_seller_value = Column(BigInteger, comment='Institutional sell value')

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship('Company', back_populates='client_types')

    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint('ins_code', 'd_even', name='uq_client_type_ins_date'),
        Index('idx_client_type_date', 'd_even'),
    )

    def __repr__(self):
        return f"<ClientType(ins_code={self.ins_code}, date={self.d_even})>"


class ScraperStatus(Base):
    """Monitoring and tracking spider execution"""
    __tablename__ = 'scraper_status'

    id = Column(Integer, primary_key=True, autoincrement=True)
    spider_name = Column(String(50), nullable=False, index=True, comment='Spider identifier')
    start_time = Column(DateTime, nullable=False, comment='Execution start time')
    end_time = Column(DateTime, comment='Execution end time')
    status = Column(String(20), nullable=False, comment='Status: running, completed, failed')

    items_scraped = Column(Integer, default=0, comment='Number of items successfully scraped')
    items_dropped = Column(Integer, default=0, comment='Number of items dropped')
    errors_count = Column(Integer, default=0, comment='Number of errors encountered')

    error_message = Column(String(1000), comment='Error details if failed')

    created_at = Column(DateTime, default=datetime.utcnow)

    # Constraints and indexes
    __table_args__ = (
        Index('idx_scraper_status_spider', 'spider_name', 'start_time'),
        Index('idx_scraper_status_time', 'start_time'),
    )

    def __repr__(self):
        return f"<ScraperStatus(spider={self.spider_name}, status={self.status}, items={self.items_scraped})>"
