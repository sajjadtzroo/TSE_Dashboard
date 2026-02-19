"""
Update All Stock Data
Runs both market_watch and instrument_details spiders to get complete data
Run this during trading hours (Sun-Wed 09:00-12:30 Tehran time) for best results
"""

import subprocess
import sys
from datetime import datetime

import pytz


def check_trading_hours():
    """Check if we're in trading hours"""
    tehran_tz = pytz.timezone("Asia/Tehran")
    now = datetime.now(tehran_tz)

    # Trading days: Sunday(6) to Wednesday(2)
    weekday = now.weekday()
    hour = now.hour
    minute = now.minute

    is_trading_day = weekday in [6, 0, 1, 2]  # Sun, Mon, Tue, Wed
    is_trading_hours = (
        (hour == 9 and minute >= 0)
        or (hour > 9 and hour < 12)
        or (hour == 12 and minute <= 30)
    )

    print(f"Current Tehran time: {now.strftime('%Y-%m-%d %H:%M:%S %A')}")
    print(f"Trading day: {'Yes' if is_trading_day else 'No (Trading: Sun-Wed)'}")
    print(
        f"Trading hours: {'Yes' if is_trading_hours else 'No (Trading: 09:00-12:30)'}"
    )
    print()

    if not is_trading_day or not is_trading_hours:
        print(
            "⚠️  WARNING: Outside trading hours - TSETMC API may have limited availability"
        )
        response = input("Continue anyway? (y/n): ")
        if response.lower() != "y":
            print("Exiting...")
            return False

    return True


def run_spider(spider_name, description):
    """Run a specific spider"""
    print(f"\n{'='*80}")
    print(f"Running {spider_name} spider: {description}")
    print(f"{'='*80}\n")

    try:
        subprocess.run(
            [
                sys.executable,
                "-m",
                "scrapy",
                "crawl",
                spider_name,
                "-s",
                "LOG_LEVEL=INFO",
            ],
            check=True,
            capture_output=False,
        )
        print(f"\n✅ {spider_name} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ {spider_name} failed with error code {e.returncode}")
        return False


def main():
    """Main function"""
    print("\n" + "=" * 80)
    print("TSETMC Data Update Script")
    print("=" * 80 + "\n")

    if not check_trading_hours():
        sys.exit(1)

    # Step 1: Get latest prices and basic info
    success1 = run_spider("market_watch", "Latest prices and client type data")

    # Step 2: Get detailed financial indicators
    success2 = run_spider(
        "instrument_details", "Company details and financial indicators"
    )

    # Summary
    print("\n" + "=" * 80)
    print("Update Summary")
    print("=" * 80)
    print(f"Market Watch: {'✅ Success' if success1 else '❌ Failed'}")
    print(f"Instrument Details: {'✅ Success' if success2 else '❌ Failed'}")
    print()

    if success1 and success2:
        print("🎉 All data updated successfully!")
        print("\nYou can now view complete data in the dashboard:")
        print("  - Latest prices")
        print("  - P/E ratios")
        print("  - EPS")
        print("  - Market Cap")
        print("  - 52-week high/low")
        print("  - Client type data")
    else:
        print("⚠️  Some scrapers failed. Check logs/scrapy.log for details.")
        print("\nCommon issues:")
        print("  - Run during trading hours for best results")
        print("  - TSETMC may be blocking requests (try again in a few minutes)")
        print("  - Check your internet connection")


if __name__ == "__main__":
    main()
