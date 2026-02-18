"""
Scrapy Item definitions for TSETMC data
All items carry ins_code; the pipeline resolves ins_code -> security_id.
"""

import scrapy


class CompanyItem(scrapy.Item):
    """Company/Instrument master data -> securities table"""

    item_type = scrapy.Field()  # Always 'company'
    ins_code = scrapy.Field()
    symbol = scrapy.Field()
    name_fa = scrapy.Field()
    name_en = scrapy.Field()
    isin = scrapy.Field()
    type = scrapy.Field()  # 'stock' or 'fund'
    sector_id = scrapy.Field()  # cs_id from BrsApi
    sector_name_fa = scrapy.Field()
    sector_name_en = scrapy.Field()
    base_volume = scrapy.Field()  # bvol from BrsApi
    total_shares = scrapy.Field()  # z from BrsApi
    is_active = scrapy.Field()


class DailyPriceItem(scrapy.Item):
    """Daily OHLCV + context -> merges into daily_ohlcv table"""

    item_type = scrapy.Field()  # Always 'daily_price'
    ins_code = scrapy.Field()
    date = scrapy.Field()  # date object or YYYYMMDD int

    # OHLCV
    open = scrapy.Field()  # pf
    high = scrapy.Field()  # pmax
    low = scrapy.Field()  # pmin
    close = scrapy.Field()  # pc
    last = scrapy.Field()  # pl
    volume = scrapy.Field()  # tvol
    value = scrapy.Field()  # tval
    trades = scrapy.Field()  # tno
    adj_close = scrapy.Field()

    # Price context
    price_yesterday = scrapy.Field()  # py
    close_change = scrapy.Field()  # pcc
    close_change_pct = scrapy.Field()  # pcp
    last_change = scrapy.Field()  # plc
    last_change_pct = scrapy.Field()  # plp
    threshold_min = scrapy.Field()  # tmin
    threshold_max = scrapy.Field()  # tmax


class FinancialIndicatorItem(scrapy.Item):
    """Financial metrics -> merges into daily_ohlcv table"""

    item_type = scrapy.Field()  # Always 'financial_indicator'
    ins_code = scrapy.Field()
    date = scrapy.Field()

    eps = scrapy.Field()
    estimated_eps = scrapy.Field()
    pe_ratio = scrapy.Field()
    market_cap = scrapy.Field()
    nav = scrapy.Field()


class ClientTypeItem(scrapy.Item):
    """Client type data -> merges into daily_ohlcv table"""

    item_type = scrapy.Field()  # Always 'client_type'
    ins_code = scrapy.Field()
    date = scrapy.Field()

    real_buy_count = scrapy.Field()
    real_buy_volume = scrapy.Field()
    real_sell_count = scrapy.Field()
    real_sell_volume = scrapy.Field()
    legal_buy_count = scrapy.Field()
    legal_buy_volume = scrapy.Field()
    legal_sell_count = scrapy.Field()
    legal_sell_volume = scrapy.Field()


class OrderBookItem(scrapy.Item):
    """5-level bid/ask order book snapshot -> order_book table"""

    item_type = scrapy.Field()  # Always 'order_book'
    ins_code = scrapy.Field()
    snapshot_time = scrapy.Field()  # datetime

    # Bid levels 1-5 (pd/qd/zd from BrsApi)
    bid_price_1 = scrapy.Field()
    bid_vol_1 = scrapy.Field()
    bid_count_1 = scrapy.Field()
    bid_price_2 = scrapy.Field()
    bid_vol_2 = scrapy.Field()
    bid_count_2 = scrapy.Field()
    bid_price_3 = scrapy.Field()
    bid_vol_3 = scrapy.Field()
    bid_count_3 = scrapy.Field()
    bid_price_4 = scrapy.Field()
    bid_vol_4 = scrapy.Field()
    bid_count_4 = scrapy.Field()
    bid_price_5 = scrapy.Field()
    bid_vol_5 = scrapy.Field()
    bid_count_5 = scrapy.Field()

    # Ask levels 1-5 (po/qo/zo from BrsApi)
    ask_price_1 = scrapy.Field()
    ask_vol_1 = scrapy.Field()
    ask_count_1 = scrapy.Field()
    ask_price_2 = scrapy.Field()
    ask_vol_2 = scrapy.Field()
    ask_count_2 = scrapy.Field()
    ask_price_3 = scrapy.Field()
    ask_vol_3 = scrapy.Field()
    ask_count_3 = scrapy.Field()
    ask_price_4 = scrapy.Field()
    ask_vol_4 = scrapy.Field()
    ask_count_4 = scrapy.Field()
    ask_price_5 = scrapy.Field()
    ask_vol_5 = scrapy.Field()
    ask_count_5 = scrapy.Field()


