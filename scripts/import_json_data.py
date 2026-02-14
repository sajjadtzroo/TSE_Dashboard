"""
Import iran_stocks.json and iran_funds.json into the database
This allows testing the database without needing TSETMC API access
"""
import sys
import json
import logging
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from database.connection import get_db_manager
from database.models import Company, DailyPrice, FinancialIndicator
from config.settings import DATABASE_URL

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def import_iran_stocks():
    """Import iran_stocks.json into database"""
    logger.info("="*80)
    logger.info("Importing iran_stocks.json")
    logger.info("="*80)

    stocks_file = project_root / 'iran_stocks.json'
    if not stocks_file.exists():
        logger.error(f"File not found: {stocks_file}")
        return 0

    # Load JSON data
    with open(stocks_file, 'r', encoding='utf-8') as f:
        stocks = json.load(f)

    logger.info(f"Loaded {len(stocks)} stocks from JSON")

    # Get database session
    db = get_db_manager(DATABASE_URL)
    today = int(datetime.now().strftime('%Y%m%d'))

    inserted_companies = 0
    inserted_prices = 0

    with db.get_session() as session:
        for i, stock in enumerate(stocks, 1):
            try:
                symbol = stock.get('symbol', '').strip()
                if not symbol:
                    continue

                # Generate a fake InsCode from symbol hash (for testing)
                # In reality, you'd need to map these to real InsCodes from TSETMC
                ins_code = hash(symbol) % 9000000000000000 + 1000000000000000

                # Create/update Company
                company = session.query(Company).filter_by(ins_code=ins_code).first()

                if not company:
                    company = Company(
                        ins_code=ins_code,
                        symbol=symbol,
                        name_fa=stock.get('name', ''),
                        is_active=True
                    )
                    session.add(company)
                    inserted_companies += 1

                # Create DailyPrice
                price = session.query(DailyPrice).filter_by(
                    ins_code=ins_code,
                    d_even=today
                ).first()

                if not price:
                    price = DailyPrice(
                        ins_code=ins_code,
                        d_even=today,
                        price_last=stock.get('closing_price'),
                        price_first=stock.get('latest_price'),  # Not ideal mapping but OK for testing
                        price_change=stock.get('price_change'),
                        price_change_percent=stock.get('price_change_percent'),
                        q_tot_tran_5j=stock.get('volume'),
                        q_tot_cap=stock.get('value'),
                        z_tot_tran=stock.get('trades_count')
                    )
                    session.add(price)
                    inserted_prices += 1

                # Commit every 100 records
                if i % 100 == 0:
                    session.commit()
                    logger.info(f"Processed {i}/{len(stocks)} stocks...")

            except Exception as e:
                logger.error(f"Error processing stock {stock.get('symbol')}: {e}")
                continue

        # Final commit
        session.commit()

    logger.info(f"✓ Inserted {inserted_companies} companies")
    logger.info(f"✓ Inserted {inserted_prices} price records")

    return inserted_companies + inserted_prices


