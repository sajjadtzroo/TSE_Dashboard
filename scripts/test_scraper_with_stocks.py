"""
Test scraper with companies from iran_stocks.json
Maps symbols to InsCodes and tests the market_watch spider
"""
import sys
import json
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from database.connection import get_db_manager
from database.models import Company, DailyPrice
from config.settings import DATABASE_URL
import subprocess

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_iran_stocks():
    """Load companies from iran_stocks.json"""
    stocks_file = project_root / 'iran_stocks.json'

    if not stocks_file.exists():
        logger.error(f"File not found: {stocks_file}")
        return []

    with open(stocks_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    logger.info(f"Loaded {len(data)} companies from iran_stocks.json")
    return data


def step1_fetch_all_companies():
    """Step 1: Run instrument_details spider to get all companies and their InsCodes"""
    logger.info("="*80)
    logger.info("STEP 1: Fetching all companies from TSETMC")
    logger.info("="*80)

    cmd = ['python', '-m', 'scrapy', 'crawl', 'instrument_details']

    logger.info("Running: " + ' '.join(cmd))
    result = subprocess.run(cmd, cwd=str(project_root))

    if result.returncode == 0:
        logger.info("✓ Successfully fetched company data")
        return True
    else:
        logger.error("✗ Failed to fetch company data")
        return False


def step2_verify_database():
    """Step 2: Verify companies are in database"""
    logger.info("\n" + "="*80)
    logger.info("STEP 2: Verifying database")
    logger.info("="*80)

    db_manager = get_db_manager(DATABASE_URL)

    with db_manager.get_session() as session:
        total_companies = session.query(Company).count()
        active_companies = session.query(Company).filter(Company.is_active == True).count()

        logger.info(f"Total companies in database: {total_companies}")
        logger.info(f"Active companies: {active_companies}")

        if total_companies == 0:
            logger.error("✗ No companies found in database!")
            return False

        # Show sample
        sample = session.query(Company).limit(5).all()
        logger.info("\nSample companies:")
        for company in sample:
            logger.info(f"  - {company.symbol}: {company.name_fa} (InsCode: {company.ins_code})")

    logger.info("✓ Database verification complete")
    return True


def step3_map_symbols_to_inscodes():
    """Step 3: Map symbols from iran_stocks.json to InsCodes"""
    logger.info("\n" + "="*80)
    logger.info("STEP 3: Mapping symbols to InsCodes")
    logger.info("="*80)

    # Load iran_stocks
    iran_stocks = load_iran_stocks()
    if not iran_stocks:
        return []

    # Get all companies from database
    db_manager = get_db_manager(DATABASE_URL)

    with db_manager.get_session() as session:
        db_companies = session.query(Company).all()

        # Create symbol lookup (normalize for matching)
        symbol_map = {}
        for company in db_companies:
            # Try both as-is and stripped versions
            if company.symbol:
                symbol_map[company.symbol.strip()] = company.ins_code
                symbol_map[company.symbol.strip().upper()] = company.ins_code

        logger.info(f"Created lookup table with {len(symbol_map)} symbols")

        # Map iran_stocks symbols to InsCodes
        matched = []
        unmatched = []

        for stock in iran_stocks:
            symbol = stock.get('symbol', '').strip()

            if symbol in symbol_map:
                matched.append({
                    'symbol': symbol,
                    'ins_code': symbol_map[symbol],
                    'iran_stock_data': stock
                })
            else:
                unmatched.append(symbol)

        logger.info(f"✓ Matched: {len(matched)} companies")
        logger.info(f"✗ Unmatched: {len(unmatched)} companies")

        if unmatched[:10]:  # Show first 10 unmatched
            logger.info(f"\nSample unmatched symbols: {', '.join(unmatched[:10])}")

        return matched


def step4_test_market_watch():
    """Step 4: Run market_watch spider to test with all companies"""
    logger.info("\n" + "="*80)
    logger.info("STEP 4: Testing market_watch spider")
    logger.info("="*80)

    cmd = ['python', '-m', 'scrapy', 'crawl', 'market_watch']

    logger.info("Running: " + ' '.join(cmd))
    result = subprocess.run(cmd, cwd=str(project_root))

    if result.returncode == 0:
        logger.info("✓ Market watch spider completed")
        return True
    else:
        logger.error("✗ Market watch spider failed")
        return False


def step5_verify_data():
    """Step 5: Verify data was collected"""
    logger.info("\n" + "="*80)
    logger.info("STEP 5: Verifying collected data")
    logger.info("="*80)

    db_manager = get_db_manager(DATABASE_URL)

    with db_manager.get_session() as session:
        # Count daily prices
        total_prices = session.query(DailyPrice).count()
        logger.info(f"Total price records: {total_prices}")

        if total_prices == 0:
            logger.error("✗ No price data collected!")
            return False

        # Get latest prices
        from datetime import datetime
        today = int(datetime.now().strftime('%Y%m%d'))

        today_prices = session.query(DailyPrice).filter(DailyPrice.d_even == today).count()
        logger.info(f"Today's price records ({today}): {today_prices}")

        # Show sample with company info
        sample_prices = session.query(DailyPrice, Company).join(
            Company, DailyPrice.ins_code == Company.ins_code
        ).limit(10).all()

        logger.info("\nSample data (10 companies):")
        for price, company in sample_prices:
            logger.info(
                f"  - {company.symbol}: {price.price_last} "
                f"(Change: {price.price_change_percent:.2f}%, "
                f"Volume: {price.q_tot_tran_5j})"
            )

    logger.info("✓ Data verification complete")
    return True


def main():
    """Main execution"""
    logger.info("\n" + "="*80)
    logger.info("TSETMC Scraper Test with iran_stocks.json")
    logger.info("="*80 + "\n")

    # Step 1: Fetch all companies from TSETMC
    if not step1_fetch_all_companies():
        logger.error("\n❌ Step 1 failed. Exiting.")
        return

    # Step 2: Verify database
    if not step2_verify_database():
        logger.error("\n❌ Step 2 failed. Exiting.")
        return

    # Step 3: Map symbols to InsCodes
    matched_companies = step3_map_symbols_to_inscodes()
    if not matched_companies:
        logger.error("\n❌ Step 3 failed. No companies matched.")
        return

    # Step 4: Test market_watch spider
    if not step4_test_market_watch():
        logger.error("\n❌ Step 4 failed.")
        return

    # Step 5: Verify collected data
    if not step5_verify_data():
        logger.error("\n❌ Step 5 failed.")
        return

    # Success!
    logger.info("\n" + "="*80)
    logger.info("🎉 SUCCESS! All steps completed")
    logger.info("="*80)
    logger.info(f"\nMatched and tested {len(matched_companies)} companies from iran_stocks.json")
    logger.info("Data is now available in the database at: data/tsetmc.db")
    logger.info("\nNext steps:")
    logger.info("1. Query the database to analyze the data")
    logger.info("2. Run historical backfill: python scripts/backfill_history.py")
    logger.info("3. Start scheduler: python scheduler/scheduler.py")
    logger.info("="*80 + "\n")


if __name__ == '__main__':
    main()
