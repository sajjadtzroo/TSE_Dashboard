"""
Application configuration settings
Loads settings from environment variables
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Project paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'data'
LOGS_DIR = BASE_DIR / 'logs'

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# Database settings
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///data/tsetmc.db')

# Logging settings
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = os.getenv('LOG_FILE', 'logs/tsetmc_scraper.log')

# Scrapy settings
CONCURRENT_REQUESTS = int(os.getenv('CONCURRENT_REQUESTS', '16'))
DOWNLOAD_DELAY = float(os.getenv('DOWNLOAD_DELAY', '0.5'))
RETRY_TIMES = int(os.getenv('RETRY_TIMES', '5'))

# Scheduler settings
SCHEDULER_ENABLED = os.getenv('SCHEDULER_ENABLED', 'true').lower() == 'true'
TIMEZONE = os.getenv('TIMEZONE', 'Asia/Tehran')

# Trading hours (Tehran Time)
MARKET_OPEN_HOUR = int(os.getenv('MARKET_OPEN_HOUR', '9'))
MARKET_OPEN_MINUTE = int(os.getenv('MARKET_OPEN_MINUTE', '0'))
MARKET_CLOSE_HOUR = int(os.getenv('MARKET_CLOSE_HOUR', '12'))
MARKET_CLOSE_MINUTE = int(os.getenv('MARKET_CLOSE_MINUTE', '30'))

# Update intervals (minutes)
MARKET_WATCH_INTERVAL = int(os.getenv('MARKET_WATCH_INTERVAL', '2'))
INSTRUMENT_DETAILS_INTERVAL = int(os.getenv('INSTRUMENT_DETAILS_INTERVAL', '1440'))  # Daily
HISTORICAL_BACKFILL_INTERVAL = int(os.getenv('HISTORICAL_BACKFILL_INTERVAL', '10080'))  # Weekly

# API settings
TSETMC_BASE_URL = os.getenv('TSETMC_BASE_URL', 'https://old.tsetmc.com/tsev2/data')
BRSAPI_BASE_URL = os.getenv('BRSAPI_BASE_URL', 'https://BrsApi.ir/Api/Tsetmc')
BRSAPI_KEY = os.getenv('BRSAPI_KEY', 'BzvJaiT4ArX6NuJcVscLyhyNyTje78LC')
REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '30'))

# Monitoring settings
ENABLE_STATISTICS = os.getenv('ENABLE_STATISTICS', 'true').lower() == 'true'
ENABLE_EMAIL_ALERTS = os.getenv('ENABLE_EMAIL_ALERTS', 'false').lower() == 'true'
ALERT_EMAIL = os.getenv('ALERT_EMAIL', '')
