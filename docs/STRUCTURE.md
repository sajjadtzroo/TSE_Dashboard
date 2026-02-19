# Project Structure — TSE Dashboard

> Complete directory and file reference for the TSE Dashboard monorepo.
> Last updated: 2026-02-18

---

## Top-Level Overview

```
TSE_Dashboard/
├── api/                    # FastAPI backend (async, ASGI)
├── alembic/                # Database migrations
├── config/                 # App settings and logging config
├── database/               # SQLAlchemy models and connection
├── docs/                   # Project documentation
│   ├── ARCHITECTURE.md     # Architecture & capacity analysis
│   └── benchmark/          # Apache Bench results and scoring
├── frontend/               # React + Vite SPA
├── infra/                  # Nginx and PostgreSQL config files
├── logs/                   # Runtime log files
├── migrations/             # Raw SQL migrations
├── rag/                    # AI/LLM pipeline (agents + tools)
├── scheduler/              # Background job runner
├── scripts/                # Dev and data utility scripts
├── tests/                  # Pytest test suite
├── tsetmc_scraper/         # Scrapy spider package
├── docker-compose.yml      # Multi-service Docker orchestration
├── Dockerfile              # Multi-stage build (api / scheduler / nginx)
├── BENCHMARK.md            # Full performance benchmark report
├── CLAUDE.md               # Claude Code project instructions
└── pyproject.toml          # Python project metadata and tooling config
```

---

## Docker Services

Defined in `docker-compose.yml`:

| Service      | Image                      | Port(s)        | Role                              |
|--------------|----------------------------|----------------|-----------------------------------|
| `nginx`      | nginx:1.25.5               | 80, 443        | Reverse proxy + static asset server |
| `app`        | `Dockerfile` → `api` target | 8000          | Gunicorn + Uvicorn (FastAPI)      |
| `scheduler`  | `Dockerfile` → `scheduler` target | —        | APScheduler background jobs       |
| `db`         | pgvector/pgvector:pg16     | 5432           | PostgreSQL 16 with pgvector       |
| `pgbouncer`  | edoburu/pgbouncer:latest   | 6432           | Connection pooler                 |
| `redis`      | redis:7-alpine             | 6379           | Cache + rate limit store          |

---

## Backend — `api/`

FastAPI application served by Gunicorn + Uvicorn workers.

```
api/
├── main.py               # App factory, middleware stack, lifespan, SPA fallback
├── auth.py               # JWT auth, require_role() dependency
├── cache.py              # RedisCacheManager — tag-based invalidation, dynamic TTL
├── cache_decorators.py   # @cached() decorator for route handlers
├── deps.py               # FastAPI dependency injection (DB session, current user)
├── helpers.py            # Shared response helpers
├── monitoring.py         # Prometheus instrumentation + JSON structured logging
├── rate_limit.py         # Redis sliding-window rate limiter (per-IP, tiered)
├── schemas.py            # Pydantic models for market/stock endpoints
├── schemas_crypto.py     # Pydantic models for crypto endpoints
├── schemas_loans.py      # Pydantic models for loan endpoints
├── services_import.py    # Loan data import service
├── services_loans.py     # Loan business logic
└── routes/
    ├── auth.py           # POST /api/auth/register, /login, /refresh, /me
    ├── crypto.py         # GET /api/crypto/* (prices, history, fear-greed)
    ├── health.py         # GET /health, /health/deep
    ├── ime.py            # GET /api/ime/* (options, futures, certificates, etc.)
    ├── import_loans.py   # POST /api/loans/import
    ├── loans.py          # GET/POST /api/loans/* (banks, loan details, compare)
    ├── market.py         # GET /api/market/* (overview, indices, prices, sectors)
    ├── options.py        # GET /api/options/* (chain, greeks, calculator)
    ├── rag.py            # POST /api/chat, /api/rag/upload
    ├── reminders.py      # GET/POST /api/reminders (loan payment alerts)
    ├── scraper.py        # POST /api/scraper/* (trigger spiders, admin only)
    ├── stocks.py         # GET /api/stocks/{symbol} (detail, history, etc.)
    ├── tools.py          # GET /api/tools/* (watchlist, compare, codal)
    └── ws.py             # WebSocket /ws/live + SSE /api/stream
```

**Middleware stack** (outer to inner):
1. Structured logging + request ID
2. Prometheus instrumentator
3. RequestID middleware
4. GZip (min 500 bytes)
5. CORS
6. Rate limiter
7. Security headers

