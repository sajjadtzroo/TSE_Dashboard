"""
Configuration for the crypto news pipeline.
All tuneable values live here or in .env — never hardcoded inline.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# ── Paths ────────────────────────────────────────────────────────────────────

MODULE_DIR = Path(__file__).parent
PROJECT_ROOT = MODULE_DIR.parent
ENV_PATH = PROJECT_ROOT / ".env"

load_dotenv(ENV_PATH)

# Local model cache
MODELS_DIR = MODULE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

# ── API Keys ─────────────────────────────────────────────────────────────────

CRYPTOPANIC_API_KEY = os.getenv("CRYPTOPANIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# ── Database ─────────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL", "")

# ── MinIO ────────────────────────────────────────────────────────────────────

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "tsetmc")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

# MinIO key prefix for news pipeline objects
MINIO_NEWS_PREFIX = "news"  # e.g. news/cointelegraph/abc123.txt.gz

# ── Polling ──────────────────────────────────────────────────────────────────

POLL_INTERVAL_MINUTES = int(os.getenv("NEWS_POLL_INTERVAL_MINUTES", "5"))

# ── Sources ──────────────────────────────────────────────────────────────────

TIER1_SOURCES = {
    "cryptopanic": {
        "type": "api",
        "url": "https://cryptopanic.com/api/v1/posts/",
        "tier": 1,
    },
    "cointelegraph": {
        "type": "rss",
        "url": "https://cointelegraph.com/rss",
        "tier": 1,
    },
    "decrypt": {
        "type": "rss",
        "url": "https://decrypt.co/feed",
        "tier": 1,
    },
    "coindesk": {
        "type": "rss",
        "url": "https://coindesk.com/arc/outboundfeeds/rss/",
        "tier": 1,
    },
}

TIER2_SOURCES = {
    "messari": {
        "type": "rss",
        "url": "https://messari.io/rss",
        "tier": 2,
    },
    "blockworks": {
        "type": "rss",
        "url": "https://blockworks.co/feed",
        "tier": 2,
    },
    "beincrypto": {
        "type": "rss",
        "url": "https://beincrypto.com/feed",
        "tier": 2,
    },
}

ALL_SOURCES = {**TIER1_SOURCES, **TIER2_SOURCES}

# ── Cleaner ──────────────────────────────────────────────────────────────────

CHUNK_SIZE_TOKENS = 400
CHUNK_OVERLAP_TOKENS = 50
MIN_CHUNK_TOKENS = 80
TIKTOKEN_ENCODING = "cl100k_base"

# Major crypto tickers → canonical ticker
# Maps both ticker and full name to the canonical ticker symbol
COIN_TICKERS = {
    "BTC": "BTC", "BITCOIN": "BTC",
    "ETH": "ETH", "ETHEREUM": "ETH",
    "SOL": "SOL", "SOLANA": "SOL",
    "BNB": "BNB",
    "XRP": "XRP", "RIPPLE": "XRP",
    "ADA": "ADA", "CARDANO": "ADA",
    "AVAX": "AVAX", "AVALANCHE": "AVAX",
    "DOGE": "DOGE", "DOGECOIN": "DOGE",
    "DOT": "DOT", "POLKADOT": "DOT",
    "MATIC": "MATIC", "POLYGON": "MATIC", "POL": "MATIC",
    "LINK": "LINK", "CHAINLINK": "LINK",
    "UNI": "UNI", "UNISWAP": "UNI",
    "ATOM": "ATOM", "COSMOS": "ATOM",
    "LTC": "LTC", "LITECOIN": "LTC",
    "NEAR": "NEAR",
    "APT": "APT", "APTOS": "APT",
    "ARB": "ARB", "ARBITRUM": "ARB",
    "OP": "OP", "OPTIMISM": "OP",
    "SUI": "SUI",
    "SEI": "SEI",
    "TIA": "TIA", "CELESTIA": "TIA",
    "FET": "FET",
    "RENDER": "RENDER", "RNDR": "RENDER",
    "INJ": "INJ", "INJECTIVE": "INJ",
    "TRX": "TRX", "TRON": "TRX",
    "SHIB": "SHIB",
    "PEPE": "PEPE",
    "WIF": "WIF",
    "TON": "TON", "TONCOIN": "TON",
    "HBAR": "HBAR", "HEDERA": "HBAR",
    "FIL": "FIL", "FILECOIN": "FIL",
    "ICP": "ICP",
    "AAVE": "AAVE",
    "MKR": "MKR", "MAKER": "MKR",
    "STX": "STX", "STACKS": "STX",
}

# Ambiguous short tickers that should only match as standalone uppercase words
# (to avoid false positives like "dot" in regular text)
AMBIGUOUS_TICKERS = {"DOT", "NEAR", "OP", "SUI", "SEI", "LINK", "APT"}

# ── Sentiment ────────────────────────────────────────────────────────────────

FINBERT_MODEL = "ProsusAI/finbert"
CRYPTOBERT_MODEL = "ElKulako/cryptobert"
FINBERT_CACHE = str(MODELS_DIR / "finbert")
CRYPTOBERT_CACHE = str(MODELS_DIR / "cryptobert")

SENTIMENT_BATCH_SIZE = 16
CONFIDENCE_THRESHOLD = 0.60
HIGH_NEUTRAL_THRESHOLD = 0.75

# Sources routed to FinBERT (formal journalism)
FINBERT_SOURCES = {"coindesk", "theblock", "messari", "blockworks", "cointelegraph"}
# Everything else → CryptoBERT

# Source credibility weights
SOURCE_WEIGHTS = {
    "coindesk": 1.0,
    "theblock": 1.0,
    "messari": 0.95,
    "blockworks": 0.95,
    "cointelegraph": 0.85,
    "decrypt": 0.85,
    "beincrypto": 0.65,
    "cryptopanic": 0.65,
}
DEFAULT_SOURCE_WEIGHT = 0.5

# Time decay for coin sentiment aggregation
DECAY_LAMBDA = 0.3
DEFAULT_COIN_WINDOW_HOURS = 4

# ── Embedder ─────────────────────────────────────────────────────────────────

EMBEDDER_TYPE = os.getenv("NEWS_EMBEDDER", "openai")  # "openai" or "local"

# OpenAI embeddings
OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
OPENAI_EMBEDDING_DIMENSIONS = 1536
OPENAI_EMBEDDING_BATCH_SIZE = 100

# Local embeddings (nomic-embed)
LOCAL_EMBEDDING_MODEL = "nomic-ai/nomic-embed-text-v1"
LOCAL_EMBEDDING_DIMENSIONS = 768
LOCAL_EMBEDDING_CACHE = str(MODELS_DIR / "nomic-embed")
LOCAL_EMBEDDING_BATCH_SIZE = 32

# ── Store (PostgreSQL + pgvector) ────────────────────────────────────────────

# Table names
NEWS_ARTICLES_TABLE = "crypto_news_articles"
NEWS_CHUNKS_TABLE = "crypto_news_chunks"

# ── Logging ──────────────────────────────────────────────────────────────────

LOG_LEVEL = os.getenv("NEWS_LOG_LEVEL", "INFO")
