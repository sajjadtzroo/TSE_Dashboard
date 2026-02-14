"""
Data processing pipelines for TSETMC scraper
Handles validation, cleaning, and database persistence
"""
import logging
from datetime import datetime
from itemadapter import ItemAdapter
from scrapy.exceptions import DropItem

from database.connection import get_db_manager
from database.models import (
    Company, DailyPrice, FinancialIndicator, ClientType,
    IntradayTrade, OrderBook, ScraperStatus
)
from tsetmc_scraper.utils import (
    safe_float, safe_int, clean_text, validate_ins_code,
    persian_to_english_numbers
)
from config.settings import DATABASE_URL

logger = logging.getLogger(__name__)


class ValidationPipeline:
    """Validate data integrity before processing"""

    def process_item(self, item, spider):
        """Validate required fields"""
        adapter = ItemAdapter(item)
        item_type = adapter.get('item_type')

        # Validate ins_code for all items
        ins_code = adapter.get('ins_code')
        if not validate_ins_code(ins_code):
            raise DropItem(f"Invalid ins_code: {ins_code}")

        # Validate d_even (date) for most items
        if item_type in ['daily_price', 'financial_indicator', 'client_type']:
            d_even = adapter.get('d_even')
            if not d_even or not isinstance(d_even, int):
                raise DropItem(f"Invalid d_even for {item_type}: {d_even}")

        return item


class DataCleaningPipeline:
    """Clean and normalize data"""

    def process_item(self, item, spider):
        """Clean and convert data types"""
        adapter = ItemAdapter(item)
        item_type = adapter.get('item_type')

        # Clean based on item type
        if item_type == 'daily_price':
            self._clean_daily_price(adapter)
        elif item_type == 'financial_indicator':
            self._clean_financial_indicator(adapter)
        elif item_type == 'client_type':
            self._clean_client_type(adapter)
        elif item_type == 'company':
            self._clean_company(adapter)

        return item

    def _clean_daily_price(self, adapter):
        """Clean daily price data"""
        # Convert prices to float
        for field in ['price_first', 'price_last', 'price_min', 'price_max',
                      'price_yesterday', 'price_change', 'price_change_percent', 'adj_close']:
            value = adapter.get(field)
            adapter[field] = safe_float(value)

        # Convert volumes to int
        for field in ['q_tot_tran_5j', 'q_tot_cap', 'z_tot_tran']:
            value = adapter.get(field)
            adapter[field] = safe_int(value)

        # Ensure ins_code and d_even are integers
        adapter['ins_code'] = safe_int(adapter.get('ins_code'))
        adapter['d_even'] = safe_int(adapter.get('d_even'))

    def _clean_financial_indicator(self, adapter):
        """Clean financial indicator data"""
        # Convert numeric fields
        for field in ['pe_ratio', 'eps', 'estimated_eps', 'min_week', 'max_week',
                      'min_year', 'max_year', 'price_threshold_min', 'price_threshold_max', 'nav']:
            value = adapter.get(field)
            adapter[field] = safe_float(value)

        for field in ['market_cap', 'total_shares']:
            value = adapter.get(field)
            adapter[field] = safe_int(value)

        adapter['ins_code'] = safe_int(adapter.get('ins_code'))
        adapter['d_even'] = safe_int(adapter.get('d_even'))

    def _clean_client_type(self, adapter):
        """Clean client type data"""
        # Convert all count/volume/value fields to int
        for field in ['real_buyer_count', 'real_buyer_volume', 'real_buyer_value',
                      'real_seller_count', 'real_seller_volume', 'real_seller_value',
                      'legal_buyer_count', 'legal_buyer_volume', 'legal_buyer_value',
                      'legal_seller_count', 'legal_seller_volume', 'legal_seller_value']:
            value = adapter.get(field)
            adapter[field] = safe_int(value, default=0)

        adapter['ins_code'] = safe_int(adapter.get('ins_code'))
        adapter['d_even'] = safe_int(adapter.get('d_even'))

    def _clean_company(self, adapter):
        """Clean company data"""
        # Clean text fields
        for field in ['symbol', 'name_fa', 'name_en', 'isin',
                      'sector_name_fa', 'sector_name_en']:
            value = adapter.get(field)
            adapter[field] = clean_text(value)

        adapter['ins_code'] = safe_int(adapter.get('ins_code'))

        # Convert is_active to boolean
        is_active = adapter.get('is_active')
        if isinstance(is_active, str):
            adapter['is_active'] = is_active.lower() in ('true', '1', 'yes')
        else:
            adapter['is_active'] = bool(is_active)


