"""
Data processing pipelines for TSETMC scraper
Handles validation, cleaning, and database persistence to PostgreSQL
"""
import logging
from datetime import datetime, timezone, date
from itemadapter import ItemAdapter
from scrapy.exceptions import DropItem

from sqlalchemy.dialects.postgresql import insert

from database.connection import get_db_manager
from database.models import (
    Security, DailyOHLCV, OrderBook, Option, IMEOption, IMEFuture,
    ETFNav, TickTrade, Shareholder, CodalAnnouncement, MarketPrice,
    MarketIndex, IMECertificate, IMEFund, IMEForward, IMEPhysicalTrade,
    FinancialStatement,
)
from tsetmc_scraper.utils import (
    safe_float, safe_int, clean_text, validate_ins_code,
    persian_to_english_numbers
)
from config.settings import DATABASE_URL

logger = logging.getLogger(__name__)

# Item types that use contract_code/isin instead of ins_code
_STANDALONE_TYPES = {
    'ime_option', 'ime_future', 'ime_certificate', 'ime_fund',
    'ime_forward', 'ime_physical', 'market_index', 'codal',
    'financial_statement',
}

# Item types that use ins_code for security lookup
_SECURITY_FK_TYPES = {
    'daily_price', 'financial_indicator', 'client_type', 'order_book',
    'etf_nav', 'tick_trade', 'shareholder',
}


class ValidationPipeline:
    """Validate data integrity before processing"""

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        item_type = adapter.get('item_type')

        # Standalone items: validate their own key fields
        if item_type in ('ime_option', 'ime_future', 'ime_certificate'):
            if not adapter.get('contract_code'):
                raise DropItem(f"Missing contract_code for {item_type}")
            if not adapter.get('date'):
                raise DropItem(f"Missing date for {item_type}")
            return item

        if item_type in ('ime_fund', 'ime_forward'):
            if not adapter.get('isin'):
                raise DropItem(f"Missing isin for {item_type}")
            if not adapter.get('date'):
                raise DropItem(f"Missing date for {item_type}")
            return item

        if item_type == 'ime_physical':
            if not adapter.get('code_offer'):
                raise DropItem("Missing code_offer for ime_physical")
            if not adapter.get('date_trade'):
                raise DropItem("Missing date_trade for ime_physical")
            return item

        if item_type == 'market_index':
            if not adapter.get('name'):
                raise DropItem("Missing name for market_index")
            return item

        if item_type == 'codal':
            if not adapter.get('code'):
                raise DropItem("Missing code for codal announcement")
            return item

        if item_type == 'financial_statement':
            if not adapter.get('symbol'):
                raise DropItem("Missing symbol for financial_statement")
            if not adapter.get('statement_type'):
                raise DropItem("Missing statement_type for financial_statement")
            if not adapter.get('period_end_date'):
                raise DropItem("Missing period_end_date for financial_statement")
            return item

        if item_type == 'market_price':
            if not adapter.get('symbol'):
                raise DropItem("Missing symbol for market_price")
            return item

        if item_type == 'etf_nav':
            if not adapter.get('symbol'):
                raise DropItem("Missing symbol for etf_nav")
            if not adapter.get('date'):
                raise DropItem("Missing date for etf_nav")
            return item

        # Items that need ins_code
        ins_code = adapter.get('ins_code')
        if item_type != 'company' and not validate_ins_code(ins_code):
            raise DropItem(f"Invalid ins_code: {ins_code}")

        if item_type in ('daily_price', 'financial_indicator', 'client_type', 'option'):
            if not adapter.get('date'):
                raise DropItem(f"Missing date for {item_type}")

        if item_type == 'tick_trade':
            if not adapter.get('date'):
                raise DropItem("Missing date for tick_trade")
            if adapter.get('row_num') is None:
                raise DropItem("Missing row_num for tick_trade")

        if item_type == 'shareholder':
            if not adapter.get('name'):
                raise DropItem("Missing shareholder name")

        return item