class OptionItem(scrapy.Item):
    """Options contract data from TSETMC -> options table"""

    item_type = scrapy.Field()  # Always 'option'
    ins_code = scrapy.Field()
    isin = scrapy.Field()
    symbol = scrapy.Field()
    name_fa = scrapy.Field()
    option_type = scrapy.Field()  # 'call' or 'put'
    underlying = scrapy.Field()  # e.g. اهرم
    strike_price = scrapy.Field()
    expiry_date = scrapy.Field()  # Shamsi date string
    date = scrapy.Field()  # trading date

    # OHLCV
    open = scrapy.Field()
    high = scrapy.Field()
    low = scrapy.Field()
    close = scrapy.Field()
    last = scrapy.Field()
    yesterday = scrapy.Field()
    close_change = scrapy.Field()
    volume = scrapy.Field()
    value = scrapy.Field()
    trades = scrapy.Field()

    # Limits
    threshold_min = scrapy.Field()
    threshold_max = scrapy.Field()
    base_volume = scrapy.Field()

    # Best bid/ask (level 1 only)
    bid_price_1 = scrapy.Field()
    bid_vol_1 = scrapy.Field()
    bid_count_1 = scrapy.Field()
    ask_price_1 = scrapy.Field()
    ask_vol_1 = scrapy.Field()
    ask_count_1 = scrapy.Field()


class IMEOptionItem(scrapy.Item):
    """IME commodity option data -> ime_options table"""

    item_type = scrapy.Field()  # Always 'ime_option'
    date = scrapy.Field()
    date_shamsi = scrapy.Field()
    contract_category = scrapy.Field()
    contract_category_sub = scrapy.Field()
    commodity = scrapy.Field()
    option_type = scrapy.Field()  # 'call' or 'put'
    price_strike = scrapy.Field()
    level_strike = scrapy.Field()
    contract_id = scrapy.Field()
    contract_code = scrapy.Field()
    contract_description = scrapy.Field()
    contract_size = scrapy.Field()
    date_end = scrapy.Field()
    day_remain = scrapy.Field()
    margin_initial = scrapy.Field()
    margin_required = scrapy.Field()
    interest_open = scrapy.Field()
    interest_open_change = scrapy.Field()
    interest_open_change_pct = scrapy.Field()
    settlement_price = scrapy.Field()  # py
    open = scrapy.Field()  # pf
    high = scrapy.Field()  # pmax
    low = scrapy.Field()  # pmin
    last = scrapy.Field()  # pl
    last_change = scrapy.Field()  # plc
    last_change_pct = scrapy.Field()  # plp
    trades = scrapy.Field()  # tno
    volume = scrapy.Field()  # tvol
    value = scrapy.Field()  # tval

    bid_price_1 = scrapy.Field()
    bid_vol_1 = scrapy.Field()
    ask_price_1 = scrapy.Field()
    ask_vol_1 = scrapy.Field()
    bid_price_2 = scrapy.Field()
    bid_vol_2 = scrapy.Field()
    ask_price_2 = scrapy.Field()
    ask_vol_2 = scrapy.Field()
    bid_price_3 = scrapy.Field()
    bid_vol_3 = scrapy.Field()
    ask_price_3 = scrapy.Field()
    ask_vol_3 = scrapy.Field()


