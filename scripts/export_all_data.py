"""
Export ALL market data in one complete file
"""
import sys
import csv
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from database.connection import get_db_manager
from database.models import Company, DailyPrice, FinancialIndicator
from config.settings import DATABASE_URL

print("="*80)
print("Exporting ALL Market Data")
print("="*80)

db = get_db_manager(DATABASE_URL)
exports_dir = project_root / 'exports'
exports_dir.mkdir(exist_ok=True)

# First, let's see what we actually have
print("\nChecking database contents...")
with db.get_session() as session:
    total_companies = session.query(Company).count()
    total_prices = session.query(DailyPrice).count()
    total_financials = session.query(FinancialIndicator).count()

    # Companies with prices
    companies_with_prices = session.query(Company).join(
        DailyPrice, Company.ins_code == DailyPrice.ins_code
    ).count()

    # Companies without prices
    companies_without_prices = session.query(Company).outerjoin(
        DailyPrice, Company.ins_code == DailyPrice.ins_code
    ).filter(DailyPrice.ins_code.is_(None)).count()

    print(f"  Total Companies: {total_companies}")
    print(f"  Companies with prices: {companies_with_prices}")
    print(f"  Companies without prices: {companies_without_prices}")
    print(f"  Total Price Records: {total_prices}")
    print(f"  Total Financial Records: {total_financials}")

# Export EVERYTHING in one file
print("\nExporting complete market data...")
with db.get_session() as session:
    # Get ALL companies with their data (left join to include companies without prices)
    all_data = session.query(Company, DailyPrice, FinancialIndicator).outerjoin(
        DailyPrice, Company.ins_code == DailyPrice.ins_code
    ).outerjoin(
        FinancialIndicator, Company.ins_code == FinancialIndicator.ins_code
    ).all()

    csv_file = exports_dir / 'complete_market_data.csv'
    with open(csv_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            'InsCode', 'Symbol', 'Company Name', 'Sector/Type', 'Is Active',
            'Date', 'Last Price', 'First Price', 'Min Price', 'Max Price',
            'Price Change', 'Change %', 'Volume', 'Value', 'Trades',
            'NAV', 'PE Ratio', 'EPS', 'Market Cap'
        ])

        for company, price, financial in all_data:
            writer.writerow([
                company.ins_code,
                company.symbol or '',
                company.name_fa or '',
                company.sector_name_fa or '',
                'Yes' if company.is_active else 'No',
                price.d_even if price else '',
                price.price_last if price else '',
                price.price_first if price else '',
                price.price_min if price else '',
                price.price_max if price else '',
                price.price_change if price else '',
                f"{price.price_change_percent:.2f}" if price and price.price_change_percent else '',
                price.q_tot_tran_5j if price else '',
                price.q_tot_cap if price else '',
                price.z_tot_tran if price else '',
                financial.nav if financial else '',
                financial.pe_ratio if financial else '',
                financial.eps if financial else '',
                financial.market_cap if financial else ''
            ])

    print(f"  Exported {len(all_data)} records to: {csv_file}")

# Also export just the raw data from iran_stocks.json mapping
print("\nExporting stocks with prices only...")
with db.get_session() as session:
    stocks_with_prices = session.query(Company, DailyPrice).join(
        DailyPrice, Company.ins_code == DailyPrice.ins_code
    ).all()

    csv_file = exports_dir / 'stocks_with_prices.csv'
    with open(csv_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            'No', 'InsCode', 'Symbol', 'Name', 'Last Price', 'Change %',
            'Volume', 'Value', 'Trades'
        ])

        for i, (company, price) in enumerate(stocks_with_prices, 1):
            writer.writerow([
                i,
                company.ins_code,
                company.symbol or '',
                company.name_fa or '',
                price.price_last or 0,
                f"{price.price_change_percent:.2f}" if price.price_change_percent else '0',
                price.q_tot_tran_5j or 0,
                price.q_tot_cap or 0,
                price.z_tot_tran or 0
            ])

    print(f"  Exported {len(stocks_with_prices)} stocks with prices to: {csv_file}")

# Export companies list
print("\nExporting companies list...")
with db.get_session() as session:
    companies = session.query(Company).all()

    csv_file = exports_dir / 'all_companies.csv'
    with open(csv_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['No', 'InsCode', 'Symbol', 'Name', 'Sector', 'Is Active'])

        for i, company in enumerate(companies, 1):
            writer.writerow([
                i,
                company.ins_code,
                company.symbol or '',
                company.name_fa or '',
                company.sector_name_fa or '',
                'Yes' if company.is_active else 'No'
            ])

    print(f"  Exported {len(companies)} companies to: {csv_file}")

print("\n" + "="*80)
print("Export Complete!")
print("="*80)
print(f"\nFiles created in: {exports_dir}")
print("\n1. complete_market_data.csv - ALL data (companies + prices + financials)")
print("2. stocks_with_prices.csv   - Only stocks that have price data")
print("3. all_companies.csv        - Complete companies list")
print("="*80)