class DataCleaningPipeline:
    """Clean and normalize data"""

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        item_type = adapter.get('item_type')

        if item_type == 'daily_price':
            self._clean_daily_price(adapter)
        elif item_type == 'financial_indicator':
            self._clean_financial_indicator(adapter)
        elif item_type == 'client_type':
            self._clean_client_type(adapter)
        elif item_type == 'company':
            self._clean_company(adapter)
        elif item_type == 'order_book':
            self._clean_order_book(adapter)
        elif item_type == 'option':
            self._clean_option(adapter)
        elif item_type == 'ime_option':
            self._clean_ime_option(adapter)
        elif item_type == 'ime_future':
            self._clean_ime_future(adapter)
        elif item_type == 'market_index':
            self._clean_market_index(adapter)
        elif item_type == 'etf_nav':
            self._clean_etf_nav(adapter)
        elif item_type == 'ime_certificate':
            self._clean_ime_certificate(adapter)
        elif item_type == 'ime_fund':
            self._clean_ime_fund(adapter)
        elif item_type == 'ime_forward':
            self._clean_ime_forward(adapter)
        elif item_type == 'market_price':
            self._clean_market_price(adapter)
        elif item_type == 'ime_physical':
            self._clean_ime_physical(adapter)
        elif item_type == 'shareholder':
            self._clean_shareholder(adapter)
        elif item_type == 'codal':
            self._clean_codal(adapter)
        elif item_type == 'financial_statement':
            self._clean_financial_statement(adapter)
        elif item_type == 'tick_trade':
            self._clean_tick_trade(adapter)

        return item

    def _clean_daily_price(self, adapter):
        for field in ['open', 'high', 'low', 'close', 'last', 'adj_close',
                      'price_yesterday', 'close_change', 'close_change_pct',
                      'last_change', 'last_change_pct', 'threshold_min', 'threshold_max']:
            adapter[field] = safe_float(adapter.get(field))

        for field in ['volume', 'value', 'trades']:
            adapter[field] = safe_int(adapter.get(field))

        adapter['ins_code'] = safe_int(adapter.get('ins_code'))

        # Ensure date is a date object
        d = adapter.get('date')
        if isinstance(d, int):
            d_str = str(d)
            if len(d_str) == 8:
                adapter['date'] = date(int(d_str[:4]), int(d_str[4:6]), int(d_str[6:8]))

    def _clean_financial_indicator(self, adapter):
        for field in ['pe_ratio', 'eps', 'estimated_eps', 'nav']:
            adapter[field] = safe_float(adapter.get(field))
        for field in ['market_cap']:
            adapter[field] = safe_int(adapter.get(field))
        adapter['ins_code'] = safe_int(adapter.get('ins_code'))

    def _clean_client_type(self, adapter):
        for field in ['real_buy_count', 'real_buy_volume',
                      'real_sell_count', 'real_sell_volume',
                      'legal_buy_count', 'legal_buy_volume',
                      'legal_sell_count', 'legal_sell_volume']:
            adapter[field] = safe_int(adapter.get(field), default=0)
        adapter['ins_code'] = safe_int(adapter.get('ins_code'))

    def _clean_company(self, adapter):
        for field in ['symbol', 'name_fa', 'name_en', 'isin',
                      'sector_name_fa', 'sector_name_en']:
            adapter[field] = clean_text(adapter.get(field))
        adapter['ins_code'] = safe_int(adapter.get('ins_code'))

        is_active = adapter.get('is_active')
        if isinstance(is_active, str):
            adapter['is_active'] = is_active.lower() in ('true', '1', 'yes')
        else:
            adapter['is_active'] = bool(is_active)

    def _clean_option(self, adapter):
        adapter['ins_code'] = safe_int(adapter.get('ins_code'))
        for field in ['open', 'high', 'low', 'close', 'last', 'yesterday',
                      'close_change', 'strike_price', 'threshold_min', 'threshold_max']:
            adapter[field] = safe_float(adapter.get(field))
        for field in ['volume', 'value', 'base_volume']:
            adapter[field] = safe_int(adapter.get(field))
        adapter['trades'] = safe_int(adapter.get('trades'))
        adapter['bid_price_1'] = safe_float(adapter.get('bid_price_1'))
        adapter['ask_price_1'] = safe_float(adapter.get('ask_price_1'))
        for field in ['bid_vol_1', 'bid_count_1', 'ask_vol_1', 'ask_count_1']:
            adapter[field] = safe_int(adapter.get(field))
        for field in ['symbol', 'name_fa', 'isin', 'underlying']:
            adapter[field] = clean_text(adapter.get(field))

    def _clean_order_book(self, adapter):
        adapter['ins_code'] = safe_int(adapter.get('ins_code'))
        for level in range(1, 6):
            for prefix in ['bid_price', 'ask_price']:
                adapter[f'{prefix}_{level}'] = safe_float(adapter.get(f'{prefix}_{level}'))
            for prefix in ['bid_vol', 'ask_vol']:
                adapter[f'{prefix}_{level}'] = safe_int(adapter.get(f'{prefix}_{level}'))
            for prefix in ['bid_count', 'ask_count']:
                adapter[f'{prefix}_{level}'] = safe_int(adapter.get(f'{prefix}_{level}'))

    def _clean_ime_option(self, adapter):
        for field in ['price_strike', 'settlement_price', 'open', 'high', 'low',
                       'last', 'last_change', 'value', 'margin_initial', 'margin_required']:
            adapter[field] = safe_int(adapter.get(field))
        for field in ['last_change_pct', 'interest_open_change_pct']:
            adapter[field] = safe_float(adapter.get(field))
        for field in ['trades', 'volume', 'interest_open', 'interest_open_change',
                       'contract_id', 'contract_size', 'level_strike', 'day_remain']:
            adapter[field] = safe_int(adapter.get(field))
        for level in range(1, 4):
            adapter[f'bid_price_{level}'] = safe_int(adapter.get(f'bid_price_{level}'))
            adapter[f'bid_vol_{level}'] = safe_int(adapter.get(f'bid_vol_{level}'))
            adapter[f'ask_price_{level}'] = safe_int(adapter.get(f'ask_price_{level}'))
            adapter[f'ask_vol_{level}'] = safe_int(adapter.get(f'ask_vol_{level}'))
        adapter['contract_code'] = clean_text(adapter.get('contract_code'))
        adapter['contract_description'] = clean_text(adapter.get('contract_description'))

    def _clean_ime_future(self, adapter):
        for field in ['settlement_price', 'open', 'high', 'low', 'last',
                       'last_change', 'value', 'margin_initial', 'margin_maintenance']:
            adapter[field] = safe_int(adapter.get(field))
        for field in ['last_change_pct', 'interest_open_change_pct', 'instant_settlement']:
            adapter[field] = safe_float(adapter.get(field))
        for field in ['trades', 'volume', 'interest_open', 'interest_open_change',
                       'contract_size', 'day_remain', 'real_buy_count', 'legal_buy_count',
                       'real_sell_count', 'legal_sell_count']:
            adapter[field] = safe_int(adapter.get(field))
        for level in range(1, 4):
            adapter[f'bid_price_{level}'] = safe_int(adapter.get(f'bid_price_{level}'))
            adapter[f'bid_vol_{level}'] = safe_int(adapter.get(f'bid_vol_{level}'))
            adapter[f'ask_price_{level}'] = safe_int(adapter.get(f'ask_price_{level}'))
            adapter[f'ask_vol_{level}'] = safe_int(adapter.get(f'ask_vol_{level}'))
        adapter['contract_code'] = clean_text(adapter.get('contract_code'))
        adapter['contract_description'] = clean_text(adapter.get('contract_description'))

    # ─── NEW CLEANERS ─────────────────────────────────────────────────────────

    def _clean_market_index(self, adapter):
        adapter['name'] = clean_text(adapter.get('name'))
        for field in ['index_value', 'index_change', 'index_change_pct',
                      'min_value', 'max_value', 'market_value', 'value']:
            adapter[field] = safe_float(adapter.get(field))
        for field in ['trades', 'volume']:
            adapter[field] = safe_int(adapter.get(field))

    def _clean_etf_nav(self, adapter):
        adapter['ins_code'] = safe_int(adapter.get('ins_code'))
        for field in ['nav_issuance', 'nav_redemption', 'last_price', 'bubble_pct']:
            adapter[field] = safe_float(adapter.get(field))
        adapter['symbol'] = clean_text(adapter.get('symbol'))
        adapter['name_fa'] = clean_text(adapter.get('name_fa'))

    def _clean_ime_certificate(self, adapter):
        for field in ['settlement_price', 'open', 'high', 'low', 'last',
                      'last_change', 'close', 'value']:
            adapter[field] = safe_int(adapter.get(field))
        adapter['last_change_pct'] = safe_float(adapter.get('last_change_pct'))
        for field in ['trades', 'volume', 'contract_size', 'cert_type']:
            adapter[field] = safe_int(adapter.get(field))
        for lvl in range(1, 6):
            adapter[f'bid_price_{lvl}'] = safe_int(adapter.get(f'bid_price_{lvl}'))
            adapter[f'bid_vol_{lvl}'] = safe_int(adapter.get(f'bid_vol_{lvl}'))
            adapter[f'ask_price_{lvl}'] = safe_int(adapter.get(f'ask_price_{lvl}'))
            adapter[f'ask_vol_{lvl}'] = safe_int(adapter.get(f'ask_vol_{lvl}'))
        for field in ['real_buy_count', 'real_buy_volume', 'real_sell_count', 'real_sell_volume',
                      'legal_buy_count', 'legal_buy_volume', 'legal_sell_count', 'legal_sell_volume']:
            adapter[field] = safe_int(adapter.get(field))
        adapter['contract_code'] = clean_text(adapter.get('contract_code'))

    def _clean_ime_fund(self, adapter):
        for field in ['settlement_price', 'open', 'high', 'low', 'last',
                      'last_change', 'close', 'value']:
            adapter[field] = safe_int(adapter.get(field))
        adapter['last_change_pct'] = safe_float(adapter.get('last_change_pct'))
        for field in ['trades', 'volume']:
            adapter[field] = safe_int(adapter.get(field))
        for field in ['real_buy_count', 'real_buy_volume', 'real_sell_count', 'real_sell_volume',
                      'legal_buy_count', 'legal_buy_volume', 'legal_sell_count', 'legal_sell_volume']:
            adapter[field] = safe_int(adapter.get(field))
        for lvl in range(1, 6):
            adapter[f'bid_price_{lvl}'] = safe_int(adapter.get(f'bid_price_{lvl}'))
            adapter[f'bid_vol_{lvl}'] = safe_int(adapter.get(f'bid_vol_{lvl}'))
            adapter[f'ask_price_{lvl}'] = safe_int(adapter.get(f'ask_price_{lvl}'))
            adapter[f'ask_vol_{lvl}'] = safe_int(adapter.get(f'ask_vol_{lvl}'))
        adapter['isin'] = clean_text(adapter.get('isin'))

    def _clean_ime_forward(self, adapter):
        for field in ['settlement_price', 'open', 'high', 'low', 'last',
                      'last_change', 'close', 'value']:
            adapter[field] = safe_int(adapter.get(field))
        adapter['last_change_pct'] = safe_float(adapter.get('last_change_pct'))
        for field in ['trades', 'volume']:
            adapter[field] = safe_int(adapter.get(field))
        for field in ['real_buy_count', 'real_buy_volume', 'real_sell_count', 'real_sell_volume',
                      'legal_buy_count', 'legal_buy_volume', 'legal_sell_count', 'legal_sell_volume']:
            adapter[field] = safe_int(adapter.get(field))
        for lvl in range(1, 6):
            adapter[f'bid_price_{lvl}'] = safe_int(adapter.get(f'bid_price_{lvl}'))
            adapter[f'bid_vol_{lvl}'] = safe_int(adapter.get(f'bid_vol_{lvl}'))
            adapter[f'ask_price_{lvl}'] = safe_int(adapter.get(f'ask_price_{lvl}'))
            adapter[f'ask_vol_{lvl}'] = safe_int(adapter.get(f'ask_vol_{lvl}'))
        adapter['isin'] = clean_text(adapter.get('isin'))

    def _clean_market_price(self, adapter):
        for field in ['price', 'price_toman', 'change_value', 'change_pct', 'market_cap']:
            adapter[field] = safe_float(adapter.get(field))
        adapter['symbol'] = clean_text(adapter.get('symbol'))
        adapter['name_fa'] = clean_text(adapter.get('name_fa'))

    def _clean_ime_physical(self, adapter):
        for field in ['price_base_offer', 'price_min', 'price_max', 'price_last',
                      'volume_offer', 'volume_contract', 'demand', 'value']:
            adapter[field] = safe_int(adapter.get(field))
        adapter['category_id'] = safe_int(adapter.get('category_id'))
        adapter['code_offer'] = clean_text(adapter.get('code_offer'))

    def _clean_shareholder(self, adapter):
        adapter['ins_code'] = safe_int(adapter.get('ins_code'))
        adapter['volume'] = safe_int(adapter.get('volume'))
        adapter['change'] = safe_int(adapter.get('change'))
        adapter['percent'] = safe_float(adapter.get('percent'))
        adapter['name'] = clean_text(adapter.get('name'))

    def _clean_codal(self, adapter):
        adapter['category'] = safe_int(adapter.get('category'))
        adapter['code'] = clean_text(adapter.get('code'))
        adapter['symbol'] = clean_text(adapter.get('symbol'))
        adapter['letter_type'] = safe_int(adapter.get('letter_type'))
        if 'letter_serial' in adapter:
            adapter['letter_serial'] = clean_text(adapter.get('letter_serial'))

    def _clean_financial_statement(self, adapter):
        adapter['symbol'] = clean_text(adapter.get('symbol'))
        adapter['company_name'] = clean_text(adapter.get('company_name'))
        for field in ['revenue', 'cost_of_revenue', 'gross_profit', 'operating_income',
                      'net_income', 'total_assets', 'total_liabilities', 'total_equity']:
            adapter[field] = safe_int(adapter.get(field))
        adapter['eps'] = safe_float(adapter.get('eps'))
        adapter['period_months'] = safe_int(adapter.get('period_months'))
        adapter['codal_announcement_id'] = safe_int(adapter.get('codal_announcement_id'))
        # Ensure line_items is a dict
        if not isinstance(adapter.get('line_items'), dict):
            adapter['line_items'] = {}

    def _clean_tick_trade(self, adapter):
        adapter['ins_code'] = safe_int(adapter.get('ins_code'))
        adapter['row_num'] = safe_int(adapter.get('row_num'))
        adapter['price'] = safe_float(adapter.get('price'))
        adapter['volume'] = safe_int(adapter.get('volume'))