class IMEFutureItem(scrapy.Item):
    """IME commodity futures data -> ime_futures table"""

    item_type = scrapy.Field()  # Always 'ime_future'
    date = scrapy.Field()
    date_shamsi = scrapy.Field()
    contract_code = scrapy.Field()
    contract_description = scrapy.Field()
    contract_size = scrapy.Field()
    contract_size_unit = scrapy.Field()
    date_end = scrapy.Field()
    day_remain = scrapy.Field()
    margin_initial = scrapy.Field()
    margin_maintenance = scrapy.Field()
    interest_open = scrapy.Field()
    interest_open_change = scrapy.Field()
    interest_open_change_pct = scrapy.Field()
    settlement_price = scrapy.Field()  # py
    open = scrapy.Field()  # pf
    high = scrapy.Field()  # pmax
    low = scrapy.Field()  # pmin
    last = scrapy.Field()  # pl
    last_change = scrapy.Field()  # plc
    last_change_pct = scrapy.Field()  # plp
    instant_settlement = scrapy.Field()  # pls
    trades = scrapy.Field()
    volume = scrapy.Field()
    value = scrapy.Field()
    real_buy_count = scrapy.Field()
    legal_buy_count = scrapy.Field()
    real_sell_count = scrapy.Field()
    legal_sell_count = scrapy.Field()

    bid_price_1 = scrapy.Field()
    bid_vol_1 = scrapy.Field()
    ask_price_1 = scrapy.Field()
    ask_vol_1 = scrapy.Field()
    bid_price_2 = scrapy.Field()
    bid_vol_2 = scrapy.Field()
    ask_price_2 = scrapy.Field()
    ask_vol_2 = scrapy.Field()
    bid_price_3 = scrapy.Field()
    bid_vol_3 = scrapy.Field()
    ask_price_3 = scrapy.Field()
    ask_vol_3 = scrapy.Field()


# ─── NEW ITEMS ────────────────────────────────────────────────────────────────


class MarketIndexItem(scrapy.Item):
    """Market index data -> market_indices table"""

    item_type = scrapy.Field()  # Always 'market_index'
    date = scrapy.Field()
    time = scrapy.Field()
    name = scrapy.Field()
    index_value = scrapy.Field()
    index_change = scrapy.Field()
    index_change_pct = scrapy.Field()
    min_value = scrapy.Field()
    max_value = scrapy.Field()
    market_value = scrapy.Field()
    trades = scrapy.Field()
    volume = scrapy.Field()
    value = scrapy.Field()
    state = scrapy.Field()


class ETFNavItem(scrapy.Item):
    """ETF NAV data -> etf_nav table"""

    item_type = scrapy.Field()  # Always 'etf_nav'
    ins_code = scrapy.Field()
    date = scrapy.Field()
    time = scrapy.Field()
    nav_issuance = scrapy.Field()
    nav_redemption = scrapy.Field()
    last_price = scrapy.Field()
    bubble_pct = scrapy.Field()
    fund_type = scrapy.Field()
    symbol = scrapy.Field()
    name_fa = scrapy.Field()


class IMECertificateItem(scrapy.Item):
    """IME deposit certificate data -> ime_certificates table"""

    item_type = scrapy.Field()  # Always 'ime_certificate'
    date = scrapy.Field()
    date_shamsi = scrapy.Field()
    cert_type = scrapy.Field()
    commodity = scrapy.Field()
    contract_code = scrapy.Field()
    contract_description = scrapy.Field()
    contract_size = scrapy.Field()
    contract_size_unit = scrapy.Field()
    isin = scrapy.Field()
    symbol = scrapy.Field()
    name = scrapy.Field()
    settlement_price = scrapy.Field()
    open = scrapy.Field()
    high = scrapy.Field()
    low = scrapy.Field()
    last = scrapy.Field()
    last_change = scrapy.Field()
    last_change_pct = scrapy.Field()
    close = scrapy.Field()
    trades = scrapy.Field()
    volume = scrapy.Field()
    value = scrapy.Field()

    # 5-level order book
    bid_price_1 = scrapy.Field()
    bid_vol_1 = scrapy.Field()
    ask_price_1 = scrapy.Field()
    ask_vol_1 = scrapy.Field()
    bid_price_2 = scrapy.Field()
    bid_vol_2 = scrapy.Field()
    ask_price_2 = scrapy.Field()
    ask_vol_2 = scrapy.Field()
    bid_price_3 = scrapy.Field()
    bid_vol_3 = scrapy.Field()
    ask_price_3 = scrapy.Field()
    ask_vol_3 = scrapy.Field()
    bid_price_4 = scrapy.Field()
    bid_vol_4 = scrapy.Field()
    ask_price_4 = scrapy.Field()
    ask_vol_4 = scrapy.Field()
    bid_price_5 = scrapy.Field()
    bid_vol_5 = scrapy.Field()
    ask_price_5 = scrapy.Field()
    ask_vol_5 = scrapy.Field()

    # Client type (type=2 only)
    real_buy_count = scrapy.Field()
    real_buy_volume = scrapy.Field()
    real_sell_count = scrapy.Field()
    real_sell_volume = scrapy.Field()
    legal_buy_count = scrapy.Field()
    legal_buy_volume = scrapy.Field()
    legal_sell_count = scrapy.Field()
    legal_sell_volume = scrapy.Field()


