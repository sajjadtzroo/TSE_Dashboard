# Crypto News Pipeline

Standalone module for scraping crypto news, scoring sentiment with FinBERT/CryptoBERT, embedding with OpenAI or local models, and storing in PostgreSQL (pgvector) + MinIO.

## Architecture

```
RSS Feeds / CryptoPanic API
        │
        ▼
   fetcher.py ──► Raw article text ──► MinIO (gzipped archive)
        │
        ▼
   cleaner.py ──► Token-based chunks with coin mentions
        │
        ▼
  sentiment.py ──► FinBERT (formal) / CryptoBERT (informal)
        │
        ▼
   embedder.py ──► OpenAI or nomic-embed vectors
        │
        ▼
    store.py ──► PostgreSQL + pgvector (chunks, embeddings, sentiment)
```

## Prerequisites

- Python 3.11+
- PostgreSQL with pgvector extension (already in your Docker stack)
- MinIO (already in your Docker stack)
- Docker running (`docker compose up -d db minio`)

## Setup

```bash
# From project root
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
pip install -r crypto_news_pipeline/requirements.txt

# Copy env template and fill in values
cp crypto_news_pipeline/.env.example .env  # if you don't already have .env

# First run downloads FinBERT + CryptoBERT models (~800MB total)
# Models are cached in crypto_news_pipeline/models/
```

## API Keys

- **CryptoPanic** (free): Sign up at https://cryptopanic.com/developers/api/
- **OpenAI** (if using OpenAI embeddings): https://platform.openai.com/api-keys
- Neither is required for basic testing — RSS feeds work without keys

## Usage

```bash
# Single pipeline run (fetch + process + store)
python -m crypto_news_pipeline run-once

# With options
python -m crypto_news_pipeline run-once --sources all --embedder local

# Continuous polling (every 5 minutes by default)
python -m crypto_news_pipeline watch
python -m crypto_news_pipeline watch --interval 10 --sources all

# Semantic search
python -m crypto_news_pipeline query "Bitcoin ETF approval impact"

# Coin sentiment signal
python -m crypto_news_pipeline coin BTC
python -m crypto_news_pipeline coin ETH --hours 24
```

## Module Structure

| File | Purpose |
|------|---------|
| `config.py` | All settings, keys, weights, thresholds |
| `fetcher.py` | RSS + CryptoPanic API polling |
| `cleaner.py` | Text extraction, tiktoken chunking, coin detection |
| `sentiment.py` | FinBERT/CryptoBERT inference + aggregation |
| `embedder.py` | OpenAI / nomic-embed vectorization |
| `store.py` | MinIO (raw text) + PostgreSQL/pgvector (chunks) |
| `pipeline.py` | Orchestrates the full flow |
| `main.py` | CLI entry point |

## Sentiment Models

- **FinBERT** (`ProsusAI/finbert`) — trained on financial news, used for CoinDesk, CoinTelegraph, Messari, Blockworks, The Block
- **CryptoBERT** (`ElKulako/cryptobert`) — fine-tuned on crypto social media, used for CryptoPanic, Decrypt, BeInCrypto

Models download automatically on first run to `crypto_news_pipeline/models/`.

## Source Tiers

| Tier | Sources | Notes |
|------|---------|-------|
| 1 | CryptoPanic, CoinTelegraph, Decrypt, CoinDesk | Always fetched |
| 2 | Messari, Blockworks, BeInCrypto | Supplemental |