**Rate limit tiers:**

| Tier    | Limit        | Endpoints                          |
|---------|--------------|------------------------------------|
| default | 100 req/min  | Most read endpoints                |
| heavy   | 30 req/min   | market-overview, client-type       |
| scraper | 5 req/min    | /api/scraper/*, /api/rag/upload    |

---

## Database — `database/`

```
database/
├── __init__.py
├── connection.py    # SQLAlchemy async engine + session factory, PgBouncer-aware
├── models.py        # ORM models: Security, MarketPrice, DailyOHLCV, Options, Loan, Bank, ...
└── schema.py        # Pydantic-compatible schemas derived from models
```

### Key Tables

| Table            | Rows    | Size     | Description                           |
|------------------|---------|----------|---------------------------------------|
| `securities`     | 4,263   | 1.5 MB   | All listed TSE symbols + metadata     |
| `order_book`     | 4,002   | 1.6 MB   | Intraday bid/ask snapshots            |
| `market_prices`  | 2,928   | 640 KB   | Daily closing data per symbol         |
| `daily_ohlcv`    | 1,335   | 624 KB   | OHLCV candles for charting            |
| `options`        | 278     | 360 KB   | Options contracts with greeks         |
| `banks`          | —       | —        | Iranian bank records                  |
| `loans`          | —       | —        | Loan products per bank                |
| `crypto_prices`  | —       | —        | Historical crypto OHLCV               |

### Migrations — `alembic/`

```
alembic/
├── env.py
├── script.py.mako
└── versions/
    ├── 001_initial_baseline.py
    ├── 002_add_indexes.py
    ├── 003_add_extra_bank_data_and_parent_bank.py
    └── 004_add_crypto_tables.py
```

---

## Configuration — `config/`

```
config/
├── settings.py      # Pydantic BaseSettings — reads from .env
└── logging.yaml     # Logging handler configuration
```

Key settings (from `.env` / environment):

| Variable              | Default       | Description                        |
|-----------------------|---------------|------------------------------------|
| `DATABASE_URL`        | required      | PostgreSQL DSN (via PgBouncer)     |
| `REDIS_URL`           | required      | Redis connection string            |
| `SECRET_KEY`          | required      | JWT signing key                    |
| `OPENAI_API_KEY`      | optional      | Enables RAG/chat features          |
| `ENABLE_LOANS`        | true          | Feature flag for loan module       |
| `ENABLE_CRYPTO`       | true          | Feature flag for crypto module     |
| `SCHEDULER_ENABLED`   | true          | Run background jobs in this process|

---

## RAG / AI — `rag/`

Multi-agent LLM pipeline for the chat assistant.

```
rag/
├── pipeline.py          # Top-level orchestration: ingest → chunk → embed → retrieve
├── chunker.py           # Document chunking strategies
├── downloader.py        # PDF/URL fetcher
├── embedder.py          # OpenAI embeddings → pgvector
├── extractor.py         # Text extraction from PDFs
├── tool_executor.py     # Dispatches tool calls from agent responses
├── agents/
│   ├── __init__.py      # get_agent(intent) registry — returns cached BaseAgent
│   ├── base.py          # BaseAgent — reusable tool-calling loop, error sanitizer
│   ├── router.py        # Classifies user intent → selects agent (uses ROUTER_MODEL)
│   ├── market_data.py   # 9 market tools
│   ├── document_qa.py   # 2 RAG tools
│   ├── technical_analysis.py  # 4 TA tools
│   ├── comparison.py    # 4 comparison tools
│   ├── loan_advisor.py  # 4 loan tools
│   ├── crypto.py        # Crypto-specific tools
│   └── general.py       # All 19 tools (fallback agent)
└── tools/
    ├── __init__.py      # Backward-compat re-exports
    ├── _helpers.py      # Shared tool utilities
    ├── market.py        # get_market_indices, get_market_overview, ...
    ├── documents.py     # search_documents, list_documents
    ├── technical.py     # get_rsi, get_macd, get_bollinger, ...
    ├── comparison.py    # compare_stocks, compare_sectors, ...
    ├── loans.py         # get_loan_rates, compare_banks, ...
    └── crypto.py        # get_crypto_price, get_fear_greed, ...
```

**API contract**: `POST /api/chat` → `{ answer, sources, tools_used, model }`

---

## Scheduler — `scheduler/`

Standalone APScheduler process (Docker target: `scheduler`).

```
scheduler/
├── scheduler.py        # APScheduler setup, job registration, startup
├── jobs.py             # Spider trigger jobs (market_watch, options, ime_*)
└── crypto_fetcher.py   # Crypto price fetch job (runs every 5 min)
```

Trading hours: **Sat–Wed 09:00–12:30 Tehran time**. Jobs only fire during open market.

---

## Scraper — `tsetmc_scraper/`

Scrapy project that fetches live data from TSETMC (Tehran Stock Exchange).

```
tsetmc_scraper/
├── settings.py        # Scrapy settings (pipelines, middlewares, concurrency)
├── items.py           # Scrapy Item definitions
├── pipelines.py       # DB write pipeline (upsert into PostgreSQL)
├── middlewares.py     # Custom request/response middleware
├── parsers/
│   ├── json_parser.py          # Parses TSETMC JSON responses
│   ├── order_book_parser.py    # Parses order book data
│   └── type_converters.py      # Persian number/date converters
└── spiders/
    ├── market_watch.py         # Real-time market overview (all stocks)
    ├── market_prices.py        # Daily price data
    ├── market_indices.py       # Index values (TEDPIX, etc.)
    ├── options.py              # Options chain data
    ├── etf_nav.py              # ETF NAV values
    ├── codal.py                # Codal financial disclosures
    ├── codal_financial.py      # Financial statement data
    ├── codal_financials_detail.py
    ├── history_backfill.py     # Historical OHLCV backfill
    ├── instrument_details.py   # Company/symbol metadata
    ├── shareholders.py         # Major shareholder data
    ├── tick_trades.py          # Tick-by-tick trade data
    ├── ime_options.py          # IME (Iran Mercantile Exchange) options
    ├── ime_futures.py
    ├── ime_certificates.py
    ├── ime_funds.py
    ├── ime_forwards.py
    └── ime_physical.py
```

---

## Infrastructure — `infra/`

```
infra/
├── nginx/
│   └── nginx.conf        # Reverse proxy, gzip, rate limits, static file serving
└── postgres/
    └── postgresql.conf   # Tuned for 4 GB RAM, SSD, pgvector workloads
```

**Nginx highlights**: dual rate-limit zones (30 req/s API, 2 req/min scraper), 1-year immutable cache for hashed assets, gzip level 6, security headers (HSTS, X-Frame-Options, X-Content-Type-Options).

**PostgreSQL highlights**: `shared_buffers=2GB`, `effective_cache_size=3GB`, `random_page_cost=1.1`, aggressive autovacuum (`naptime=30s`, `scale_factor=0.05`).

---

## Frontend — `frontend/`

React 18 + Vite SPA. RTL layout (`direction="rtl"`). Mantine v7 UI library.

```
frontend/
├── index.html
├── vite.config.js
├── tsconfig.json
├── package.json
└── src/
    ├── App.jsx              # Route definitions, lazy loading, error boundaries
    ├── main.jsx             # React root, MantineProvider, QueryClientProvider
    ├── global.css           # Global styles, landing CSS, dark theme utilities
    │
    ├── core/
    │   └── theme.js         # Mantine theme (rallyTheme, colors, typography)
    │
    ├── theme/
    │   ├── rallyColors.js   # All hex values and color tokens
    │   └── rallyTheme.js    # Mantine theme overrides
    │
    ├── layout/              # Shell layouts (per section)
    │   ├── BaseLayout.jsx         # Common sidebar + content skeleton
    │   ├── MainLayout.jsx         # TSE market section layout
    │   ├── CryptoMainLayout.jsx   # Crypto section layout
    │   ├── LoanMainLayout.jsx     # Loans section layout
    │   └── PortfolioMainLayout.jsx # Portfolio section layout
    │
    ├── pages/               # Route-level page components (lazy loaded)
    │   ├── LandingPage.jsx        # / — marketing landing page
    │   ├── PricingPage.jsx        # /pricing — dedicated pricing page
    │   ├── TutorialPage.jsx       # /tutorial
    │   ├── AboutPage.jsx          # /about
    │   ├── Dashboard.jsx          # /dashboard (TSE summary)
    │   ├── MarketOverview.jsx
    │   ├── Heatmap.jsx
    │   ├── ClientType.jsx
    │   ├── Screener.jsx
    │   ├── MarketIndices.jsx
    │   ├── ETFNav.jsx
    │   ├── MarketPrices.jsx
    │   ├── Funds.jsx
    │   ├── Options.jsx
    │   ├── OptionsCalculator.jsx
    │   ├── OptionsExplorer.jsx
    │   ├── IMEOptions.jsx … IMEPhysical.jsx  (6 IME pages)
    │   ├── Codal.jsx
    │   ├── Watchlist.jsx
    │   ├── Compare.jsx
    │   ├── Portfolio.jsx
    │   ├── StockDetail.jsx
    │   ├── Shareholders.jsx
    │   ├── TickTrades.jsx
    │   ├── SystemStatus.jsx
    │   ├── crypto/
    │   │   ├── CryptoDashboard.jsx
    │   │   ├── CoinDetail.jsx
    │   │   ├── CryptoHeatmap.jsx
    │   │   ├── CryptoCompare.jsx
    │   │   ├── MarketCapChart.jsx
    │   │   ├── coin/          (CoinChartSection, CoinInfoSidebar, ...)
    │   │   └── dashboard/     (10 section components)
    │   ├── loans/             (12 .tsx pages: LoanDashboard, LoanBanks, ...)
    │   └── portfolio/         (PortfolioDashboard, Performance, Risk, Simulation, ...)
    │
    ├── features/            # Feature-scoped components (domain-driven)
    │   ├── chat/
    │   │   └── components/  (ChatDrawer, MessageBubble, MarkdownRenderer, ...)
    │   ├── landing/
    │   │   └── components/  (LandingNav, LandingFooter, SectionHeader, Reveal,
    │   │                     HeroVisual, FeatureCard, PricingPlans, StatsSection, ...)
    │   └── loans/
    │       ├── analytics/   (AnalyticsDashboard, tabs: Overview/InterestRates/...)
    │       ├── banks/        (BanksList, BankDetail, sub-components)
    │       ├── calculator/   (FinancialCalculator, calculatorEngine)
    │       ├── calculators/  (7 calculators: Affordability, EarlyPayoff, CAPM, ...)
    │       ├── compare/      (ComparisonView, ComparisonTable)
    │       ├── loan-list/    (LoansList, LoanCFAMetrics, LoanDetailCFASection)
    │       ├── loan-optimizer/ (LoanOptimizerPage, OptimizerCharts, ...)
    │       └── reminders/    (AlertsDashboard, LoanForm, PaymentScheduleTable)
    │
    ├── components/          # Shared/generic UI components
    │   ├── RallyDataTable.jsx    # Primary data grid (mantine-datatable)
    │   ├── RallyKPICard.jsx      # KPI metric card with sparkline
    │   ├── RallyMainCard.jsx     # Standard content card wrapper
    │   ├── RallyListCard.jsx     # List-style card
    │   ├── RallyEmptyState.jsx   # Empty state illustration
    │   ├── RallyChartSkeleton.jsx
    │   ├── RallyKPISkeleton.jsx
    │   ├── RallyTableSkeleton.jsx
    │   ├── RallyBreadcrumbs.jsx
    │   ├── PageHeader.jsx        # Page title + action buttons
    │   ├── PageShell.jsx         # Page wrapper with padding/spacing
    │   ├── PageTransition.jsx    # motion/react page enter animation
    │   ├── ChatDrawer.jsx        # Re-export shim → features/chat/
    │   ├── GlobalSearch.jsx
    │   ├── TickerTape.jsx        # Scrolling market ticker
    │   ├── KPICarousel.jsx
    │   ├── MarketBreadthBar.jsx
    │   ├── MarketStatusBadge.jsx
    │   ├── IndicatorToggle.jsx
    │   ├── TopMoversCards.jsx
    │   ├── FinancialRatiosPanel.jsx
    │   ├── RiskMetricsPanel.jsx
    │   ├── ErrorBoundary.jsx
    │   ├── RouteErrorBoundary.jsx
    │   ├── SectionTabs.jsx
    │   ├── ExportButton.jsx
    │   ├── RefreshButton.jsx
    │   ├── DataFreshness.jsx
    │   ├── ColumnToggle.jsx
    │   ├── DensityToggle.jsx
    │   └── CryptoIcon.jsx
    │
    ├── hooks/               # Custom React hooks
    │   ├── useMarketData.js        # TanStack Query hooks for market endpoints
    │   ├── useWebSocket.js         # Auto-reconnect WebSocket
    │   ├── useDashboardData.js
    │   ├── useStockDetailData.js
    │   ├── useCryptoDashboard.js
    │   ├── useCryptoData.js
    │   ├── useCoinDetailData.js
    │   ├── useCryptoWebSocket.js
    │   ├── useCryptoRiskMetrics.js
    │   ├── usePortfolio.js
    │   ├── useRiskMetrics.js
    │   ├── useMonteCarloWorker.js
    │   ├── useTechnicalIndicators.js
    │   ├── useOptionsChainData.js
    │   ├── useOptionsState.js
    │   ├── usePayoffData.js
    │   ├── useSSEChat.js
    │   ├── useChatSessions.js
    │   ├── useScraperActions.js
    │   ├── useSidebarMarketData.js
    │   ├── useSparklineData.js
    │   ├── useIndicatorPrefs.js
    │   ├── useWatchlist.js
    │   ├── useColumnFilters.js
    │   ├── usePagination.ts
    │   ├── useRowSelection.ts
    │   ├── useTableSearch.ts
    │   ├── useTableKeyboard.js
    │   ├── useTablePage.ts
    │   ├── useVirtualization.js
    │   ├── useSectionObserver.js
    │   ├── useSwipeNavigation.js
    │   ├── usePullToRefresh.js
    │   └── useApiData.js
    │
    ├── utils/               # Pure utility functions
    │   ├── lazyRetry.js          # Lazy import with auto-retry on chunk failure
    │   ├── formatUtils.js        # Number/date/percent formatters
    │   ├── dateUtils.js          # Jalali (Persian) calendar helpers
    │   ├── colorUtils.js         # Color interpolation for heatmaps
    │   ├── marketStatus.js       # Is market open? trading hours helper
    │   ├── chartUtils.js         # Recharts data transformers
    │   ├── blackScholes.js       # Black-Scholes options pricing
    │   ├── financialRatios.js    # P/E, EV/EBITDA, etc.
    │   ├── indicatorMeta.js      # TA indicator metadata
    │   ├── technicalIndicators.js # RSI, MACD, Bollinger Band calculations
    │   ├── sectorUtils.js        # Sector color and grouping helpers
    │   ├── exportData.js         # CSV/Excel export
    │   ├── scraperConfig.js
    │   └── apiTracker.js
    │   └── riskMetrics/
    │       └── rolling.js        # Rolling beta, correlation, VaR
    │
    ├── constants/           # Static config and navigation data
    │   ├── navigation.js         # Main sidebar nav items
    │   ├── dashboard.js          # Dashboard section config
    │   ├── market.js             # Market page constants
    │   ├── bottomNav.js          # Mobile bottom navigation
    │   ├── loanNav.js            # Loan section nav items
    │   ├── cryptoNav.js          # Crypto section nav items
    │   ├── cryptoBottomNav.js
    │   ├── portfolioNav.js       # Portfolio section nav items
    │   ├── landing.js            # Landing page data (stats, features)
    │   ├── heroVisualData.js     # Hero chart mock data
    │   ├── chat.js               # Chat tool label mappings
    │   ├── options.js            # Options page constants
    │   ├── screener.js           # Screener filter definitions
    │   └── stockDetail.js        # Stock detail tab config
    │
    ├── context/             # React context providers
    │   ├── AuthContext.jsx       # JWT auth state
    │   └── LoanSelectionContext.tsx
    │
    ├── types/               # TypeScript type definitions
    │   ├── index.ts
    │   ├── market.ts
    │   ├── options.ts
    │   ├── crypto.ts
    │   ├── ime.ts
    │   ├── chat.ts
    │   ├── components.ts
    │   └── advancedFinancial.ts
    │
    ├── schemas/
    │   └── index.ts              # Zod validation schemas
    │
    └── workers/
        └── monteCarlo.worker.js  # Web Worker for Monte Carlo simulation
```

---

## Tests — `tests/`

```
tests/
├── conftest.py               # Fixtures: test DB, client, sample data
├── fixtures/
│   └── sample_data.py        # Reusable market/loan/crypto fixtures
├── unit/
│   ├── test_auth_module.py
│   ├── test_json_parser.py
│   ├── test_order_book_parser.py
│   ├── test_type_converters.py
│   ├── test_market_null_handling.py
│   ├── test_logging_utils.py
│   ├── test_rag_auth.py
│   ├── test_rag_upload.py
│   ├── test_websocket.py
│   ├── test_alembic_config.py
│   ├── test_spider_run_model.py
│   └── test_example.py
├── integration/              # (empty, planned)
└── e2e/                      # (empty, planned)
```

Run with: `pytest -n auto --cov=api --cov=database --cov=rag --cov=scheduler`

---

## Scripts — `scripts/`

Development and data utilities (not deployed):

| Script                     | Purpose                                      |
|----------------------------|----------------------------------------------|
| `init_db.py`               | Initialize schema and seed baseline data     |
| `import_json_data.py`      | Import `iran_stocks.json` / `iran_funds.json` |
| `seed_loan_data.py`        | Seed bank and loan records                   |
| `backfill_history.py`      | Backfill historical OHLCV for all symbols    |
| `migrate_sqlite_to_pg.py`  | One-time migration from SQLite dev DB        |
| `update_all_data.py`       | Trigger all spiders in sequence              |
| `export_all_data.py`       | Dump all tables to JSON                      |
| `check_trading_hours.py`   | Print current trading session status         |
| `run_spider.py`            | Run a single spider by name                  |
| `test_api_connection.py`   # Test API connectivity                        |
| `quick_test.py`            | Smoke test key endpoints                     |
| `query_examples.py`        | Sample DB query demonstrations               |

---

## Documentation — `docs/`

```
docs/
├── ARCHITECTURE.md        # Architecture & capacity analysis
├── STRUCTURE.md            # This file
└── benchmark/
    ├── frontend.md         # Static asset serving benchmark (Nginx)
    ├── backend.md          # API endpoint benchmark (FastAPI/Uvicorn)
    ├── database.md         # PostgreSQL + Redis + PgBouncer benchmark
    └── scoring.md          # Performance scorecard + code review grades
```

Root-level docs:

| File                   | Contents                                         |
|------------------------|--------------------------------------------------|
| `BENCHMARK.md`         | Consolidated Apache Bench results                |
| `CLAUDE.md`            | Instructions for Claude Code                     |
| `GIT_BRANCHING.md`     | Git Flow branching strategy                      |
| `README.md`            | Project overview and quickstart                  |

---

## Key Conventions

### Import Paths

- Landing page components: `import X from '../features/landing/components/X'`
- Chat components: `import X from '../features/chat/components/X'`
- Loan feature components: `import X from '../features/loans/<domain>/X'`
- Shared UI: `import X from '../components/X'`
- Hooks: `import useX from '../hooks/useX'`
- Utils: `import { fn } from '../utils/formatUtils'`
- Colors: `import rallyColors from '../theme/rallyColors'`

### Routing

All routes defined in `frontend/src/App.jsx`:

| Path prefix    | Layout             | Notes                          |
|----------------|--------------------|--------------------------------|
| `/`            | None (standalone)  | LandingPage                    |
| `/pricing`     | None (standalone)  | PricingPage                    |
| `/tutorial`    | None (standalone)  | TutorialPage                   |
| `/about`       | None (standalone)  | AboutPage                      |
| `/dashboard/*` | `MainLayout`       | TSE market section             |
| `/crypto/*`    | `CryptoMainLayout` | Crypto section                 |
| `/loans/*`     | `LoanMainLayout`   | Loans section                  |

### CSS Classes (landing pages)

| Class                        | Purpose                              |
|------------------------------|--------------------------------------|
| `landing-bg`                 | Dark animated background             |
| `landing-dot-grid`           | Faded dot grid overlay               |
| `landing-glow-card`          | Glassmorphic card base style         |
| `landing-pricing-card`       | Pricing plan card                    |
| `landing-pricing-card--featured` | Highlighted (Pro) card           |
| `landing-pricing-check`      | Feature row with icon + text         |
| `landing-compare-table`      | Comparison table wrapper             |
| `landing-compare-row`        | Feature comparison row               |
| `landing-compare-cell`       | Individual cell in comparison table  |
| `landing-compare-cell--highlight` | Pro column highlight            |
| `landing-billing-toggle`     | Monthly/yearly segmented control     |
| `landing-cta`                | Primary green CTA button             |
| `landing-cta-ghost`          | Secondary outline CTA button         |
| `landing-pill`               | Small badge/label pill               |
| `landing-footer-link`        | Hoverable footer navigation link     |

### Cache Tags

Cache invalidation tags match spider names:

| Tag              | Invalidated by spider         |
|------------------|-------------------------------|
| `market_watch`   | market_watch                  |
| `market_prices`  | market_prices                 |
| `options`        | options                       |
| `ime_options`    | ime_options                   |
| `ime_futures`    | ime_futures                   |
| `ime_*`          | all IME spiders               |
| `sectors`        | market_watch (aggregate)      |
| `companies`      | instrument_details            |