class IMEFundItem(scrapy.Item):
    """IME commodity fund data -> ime_funds table"""

    item_type = scrapy.Field()  # Always 'ime_fund'
    date = scrapy.Field()
    date_shamsi = scrapy.Field()
    isin = scrapy.Field()
    symbol = scrapy.Field()
    name = scrapy.Field()
    settlement_price = scrapy.Field()
    open = scrapy.Field()
    high = scrapy.Field()
    low = scrapy.Field()
    last = scrapy.Field()
    last_change = scrapy.Field()
    last_change_pct = scrapy.Field()
    close = scrapy.Field()
    trades = scrapy.Field()
    volume = scrapy.Field()
    value = scrapy.Field()

    # Client type
    real_buy_count = scrapy.Field()
    real_buy_volume = scrapy.Field()
    real_sell_count = scrapy.Field()
    real_sell_volume = scrapy.Field()
    legal_buy_count = scrapy.Field()
    legal_buy_volume = scrapy.Field()
    legal_sell_count = scrapy.Field()
    legal_sell_volume = scrapy.Field()

    # 5-level order book
    bid_price_1 = scrapy.Field()
    bid_vol_1 = scrapy.Field()
    ask_price_1 = scrapy.Field()
    ask_vol_1 = scrapy.Field()
    bid_price_2 = scrapy.Field()
    bid_vol_2 = scrapy.Field()
    ask_price_2 = scrapy.Field()
    ask_vol_2 = scrapy.Field()
    bid_price_3 = scrapy.Field()
    bid_vol_3 = scrapy.Field()
    ask_price_3 = scrapy.Field()
    ask_vol_3 = scrapy.Field()
    bid_price_4 = scrapy.Field()
    bid_vol_4 = scrapy.Field()
    ask_price_4 = scrapy.Field()
    ask_vol_4 = scrapy.Field()
    bid_price_5 = scrapy.Field()
    bid_vol_5 = scrapy.Field()
    ask_price_5 = scrapy.Field()
    ask_vol_5 = scrapy.Field()


class IMEForwardItem(scrapy.Item):
    """IME forward contract data -> ime_forwards table"""

    item_type = scrapy.Field()  # Always 'ime_forward'
    date = scrapy.Field()
    date_shamsi = scrapy.Field()
    ins_code = scrapy.Field()
    isin = scrapy.Field()
    symbol = scrapy.Field()
    name = scrapy.Field()
    settlement_price = scrapy.Field()
    open = scrapy.Field()
    high = scrapy.Field()
    low = scrapy.Field()
    last = scrapy.Field()
    last_change = scrapy.Field()
    last_change_pct = scrapy.Field()
    close = scrapy.Field()
    trades = scrapy.Field()
    volume = scrapy.Field()
    value = scrapy.Field()

    # Client type
    real_buy_count = scrapy.Field()
    real_buy_volume = scrapy.Field()
    real_sell_count = scrapy.Field()
    real_sell_volume = scrapy.Field()
    legal_buy_count = scrapy.Field()
    legal_buy_volume = scrapy.Field()
    legal_sell_count = scrapy.Field()
    legal_sell_volume = scrapy.Field()

    # 5-level order book
    bid_price_1 = scrapy.Field()
    bid_vol_1 = scrapy.Field()
    ask_price_1 = scrapy.Field()
    ask_vol_1 = scrapy.Field()
    bid_price_2 = scrapy.Field()
    bid_vol_2 = scrapy.Field()
    ask_price_2 = scrapy.Field()
    ask_vol_2 = scrapy.Field()
    bid_price_3 = scrapy.Field()
    bid_vol_3 = scrapy.Field()
    ask_price_3 = scrapy.Field()
    ask_vol_3 = scrapy.Field()
    bid_price_4 = scrapy.Field()
    bid_vol_4 = scrapy.Field()
    ask_price_4 = scrapy.Field()
    ask_vol_4 = scrapy.Field()
    bid_price_5 = scrapy.Field()
    bid_vol_5 = scrapy.Field()
    ask_price_5 = scrapy.Field()
    ask_vol_5 = scrapy.Field()


