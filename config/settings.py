"""
Application configuration settings
Loads settings from environment variables
"""

import os
from pathlib import Path

from dotenv import load_dotenv

from config.env import parse_bool_env

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Project paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# Database settings — REQUIRED, no hardcoded credentials
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is required. "
        "Please set it in your .env file or environment. "
        "Example: postgresql://user:password@localhost:5432/tsetmc"
    )

# Logging settings
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.getenv("LOG_FILE", "logs/tsetmc_scraper.log")

# Scrapy settings
CONCURRENT_REQUESTS = int(os.getenv("CONCURRENT_REQUESTS", "16"))
DOWNLOAD_DELAY = float(os.getenv("DOWNLOAD_DELAY", "0.5"))
RETRY_TIMES = int(os.getenv("RETRY_TIMES", "5"))

# Scheduler settings
SCHEDULER_ENABLED = parse_bool_env("SCHEDULER_ENABLED", "true")
TIMEZONE = os.getenv("TIMEZONE", "Asia/Tehran")

# Trading hours (Tehran Time)
MARKET_OPEN_HOUR = int(os.getenv("MARKET_OPEN_HOUR", "9"))
MARKET_OPEN_MINUTE = int(os.getenv("MARKET_OPEN_MINUTE", "0"))
MARKET_CLOSE_HOUR = int(os.getenv("MARKET_CLOSE_HOUR", "12"))
MARKET_CLOSE_MINUTE = int(os.getenv("MARKET_CLOSE_MINUTE", "30"))

# Update intervals (minutes)
MARKET_WATCH_INTERVAL = float(os.getenv("MARKET_WATCH_INTERVAL", "2.5"))
INSTRUMENT_DETAILS_INTERVAL = int(
    os.getenv("INSTRUMENT_DETAILS_INTERVAL", "1440")
)  # Daily
HISTORICAL_BACKFILL_INTERVAL = int(
    os.getenv("HISTORICAL_BACKFILL_INTERVAL", "10080")
)  # Weekly

# API settings
TSETMC_BASE_URL = os.getenv("TSETMC_BASE_URL", "https://old.tsetmc.com/tsev2/data")
BRSAPI_BASE_URL = os.getenv("BRSAPI_BASE_URL", "https://BrsApi.ir/Api/Tsetmc")

# BRSAPI_KEY — required only for scraper/BrsApi features
BRSAPI_KEY = os.getenv("BRSAPI_KEY", "")
if not BRSAPI_KEY:
    import logging as _log

    _log.getLogger(__name__).warning(
        "BRSAPI_KEY not set — scraper/API features will be unavailable"
    )


def get_brsapi_key() -> str:
    """Return BRSAPI_KEY or raise if not configured (call at point-of-use)."""
    if not BRSAPI_KEY:
        raise ValueError(
            "BRSAPI_KEY environment variable is required. "
            "Please set it in your .env file or environment. "
            "Get your key from https://BrsApi.ir"
        )
    return BRSAPI_KEY


REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))

# Redis settings
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_ENABLED = parse_bool_env("REDIS_ENABLED", "true")
REDIS_KEY_PREFIX = os.getenv("REDIS_KEY_PREFIX", "tse:")

# Gunicorn settings
GUNICORN_WORKERS = int(os.getenv("GUNICORN_WORKERS", "4"))
SERVE_STATIC = parse_bool_env("SERVE_STATIC", "true")

# Security settings
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
CORS_ORIGINS_LIST = [origin.strip() for origin in CORS_ORIGINS.split(",")]

# API authentication
# Set API_SECRET_KEY to protect mutating endpoints (scraper, upload, delete).
# When unset, those endpoints are publicly accessible (dev mode only).
API_SECRET_KEY = os.getenv("API_SECRET_KEY", "")
if not API_SECRET_KEY:
    import warnings
    warnings.warn(
        "API_SECRET_KEY is not set — scraper/upload/delete endpoints are publicly accessible. "
        "Set this variable before deploying to production.",
        stacklevel=2,
    )

# Auto-detect Codespaces: allow *.app.github.dev origins
CODESPACE_NAME = os.getenv("CODESPACE_NAME", "")
if CODESPACE_NAME:
    for port in ("80", "3000", "5173", "8000"):
        CORS_ORIGINS_LIST.append(f"https://{CODESPACE_NAME}-{port}.app.github.dev")

