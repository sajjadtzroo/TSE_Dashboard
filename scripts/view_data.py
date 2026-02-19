"""
View imported data - exports to CSV and shows statistics
Avoids console encoding issues
"""

import csv
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import desc, func

from config.settings import DATABASE_URL
from database.connection import get_db_manager
from database.models import Company, DailyPrice, FinancialIndicator

print("=" * 80)
print("TSETMC Data Viewer")
print("=" * 80)

db = get_db_manager(DATABASE_URL)

# Create exports directory
exports_dir = project_root / "exports"
exports_dir.mkdir(exist_ok=True)

# 1. Export all stocks to CSV
print("\n1. Exporting stocks to CSV...")
with db.get_session() as session:
    stocks = (
        session.query(Company, DailyPrice)
        .join(DailyPrice, Company.ins_code == DailyPrice.ins_code)
        .filter(Company.ins_code < 2000000000000000)
        .all()
    )

    csv_file = exports_dir / "stocks_data.csv"
    with open(csv_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "InsCode",
                "Symbol",
                "Name",
                "Date",
                "Last Price",
                "First Price",
                "Change %",
                "Volume",
                "Value",
                "Trades",
            ]
        )

        for company, price in stocks:
            writer.writerow(
                [
                    company.ins_code,
                    company.symbol or "",
                    company.name_fa or "",
                    price.d_even,
                    price.price_last or 0,
                    price.price_first or 0,
                    (
                        f"{price.price_change_percent:.2f}"
                        if price.price_change_percent
                        else "0"
                    ),
                    price.q_tot_tran_5j or 0,
                    price.q_tot_cap or 0,
                    price.z_tot_tran or 0,
                ]
            )

    print(f"   Exported {len(stocks)} stocks to: {csv_file}")

# 2. Export funds to CSV
print("\n2. Exporting funds to CSV...")
with db.get_session() as session:
    funds = (
        session.query(Company, FinancialIndicator)
        .outerjoin(FinancialIndicator, Company.ins_code == FinancialIndicator.ins_code)
        .filter(Company.ins_code >= 2000000000000000)
        .all()
    )

    csv_file = exports_dir / "funds_data.csv"
    with open(csv_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["InsCode", "Symbol", "Name", "Type", "NAV"])

        for company, financial in funds:
            writer.writerow(
                [
                    company.ins_code,
                    company.symbol or "",
                    company.name_fa or "",
                    company.sector_name_fa or "",
                    financial.nav if financial else "",
                ]
            )

    print(f"   Exported {len(funds)} funds to: {csv_file}")

# 3. Export top gainers
print("\n3. Exporting top gainers...")
with db.get_session() as session:
    gainers = (
        session.query(Company, DailyPrice)
        .join(DailyPrice)
        .filter(DailyPrice.price_change_percent > 0)
        .order_by(desc(DailyPrice.price_change_percent))
        .limit(50)
        .all()
    )

    csv_file = exports_dir / "top_gainers.csv"
    with open(csv_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["Rank", "Symbol", "Name", "Last Price", "Change %", "Volume"])

        for i, (company, price) in enumerate(gainers, 1):
            writer.writerow(
                [
                    i,
                    company.symbol or "",
                    company.name_fa or "",
                    price.price_last or 0,
                    (
                        f"{price.price_change_percent:.2f}"
                        if price.price_change_percent
                        else "0"
                    ),
                    price.q_tot_tran_5j or 0,
                ]
            )

    print(f"   Exported {len(gainers)} top gainers to: {csv_file}")

# 4. Export top losers
print("\n4. Exporting top losers...")
with db.get_session() as session:
    losers = (
        session.query(Company, DailyPrice)
        .join(DailyPrice)
        .filter(DailyPrice.price_change_percent < 0)
        .order_by(DailyPrice.price_change_percent)
        .limit(50)
        .all()
    )

    csv_file = exports_dir / "top_losers.csv"
    with open(csv_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["Rank", "Symbol", "Name", "Last Price", "Change %", "Volume"])

        for i, (company, price) in enumerate(losers, 1):
            writer.writerow(
                [
                    i,
                    company.symbol or "",
                    company.name_fa or "",
                    price.price_last or 0,
                    (
                        f"{price.price_change_percent:.2f}"
                        if price.price_change_percent
                        else "0"
                    ),
                    price.q_tot_tran_5j or 0,
                ]
            )

    print(f"   Exported {len(losers)} top losers to: {csv_file}")

