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
    type = scrapy.Field()           # 'stock' or 'fund'
    sector_id = scrapy.Field()      # cs_id from BrsApi
    sector_name_fa = scrapy.Field()
    sector_name_en = scrapy.Field()
    base_volume = scrapy.Field()    # bvol from BrsApi
    total_shares = scrapy.Field()   # z from BrsApi
    is_active = scrapy.Field()


class DailyPriceItem(scrapy.Item):
    """Daily OHLCV + context -> merges into daily_ohlcv table"""
    item_type = scrapy.Field()  # Always 'daily_price'
    ins_code = scrapy.Field()
    date = scrapy.Field()       # date object or YYYYMMDD int

    # OHLCV
    open = scrapy.Field()       # pf
    high = scrapy.Field()       # pmax
    low = scrapy.Field()        # pmin
    close = scrapy.Field()      # pc
    last = scrapy.Field()       # pl
    volume = scrapy.Field()     # tvol
    value = scrapy.Field()      # tval
    trades = scrapy.Field()     # tno
    adj_close = scrapy.Field()

    # Price context
    price_yesterday = scrapy.Field()    # py
    close_change = scrapy.Field()       # pcc
    close_change_pct = scrapy.Field()   # pcp
    last_change = scrapy.Field()        # plc
    last_change_pct = scrapy.Field()    # plp
    threshold_min = scrapy.Field()      # tmin
    threshold_max = scrapy.Field()      # tmax


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