# JWT settings (for future authentication)
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    raise ValueError(
        "JWT_SECRET_KEY environment variable is required. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "60"))

# Telegram Mini App settings
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
ENABLE_TELEGRAM = parse_bool_env("ENABLE_TELEGRAM", "false")

# Feature flags
ENABLE_LOANS = parse_bool_env("ENABLE_LOANS", "true")
ENABLE_CRYPTO = parse_bool_env("ENABLE_CRYPTO", "false")
ENABLE_VOICE = parse_bool_env("ENABLE_VOICE", "false")

# Voice calling settings (direct provider WebSocket connections)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
XAI_API_KEY = os.getenv("XAI_API_KEY", "")
VOICE_MAX_DURATION_SECONDS = int(os.getenv("VOICE_MAX_DURATION_SECONDS", "600"))

# Crypto settings (CoinMarketCap)
CMC_API_KEY = os.getenv("CMC_API_KEY", "")
CMC_BASE_URL = os.getenv("CMC_BASE_URL", "https://pro-api.coinmarketcap.com")

# Web search (Tavily)
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
CRYPTO_TICKER_INTERVAL = int(os.getenv("CRYPTO_TICKER_INTERVAL", "300"))
CRYPTO_TICKER_RETENTION_HOURS = int(os.getenv("CRYPTO_TICKER_RETENTION_HOURS", "48"))

# Monitoring settings
ENABLE_STATISTICS = parse_bool_env("ENABLE_STATISTICS", "true")
ENABLE_EMAIL_ALERTS = parse_bool_env("ENABLE_EMAIL_ALERTS", "false")
ALERT_EMAIL = os.getenv("ALERT_EMAIL", "")

# MinIO Object Storage
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
if not MINIO_ACCESS_KEY or not MINIO_SECRET_KEY:
    raise ValueError(
        "MINIO_ACCESS_KEY and MINIO_SECRET_KEY environment variables are required. "
        "Set them to non-default values — never use 'minioadmin' in production."
    )
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "tsetmc")
MINIO_SECURE = parse_bool_env("MINIO_SECURE", "false")

# RAG Pipeline settings
PDF_DIR = DATA_DIR / "pdfs"
PDF_DIR.mkdir(exist_ok=True)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "100"))
EMBEDDING_TIMEOUT = int(os.getenv("EMBEDDING_TIMEOUT", "30"))
EMBEDDING_MAX_RETRIES = int(os.getenv("EMBEDDING_MAX_RETRIES", "3"))

# PDF download concurrency
PDF_DOWNLOAD_CONCURRENCY = int(os.getenv("PDF_DOWNLOAD_CONCURRENCY", "3"))

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))
OCR_FALLBACK_THRESHOLD = int(os.getenv("OCR_FALLBACK_THRESHOLD", "50"))

RAG_CHAT_MODEL = os.getenv("RAG_CHAT_MODEL", "google/gemini-2.0-flash-001")
FINANCIAL_ANALYSIS_MODEL = os.getenv("FINANCIAL_ANALYSIS_MODEL", "google/gemini-2.5-flash")
FINANCIAL_MODELING_MODEL = os.getenv("FINANCIAL_MODELING_MODEL", "anthropic/claude-opus-4.6")
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))
ROUTER_MODEL = os.getenv("ROUTER_MODEL", "openai/gpt-4o-mini")
ROUTER_CONFIDENCE_THRESHOLD = float(os.getenv("ROUTER_CONFIDENCE_THRESHOLD", "0.5"))
HYBRID_SEARCH_ENABLED = parse_bool_env("HYBRID_SEARCH_ENABLED", "true")
RRF_K = int(os.getenv("RRF_K", "60"))
RERANKER_ENABLED = parse_bool_env("RERANKER_ENABLED", "true")
HYDE_ENABLED = parse_bool_env("HYDE_ENABLED", "false")
HYDE_MODEL = os.getenv("HYDE_MODEL", "openai/gpt-4o-mini")
CONVERSATION_SUMMARY_ENABLED = parse_bool_env("CONVERSATION_SUMMARY_ENABLED", "false")
MULTI_QUERY_ENABLED = parse_bool_env("MULTI_QUERY_ENABLED", "false")
GROUNDING_CHECK_ENABLED = parse_bool_env("GROUNDING_CHECK_ENABLED", "false")

# Available LLM models for chat (via OpenRouter)
AVAILABLE_MODELS = [
    {
        "id": "google/gemini-3.1-pro-preview",
        "name": "Gemini 3.1 Pro",
        "provider": "Google",
    },
    {
        "id": "anthropic/claude-sonnet-4.6",
        "name": "Claude Sonnet 4.6",
        "provider": "Anthropic",
    },
    {
        "id": "openai/gpt-5.2",
        "name": "GPT-5.2",
        "provider": "OpenAI",
    },
    {
        "id": "google/gemini-2.5-flash",
        "name": "Gemini 2.5 Flash",
        "provider": "Google",
    },
    {
        "id": "google/gemini-2.5-pro-preview",
        "name": "Gemini 2.5 Pro",
        "provider": "Google",
    },
    {"id": "openai/gpt-4o", "name": "GPT-4o", "provider": "OpenAI"},
    {
        "id": "anthropic/claude-sonnet-4",
        "name": "Claude Sonnet 4",
        "provider": "Anthropic",
    },
]

# Excel model output directory
EXCEL_MODELS_DIR = BASE_DIR / "data" / "models"
EXCEL_MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Module-level settings object (allows `from config.settings import settings`)
import sys as _sys
settings = _sys.modules[__name__]
