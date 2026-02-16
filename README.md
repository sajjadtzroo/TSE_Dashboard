# TSETMC Real-Time Stock Market Scraper

A production-ready web scraper for the Tehran Stock Exchange (TSETMC) that collects real-time and historical data for all listed companies.

## Features

- **Real-time Data Collection**: Captures current prices, volume, and trades every 2 minutes during trading hours
- **Comprehensive Coverage**: Monitors all companies listed on the Iran stock market
- **Historical Backfill**: Full historical data retrieval capability
- **Financial Indicators**: P/E ratio, EPS, market cap, and other valuation metrics
- **Client Type Analysis**: Legal vs. real trader activity tracking
- **Automated Scheduling**: APScheduler for automatic execution during trading hours
- **Database Storage**: SQLite with easy PostgreSQL migration path
- **Robust Error Handling**: Retry logic for TSETMC's frequent 403 errors

## Architecture

### Multi-Spider Design

The scraper uses 5 specialized spiders:

1. **MarketWatchSpider** - Real-time prices for all instruments (runs every 2 min)
2. **InstrumentDetailsSpider** - Company metadata and financial indicators (daily)
3. **HistoricalPricesSpider** - Historical price backfill (weekly/on-demand)
4. **IntradayDataSpider** - Tick-by-tick trade data (optional)
5. **OrderBookSpider** - Order book depth snapshots (optional)

### Technology Stack

- **Scrapy 2.14** - Web scraping framework
- **SQLAlchemy 2.0** - Database ORM
- **APScheduler 3.11** - Job scheduling
- **SQLite** - Database (PostgreSQL-ready)
- **Pydantic 2.x** - Data validation

## Project Structure

```
D:\Bourse\
├── tsetmc_scraper/         # Main Scrapy project
│   ├── spiders/            # Spider modules
│   │   ├── market_watch.py
│   │   ├── instrument_details.py
│   │   └── historical_prices.py
│   ├── items.py            # Data models
│   ├── pipelines.py        # Data processing
│   ├── settings.py         # Scrapy configuration
│   └── utils.py            # Utility functions
│
├── database/               # Database layer
│   ├── models.py           # SQLAlchemy ORM models
│   ├── connection.py       # DB connection management
│   └── schema.py           # Schema utilities
│
├── scheduler/              # Scheduling system
│   ├── scheduler.py        # APScheduler config
│   └── jobs.py             # Job definitions
│
├── config/                 # Configuration
│   ├── settings.py         # App settings
│   └── logging.yaml        # Logging config
│
├── scripts/                # Utility scripts
│   ├── init_db.py          # Initialize database
│   ├── run_spider.py       # Manual spider execution
│   └── backfill_history.py # Historical backfill
│
├── logs/                   # Log files
└── data/                   # SQLite database
```

## Installation

### Prerequisites

- Python 3.8 or higher
- Git

### Setup

1. **Clone or navigate to the project directory**:
   ```bash
   cd D:\Bourse
   ```

2. **Install dependencies**:
   ```bash
   python -m pip install -r requirements.txt
   ```

3. **Configure environment** (optional):
   ```bash
   # Copy example environment file
   cp .env.example .env

   # Edit .env with your settings
   notepad .env
   ```

4. **Initialize database**:
   ```bash
   python scripts/init_db.py
   ```

## Usage

### Manual Spider Execution

#### 1. Run Market Watch (Real-time Data)
```bash
python -m scrapy crawl market_watch
```

#### 2. Run Instrument Details (Company Metadata)
```bash
python -m scrapy crawl instrument_details
```

#### 3. Run Historical Backfill
```bash
# All instruments
python -m scrapy crawl historical_prices

# Specific instruments
python -m scrapy crawl historical_prices -a ins_codes=12345678901234567,98765432109876543
```

#### 4. Run All Spiders
```bash
python scripts/run_spider.py all
```

### Scheduled Execution

Start the automatic scheduler (runs spiders during trading hours):

```bash
python scheduler/scheduler.py
```

**Schedule:**
- **Market Watch**: Every 2 minutes (Sun-Wed, 09:00-12:30 Tehran time)
- **Instrument Details**: Daily at 15:00
- **Historical Backfill**: Weekly on Sunday at 02:00
- **Database Backup**: Daily at 01:00
- **Log Cleanup**: Weekly on Saturday at 03:00

### Historical Data Backfill

For comprehensive historical data collection:

```bash
# Backfill all instruments in batches
python scripts/backfill_history.py

# Custom batch size
python scripts/backfill_history.py --batch-size 50
```

## Database Schema

### Core Tables

**companies** - Master instrument registry
- `ins_code` (BIGINT, PK) - Unique instrument identifier
- `symbol`, `name_fa`, `name_en` - Company identifiers
- `isin` - International Securities ID
- `sector_name_fa`, `sector_name_en` - Industry sector
- `is_active` - Trading status

**daily_prices** - Daily OHLCV data
- `ins_code`, `d_even` (date as YYYYMMDD)
- `price_first`, `price_last`, `price_min`, `price_max` - OHLC
- `price_change`, `price_change_percent`
- `q_tot_tran_5j` (volume), `q_tot_cap` (value), `z_tot_tran` (trades)

**financial_indicators** - Financial metrics
- `market_cap`, `pe_ratio`, `eps`, `estimated_eps`
- `min_week`, `max_week`, `min_year`, `max_year`
- `price_threshold_min`, `price_threshold_max`