def import_iran_funds():
    """Import iran_funds.json into database"""
    logger.info("\n" + "="*80)
    logger.info("Importing iran_funds.json")
    logger.info("="*80)

    funds_file = project_root / 'iran_funds.json'
    if not funds_file.exists():
        logger.error(f"File not found: {funds_file}")
        return 0

    # Load JSON data
    with open(funds_file, 'r', encoding='utf-8') as f:
        funds = json.load(f)

    logger.info(f"Loaded {len(funds)} funds from JSON")

    # Get database session
    db = get_db_manager(DATABASE_URL)
    today = int(datetime.now().strftime('%Y%m%d'))

    inserted_companies = 0
    inserted_financials = 0

    with db.get_session() as session:
        for i, fund in enumerate(funds, 1):
            try:
                name = fund.get('name', '').strip()
                if not name or len(name) < 3:
                    continue

                # Generate a fake InsCode from name hash (for testing)
                ins_code = hash(name) % 9000000000000000 + 2000000000000000

                # Create/update Company (fund)
                company = session.query(Company).filter_by(ins_code=ins_code).first()

                if not company:
                    company = Company(
                        ins_code=ins_code,
                        symbol=name[:20],  # Use truncated name as symbol
                        name_fa=name,
                        sector_name_fa=fund.get('fund_type', ''),
                        is_active=True
                    )
                    session.add(company)
                    inserted_companies += 1

                # Create FinancialIndicator
                financial = session.query(FinancialIndicator).filter_by(
                    ins_code=ins_code,
                    d_even=today
                ).first()

                if not financial:
                    financial = FinancialIndicator(
                        ins_code=ins_code,
                        d_even=today,
                        nav=fund.get('nav'),
                        # Map other fund fields as needed
                    )
                    session.add(financial)
                    inserted_financials += 1

                # Create DailyPrice for NAV
                price = session.query(DailyPrice).filter_by(
                    ins_code=ins_code,
                    d_even=today
                ).first()

                if not price:
                    nav = fund.get('nav')
                    price = DailyPrice(
                        ins_code=ins_code,
                        d_even=today,
                        price_last=nav,
                        price_first=fund.get('issue_price'),
                    )
                    session.add(price)

                # Commit every 100 records
                if i % 100 == 0:
                    session.commit()
                    logger.info(f"Processed {i}/{len(funds)} funds...")

            except Exception as e:
                logger.error(f"Error processing fund {fund.get('name')}: {e}")
                continue

        # Final commit
        session.commit()

    logger.info(f"✓ Inserted {inserted_companies} fund companies")
    logger.info(f"✓ Inserted {inserted_financials} financial records")

    return inserted_companies + inserted_financials


def verify_import():
    """Verify imported data"""
    logger.info("\n" + "="*80)
    logger.info("Verifying Imported Data")
    logger.info("="*80)

    db = get_db_manager(DATABASE_URL)

    with db.get_session() as session:
        total_companies = session.query(Company).count()
        total_prices = session.query(DailyPrice).count()
        total_financials = session.query(FinancialIndicator).count()

        logger.info(f"\nDatabase Statistics:")
        logger.info(f"  - Total companies: {total_companies}")
        logger.info(f"  - Total price records: {total_prices}")
        logger.info(f"  - Total financial records: {total_financials}")

        # Show sample stocks
        logger.info(f"\nSample Stocks (first 5):")
        stocks = session.query(Company, DailyPrice).join(
            DailyPrice, Company.ins_code == DailyPrice.ins_code
        ).filter(
            Company.ins_code < 2000000000000000  # Stocks have lower InsCodes
        ).limit(5).all()

        for company, price in stocks:
            logger.info(
                f"  - {company.symbol}: {company.name_fa} "
                f"(Last: {price.price_last}, Volume: {price.q_tot_tran_5j})"
            )

        # Show sample funds
        logger.info(f"\nSample Funds (first 5):")
        funds = session.query(Company).filter(
            Company.ins_code >= 2000000000000000  # Funds have higher InsCodes
        ).limit(5).all()

        for fund in funds:
            logger.info(f"  - {fund.symbol}: {fund.name_fa} ({fund.sector_name_fa})")


def main():
    """Main execution"""
    logger.info("\n" + "="*80)
    logger.info("Import JSON Data to Database")
    logger.info("="*80 + "\n")

    # Import stocks
    stocks_count = import_iran_stocks()

    # Import funds
    funds_count = import_iran_funds()

    # Verify
    verify_import()

    # Summary
    logger.info("\n" + "="*80)
    logger.info("🎉 Import Complete!")
    logger.info("="*80)
    logger.info(f"\nTotal records imported: {stocks_count + funds_count}")
    logger.info(f"\nDatabase location: {DATABASE_URL}")
    logger.info("\nNext steps:")
    logger.info("1. Query the database using Python or SQL")
    logger.info("2. Run analysis on the imported data")
    logger.info("3. Test the scheduler and other features")
    logger.info("="*80 + "\n")


if __name__ == '__main__':
    main()
