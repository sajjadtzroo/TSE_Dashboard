# How to Get Complete Stock Data (P/E, EPS, etc.)

## The Issue

Your dashboard currently shows:
- ✅ Prices, volumes, changes (1285 stocks)
- ❌ P/E ratios, EPS, Market Cap (incomplete)

## Why?

TSETMC's API is **only reliable during trading hours**:
- 📅 **Trading Days**: Sunday - Wednesday
- ⏰ **Trading Hours**: 09:00 - 12:30 (Tehran time)
- 🚫 **Outside these hours**: API often doesn't respond or returns incomplete data

## Solution

### Option 1: Manual Update (Quickest)

Run this script during trading hours:

```bash
python scripts/update_all_data.py
```

This will:
1. Check if you're in trading hours
2. Run `market_watch` spider (prices)
3. Run `instrument_details` spider (P/E, EPS, financials)
4. Show success/failure summary

**Time**: ~5-10 minutes for all 1285 stocks

### Option 2: Automatic Updates (Set and Forget)

Run the scheduler - it will automatically update data during trading hours:

```bash
python scheduler/scheduler.py
```

Schedule:
- **Every 2 minutes**: Price updates (09:00-12:30, trading days)
- **Daily at 15:00**: Financial indicators
- **Weekly**: Historical backfill

### Option 3: Manual Spider Runs

If you want more control:

```bash
# Get latest prices
python -m scrapy crawl market_watch

# Get financial indicators (P/E, EPS, etc.)
python -m scrapy crawl instrument_details

# Get historical data for a specific stock
python -m scrapy crawl historical_prices -a ins_codes=8509797923681353
```

## Checking Your Data

After running the scripts, verify in the dashboard:

1. **Open dashboard**: http://localhost:3000/market
2. **Check columns**: P/E, EPS, Market Cap should have values (not "-")
3. **Click a stock**: Financial indicators should show in the detail view

Or check via command line:

```bash
python -c "
from database.connection import get_db_manager
from database.models import FinancialIndicator
from config.settings import DATABASE_URL

db = get_db_manager(DATABASE_URL)
with db.get_session() as session:
    with_pe = session.query(FinancialIndicator).filter(
        FinancialIndicator.pe_ratio.isnot(None)
    ).count()
    print(f'Stocks with P/E ratio: {with_pe} / 1285')
"
```

## Current Tehran Time

Check if you're in trading hours:

```bash
python -c "
from datetime import datetime
import pytz

tz = pytz.timezone('Asia/Tehran')
now = datetime.now(tz)
print(f'Tehran time: {now.strftime(\"%A %H:%M\")}')
print(f'Trading: Sun-Wed 09:00-12:30')
"
```

## Troubleshooting

### "API not responding"
- ⏰ Wait for trading hours
- 🔄 Try again in 5-10 minutes
- 🌐 Check internet connection

### "403 Forbidden" or "502 Bad Gateway"
- Normal for TSETMC - the scraper has retry logic
- If persistent, increase delay: `-s DOWNLOAD_DELAY=2.0`

### "Timeout errors"
- TSETMC is slow/overloaded
- The scraper will retry automatically
- Be patient - it may take 10-15 minutes

### Still no data after scraping?
- Check logs: `tail -100 logs/scrapy.log`
- TSETMC might not provide P/E for all stocks (some may be funds)
- Run: `python scripts/view_data.py` to see what's available

## Next Steps

1. **Now**: Note your current Tehran time
2. **During trading hours**: Run `python scripts/update_all_data.py`
3. **After success**: Refresh your dashboard
4. **Long term**: Set up scheduler for automatic updates

Your dashboard will then show **complete financial data** for all stocks!