**client_type** - Trader activity
- Real/legal buyer/seller counts, volumes, values

**scraper_status** - Monitoring logs

### Query Examples

```python
from database.connection import get_db_manager
from database.models import Company, DailyPrice
from config.settings import DATABASE_URL

db_manager = get_db_manager(DATABASE_URL)

with db_manager.get_session() as session:
    # Get all active companies
    companies = session.query(Company).filter(Company.is_active == True).all()

    # Get latest prices
    latest_prices = session.query(DailyPrice).filter(
        DailyPrice.d_even == 20260214
    ).all()

    # Get specific company's price history
    prices = session.query(DailyPrice).filter(
        DailyPrice.ins_code == 12345678901234567
    ).order_by(DailyPrice.d_even.desc()).limit(30).all()
```

## Configuration

### Environment Variables (.env)

Key settings in `.env`:

```env
# Database
DATABASE_URL=sqlite:///data/tsetmc.db

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/tsetmc_scraper.log

# Scrapy
CONCURRENT_REQUESTS=16
DOWNLOAD_DELAY=0.5
RETRY_TIMES=5

# Trading Hours
MARKET_OPEN_HOUR=9
MARKET_CLOSE_HOUR=12
```

### Scrapy Settings (tsetmc_scraper/settings.py)

- **Retry Logic**: 5 retries for 403 errors (TSETMC frequently returns 403)
- **AutoThrottle**: Enabled to prevent overloading
- **Concurrent Requests**: 16 (conservative)
- **Download Delay**: 500ms between requests

## Monitoring

### Logs

- **Scrapy logs**: `logs/scrapy.log`
- **Scheduler logs**: `logs/scheduler.log`
- **Database init**: `logs/init_db.log`
- **Error logs**: `logs/errors.log`

### Database Status

Check scraper execution history:

```python
from database.models import ScraperStatus

with db_manager.get_session() as session:
    recent_runs = session.query(ScraperStatus).order_by(
        ScraperStatus.start_time.desc()
    ).limit(10).all()

    for run in recent_runs:
        print(f"{run.spider_name}: {run.status} - {run.items_scraped} items")
```

## Troubleshooting

### Common Issues

**1. 403 Errors**
- Normal for TSETMC; retry logic handles this automatically
- If persistent, increase `DOWNLOAD_DELAY` in settings

**2. Database Locked**
- SQLite limitation with concurrent writes
- Consider migrating to PostgreSQL for production

**3. Missing Data**
- Run `instrument_details` spider first to populate companies
- Then run `historical_prices` for backfill

**4. Scheduler Not Running**
- Check `SCHEDULER_ENABLED=true` in `.env`
- Verify timezone settings (`TIMEZONE=Asia/Tehran`)

### Reset Database

```bash
# WARNING: This deletes all data!
python scripts/init_db.py --drop
```

## Migration to PostgreSQL

For production deployment with high volume:

1. **Install PostgreSQL**:
   ```bash
   python -m pip install psycopg2-binary
   ```

2. **Update DATABASE_URL** in `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/tsetmc
   ```

3. **Initialize PostgreSQL database**:
   ```bash
   createdb tsetmc
   python scripts/init_db.py
   ```

4. **Benefits**:
   - Better concurrent write handling
   - Advanced indexing
   - Table partitioning for large datasets
   - Better performance for complex queries

## Performance Optimization

### Database Indexes

All critical indexes are pre-configured:
- `ins_code` (all tables)
- `d_even` (date-based queries)
- `symbol` (company lookups)
- `sector_name_fa` (sector analysis)

### Scrapy Optimization

```python
# In tsetmc_scraper/settings.py
CONCURRENT_REQUESTS = 16          # Adjust based on network
DOWNLOAD_DELAY = 0.5              # Balance speed vs. politeness
AUTOTHROTTLE_TARGET_CONCURRENCY = 4.0  # Auto-adjust delays
```

## API Endpoints Reference

Main TSETMC endpoints used:

1. **Market Watch**: `http://tsetmc.com/api/ClosingPrice/GetClosingPriceDailyAllInst`
2. **Instrument Details**: `http://tsetmc.com/api/Instrument/GetInstrumentInfo/{InsCode}`
3. **Historical Prices**: `http://tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/{InsCode}/0`
4. **Client Type**: `http://tsetmc.com/api/ClientType/GetClientTypeAll`

## Development

### Adding New Spiders

1. Create spider file in `tsetmc_scraper/spiders/`
2. Define items in `items.py`
3. Add pipeline handling in `pipelines.py`
4. Update scheduler in `scheduler/scheduler.py`

### Testing

```bash
# Test single spider
python -m scrapy crawl market_watch -s LOG_LEVEL=DEBUG

# Test with limited items
python -m scrapy crawl historical_prices -a ins_codes=12345678901234567 -s CLOSESPIDER_ITEMCOUNT=10
```

## License

This project is for educational and research purposes. Please respect TSETMC's terms of service and rate limits.

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review error messages in `logs/errors.log`
3. Ensure database is initialized: `python scripts/init_db.py`

## Roadmap

- [ ] Add order book depth tracking
- [ ] Implement intraday tick data collection
- [ ] Add data export to CSV/Excel
- [ ] Create data visualization dashboard
- [ ] Add Telegram/Email alerts
- [ ] Implement data quality checks
- [ ] Add PostgreSQL partitioning

---

**Current Status**: Production-ready v1.0

**Last Updated**: February 2026
