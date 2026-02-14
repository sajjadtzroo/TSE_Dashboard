"""
Scrapy Item definitions for TSETMC data
Defines the structure of scraped data before pipeline processing
"""
import scrapy


class CompanyItem(scrapy.Item):
    """Company/Instrument master data"""
    item_type = scrapy.Field()  # Always 'company'
    ins_code = scrapy.Field()
    symbol = scrapy.Field()
    name_fa = scrapy.Field()
    name_en = scrapy.Field()
    isin = scrapy.Field()
    sector_name_fa = scrapy.Field()
    sector_name_en = scrapy.Field()
    is_active = scrapy.Field()


class DailyPriceItem(scrapy.Item):
    """Daily OHLCV price data"""
    item_type = scrapy.Field()  # Always 'daily_price'
    ins_code = scrapy.Field()
    d_even = scrapy.Field()

    # OHLC prices
    price_first = scrapy.Field()
    price_last = scrapy.Field()
    price_min = scrapy.Field()
    price_max = scrapy.Field()

    # Price changes
    price_yesterday = scrapy.Field()
    price_change = scrapy.Field()
    price_change_percent = scrapy.Field()

    # Volume and value
    q_tot_tran_5j = scrapy.Field()
    q_tot_cap = scrapy.Field()
    z_tot_tran = scrapy.Field()

    # Additional
    adj_close = scrapy.Field()


class FinancialIndicatorItem(scrapy.Item):
    """Financial indicators and metrics"""
    item_type = scrapy.Field()  # Always 'financial_indicator'
    ins_code = scrapy.Field()
    d_even = scrapy.Field()

    # Valuation
    market_cap = scrapy.Field()
    pe_ratio = scrapy.Field()
    eps = scrapy.Field()
    estimated_eps = scrapy.Field()

    # Price ranges
    min_week = scrapy.Field()
    max_week = scrapy.Field()
    min_year = scrapy.Field()
    max_year = scrapy.Field()

    # Thresholds
    price_threshold_min = scrapy.Field()
    price_threshold_max = scrapy.Field()

    # Additional
    nav = scrapy.Field()
    total_shares = scrapy.Field()


class ClientTypeItem(scrapy.Item):
    """Legal vs. Real trader activity"""
    item_type = scrapy.Field()  # Always 'client_type'
    ins_code = scrapy.Field()
    d_even = scrapy.Field()

    # Real (individual) traders
    real_buyer_count = scrapy.Field()
    real_buyer_volume = scrapy.Field()
    real_buyer_value = scrapy.Field()
    real_seller_count = scrapy.Field()
    real_seller_volume = scrapy.Field()
    real_seller_value = scrapy.Field()

    # Legal (institutional) traders
    legal_buyer_count = scrapy.Field()
    legal_buyer_volume = scrapy.Field()
    legal_buyer_value = scrapy.Field()
    legal_seller_count = scrapy.Field()
    legal_seller_volume = scrapy.Field()
    legal_seller_value = scrapy.Field()


class IntradayTradeItem(scrapy.Item):
    """Tick-by-tick trade data"""
    item_type = scrapy.Field()  # Always 'intraday_trade'
    ins_code = scrapy.Field()
    d_even = scrapy.Field()
    trade_time = scrapy.Field()
    price = scrapy.Field()
    volume = scrapy.Field()
    value = scrapy.Field()


class OrderBookItem(scrapy.Item):
    """Order book depth snapshot"""
    item_type = scrapy.Field()  # Always 'order_book'
    ins_code = scrapy.Field()
    d_even = scrapy.Field()
    snapshot_time = scrapy.Field()

    # Buy side (5 levels)
    buy_price_1 = scrapy.Field()
    buy_volume_1 = scrapy.Field()
    buy_count_1 = scrapy.Field()
    buy_price_2 = scrapy.Field()
    buy_volume_2 = scrapy.Field()
    buy_count_2 = scrapy.Field()
    buy_price_3 = scrapy.Field()
    buy_volume_3 = scrapy.Field()
    buy_count_3 = scrapy.Field()
    buy_price_4 = scrapy.Field()
    buy_volume_4 = scrapy.Field()
    buy_count_4 = scrapy.Field()
    buy_price_5 = scrapy.Field()
    buy_volume_5 = scrapy.Field()
    buy_count_5 = scrapy.Field()

    # Sell side (5 levels)
    sell_price_1 = scrapy.Field()
    sell_volume_1 = scrapy.Field()
    sell_count_1 = scrapy.Field()
    sell_price_2 = scrapy.Field()
    sell_volume_2 = scrapy.Field()
    sell_count_2 = scrapy.Field()
    sell_price_3 = scrapy.Field()
    sell_volume_3 = scrapy.Field()
    sell_count_3 = scrapy.Field()
    sell_price_4 = scrapy.Field()
    sell_volume_4 = scrapy.Field()
    sell_count_4 = scrapy.Field()
    sell_price_5 = scrapy.Field()
    sell_volume_5 = scrapy.Field()
    sell_count_5 = scrapy.Field()