class DatabasePipeline:
    """Persist data to database"""

    def __init__(self):
        self.db_manager = None
        self.session = None
        self.items_processed = 0
        self.items_inserted = 0
        self.items_updated = 0

    def open_spider(self, spider):
        """Initialize database connection when spider opens"""
        logger.info(f"Opening database connection for {spider.name}")
        self.db_manager = get_db_manager(DATABASE_URL)
        self.session = self.db_manager.get_scoped_session()
        self.items_processed = 0
        self.items_inserted = 0
        self.items_updated = 0

    def close_spider(self, spider):
        """Close database connection when spider closes"""
        try:
            if self.session:
                self.session.commit()
                self.session.close()

            logger.info(f"Database pipeline stats - Processed: {self.items_processed}, "
                       f"Inserted: {self.items_inserted}, Updated: {self.items_updated}")
        except Exception as e:
            logger.error(f"Error closing database session: {e}")

    def process_item(self, item, spider):
        """Save item to database"""
        adapter = ItemAdapter(item)
        item_type = adapter.get('item_type')

        try:
            if item_type == 'daily_price':
                self._save_daily_price(adapter)
            elif item_type == 'financial_indicator':
                self._save_financial_indicator(adapter)
            elif item_type == 'client_type':
                self._save_client_type(adapter)
            elif item_type == 'company':
                self._save_company(adapter)
            elif item_type == 'intraday_trade':
                self._save_intraday_trade(adapter)
            elif item_type == 'order_book':
                self._save_order_book(adapter)

            self.items_processed += 1

            # Commit every 100 items
            if self.items_processed % 100 == 0:
                self.session.commit()
                logger.debug(f"Committed {self.items_processed} items to database")

        except Exception as e:
            logger.error(f"Error saving {item_type} to database: {e}")
            self.session.rollback()
            raise

        return item

    def _save_daily_price(self, adapter):
        """Save or update daily price data"""
        ins_code = adapter['ins_code']
        d_even = adapter['d_even']

        # Check if record exists
        existing = self.session.query(DailyPrice).filter_by(
            ins_code=ins_code,
            d_even=d_even
        ).first()

        if existing:
            # Update existing record
            for key, value in adapter.items():
                if key != 'item_type' and hasattr(existing, key):
                    setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
            self.items_updated += 1
        else:
            # Insert new record
            record = DailyPrice(**{k: v for k, v in adapter.items() if k != 'item_type'})
            self.session.add(record)
            self.items_inserted += 1

    def _save_financial_indicator(self, adapter):
        """Save or update financial indicator data"""
        ins_code = adapter['ins_code']
        d_even = adapter['d_even']

        existing = self.session.query(FinancialIndicator).filter_by(
            ins_code=ins_code,
            d_even=d_even
        ).first()

        if existing:
            for key, value in adapter.items():
                if key != 'item_type' and hasattr(existing, key):
                    setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
            self.items_updated += 1
        else:
            record = FinancialIndicator(**{k: v for k, v in adapter.items() if k != 'item_type'})
            self.session.add(record)
            self.items_inserted += 1

    def _save_client_type(self, adapter):
        """Save or update client type data"""
        ins_code = adapter['ins_code']
        d_even = adapter['d_even']

        existing = self.session.query(ClientType).filter_by(
            ins_code=ins_code,
            d_even=d_even
        ).first()

        if existing:
            for key, value in adapter.items():
                if key != 'item_type' and hasattr(existing, key):
                    setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
            self.items_updated += 1
        else:
            record = ClientType(**{k: v for k, v in adapter.items() if k != 'item_type'})
            self.session.add(record)
            self.items_inserted += 1

    def _save_company(self, adapter):
        """Save or update company data"""
        ins_code = adapter['ins_code']

        existing = self.session.query(Company).filter_by(ins_code=ins_code).first()

        if existing:
            for key, value in adapter.items():
                if key != 'item_type' and hasattr(existing, key):
                    setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
            self.items_updated += 1
        else:
            record = Company(**{k: v for k, v in adapter.items() if k != 'item_type'})
            self.session.add(record)
            self.items_inserted += 1

    def _save_intraday_trade(self, adapter):
        """Save intraday trade data (append only)"""
        record = IntradayTrade(**{k: v for k, v in adapter.items() if k != 'item_type'})
        self.session.add(record)
        self.items_inserted += 1

    def _save_order_book(self, adapter):
        """Save order book data (append only)"""
        record = OrderBook(**{k: v for k, v in adapter.items() if k != 'item_type'})
        self.session.add(record)
        self.items_inserted += 1


class StatisticsPipeline:
    """Log statistics about scraping"""

    def __init__(self):
        self.items_count = {}

    def process_item(self, item, spider):
        """Count items by type"""
        adapter = ItemAdapter(item)
        item_type = adapter.get('item_type', 'unknown')

        self.items_count[item_type] = self.items_count.get(item_type, 0) + 1

        return item

    def close_spider(self, spider):
        """Log final statistics"""
        logger.info("="*80)
        logger.info("Scraping Statistics:")
        logger.info("-"*80)
        for item_type, count in sorted(self.items_count.items()):
            logger.info(f"  {item_type}: {count} items")
        logger.info("="*80)
