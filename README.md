# TSE Dashboard

> **All-in-one financial intelligence platform for Iranian markets** — Tehran Stock Exchange, cryptocurrency, bank loans, and AI-powered analysis in a single dashboard.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/react-18.2-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)

---

## What Is This?

TSE Dashboard is a production-ready SaaS platform built for Iranian retail and institutional investors. It unifies data and analysis tools from four distinct markets that are otherwise siloed:

| Market | Coverage |
|--------|----------|
| **Tehran Stock Exchange (TSE)** | 300+ equities, sector indices, order books, OHLCV, client-type flows, TEDPIX |
| **Cryptocurrency** | 30+ coins (BTC, ETH, SOL, …), fear-greed index, on-chain metrics, signals |
| **Iran Mercantile Exchange (IME)** | Gold/crude oil options & futures, commodity certificates, physical trade data |
| **Iranian Bank Loans** | 50+ banks, product comparison, installment calculators, eligibility requirements |

On top of market data, it ships an AI assistant (Claude Sonnet 4.6) wired to 80+ financial tools — type a question in Persian or English and get a DCF model, a loan comparison, or a technical analysis in seconds.

---

## Screenshots / Feature Tour

```
Landing → Dashboard → Stock Detail → AI Chat → Financial Modeling → Loans
```

*(Screenshots in `docs/screenshots/` — add your own after first run)*

---

## Architecture

```
Browser
  │
  └── Nginx :80
        ├── /api/* ──► Gunicorn + Uvicorn :8000 ──► FastAPI
        │                        │
        │               ┌────────┴────────┐
        │           PgBouncer :6432     Redis :6379
        │               │
        │           PostgreSQL :5432 (+ pgvector)
        │
        └── /* ──► React 18 SPA (static)
```

**Services (Docker Compose)**

| Service | Role |
|---------|------|
| `nginx` | Reverse proxy, gzip, rate limiting, static assets |
| `app` | FastAPI API (Gunicorn + Uvicorn workers) |
| `scheduler` | APScheduler background data refresh jobs |
| `db` | PostgreSQL 16 + pgvector |
| `pgbouncer` | Connection pool (6432 → 5432) |
| `redis` | Cache, rate limiter, session store |

---

## Tech Stack

### Backend
| Library | Version | Purpose |
|---------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.100+ | HTTP framework |
| SQLAlchemy | 2.0+ | ORM |
| Alembic | 1.13+ | DB migrations |
| Pydantic | 2.9+ | Validation |
| APScheduler | 3.10+ | Background jobs |
| Scrapy | 2.11+ | Market data scraping |
| OpenAI SDK | 1.0+ | LLM calls (via OpenRouter) |
| Sentence Transformers | 2.2+ | Embeddings for RAG |
| LangChain | 0.3+ | Text splitting |
| openpyxl | 3.1.2 | Excel workbook generation |
| PyMuPDF | 1.24+ | Codal PDF extraction |
| jdatetime | 5.0+ | Jalali calendar support |
| Prometheus Client | 0.20+ | Metrics |

### Frontend
| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.2.0 | UI framework |
| Vite | 5.1.0 | Build tool |
| Mantine | 7.17.8 | Component library |
| TanStack Query | 5.56.0 | Server state |
| React Router | 6.22.0 | Client routing |
| Recharts | 3.7.0 | Charts |
| KlineCharts | 9.8.12 | Candlestick charts |
| Motion | 12.34.2 | Animations |
| XLSX | 0.18.5 | Client-side spreadsheet |

### AI / LLM
| Component | Model / Library |
|-----------|----------------|
| Chat & Financial Modeling | Claude Sonnet 4.6 (via OpenRouter) |
| Intent Router | GPT-4o-mini |
| Document Embeddings | Sentence Transformers (cross-encoder) |
| Vector Store | PostgreSQL + pgvector |

---

## Quick Start

### Prerequisites
- Docker 24+ and Docker Compose v2
- A `.env` file (copy from `.env.example`)

```bash
cp .env.example .env
# fill in: OPENROUTER_API_KEY, JWT_SECRET_KEY, DATABASE_URL, REDIS_URL
```

### Run
```bash
docker compose up --build -d

# Verify all services are healthy
docker compose ps

# View API logs
docker compose logs -f app
```

The app will be available at `http://localhost`.

### First-time database setup
```bash
docker compose exec app alembic upgrade head
```

### Run tests
```bash
pytest -n auto --cov=api --cov=database --cov=rag
```

Or inside Docker (required — project uses Python 3.11):
```bash
docker compose run --rm app pytest tests/ -q
```

---

## Development

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Database migrations
alembic upgrade head
alembic revision --autogenerate -m "describe change"

# Run API locally (with hot reload)
uvicorn api.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Dev server (proxies /api to localhost:8000)
npm run dev

# Production build
npm run build
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | LLM API key (OpenRouter) |
| `JWT_SECRET_KEY` | Yes | Token signing secret |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `BRSAPI_KEY` | No | TSE broker data API key |
| `TAVILY_API_KEY` | No | Web search fallback |

---

## API Reference

The API is self-documented at `http://localhost/api/docs` (Swagger UI).

**Key endpoint groups:**