class DatabasePipeline:
    """Persist data to PostgreSQL using bulk upserts"""

    BULK_FLUSH_SIZE = 500

    def __init__(self):
        self.db_manager = None
        self.session = None
        self.buffers = {}
        self.items_processed = 0
        self.items_flushed = 0
        # ins_code -> security_id cache
        self._sec_cache = {}
        # (symbol, market_type) -> security_id cache for non-TSE entities
        self._market_sec_cache = {}

    def open_spider(self, spider):
        logger.info(f"Opening database connection for {spider.name}")
        self.db_manager = get_db_manager(DATABASE_URL)
        self.session = self.db_manager.get_scoped_session()
        self.buffers = {}
        self.items_processed = 0
        self.items_flushed = 0
        self._load_security_cache()

    def _load_security_cache(self):
        """Load ins_code -> security_id and (symbol, market_type) -> security_id mappings."""
        try:
            rows = self.session.query(
                Security.ins_code, Security.security_id, Security.symbol, Security.market_type
            ).all()
            for ins_code, sec_id, symbol, market_type in rows:
                if ins_code is not None:
                    self._sec_cache[ins_code] = sec_id
                if market_type != 'tse':
                    self._market_sec_cache[(symbol, market_type)] = sec_id
            logger.info(f"Loaded security cache: {len(self._sec_cache)} TSE + {len(self._market_sec_cache)} market entries")
        except Exception as e:
            logger.warning(f"Could not load security cache: {e}")
            self._sec_cache = {}
            self._market_sec_cache = {}

    def _resolve_security_id(self, ins_code):
        """Resolve ins_code to security_id, creating a stub if needed."""
        sec_id = self._sec_cache.get(ins_code)
        if sec_id:
            return sec_id

        # Validate before creating stub
        if not validate_ins_code(ins_code):
            logger.warning(f"Invalid ins_code, skipping stub creation: {ins_code}")
            return None

        # Try DB lookup first (another spider may have inserted it)
        row = self.session.query(Security.security_id).filter(
            Security.ins_code == ins_code
        ).one_or_none()
        if row:
            self._sec_cache[ins_code] = row[0]
            return row[0]

        # Create a stub security record (flush instead of commit — let the
        # buffer flush handle the actual commit)
        stmt = insert(Security.__table__).values(
            ins_code=ins_code,
            symbol=str(ins_code),
            market_type='tse',
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        ).on_conflict_do_nothing(index_elements=['ins_code'])
        self.session.execute(stmt)
        self.session.flush()

        row = self.session.query(Security.security_id).filter(
            Security.ins_code == ins_code
        ).one_or_none()
        if row:
            self._sec_cache[ins_code] = row[0]
            return row[0]
        return None

    def _resolve_market_security_id(self, symbol, market_type, name_fa=None):
        """Resolve (symbol, market_type) to security_id for non-TSE entities."""
        key = (symbol, market_type)
        sec_id = self._market_sec_cache.get(key)
        if sec_id:
            return sec_id

        # Upsert the non-TSE security entity
        now = datetime.now(timezone.utc)
        stmt = insert(Security.__table__).values(
            ins_code=None,
            symbol=symbol,
            name_fa=name_fa or symbol,
            market_type=market_type,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        # Use symbol + market_type composite to find existing
        # Since ins_code is NULL, we can't use ins_code conflict
        # Try to find existing first
        existing = self.session.query(Security.security_id).filter(
            Security.symbol == symbol,
            Security.market_type == market_type,
        ).one_or_none()

        if existing:
            self._market_sec_cache[key] = existing[0]
            return existing[0]

        # Insert new
        try:
            self.session.execute(
                Security.__table__.insert().values(
                    symbol=symbol,
                    name_fa=name_fa or symbol,
                    market_type=market_type,
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                )
            )
            self.session.commit()
        except Exception:
            self.session.rollback()

        row = self.session.query(Security.security_id).filter(
            Security.symbol == symbol,
            Security.market_type == market_type,
        ).one_or_none()
        if row:
            self._market_sec_cache[key] = row[0]
            return row[0]
        return None

    def close_spider(self, spider):
        try:
            for item_type in list(self.buffers.keys()):
                self._flush_buffer(item_type)

            if self.session:
                self.session.commit()
                self.session.close()

            logger.info(f"Database pipeline stats - Processed: {self.items_processed}, "
                       f"Flushed: {self.items_flushed}")
        except Exception as e:
            logger.error(f"Error closing database session: {e}")

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        item_type = adapter.get('item_type')

        row = {k: v for k, v in adapter.items() if k != 'item_type'}

        if item_type not in self.buffers:
            self.buffers[item_type] = []
        self.buffers[item_type].append(row)
        self.items_processed += 1

        if len(self.buffers[item_type]) >= self.BULK_FLUSH_SIZE:
            self._flush_buffer(item_type)

        return item

    def _flush_buffer(self, item_type):
        buffer = self.buffers.get(item_type, [])
        if not buffer:
            return

        try:
            flush_map = {
                'company': self._flush_companies,
                'daily_price': self._flush_daily_prices,
                'financial_indicator': self._flush_financial_indicators,
                'client_type': self._flush_client_types,
                'order_book': self._flush_order_books,
                'option': self._flush_options,
                'ime_option': self._flush_ime_options,
                'ime_future': self._flush_ime_futures,
                'market_index': self._flush_market_indices,
                'etf_nav': self._flush_etf_nav,
                'ime_certificate': self._flush_ime_certificates,
                'ime_fund': self._flush_ime_funds,
                'ime_forward': self._flush_ime_forwards,
                'market_price': self._flush_market_prices,
                'ime_physical': self._flush_ime_physical,
                'shareholder': self._flush_shareholders,
                'codal': self._flush_codal,
                'financial_statement': self._flush_financial_statements,
                'tick_trade': self._flush_tick_trades,
            }

            handler = flush_map.get(item_type)
            if not handler:
                logger.warning(f"Unknown item_type: {item_type}")
                self.buffers[item_type] = []
                return

            handler(buffer)
            self.items_flushed += len(buffer)
            self.buffers[item_type] = []
            self.session.commit()
            logger.debug(f"Flushed {len(buffer)} {item_type} items")

        except Exception as e:
            logger.error(f"Error flushing {item_type} buffer: {e}")
            self.session.rollback()
            raise

    # ─── EXISTING FLUSH METHODS ───────────────────────────────────────────────

    def _flush_companies(self, buffer):
        """Upsert into securities table."""
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            rows.append({
                'ins_code': item['ins_code'],
                'symbol': item.get('symbol', ''),
                'name_fa': item.get('name_fa'),
                'name_en': item.get('name_en'),
                'isin': item.get('isin'),
                'type': item.get('type'),
                'market_type': 'tse',
                'sector_id': item.get('sector_id'),
                'sector_name_fa': item.get('sector_name_fa'),
                'sector_name_en': item.get('sector_name_en'),
                'base_volume': item.get('base_volume'),
                'total_shares': item.get('total_shares'),
                'is_active': item.get('is_active', True),
                'created_at': now,
                'updated_at': now,
            })

        stmt = insert(Security.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in Security.__table__.columns
            if c.name not in ('security_id', 'ins_code', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            index_elements=['ins_code'], set_=update_cols
        )
        self.session.execute(stmt)

        # Refresh cache with newly upserted securities
        ins_codes = [r['ins_code'] for r in rows]
        new_rows = self.session.query(Security.ins_code, Security.security_id).filter(
            Security.ins_code.in_(ins_codes)
        ).all()
        for ins_code, sec_id in new_rows:
            self._sec_cache[ins_code] = sec_id

    def _flush_daily_prices(self, buffer):
        """Upsert into daily_ohlcv (OHLCV + price context columns)."""
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            sec_id = self._resolve_security_id(item['ins_code'])
            if not sec_id:
                continue
            rows.append({
                'security_id': sec_id,
                'date': item['date'],
                'open': item.get('open'),
                'high': item.get('high'),
                'low': item.get('low'),
                'close': item.get('close'),
                'last': item.get('last'),
                'volume': item.get('volume'),
                'value': item.get('value'),
                'trades': item.get('trades'),
                'adj_close': item.get('adj_close'),
                'price_yesterday': item.get('price_yesterday'),
                'close_change': item.get('close_change'),
                'close_change_pct': item.get('close_change_pct'),
                'last_change': item.get('last_change'),
                'last_change_pct': item.get('last_change_pct'),
                'threshold_min': item.get('threshold_min'),
                'threshold_max': item.get('threshold_max'),
                'created_at': now,
                'updated_at': now,
            })

        if not rows:
            return

        stmt = insert(DailyOHLCV.__table__).values(rows)
        update_cols = {
            col: stmt.excluded[col]
            for col in [
                'open', 'high', 'low', 'close', 'last', 'volume', 'value',
                'trades', 'adj_close', 'price_yesterday', 'close_change',
                'close_change_pct', 'last_change', 'last_change_pct',
                'threshold_min', 'threshold_max', 'updated_at',
            ]
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_daily_ohlcv_sec_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_financial_indicators(self, buffer):
        """Upsert fundamentals columns into daily_ohlcv."""
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            sec_id = self._resolve_security_id(item['ins_code'])
            if not sec_id:
                continue
            rows.append({
                'security_id': sec_id,
                'date': item['date'],
                'eps': item.get('eps'),
                'estimated_eps': item.get('estimated_eps'),
                'pe_ratio': item.get('pe_ratio'),
                'market_cap': item.get('market_cap'),
                'nav': item.get('nav'),
                'created_at': now,
                'updated_at': now,
            })

        if not rows:
            return

        stmt = insert(DailyOHLCV.__table__).values(rows)
        update_cols = {
            col: stmt.excluded[col]
            for col in ['eps', 'estimated_eps', 'pe_ratio', 'market_cap', 'nav', 'updated_at']
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_daily_ohlcv_sec_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_client_types(self, buffer):
        """Upsert client type columns into daily_ohlcv."""
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            sec_id = self._resolve_security_id(item['ins_code'])
            if not sec_id:
                continue
            rows.append({
                'security_id': sec_id,
                'date': item['date'],
                'real_buy_count': item.get('real_buy_count'),
                'real_buy_volume': item.get('real_buy_volume'),
                'real_sell_count': item.get('real_sell_count'),
                'real_sell_volume': item.get('real_sell_volume'),
                'legal_buy_count': item.get('legal_buy_count'),
                'legal_buy_volume': item.get('legal_buy_volume'),
                'legal_sell_count': item.get('legal_sell_count'),
                'legal_sell_volume': item.get('legal_sell_volume'),
                'created_at': now,
                'updated_at': now,
            })

        if not rows:
            return

        stmt = insert(DailyOHLCV.__table__).values(rows)
        update_cols = {
            col: stmt.excluded[col]
            for col in [
                'real_buy_count', 'real_buy_volume',
                'real_sell_count', 'real_sell_volume',
                'legal_buy_count', 'legal_buy_volume',
                'legal_sell_count', 'legal_sell_volume',
                'updated_at',
            ]
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_daily_ohlcv_sec_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_order_books(self, buffer):
        """Append-only insert into order_book table."""
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            sec_id = self._resolve_security_id(item['ins_code'])
            if not sec_id:
                continue
            row = {
                'security_id': sec_id,
                'snapshot_time': item['snapshot_time'],
                'created_at': now,
            }
            for level in range(1, 6):
                row[f'bid_price_{level}'] = item.get(f'bid_price_{level}')
                row[f'bid_vol_{level}'] = item.get(f'bid_vol_{level}')
                row[f'bid_count_{level}'] = item.get(f'bid_count_{level}')
                row[f'ask_price_{level}'] = item.get(f'ask_price_{level}')
                row[f'ask_vol_{level}'] = item.get(f'ask_vol_{level}')
                row[f'ask_count_{level}'] = item.get(f'ask_count_{level}')
            rows.append(row)

        if not rows:
            return

        stmt = insert(OrderBook.__table__).values(rows).on_conflict_do_nothing(
            constraint='uq_order_book_sec_time'
        )
        self.session.execute(stmt)

    def _flush_options(self, buffer):
        """Upsert into options table."""
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            rows.append({
                'ins_code': item['ins_code'],
                'isin': item.get('isin'),
                'symbol': item.get('symbol', ''),
                'name_fa': item.get('name_fa'),
                'option_type': item.get('option_type'),
                'underlying': item.get('underlying'),
                'strike_price': item.get('strike_price'),
                'expiry_date': item.get('expiry_date'),
                'date': item['date'],
                'open': item.get('open'),
                'high': item.get('high'),
                'low': item.get('low'),
                'close': item.get('close'),
                'last': item.get('last'),
                'yesterday': item.get('yesterday'),
                'close_change': item.get('close_change'),
                'volume': item.get('volume'),
                'value': item.get('value'),
                'trades': item.get('trades'),
                'threshold_min': item.get('threshold_min'),
                'threshold_max': item.get('threshold_max'),
                'base_volume': item.get('base_volume'),
                'bid_price_1': item.get('bid_price_1'),
                'bid_vol_1': item.get('bid_vol_1'),
                'bid_count_1': item.get('bid_count_1'),
                'ask_price_1': item.get('ask_price_1'),
                'ask_vol_1': item.get('ask_vol_1'),
                'ask_count_1': item.get('ask_count_1'),
                'created_at': now,
            })

        if not rows:
            return

        stmt = insert(Option.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in Option.__table__.columns
            if c.name not in ('id', 'ins_code', 'date', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_options_ins_code_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_ime_options(self, buffer):
        """Upsert into ime_options table."""
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            row = {
                'date': item['date'],
                'date_shamsi': item.get('date_shamsi'),
                'contract_category': item.get('contract_category'),
                'contract_category_sub': item.get('contract_category_sub'),
                'commodity': item.get('commodity'),
                'option_type': item.get('option_type'),
                'price_strike': item.get('price_strike'),
                'level_strike': item.get('level_strike'),
                'contract_id': item.get('contract_id'),
                'contract_code': item['contract_code'],
                'contract_description': item.get('contract_description'),
                'contract_size': item.get('contract_size'),
                'date_end': item.get('date_end'),
                'day_remain': item.get('day_remain'),
                'margin_initial': item.get('margin_initial'),
                'margin_required': item.get('margin_required'),
                'interest_open': item.get('interest_open'),
                'interest_open_change': item.get('interest_open_change'),
                'interest_open_change_pct': item.get('interest_open_change_pct'),
                'settlement_price': item.get('settlement_price'),
                'open': item.get('open'),
                'high': item.get('high'),
                'low': item.get('low'),
                'last': item.get('last'),
                'last_change': item.get('last_change'),
                'last_change_pct': item.get('last_change_pct'),
                'trades': item.get('trades'),
                'volume': item.get('volume'),
                'value': item.get('value'),
                'created_at': now,
            }
            for level in range(1, 4):
                row[f'bid_price_{level}'] = item.get(f'bid_price_{level}')
                row[f'bid_vol_{level}'] = item.get(f'bid_vol_{level}')
                row[f'ask_price_{level}'] = item.get(f'ask_price_{level}')
                row[f'ask_vol_{level}'] = item.get(f'ask_vol_{level}')
            rows.append(row)

        if not rows:
            return

        stmt = insert(IMEOption.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in IMEOption.__table__.columns
            if c.name not in ('id', 'contract_code', 'date', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_ime_options_code_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_ime_futures(self, buffer):
        """Upsert into ime_futures table."""
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            row = {
                'date': item['date'],
                'date_shamsi': item.get('date_shamsi'),
                'contract_code': item['contract_code'],
                'contract_description': item.get('contract_description'),
                'contract_size': item.get('contract_size'),
                'contract_size_unit': item.get('contract_size_unit'),
                'date_end': item.get('date_end'),
                'day_remain': item.get('day_remain'),
                'margin_initial': item.get('margin_initial'),
                'margin_maintenance': item.get('margin_maintenance'),
                'interest_open': item.get('interest_open'),
                'interest_open_change': item.get('interest_open_change'),
                'interest_open_change_pct': item.get('interest_open_change_pct'),
                'settlement_price': item.get('settlement_price'),
                'open': item.get('open'),
                'high': item.get('high'),
                'low': item.get('low'),
                'last': item.get('last'),
                'last_change': item.get('last_change'),
                'last_change_pct': item.get('last_change_pct'),
                'instant_settlement': item.get('instant_settlement'),
                'trades': item.get('trades'),
                'volume': item.get('volume'),
                'value': item.get('value'),
                'real_buy_count': item.get('real_buy_count'),
                'legal_buy_count': item.get('legal_buy_count'),
                'real_sell_count': item.get('real_sell_count'),
                'legal_sell_count': item.get('legal_sell_count'),
                'created_at': now,
            }
            for level in range(1, 4):
                row[f'bid_price_{level}'] = item.get(f'bid_price_{level}')
                row[f'bid_vol_{level}'] = item.get(f'bid_vol_{level}')
                row[f'ask_price_{level}'] = item.get(f'ask_price_{level}')
                row[f'ask_vol_{level}'] = item.get(f'ask_vol_{level}')
            rows.append(row)

        if not rows:
            return

        stmt = insert(IMEFuture.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in IMEFuture.__table__.columns
            if c.name not in ('id', 'contract_code', 'date', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_ime_futures_code_date', set_=update_cols
        )
        self.session.execute(stmt)

    # ─── NEW FLUSH METHODS ────────────────────────────────────────────────────

    def _flush_market_indices(self, buffer):
        now = datetime.now(timezone.utc)
        rows = [{
            'date': item['date'],
            'time': item.get('time'),
            'name': item['name'],
            'index_value': item.get('index_value'),
            'index_change': item.get('index_change'),
            'index_change_pct': item.get('index_change_pct'),
            'min_value': item.get('min_value'),
            'max_value': item.get('max_value'),
            'market_value': item.get('market_value'),
            'trades': item.get('trades'),
            'volume': item.get('volume'),
            'value': item.get('value'),
            'state': item.get('state'),
            'created_at': now,
        } for item in buffer]

        if not rows:
            return

        stmt = insert(MarketIndex.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in MarketIndex.__table__.columns
            if c.name not in ('id', 'name', 'date', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_market_indices_name_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_etf_nav(self, buffer):
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            ins_code = item.get('ins_code')
            sec_id = self._resolve_security_id(ins_code) if ins_code else None
            if not sec_id:
                # Fallback: resolve by symbol
                symbol = item.get('symbol', '').strip()
                if symbol:
                    row = self.session.query(Security.security_id).filter(
                        Security.symbol == symbol,
                        Security.market_type == 'tse',
                    ).first()
                    sec_id = row[0] if row else None
            if not sec_id:
                continue
            rows.append({
                'security_id': sec_id,
                'date': item['date'],
                'time': item.get('time'),
                'nav_issuance': item.get('nav_issuance'),
                'nav_redemption': item.get('nav_redemption'),
                'last_price': item.get('last_price'),
                'bubble_pct': item.get('bubble_pct'),
                'fund_type': item.get('fund_type'),
                'created_at': now,
            })

        if not rows:
            return

        stmt = insert(ETFNav.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in ETFNav.__table__.columns
            if c.name not in ('id', 'security_id', 'date', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_etf_nav_sec_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_ime_certificates(self, buffer):
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            row = {
                'date': item['date'],
                'date_shamsi': item.get('date_shamsi'),
                'cert_type': item['cert_type'],
                'commodity': item.get('commodity'),
                'contract_code': item['contract_code'],
                'contract_description': item.get('contract_description'),
                'contract_size': item.get('contract_size'),
                'contract_size_unit': item.get('contract_size_unit'),
                'isin': item.get('isin'),
                'symbol': item.get('symbol'),
                'name': item.get('name'),
                'settlement_price': item.get('settlement_price'),
                'open': item.get('open'),
                'high': item.get('high'),
                'low': item.get('low'),
                'last': item.get('last'),
                'last_change': item.get('last_change'),
                'last_change_pct': item.get('last_change_pct'),
                'close': item.get('close'),
                'trades': item.get('trades'),
                'volume': item.get('volume'),
                'value': item.get('value'),
                'created_at': now,
            }
            for lvl in range(1, 6):
                row[f'bid_price_{lvl}'] = item.get(f'bid_price_{lvl}')
                row[f'bid_vol_{lvl}'] = item.get(f'bid_vol_{lvl}')
                row[f'ask_price_{lvl}'] = item.get(f'ask_price_{lvl}')
                row[f'ask_vol_{lvl}'] = item.get(f'ask_vol_{lvl}')
            for field in ['real_buy_count', 'real_buy_volume', 'real_sell_count', 'real_sell_volume',
                          'legal_buy_count', 'legal_buy_volume', 'legal_sell_count', 'legal_sell_volume']:
                row[field] = item.get(field)
            rows.append(row)

        if not rows:
            return

        stmt = insert(IMECertificate.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in IMECertificate.__table__.columns
            if c.name not in ('id', 'contract_code', 'date', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_ime_certificates_code_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_ime_funds(self, buffer):
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            row = {
                'date': item['date'],
                'date_shamsi': item.get('date_shamsi'),
                'isin': item['isin'],
                'symbol': item.get('symbol'),
                'name': item.get('name'),
                'settlement_price': item.get('settlement_price'),
                'open': item.get('open'), 'high': item.get('high'),
                'low': item.get('low'), 'last': item.get('last'),
                'last_change': item.get('last_change'),
                'last_change_pct': item.get('last_change_pct'),
                'close': item.get('close'),
                'trades': item.get('trades'), 'volume': item.get('volume'),
                'value': item.get('value'),
                'created_at': now,
            }
            for field in ['real_buy_count', 'real_buy_volume', 'real_sell_count', 'real_sell_volume',
                          'legal_buy_count', 'legal_buy_volume', 'legal_sell_count', 'legal_sell_volume']:
                row[field] = item.get(field)
            for lvl in range(1, 6):
                row[f'bid_price_{lvl}'] = item.get(f'bid_price_{lvl}')
                row[f'bid_vol_{lvl}'] = item.get(f'bid_vol_{lvl}')
                row[f'ask_price_{lvl}'] = item.get(f'ask_price_{lvl}')
                row[f'ask_vol_{lvl}'] = item.get(f'ask_vol_{lvl}')
            rows.append(row)

        if not rows:
            return

        stmt = insert(IMEFund.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in IMEFund.__table__.columns
            if c.name not in ('id', 'isin', 'date', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_ime_funds_isin_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_ime_forwards(self, buffer):
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            row = {
                'date': item['date'],
                'date_shamsi': item.get('date_shamsi'),
                'ins_code': item.get('ins_code'),
                'isin': item['isin'],
                'symbol': item.get('symbol'),
                'name': item.get('name'),
                'settlement_price': item.get('settlement_price'),
                'open': item.get('open'), 'high': item.get('high'),
                'low': item.get('low'), 'last': item.get('last'),
                'last_change': item.get('last_change'),
                'last_change_pct': item.get('last_change_pct'),
                'close': item.get('close'),
                'trades': item.get('trades'), 'volume': item.get('volume'),
                'value': item.get('value'),
                'created_at': now,
            }
            for field in ['real_buy_count', 'real_buy_volume', 'real_sell_count', 'real_sell_volume',
                          'legal_buy_count', 'legal_buy_volume', 'legal_sell_count', 'legal_sell_volume']:
                row[field] = item.get(field)
            for lvl in range(1, 6):
                row[f'bid_price_{lvl}'] = item.get(f'bid_price_{lvl}')
                row[f'bid_vol_{lvl}'] = item.get(f'bid_vol_{lvl}')
                row[f'ask_price_{lvl}'] = item.get(f'ask_price_{lvl}')
                row[f'ask_vol_{lvl}'] = item.get(f'ask_vol_{lvl}')
            rows.append(row)

        if not rows:
            return

        stmt = insert(IMEForward.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in IMEForward.__table__.columns
            if c.name not in ('id', 'isin', 'date', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_ime_forwards_isin_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_market_prices(self, buffer):
        now = datetime.now(timezone.utc)
        # Deduplicate by (security_id, date) — keep last occurrence
        dedup = {}
        for item in buffer:
            sec_id = self._resolve_market_security_id(
                item['symbol'], item['market_type'], item.get('name_fa')
            )
            if not sec_id:
                continue
            key = (sec_id, item['date'])
            dedup[key] = {
                'security_id': sec_id,
                'date': item['date'],
                'time': item.get('time'),
                'price': item.get('price'),
                'price_toman': item.get('price_toman'),
                'change_value': item.get('change_value'),
                'change_pct': item.get('change_pct'),
                'unit': item.get('unit'),
                'market_cap': item.get('market_cap'),
                'icon_url': item.get('icon_url'),
                'created_at': now,
            }

        rows = list(dedup.values())
        if not rows:
            return

        stmt = insert(MarketPrice.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in MarketPrice.__table__.columns
            if c.name not in ('id', 'security_id', 'date', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_market_prices_sec_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_ime_physical(self, buffer):
        now = datetime.now(timezone.utc)
        # Deduplicate by (code_offer, date_trade) — keep last occurrence
        dedup = {}
        for item in buffer:
            key = (item['code_offer'], item['date_trade'])
            dedup[key] = {
                'date_trade': item['date_trade'],
                'date_trade_shamsi': item.get('date_trade_shamsi'),
                'symbol': item.get('symbol'),
                'name': item.get('name'),
                'category_id': item.get('category_id'),
                'code_offer': item['code_offer'],
                'market_hall': item.get('market_hall'),
                'producer': item.get('producer'),
                'supplier': item.get('supplier'),
                'broker': item.get('broker'),
                'contract_type': item.get('contract_type'),
                'settlement_type': item.get('settlement_type'),
                'date_settlement': item.get('date_settlement'),
                'date_delivery': item.get('date_delivery'),
                'location_delivery': item.get('location_delivery'),
                'price_base_offer': item.get('price_base_offer'),
                'price_min': item.get('price_min'),
                'price_max': item.get('price_max'),
                'price_last': item.get('price_last'),
                'volume_offer': item.get('volume_offer'),
                'volume_contract': item.get('volume_contract'),
                'demand': item.get('demand'),
                'value': item.get('value'),
                'currency': item.get('currency'),
                'packaging_type': item.get('packaging_type'),
                'unit': item.get('unit'),
                'created_at': now,
            }

        rows = list(dedup.values())
        if not rows:
            return

        stmt = insert(IMEPhysicalTrade.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in IMEPhysicalTrade.__table__.columns
            if c.name not in ('id', 'code_offer', 'date_trade', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_ime_physical_code_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_shareholders(self, buffer):
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            sec_id = self._resolve_security_id(item['ins_code'])
            if not sec_id:
                continue
            rows.append({
                'security_id': sec_id,
                'date': item['date'],
                'shareholder_id': item.get('shareholder_id'),
                'name': item['name'],
                'volume': item.get('volume'),
                'percent': item.get('percent'),
                'change': item.get('change'),
                'created_at': now,
            })

        if not rows:
            return

        stmt = insert(Shareholder.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in Shareholder.__table__.columns
            if c.name not in ('id', 'security_id', 'name', 'date', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_shareholders_sec_name_date', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_codal(self, buffer):
        now = datetime.now(timezone.utc)
        # Deduplicate by code — keep last occurrence
        dedup = {}
        for item in buffer:
            # Try to resolve symbol to security_id
            sec_id = None
            symbol = item.get('symbol')
            if symbol:
                row = self.session.query(Security.security_id).filter(
                    Security.symbol == symbol, Security.market_type == 'tse'
                ).first()
                if row:
                    sec_id = row[0]

            row_data = {
                'security_id': sec_id,
                'symbol': symbol,
                'company_name': item.get('company_name'),
                'title': item.get('title'),
                'code': item['code'],
                'category': item.get('category'),
                'date_title': item.get('date_title'),
                'date_send': item.get('date_send'),
                'time_send': item.get('time_send'),
                'date_publish': item.get('date_publish'),
                'time_publish': item.get('time_publish'),
                'link': item.get('link'),
                'link_pdf': item.get('link_pdf'),
                'link_excel': item.get('link_excel'),
                'link_attachment': item.get('link_attachment'),
                'created_at': now,
            }
            # Add financial statement scraper fields if present
            if 'letter_type' in item and item.get('letter_type') is not None:
                row_data['letter_type'] = item['letter_type']
            if 'letter_serial' in item and item.get('letter_serial') is not None:
                row_data['letter_serial'] = item['letter_serial']
            if 'has_excel' in item:
                row_data['has_excel'] = bool(item.get('has_excel', False))
            if 'has_pdf' in item:
                row_data['has_pdf'] = bool(item.get('has_pdf', False))

            dedup[item['code']] = row_data

        rows = list(dedup.values())
        if not rows:
            return

        # Columns that should never be overwritten by a spider that doesn't populate them.
        # The BrsApi 'codal' spider doesn't set letter_serial/letter_type/has_excel/has_pdf,
        # so those keys are absent from its row_data.  We must not let the upsert SET them
        # to NULL and wipe values previously written by 'codal_financial'.
        _never_overwrite = {'id', 'code', 'created_at', 'is_processed', 'is_failed',
                            'retry_count', 'parse_errors'}
        _conditional_cols = {'letter_type', 'letter_serial', 'has_excel', 'has_pdf'}

        # Only include conditional columns in the update if ALL rows actually carry them
        cols_present = _conditional_cols & set().union(*(r.keys() for r in rows))
        skip_cols = _never_overwrite | (_conditional_cols - cols_present)

        stmt = insert(CodalAnnouncement.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in CodalAnnouncement.__table__.columns
            if c.name not in skip_cols
        }
        stmt = stmt.on_conflict_do_update(
            index_elements=['code'], set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_financial_statements(self, buffer):
        """Upsert into financial_statements table."""
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            # Resolve symbol to security_id
            sec_id = None
            symbol = item.get('symbol')
            if symbol:
                row = self.session.query(Security.security_id).filter(
                    Security.symbol == symbol, Security.market_type == 'tse'
                ).first()
                if row:
                    sec_id = row[0]

            rows.append({
                'codal_announcement_id': item.get('codal_announcement_id'),
                'security_id': sec_id,
                'symbol': symbol,
                'company_name': item.get('company_name'),
                'statement_type': item['statement_type'],
                'period_end_date': item['period_end_date'],
                'period_end_jalali': item.get('period_end_jalali', ''),
                'fiscal_year_end': item.get('fiscal_year_end'),
                'fiscal_year_end_jalali': item.get('fiscal_year_end_jalali'),
                'is_audited': item.get('is_audited', False),
                'is_consolidated': item.get('is_consolidated', False),
                'period_months': item.get('period_months'),
                'revenue': item.get('revenue'),
                'cost_of_revenue': item.get('cost_of_revenue'),
                'gross_profit': item.get('gross_profit'),
                'operating_income': item.get('operating_income'),
                'net_income': item.get('net_income'),
                'total_assets': item.get('total_assets'),
                'total_liabilities': item.get('total_liabilities'),
                'total_equity': item.get('total_equity'),
                'eps': item.get('eps'),
                'line_items': item.get('line_items', {}),
                'created_at': now,
            })

        if not rows:
            return

        stmt = insert(FinancialStatement.__table__).values(rows)
        update_cols = {
            c.name: stmt.excluded[c.name]
            for c in FinancialStatement.__table__.columns
            if c.name not in ('id', 'codal_announcement_id', 'statement_type', 'created_at')
        }
        stmt = stmt.on_conflict_do_update(
            constraint='uq_fs_announcement_type', set_=update_cols
        )
        self.session.execute(stmt)

    def _flush_tick_trades(self, buffer):
        now = datetime.now(timezone.utc)
        rows = []
        for item in buffer:
            sec_id = self._resolve_security_id(item['ins_code'])
            if not sec_id:
                continue
            rows.append({
                'security_id': sec_id,
                'date': item['date'],
                'row_num': item['row_num'],
                'time': item.get('time'),
                'price': item.get('price'),
                'volume': item.get('volume'),
                'canceled': item.get('canceled', False),
                'created_at': now,
            })

        if not rows:
            return

        stmt = insert(TickTrade.__table__).values(rows).on_conflict_do_nothing(
            constraint='uq_tick_trades_sec_date_row'
        )
        self.session.execute(stmt)


class StatisticsPipeline:
    """Log statistics about scraping"""

    def __init__(self):
        self.items_count = {}

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        item_type = adapter.get('item_type', 'unknown')
        self.items_count[item_type] = self.items_count.get(item_type, 0) + 1
        return item

    def close_spider(self, spider):
        logger.info("=" * 80)
        logger.info("Scraping Statistics:")
        logger.info("-" * 80)
        for item_type, count in sorted(self.items_count.items()):
            logger.info(f"  {item_type}: {count} items")
        logger.info("=" * 80)
