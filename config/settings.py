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
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5434/tsetmc')

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
MARKET_WATCH_INTERVAL = float(os.getenv('MARKET_WATCH_INTERVAL', '2.5'))
INSTRUMENT_DETAILS_INTERVAL = int(os.getenv('INSTRUMENT_DETAILS_INTERVAL', '1440'))  # Daily
HISTORICAL_BACKFILL_INTERVAL = int(os.getenv('HISTORICAL_BACKFILL_INTERVAL', '10080'))  # Weekly

# API settings
TSETMC_BASE_URL = os.getenv('TSETMC_BASE_URL', 'https://old.tsetmc.com/tsev2/data')
BRSAPI_BASE_URL = os.getenv('BRSAPI_BASE_URL', 'https://BrsApi.ir/Api/Tsetmc')

# BRSAPI_KEY is REQUIRED - no default for security
BRSAPI_KEY = os.getenv('BRSAPI_KEY')
if not BRSAPI_KEY:
    raise ValueError(
        "BRSAPI_KEY environment variable is required. "
        "Please set it in your .env file or environment. "
        "Get your key from https://BrsApi.ir"
    )

REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '30'))

# Redis settings
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
REDIS_ENABLED = os.getenv('REDIS_ENABLED', 'true').lower() == 'true'
REDIS_KEY_PREFIX = os.getenv('REDIS_KEY_PREFIX', 'tse:')

# Gunicorn settings
GUNICORN_WORKERS = int(os.getenv('GUNICORN_WORKERS', '4'))
SERVE_STATIC = os.getenv('SERVE_STATIC', 'true').lower() == 'true'

# Security settings
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173')
CORS_ORIGINS_LIST = [origin.strip() for origin in CORS_ORIGINS.split(',')]

# JWT settings (for future authentication)
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_MINUTES = int(os.getenv('JWT_EXPIRATION_MINUTES', '60'))

# Monitoring settings
ENABLE_STATISTICS = os.getenv('ENABLE_STATISTICS', 'true').lower() == 'true'
ENABLE_EMAIL_ALERTS = os.getenv('ENABLE_EMAIL_ALERTS', 'false').lower() == 'true'
ALERT_EMAIL = os.getenv('ALERT_EMAIL', '')

# RAG Pipeline settings
PDF_DIR = DATA_DIR / 'pdfs'
PDF_DIR.mkdir(exist_ok=True)

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small')
EMBEDDING_DIMENSIONS = int(os.getenv('EMBEDDING_DIMENSIONS', '1536'))
EMBEDDING_BATCH_SIZE = int(os.getenv('EMBEDDING_BATCH_SIZE', '100'))

CHUNK_SIZE = int(os.getenv('CHUNK_SIZE', '1000'))
CHUNK_OVERLAP = int(os.getenv('CHUNK_OVERLAP', '200'))
OCR_FALLBACK_THRESHOLD = int(os.getenv('OCR_FALLBACK_THRESHOLD', '50'))

RAG_CHAT_MODEL = os.getenv('RAG_CHAT_MODEL', 'google/gemini-2.0-flash-001')
RAG_TOP_K = int(os.getenv('RAG_TOP_K', '5'))

# Available LLM models for chat (via OpenRouter)
AVAILABLE_MODELS = [
    {"id": "google/gemini-2.0-flash-001", "name": "Gemini 2.0 Flash", "provider": "Google"},
    {"id": "openai/gpt-4o", "name": "GPT-4o", "provider": "OpenAI"},
    {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "provider": "OpenAI"},
    {"id": "anthropic/claude-sonnet-4", "name": "Claude Sonnet 4", "provider": "Anthropic"},
    {"id": "google/gemini-2.5-pro-preview", "name": "Gemini 2.5 Pro", "provider": "Google"},
]
