# CLAUDE.md — TSE Dashboard

> Instructions for Claude Code. Keep this file updated as the project evolves.

---

## Project Overview

**TSE Dashboard** is a full-stack web application for monitoring and analyzing the Tehran Stock Exchange (TSE), Iranian bank loans, cryptocurrency markets, and investment portfolios. It is a production-ready monorepo with a Python backend and a React frontend, served via Docker.

- **Repo**: `sajjadtzroo/TSE_Dashboard`
- **License**: MIT
- **Stack**: FastAPI + Gunicorn/Uvicorn · PostgreSQL 16 + pgvector · Redis · PgBouncer · Nginx · React 18 + Vite · Mantine v7

---

## Architecture

```
Client ──► Nginx :80 ──► Gunicorn+Uvicorn :8000 ──► PgBouncer :6432 ──► PostgreSQL :5432
                                    │
                                    └──► Redis :6379 (cache + rate limit)
```

**Docker services**: `nginx`, `app` (API), `scheduler`, `db`, `pgbouncer`, `redis`

**Docker targets** in multi-stage Dockerfile: `api`, `scheduler`, `nginx`

---

## Key File Locations

### Backend
| File | Purpose |
|------|---------|
| `api/main.py` | App factory, middleware stack, lifespan, SPA fallback |
| `api/cache.py` | RedisCacheManager — tag-based invalidation, dynamic TTL |
| `api/cache_decorators.py` | `@cached()` decorator for route handlers |
| `api/rate_limit.py` | Redis sliding-window rate limiter (per-IP, tiered) |
| `api/auth.py` | JWT auth, `require_role()` dependency |
| `api/monitoring.py` | Prometheus + JSON structured logging + X-Request-ID |
| `api/routes/auth.py` | Register / login / refresh / me endpoints |
| `api/routes/ws.py` | WebSocket + SSE for live market data |
| `database/models.py` | SQLAlchemy ORM models |
| `database/connection.py` | Async engine + session factory |
| `config/settings.py` | Pydantic BaseSettings — reads `.env` |

### RAG / AI
| File | Purpose |
|------|---------|
| `rag/agents/__init__.py` | `get_agent(intent)` registry — returns cached `BaseAgent` |
| `rag/agents/router.py` | Classifies user intent (uses `ROUTER_MODEL = gpt-4o-mini`) |
| `rag/agents/base.py` | Reusable tool-calling loop, sanitized errors |
| `rag/tools/` | market.py, documents.py, technical.py, comparison.py, loans.py, crypto.py |

API contract: `POST /api/chat` → `{ answer, sources, tools_used, model }`

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/App.jsx` | All routes, lazy loading, error boundaries |
| `frontend/src/global.css` | Global styles, all landing CSS classes, dark theme |
| `frontend/src/theme/rallyColors.js` | All color tokens (hex values) |
| `frontend/src/features/landing/components/` | LandingNav, LandingFooter, SectionHeader, Reveal, HeroVisual, FeatureCard, PricingPlans |
| `frontend/src/features/chat/components/` | ChatDrawer, MessageBubble, MarkdownRenderer |
| `frontend/src/hooks/useMarketData.js` | TanStack Query hooks for market endpoints |
| `frontend/src/hooks/useWebSocket.js` | Auto-reconnect WebSocket hook |

### Infrastructure
| File | Purpose |
|------|---------|
| `infra/nginx/nginx.conf` | Reverse proxy, gzip, rate limits, static asset caching |
| `infra/postgres/postgresql.conf` | Tuned for 4 GB RAM, SSD, pgvector |
| `docker-compose.yml` | All service definitions |
| `alembic/versions/` | Database migration history |

### Docs
| File | Purpose |
|------|---------|
| `docs/STRUCTURE.md` | Complete directory and file reference |
| `docs/benchmark/frontend.md` | Static asset Apache Bench results |
| `docs/benchmark/backend.md` | API endpoint Apache Bench results |
| `docs/benchmark/database.md` | PostgreSQL + Redis + PgBouncer analysis |
| `docs/benchmark/scoring.md` | Performance scorecard + code review grades |
| `BENCHMARK.md` | Consolidated benchmark report |

---

## Development Commands

```bash
# Start all services
docker compose up --build -d