# 5. Export high volume stocks
print("\n5. Exporting high volume stocks...")
with db.get_session() as session:
    high_vol = (
        session.query(Company, DailyPrice)
        .join(DailyPrice)
        .filter(DailyPrice.q_tot_tran_5j.isnot(None))
        .order_by(desc(DailyPrice.q_tot_tran_5j))
        .limit(50)
        .all()
    )

    csv_file = exports_dir / "high_volume.csv"
    with open(csv_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["Rank", "Symbol", "Name", "Volume", "Last Price", "Change %"])

        for i, (company, price) in enumerate(high_vol, 1):
            writer.writerow(
                [
                    i,
                    company.symbol or "",
                    company.name_fa or "",
                    price.q_tot_tran_5j or 0,
                    price.price_last or 0,
                    (
                        f"{price.price_change_percent:.2f}"
                        if price.price_change_percent
                        else "0"
                    ),
                ]
            )

    print(f"   Exported {len(high_vol)} high volume stocks to: {csv_file}")

# 6. Statistics summary
print("\n6. Generating statistics summary...")
with db.get_session() as session:
    # Overall stats
    total_companies = session.query(Company).count()
    total_stocks = (
        session.query(Company).filter(Company.ins_code < 2000000000000000).count()
    )
    total_funds = (
        session.query(Company).filter(Company.ins_code >= 2000000000000000).count()
    )
    total_prices = session.query(DailyPrice).count()

    # Market stats
    stats = session.query(
        func.count(DailyPrice.id).label("count"),
        func.avg(DailyPrice.price_change_percent).label("avg_change"),
        func.sum(DailyPrice.q_tot_tran_5j).label("total_volume"),
        func.sum(DailyPrice.q_tot_cap).label("total_value"),
    ).first()

    # Gainers/Losers count
    gainers_count = (
        session.query(DailyPrice).filter(DailyPrice.price_change_percent > 0).count()
    )
    losers_count = (
        session.query(DailyPrice).filter(DailyPrice.price_change_percent < 0).count()
    )
    unchanged_count = (
        session.query(DailyPrice).filter(DailyPrice.price_change_percent == 0).count()
    )

    csv_file = exports_dir / "market_statistics.csv"
    with open(csv_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Companies", total_companies])
        writer.writerow(["Stocks", total_stocks])
        writer.writerow(["Funds", total_funds])
        writer.writerow(["Price Records", total_prices])
        writer.writerow([""])
        writer.writerow(["Gainers", gainers_count])
        writer.writerow(["Losers", losers_count])
        writer.writerow(["Unchanged", unchanged_count])
        writer.writerow([""])
        writer.writerow(
            ["Average Change %", f"{stats.avg_change:.2f}" if stats.avg_change else "0"]
        )
        writer.writerow(["Total Volume", stats.total_volume or 0])
        writer.writerow(["Total Value", stats.total_value or 0])

    print(f"   Statistics saved to: {csv_file}")

# Print summary
print("\n" + "=" * 80)
print("Data Export Complete!")
print("=" * 80)
print(f"\nAll files saved to: {exports_dir}")
print("\nExported files:")
print(f"  1. stocks_data.csv       - All {total_stocks} stocks")
print(f"  2. funds_data.csv        - All {total_funds} funds")
print("  3. top_gainers.csv       - Top 50 gainers")
print("  4. top_losers.csv        - Top 50 losers")
print("  5. high_volume.csv       - Top 50 by volume")
print("  6. market_statistics.csv - Market summary")
print("\nOpen these CSV files in Excel to view the data!")
print("=" * 80)