class MarketPriceItem(scrapy.Item):
    """Gold/currency/commodity/crypto price -> market_prices table"""

    item_type = scrapy.Field()  # Always 'market_price'
    symbol = scrapy.Field()
    name_fa = scrapy.Field()
    market_type = scrapy.Field()  # 'gold', 'currency', 'commodity', 'crypto'
    date = scrapy.Field()
    time = scrapy.Field()
    price = scrapy.Field()
    price_toman = scrapy.Field()
    change_value = scrapy.Field()
    change_pct = scrapy.Field()
    unit = scrapy.Field()
    market_cap = scrapy.Field()
    icon_url = scrapy.Field()


class IMEPhysicalTradeItem(scrapy.Item):
    """IME physical trade data -> ime_physical_trades table"""

    item_type = scrapy.Field()  # Always 'ime_physical'
    date_trade = scrapy.Field()
    date_trade_shamsi = scrapy.Field()
    symbol = scrapy.Field()
    name = scrapy.Field()
    category_id = scrapy.Field()
    code_offer = scrapy.Field()
    market_hall = scrapy.Field()
    producer = scrapy.Field()
    supplier = scrapy.Field()
    broker = scrapy.Field()
    contract_type = scrapy.Field()
    settlement_type = scrapy.Field()
    date_settlement = scrapy.Field()
    date_delivery = scrapy.Field()
    location_delivery = scrapy.Field()
    price_base_offer = scrapy.Field()
    price_min = scrapy.Field()
    price_max = scrapy.Field()
    price_last = scrapy.Field()
    volume_offer = scrapy.Field()
    volume_contract = scrapy.Field()
    demand = scrapy.Field()
    value = scrapy.Field()
    currency = scrapy.Field()
    packaging_type = scrapy.Field()
    unit = scrapy.Field()


class ShareholderItem(scrapy.Item):
    """Shareholder data -> shareholders table"""

    item_type = scrapy.Field()  # Always 'shareholder'
    ins_code = scrapy.Field()
    symbol = scrapy.Field()
    date = scrapy.Field()
    shareholder_id = scrapy.Field()
    name = scrapy.Field()
    volume = scrapy.Field()
    percent = scrapy.Field()
    change = scrapy.Field()


class CodalAnnouncementItem(scrapy.Item):
    """Codal announcement data -> codal_announcements table"""

    item_type = scrapy.Field()  # Always 'codal'
    symbol = scrapy.Field()
    company_name = scrapy.Field()
    title = scrapy.Field()
    code = scrapy.Field()
    category = scrapy.Field()
    date_title = scrapy.Field()
    date_send = scrapy.Field()
    time_send = scrapy.Field()
    date_publish = scrapy.Field()
    time_publish = scrapy.Field()
    link = scrapy.Field()
    link_pdf = scrapy.Field()
    link_excel = scrapy.Field()
    link_attachment = scrapy.Field()
    # Financial statement scraper fields
    letter_type = scrapy.Field()
    letter_serial = scrapy.Field()
    has_excel = scrapy.Field()
    has_pdf = scrapy.Field()


class FinancialStatementItem(scrapy.Item):
    """Parsed financial statement -> financial_statements table"""

    item_type = scrapy.Field()  # Always 'financial_statement'
    codal_announcement_id = scrapy.Field()
    symbol = scrapy.Field()
    company_name = scrapy.Field()
    statement_type = scrapy.Field()  # income_statement, balance_sheet, etc.
    period_end_date = scrapy.Field()  # Gregorian date object
    period_end_jalali = scrapy.Field()  # e.g. "1404/09/30"
    fiscal_year_end = scrapy.Field()
    fiscal_year_end_jalali = scrapy.Field()
    is_audited = scrapy.Field()
    is_consolidated = scrapy.Field()
    period_months = scrapy.Field()
    # Hot fields
    revenue = scrapy.Field()
    cost_of_revenue = scrapy.Field()
    gross_profit = scrapy.Field()
    operating_income = scrapy.Field()
    net_income = scrapy.Field()
    total_assets = scrapy.Field()
    total_liabilities = scrapy.Field()
    total_equity = scrapy.Field()
    eps = scrapy.Field()
    # Long tail
    line_items = scrapy.Field()


class TickTradeItem(scrapy.Item):
    """Tick trade data -> tick_trades table"""

    item_type = scrapy.Field()  # Always 'tick_trade'
    ins_code = scrapy.Field()
    symbol = scrapy.Field()
    date = scrapy.Field()
    row_num = scrapy.Field()
    time = scrapy.Field()
    price = scrapy.Field()
    volume = scrapy.Field()
    canceled = scrapy.Field()