# View logs
docker compose logs -f app
docker compose logs -f scheduler

# Stop all
docker compose down

# Run Python tests
pytest -n auto --cov=api --cov=database --cov=rag

# Build frontend only
cd frontend && npm run build

# Run frontend dev server
cd frontend && npm run dev

# Database migrations
alembic upgrade head
alembic revision --autogenerate -m "description"
```

---

## Conventions

### Frontend Import Paths
- Landing components: `import X from '../features/landing/components/X'`
- Chat components: `import X from '../features/chat/components/X'`
- Shared UI: `import X from '../components/X'`
- Colors: `import rallyColors from '../theme/rallyColors'`
- Lazy pages: `const Page = lazyRetry(() => import('./pages/Page'), 'Page')`

### Routing (App.jsx)
- Standalone pages (no layout): `/`, `/pricing`, `/tutorial`, `/about`
- TSE market section: `/dashboard/*` → `MainLayout`
- Crypto section: `/crypto/*` → `CryptoMainLayout`
- Loans section: `/loans/*` → `LoanMainLayout`

### CSS Classes (landing pages)
Key classes in `global.css`: `landing-bg`, `landing-dot-grid`, `landing-glow-card`, `landing-pricing-card`, `landing-pricing-card--featured`, `landing-pricing-check`, `landing-compare-table`, `landing-compare-row`, `landing-compare-cell`, `landing-compare-cell--highlight`, `landing-billing-toggle`, `landing-cta`, `landing-cta-ghost`, `landing-pill`, `landing-footer-link`

### Cache Tags
Tags match spider names: `market_watch`, `market_prices`, `options`, `ime_options`, `ime_futures`, `ime_*`, `sectors`, `companies`

### Rate Limit Tiers
| Tier | Limit | Used for |
|------|-------|---------|
| default | 100 req/min | Most read endpoints |
| heavy | 30 req/min | market-overview, client-type |
| scraper | 5 req/min | /api/scraper/*, /api/rag/upload |

### Auth Tiers
| Tier | Access |
|------|--------|
| public | GET market data |
| viewer | RAG / chat |
| analyst | Document upload |
| admin | Scraper triggers, cache admin |

### Trading Hours
Sat–Wed 09:00–12:30 Tehran time. Cache TTLs are shorter during open market. Use `_is_trading_hours()` helper.

### Known Gotchas
- **Prometheus**: Do NOT pass `should_instrument_requests_in_progress` (removed in v7+)
- **python-json-logger**: Import as `from pythonjsonlogger import jsonlogger`
- **Tool dispatch**: No-arg tools (`get_market_indices`, `list_banks`) call `func(db)` only
- **RAG tools**: `rag/tools.py` deleted — replaced by `rag/tools/__init__.py` (backward-compat re-exports)
- **ChatDrawer**: `components/ChatDrawer.jsx` is a re-export shim; real code in `features/chat/components/`

---

## Git Branching Model

Git Flow:

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready releases |
| `develop` | Active development integration |
| `staging` | Pre-production testing |
| `feature/*` | New features (branch from `develop`) |
| `release/*` | Release prep (branch from `develop`, merge to `main` + `develop`) |
| `hotfix/*` | Urgent fixes (branch from `main`, merge to `main` + `develop`) |

See [GIT_BRANCHING.md](./GIT_BRANCHING.md) for full details.

---

## Commit Message Convention

```
<type>: <short summary>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`

---

## Code Guidelines

- Do not commit `.env`, `node_modules/`, secrets, or API keys
- RTL layout — use `inset-inline-start` / logical CSS properties in landing pages
- All landing page animations use `motion/react` (`motion.div`, `whileHover`, `Reveal`)
- Prefer editing existing files over creating new ones
- Keep components focused — no premature abstractions
- Follow existing file structure: new landing components → `features/landing/components/`, new shared UI → `components/`