| Prefix | Description |
|--------|-------------|
| `GET /api/companies` | TSE securities list |
| `GET /api/stocks/{symbol}` | Stock OHLCV, order book, shareholders |
| `GET /api/market/indices` | TEDPIX and sector indices |
| `GET /api/options` | Options chain |
| `GET /api/ime/*` | IME commodities |
| `GET /api/loans/*` | Bank loan products |
| `GET /api/crypto/*` | Cryptocurrency market data |
| `POST /api/chat` | AI chat (any intent) |
| `POST /api/chat/stream` | Streaming AI chat |
| `POST /api/rag/upload` | Upload document for RAG |
| `GET /api/financial-modeling/download/{id}` | Download Excel model |
| `GET /health` | Health check |

---

## Financial Modeling Tools

The AI assistant can build the following models on-demand and return an Excel workbook:

| Model | Description |
|-------|-------------|
| `build_dcf_model` | DCF with FCFF, terminal value, sensitivity table, mid-year convention |
| `build_pl_model` | Multi-year P&L projection (revenue → gross profit → EBITDA → net income) |
| `build_ddm_model` | Dividend Discount (Gordon Growth, H-Model, multistage) |
| `build_residual_income_model` | Residual income / clean surplus valuation |
| `build_multiples_model` | Peer comps: EV/EBITDA, EV/EBIT, EV/Revenue, P/E, P/B, P/S |
| `compute_wacc` | WACC formula with equity/debt weights |
| `compute_capm` | CAPM cost of equity |
| `compute_beta` | Hamada unlevering/re-levering |
| `compute_eva` | Economic Value Added and MVA |
| `compute_pvgo` | PVGO and justified P/E |
| `build_scenario_model` | Bear / base / bull sensitivity |
| … and 50+ more | Derivatives, bonds, Islamic finance, real estate, portfolio analytics |

---

## RAG Pipeline

Document QA uses a 3-stage hybrid retrieval pipeline:

```
User query
    │
    ├── 1. Dense retrieval (pgvector cosine similarity)
    ├── 2. BM25 keyword filtering (Postgres full-text)
    └── 3. Cross-encoder reranking (Sentence Transformers)
         │
         └── Top-k chunks → Claude Sonnet 4.6 → Cited answer
```

Supported document types: PDF, DOCX, HTML (Codal reports auto-extracted).

---

## AI Intent Routing

The `/api/chat` endpoint routes queries to one of 10 specialized agents:

| Intent | Agent | Example query |
|--------|-------|---------------|
| `market_data` | Market tools | "قیمت فولاد مبارکه؟" |
| `technical_analysis` | TA tools | "RSI سهام شبندر؟" |
| `comparison` | Screener | "بهترین سهام به P/E زیر ۵" |
| `loan_advisor` | Loan tools | "بهترین وام ملک بانک ملت" |
| `crypto` | Crypto tools | "قیمت بیتکوین در ۳۰ روز" |
| `document_qa` | Codal RAG | "گزارش مالی فولاد ۱۴۰۳" |
| `cfa_finance` | Valuation | "WACC شرکت با بتا ۱.۲" |
| `financial_modeling` | FM tools | "DCF مدل برای شرکت X" |
| `portfolio_advisor` | Portfolio | "پیشنهاد سبد با ریسک متوسط" |
| `general` | General | "سلام، چه کاری می‌کنی؟" |

---

## Project Structure

```
TSE_Dashboard/
├── api/                    # FastAPI app
│   ├── main.py             # App factory + middleware
│   ├── auth.py             # JWT auth + role guards
│   ├── cache.py            # Redis tag-based cache
│   ├── rate_limit.py       # Sliding-window rate limiter
│   ├── monitoring.py       # Prometheus + structured logging
│   └── routes/             # Endpoint modules
├── rag/
│   ├── agents/             # Intent router + base agent
│   └── tools/
│       ├── financial_modeling/   # 60+ valuation tools
│       ├── market.py             # TSE market tools
│       ├── crypto.py             # Crypto tools
│       ├── loans.py              # Loan search tools
│       └── documents.py          # Codal RAG tools
├── database/
│   ├── models.py           # SQLAlchemy ORM models
│   └── connection.py       # Async engine + session factory
├── config/
│   └── settings.py         # Pydantic BaseSettings
├── frontend/
│   └── src/
│       ├── App.jsx         # Routes + lazy loading
│       ├── features/       # Feature modules (landing, chat, FM)
│       ├── pages/          # Route-level page components
│       └── hooks/          # useMarketData, useWebSocket, …
├── infra/
│   ├── nginx/nginx.conf    # Reverse proxy config
│   └── postgres/postgresql.conf
├── alembic/versions/       # Migration history
├── tests/                  # pytest (unit + integration)
└── docker-compose.yml
```

---

## Contributing

1. Fork and clone the repo
2. Branch off `develop`: `git checkout -b feature/your-feature`
3. Make changes — follow the conventions in `CLAUDE.md`
4. Run tests: `pytest tests/ -q`
5. Open a PR against `develop`

See `CLAUDE.md` for full coding conventions, import paths, and architecture notes.

---

## License

MIT — see [LICENSE](LICENSE)

---

## Links

- **Architecture deep-dive**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Project structure**: [`docs/STRUCTURE.md`](docs/STRUCTURE.md)
- **Performance benchmarks**: [`BENCHMARK.md`](BENCHMARK.md)
- **Business model**: [`docs/BUSINESS_MODEL.md`](docs/BUSINESS_MODEL.md)
- **Pitch deck**: [`docs/PITCHDECK.md`](docs/PITCHDECK.md)
- **Scaling guides**: [`docs/scaling-guide.md`](docs/scaling-guide.md)
