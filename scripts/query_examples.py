"""
Example queries to demonstrate the database functionality
Run this to see what you can do with the imported data
"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from database.connection import get_db_manager
from database.models import Company, DailyPrice, FinancialIndicator
from config.settings import DATABASE_URL
from sqlalchemy import func, desc

print("="*80)
print("TSETMC Database Query Examples")
print("="*80)

db = get_db_manager(DATABASE_URL)

# Example 1: Top 10 companies by volume
print("\n1. TOP 10 STOCKS BY TRADING VOLUME")
print("-"*80)
with db.get_session() as session:
    top_volume = session.query(Company, DailyPrice).join(
        DailyPrice, Company.ins_code == DailyPrice.ins_code
    ).filter(
        DailyPrice.q_tot_tran_5j.isnot(None)
    ).order_by(
        desc(DailyPrice.q_tot_tran_5j)
    ).limit(10).all()

    for i, (company, price) in enumerate(top_volume, 1):
        print(f"{i:2d}. {company.symbol:15s} - Volume: {price.q_tot_tran_5j:>15,} - Last: {price.price_last}")

# Example 2: Biggest gainers
print("\n2. BIGGEST GAINERS (by percentage)")
print("-"*80)
with db.get_session() as session:
    gainers = session.query(Company, DailyPrice).join(
        DailyPrice, Company.ins_code == DailyPrice.ins_code
    ).filter(
        DailyPrice.price_change_percent.isnot(None),
        DailyPrice.price_change_percent > 0
    ).order_by(
        desc(DailyPrice.price_change_percent)
    ).limit(10).all()

    for i, (company, price) in enumerate(gainers, 1):
        print(f"{i:2d}. {company.symbol:15s} - Change: {price.price_change_percent:>6.2f}% - Last: {price.price_last}")

# Example 3: Biggest losers
print("\n3. BIGGEST LOSERS (by percentage)")
print("-"*80)
with db.get_session() as session:
    losers = session.query(Company, DailyPrice).join(
        DailyPrice, Company.ins_code == DailyPrice.ins_code
    ).filter(
        DailyPrice.price_change_percent.isnot(None),
        DailyPrice.price_change_percent < 0
    ).order_by(
        DailyPrice.price_change_percent
    ).limit(10).all()

    for i, (company, price) in enumerate(losers, 1):
        print(f"{i:2d}. {company.symbol:15s} - Change: {price.price_change_percent:>6.2f}% - Last: {price.price_last}")

# Example 4: Market statistics
print("\n4. MARKET STATISTICS")
print("-"*80)
with db.get_session() as session:
    stats = session.query(
        func.count(DailyPrice.id).label('total_stocks'),
        func.avg(DailyPrice.price_change_percent).label('avg_change'),
        func.sum(DailyPrice.q_tot_tran_5j).label('total_volume'),
        func.sum(DailyPrice.q_tot_cap).label('total_value')
    ).first()

    print(f"Total stocks with prices: {stats.total_stocks:,}")
    print(f"Average price change:     {stats.avg_change:.2f}%")
    print(f"Total trading volume:     {stats.total_volume:,}" if stats.total_volume else "N/A")
    print(f"Total trading value:      {stats.total_value:,}" if stats.total_value else "N/A")

# Example 5: Funds statistics
print("\n5. INVESTMENT FUNDS STATISTICS")
print("-"*80)
with db.get_session() as session:
    funds_count = session.query(Company).filter(
        Company.ins_code >= 2000000000000000
    ).count()

    funds_with_nav = session.query(FinancialIndicator).filter(
        FinancialIndicator.nav.isnot(None)
    ).count()

    avg_nav = session.query(func.avg(FinancialIndicator.nav)).filter(
        FinancialIndicator.nav.isnot(None)
    ).scalar()

    print(f"Total funds:              {funds_count:,}")
    print(f"Funds with NAV data:      {funds_with_nav:,}")
    print(f"Average NAV:              {avg_nav:.2f}" if avg_nav else "N/A")

# Example 6: Search for specific company
print("\n6. SEARCH EXAMPLE (companies containing 'فولاد')")
print("-"*80)
with db.get_session() as session:
    results = session.query(Company, DailyPrice).outerjoin(
        DailyPrice, Company.ins_code == DailyPrice.ins_code
    ).filter(
        Company.name_fa.like('%فولاد%')
    ).limit(5).all()

    for company, price in results:
        if price:
            print(f"- {company.symbol}: {company.name_fa} - Last: {price.price_last}, Change: {price.price_change_percent}%")
        else:
            print(f"- {company.symbol}: {company.name_fa} - No price data")

print("\n" + "="*80)
print("Query examples completed!")
print("="*80)
print("\nThe database is fully functional and ready for:")
print("  - Custom queries and analysis")
print("  - Data visualization and reporting")
print("  - Integration with trading algorithms")
print("  - Real-time monitoring (once TSETMC API is accessible)")
print("="*80)
