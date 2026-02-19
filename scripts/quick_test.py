"""Quick test of market_watch spider"""

import subprocess
from pathlib import Path

project_root = Path(__file__).parent.parent

print("=" * 80)
print("Quick Test: Market Watch Spider")
print("=" * 80)
print("\nFetching market data from TSETMC...")
print("(Limited to first 20 items for quick testing)\n")

# Run spider with item limit
cmd = [
    "python",
    "-m",
    "scrapy",
    "crawl",
    "market_watch",
    "-s",
    "CLOSESPIDER_ITEMCOUNT=20",
    "-s",
    "LOG_LEVEL=INFO",
]

result = subprocess.run(cmd, cwd=str(project_root))

print("\n" + "=" * 80)
if result.returncode == 0:
    print("✓ Spider completed successfully!")
    print("\nNow checking database...")

    # Check database
    from config.settings import DATABASE_URL
    from database.connection import get_db_manager
    from database.models import Company, DailyPrice

    db = get_db_manager(DATABASE_URL)
    with db.get_session() as session:
        price_count = session.query(DailyPrice).count()
        company_count = session.query(Company).count()

        print("\nDatabase status:")
        print(f"  - Companies: {company_count}")
        print(f"  - Price records: {price_count}")

        if price_count > 0:
            print(f"\n✓ SUCCESS! Collected {price_count} price records")

            # Show sample
            sample = session.query(DailyPrice).limit(5).all()
            print("\nSample data:")
            for price in sample:
                print(
                    f"  - InsCode {price.ins_code}: Last={price.price_last}, Volume={price.q_tot_tran_5j}"
                )
        else:
            print("\n⚠️ No data collected yet")

else:
    print("✗ Spider failed")

print("=" * 80)
