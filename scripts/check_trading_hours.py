"""
Check Trading Hours
Shows current Tehran time and whether it's a good time to scrape data
"""
from datetime import datetime, timedelta
import pytz

def main():
    tehran_tz = pytz.timezone('Asia/Tehran')
    now = datetime.now(tehran_tz)

    # Trading schedule
    trading_days = [6, 0, 1, 2]  # Sunday(6), Monday(0), Tuesday(1), Wednesday(2)
    trading_start = 9  # 09:00
    trading_end_hour = 12
    trading_end_minute = 30  # 12:30

    weekday = now.weekday()
    hour = now.hour
    minute = now.minute

    is_trading_day = weekday in trading_days
    is_trading_hours = (
        (hour == trading_start and minute >= 0) or
        (hour > trading_start and hour < trading_end_hour) or
        (hour == trading_end_hour and minute <= trading_end_minute)
    )

    print("="*80)
    print("TSETMC Trading Hours Check")
    print("="*80)
    print()
    print(f"Current Tehran Time: {now.strftime('%A, %B %d, %Y')}")
    print(f"Current Time: {now.strftime('%H:%M:%S')}")
    print()
    print("Trading Schedule:")
    print("  Days:  Sunday - Wednesday")
    print("  Hours: 09:00 - 12:30 (Tehran time)")
    print()

    if is_trading_day and is_trading_hours:
        print("[OPEN] MARKET IS OPEN - Good time to scrape!")
        print()
        print("Run this command to get all data:")
        print("  python scripts/update_all_data.py")
        print()

        # Calculate time until market close
        close_time = now.replace(hour=12, minute=30, second=0, microsecond=0)
        time_remaining = close_time - now
        hours_remaining = time_remaining.seconds // 3600
        minutes_remaining = (time_remaining.seconds % 3600) // 60
        print(f"Time until market closes: {hours_remaining}h {minutes_remaining}m")

    elif is_trading_day:
        # Trading day but outside hours
        if hour < trading_start:
            # Before market opens
            open_time = now.replace(hour=9, minute=0, second=0, microsecond=0)
            time_until = open_time - now
            hours = time_until.seconds // 3600
            minutes = (time_until.seconds % 3600) // 60
            print(f"[WAITING] Market opens in: {hours}h {minutes}m")
            print(f"          Opens at: 09:00")
        else:
            # After market closes
            print("[CLOSED] Market is CLOSED for today")
            # Find next trading day
            next_day = now + timedelta(days=1)
            while next_day.weekday() not in trading_days:
                next_day += timedelta(days=1)
            next_open = next_day.replace(hour=9, minute=0, second=0, microsecond=0)
            time_until = next_open - now
            days = time_until.days
            hours = time_until.seconds // 3600
            print(f"         Next trading: {next_open.strftime('%A, %B %d at 09:00')}")
            print(f"         Opens in: {days}d {hours}h")
    else:
        # Not a trading day
        print("[CLOSED] Market is CLOSED")
        # Find next trading day
        next_day = now + timedelta(days=1)
        while next_day.weekday() not in trading_days:
            next_day += timedelta(days=1)
        next_open = next_day.replace(hour=9, minute=0, second=0, microsecond=0)
        time_until = next_open - now
        days = time_until.days
        hours = time_until.seconds // 3600

        print(f"         Today is {now.strftime('%A')} (not a trading day)")
        print(f"         Next trading: {next_open.strftime('%A, %B %d at 09:00')}")
        print(f"         Opens in: {days}d {hours}h")

    print()
    print("="*80)
    print()

    if not (is_trading_day and is_trading_hours):
        print("TIP: Run the scheduler to automatically scrape during trading hours:")
        print("     python scheduler/scheduler.py")
        print()
        print("     The scheduler will:")
        print("     - Wait for trading hours")
        print("     - Scrape prices every 2 minutes")
        print("     - Update financial indicators daily")
        print()

if __name__ == "__main__":
    main()
