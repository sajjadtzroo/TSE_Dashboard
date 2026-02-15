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
from database.models import Security, DailyOHLCV, OrderBook
from tsetmc_scraper.utils import (
    safe_float, safe_int, clean_text, validate_ins_code,
    persian_to_english_numbers
)
from config.settings import DATABASE_URL

logger = logging.getLogger(__name__)


class ValidationPipeline:
    """Validate data integrity before processing"""

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        item_type = adapter.get('item_type')

        ins_code = adapter.get('ins_code')
        if not validate_ins_code(ins_code):
            raise DropItem(f"Invalid ins_code: {ins_code}")

        if item_type in ['daily_price', 'financial_indicator', 'client_type']:
            d = adapter.get('date')
            if not d:
                raise DropItem(f"Missing date for {item_type}")

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

    def _clean_order_book(self, adapter):
        adapter['ins_code'] = safe_int(adapter.get('ins_code'))
        for level in range(1, 6):
            for prefix in ['bid_price', 'ask_price']:
                adapter[f'{prefix}_{level}'] = safe_float(adapter.get(f'{prefix}_{level}'))
            for prefix in ['bid_vol', 'ask_vol']:
                adapter[f'{prefix}_{level}'] = safe_int(adapter.get(f'{prefix}_{level}'))
            for prefix in ['bid_count', 'ask_count']:
                adapter[f'{prefix}_{level}'] = safe_int(adapter.get(f'{prefix}_{level}'))


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

    def open_spider(self, spider):
        logger.info(f"Opening database connection for {spider.name}")
        self.db_manager = get_db_manager(DATABASE_URL)
        self.session = self.db_manager.get_scoped_session()
        self.buffers = {}
        self.items_processed = 0
        self.items_flushed = 0
        self._load_security_cache()

    def _load_security_cache(self):
        """Load ins_code -> security_id mapping from DB."""
        try:
            rows = self.session.query(Security.ins_code, Security.security_id).all()
            self._sec_cache = {ins_code: sec_id for ins_code, sec_id in rows}
            logger.info(f"Loaded security cache: {len(self._sec_cache)} entries")
        except Exception as e:
            logger.warning(f"Could not load security cache: {e}")
            self._sec_cache = {}

    def _resolve_security_id(self, ins_code):
        """Resolve ins_code to security_id, creating a stub if needed."""
        sec_id = self._sec_cache.get(ins_code)
        if sec_id:
            return sec_id

        # Create a stub security record
        stmt = insert(Security.__table__).values(
            ins_code=ins_code,
            symbol=str(ins_code),
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        ).on_conflict_do_nothing(index_elements=['ins_code'])
        self.session.execute(stmt)
        self.session.commit()

        row = self.session.query(Security.security_id).filter(
            Security.ins_code == ins_code
        ).one_or_none()
        if row:
            self._sec_cache[ins_code] = row[0]
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
            if item_type == 'company':
                self._flush_companies(buffer)
            elif item_type == 'daily_price':
                self._flush_daily_prices(buffer)
            elif item_type == 'financial_indicator':
                self._flush_financial_indicators(buffer)
            elif item_type == 'client_type':
                self._flush_client_types(buffer)
            elif item_type == 'order_book':
                self._flush_order_books(buffer)
            else:
                logger.warning(f"Unknown item_type: {item_type}")
                self.buffers[item_type] = []
                return

            self.items_flushed += len(buffer)
            self.buffers[item_type] = []
            self.session.commit()
            logger.debug(f"Flushed {len(buffer)} {item_type} items")

        except Exception as e:
            logger.error(f"Error flushing {item_type} buffer: {e}")
            self.session.rollback()
            raise

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
        # Only update OHLCV + price context columns (not fundamentals/client type)
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

        # Use ON CONFLICT DO NOTHING to skip duplicates for same security+time
        stmt = insert(OrderBook.__table__).values(rows).on_conflict_do_nothing(
            constraint='uq_order_book_sec_time'
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
