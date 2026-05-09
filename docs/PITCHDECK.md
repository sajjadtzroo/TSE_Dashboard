# TSE Dashboard — Pitch Deck

---

## Slide 1 — Cover

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              📊  TSE Dashboard                          │
│                                                         │
│   AI-Powered Financial Intelligence                     │
│   for [XX]M+ Iranian Investors                          │
│                                                         │
│   Seed Round  ·  [YEAR]                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Slide 2 — The Problem

**Iranian investors are flying blind.**

> Iran has [XX]M+ registered stock market investors, yet the tools available to them look like 2005 web portals — no AI, no aggregation, no professional-grade analysis.

**Three compounding problems:**

```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  📂 FRAGMENTATION    │  │  🔧 ANALYSIS GAP     │  │  🌐 LOCALE BARRIER   │
│                      │  │                      │  │                      │
│  TSE, IME, Codal,    │  │  No tool builds DCF  │  │  Bloomberg, Trading  │
│  50+ banks, crypto   │  │  models, parses      │  │  View don't support  │
│  each on a separate  │  │  Codal financials,   │  │  Jalali calendar,    │
│  portal              │  │  or compares loans   │  │  IRR, or Persian     │
│                      │  │  automatically       │  │  filings — and       │
│                      │  │                      │  │  sanctions block     │
│                      │  │                      │  │  half the data       │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

---

## Slide 3 — The Opportunity

**Iran's financial market is massive and underserved.**

| Indicator | Figure |
|-----------|--------|
| Registered TSE investors | **[XX]M+** |
| Daily TSE trading volume (peak) | **$[XXX]B+** |
| Crypto P2P volume (global rank) | **Top [XX]** |
| Banks offering loans | **[XX]+** competing products |
| Annual bank lending | **$[XXX]B+** |

**No single product connects all of this.**

---

## Slide 4 — Our Solution

**One dashboard, four markets, fourteen specialized AI agents.**

```
┌─────────────────────────────────────────────────────────────────┐
│                     TSE DASHBOARD                               │
│                                                                 │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐ │
│   │    TSE     │  │    IME     │  │   Crypto   │  │  Loans  │ │
│   │ Real-time  │  │ Gold, oil, │  │  30+ coins │  │ 50+     │ │
│   │ 300+ stocks│  │ metals,    │  │ Fear-greed │  │ banks   │ │
│   │ + flows    │  │ derivatives│  │ + on-chain │  │         │ │
│   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └────┬────┘ │
│         └───────────────┴───────────────┴──────────────┘       │
│                                │                                │
│              ┌─────────────────▼─────────────────┐             │
│              │  14-agent AI router               │             │
│              │  50+ deterministic finance tools  │             │
│              │  pgvector RAG (Codal + CFA)       │             │
│              │  Persian + English                │             │
│              └───────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

User types `"تحلیل مالی فولاد"` → router classifies as `FINANCIAL_ANALYSIS` → agent calls `search_documents()` over Codal + `compute_financial_ratios()` + `compute_dupont()` → cited Persian answer in <3s.

---

## Slide 5 — Product Demo

### Ask anything. Get professional analysis.

**User types:**
> "یک مدل DCF برای شرکت فولاد با WACC ۲۲٪ بساز"
> *(Build a DCF model for Foolad with 22% WACC)*

**What happens in <5 seconds:**

```
1. Router → financial_modeling agent (Claude Opus 4.6)
2. compute_wacc → build_dcf_model → _build_dcf_workbook
3. Returns:
   • Enterprise value
   • Price per share
   • Sensitivity table (9×5 WACC/TG grid)
   • ✅ Download: DCF-فولاد.xlsx
```

**Same flow handles:**
- "بهترین وام مسکن بدون ضامن" → Loan comparison table
- "تکنیکال شبندر" → RSI, MACD, Bollinger Bands chart
- "پرتفوی با ریسک متوسط" → Asset allocation with Monte Carlo
- "گزارش مالی فولاد ۱۴۰۳" → Cited answer over parsed Codal financials

---

## Slide 6 — Traction

**Built and running in production today:**

- 23 API route modules, 100+ endpoints (`api/routes/`)
- 18 spiders running on schedule from 2.5 min to daily (`scheduler/scheduler.py`)
- 14 AI agents, 30+ tools, 50+ financial-modeling functions (`rag/agents/`, `rag/tools/`)
- pgvector RAG over Codal financials + CFA curriculum (1536-dim embeddings, cross-encoder rerank)
- WebSocket live market stream + SSE fallback (`/ws/market`, `/api/events/market`)
- Telegram Mini App authentication (HMAC-verified, no password needed)
- Multi-model LLM routing — Gemini 2.0 Flash (chat) / Gemini 2.5 (analysis) / Claude Opus 4.6 (modeling)
- Production Docker stack: 10 services, healthchecks, Sentry, Prometheus

**Performance** (Apache Bench, `BENCHMARK.md`):

- 97.7% Redis cache hit rate
- 173 RPS heavy API · 589 RPS cached endpoints
- p99 latency < 80ms
- 1,000+ concurrent users on a single node

**Next 90 days:**
- Public launch · Pro paywall · mobile app (React Native)

---

## Slide 7 — Business Model

### Freemium SaaS with Enterprise Licensing

```
┌──────────────────┬───────────────────┬────────────────────────┐
│     FREE         │       PRO         │      ENTERPRISE        │
│                  │                   │                         │
│ [PRICE] / month  │  [PRICE] / month  │  Custom pricing         │
│                  │                   │                         │
│ • TSE data       │ • AI chat         │ • API access            │
│ • Crypto prices  │ • Financial       │ • White-label           │
│ • Loan listings  │   modeling        │ • Unlimited users       │
│ • Heatmaps       │ • Portfolio       │ • SLA                   │
│ • Screener       │ • IME data        │ • Custom integrations   │
│                  │ • Options tools   │ • 24/7 support          │
│                  │ • Alerts          │                         │
└──────────────────┴───────────────────┴────────────────────────┘
```

**Unit economics (Pro):**
- ARPU: [PLACEHOLDER]
- Gross margin: [XX]% (SaaS + AI API costs only)
- CAC: [PLACEHOLDER] (organic, Telegram community)
- LTV: [PLACEHOLDER]
- **LTV/CAC: [XX]×**

---

## Slide 8 — Market Size

```
                    TAM
              ┌────────────────────┐
              │  [XX]M+ TSE        │
              │  investors         │
              │  ≈ $[XXX] TAM      │
              └────────┬───────────┘
                       │
                    SAM
              ┌────────────────────┐
              │  [X]M digitally    │
              │  active investors  │
              │  ≈ $[XXX] SAM      │
              └────────┬───────────┘
                       │
                    SOM (Y3)
              ┌────────────────────┐
              │  [XX]K Pro users   │
              │  + [XX] enterprise │
              │  ≈ $[XXX] ARR      │
              └────────────────────┘
```

---

## Slide 9 — Why We Win

**Four moats, each measured in months of replication time:**

**1. Sanctioned-network data pipeline.** Codal (Iran's SEC EDGAR equivalent) blocks foreign IPs. We run a `gost` HTTP→SOCKS5 bridge inside our Docker stack that routes Scrapy traffic through Iranian residential proxies, then parse the actual Excel financial statements — not just announcement headlines. *No foreign competitor can do this.* (`docker-compose.yml`, `tsetmc_scraper/spiders/codal_financials_detail.py`)

**2. Real-vs-legal flow data.** Every TSE trade is tagged retail (حقیقی) or institutional (حقوقی). We capture and time-series this in `DailyClientType` — the single most-watched signal among Iranian traders. Bloomberg doesn't have it. TradingView doesn't have it. TSETMC has it but won't expose an API. (`database/models.py`)

**3. AI depth, not AI veneer.** 14 intent-routed agents wired to 50+ deterministic financial tools (DCF, WACC, DDM, Black-Scholes, Hamada, EVA, multi-stage DDM, sensitivity grids). Most "AI fintech" wraps GPT around a search box; we wrap it around an investment-banking toolkit that produces auditable Excel. *12+ months to replicate.*

**4. Persian-first, not localized.** Jalali dates, RTL layout, Codal parsing, CFA curriculum embedded for ratio explanations in Persian, Telegram Mini App login. Built in, not retrofitted.

| | TSE Dashboard | TSETMC Portal | Tadbir Pardaz | TradingView |
|---|:---:|:---:|:---:|:---:|
| TSE real-time + retail/institutional flows | ✅ | ✅ | ⚠️ | ❌ |
| Codal **financials** parsed (not just titles) | ✅ | ❌ | ❌ | ❌ |
| AI chat with 50+ deterministic tools | ✅ | ❌ | ❌ | ❌ |
| DCF / DDM / Greeks → Excel | ✅ | ❌ | ⚠️ basic | ❌ |
| 50-bank loan comparison | ✅ | ❌ | ❌ | ❌ |
| Crypto + IME commodity derivatives | ✅ | ❌ | ❌ | ⚠️ crypto only |
| Persian / Jalali / Telegram-native | ✅ | ✅ | ✅ | ❌ |

---

## Slide 10 — Technology

**Production-grade stack, built for the Iranian network reality.**

```
Browser
  │
  └── Nginx (rate-limit, gzip, CDN-ready)
        │
        └── FastAPI / Gunicorn + Uvicorn
              ├── PgBouncer ──► Postgres 16
              │                 ├── pgvector  (RAG, 1536-dim)
              │                 └── TimescaleDB (tick hypertables)
              ├── Redis  (cache + pub/sub + rate limit, 4 tiers)
              ├── MinIO  (PDFs, generated Excel models)
              └── gost   ──► SOCKS5 ──► Codal / BrsAPI

Tick Ingestor    ──► Redis pub/sub ──► WebSocket /ws/market
Binance Ingestor ──► Redis pub/sub ──► WebSocket /ws/crypto
Scheduler (APScheduler)   ──► 18 spiders, 2.5 min → daily
```

**Cost-aware multi-model AI routing** (instead of "everything to GPT-4"):

| Layer | Model | Why |
|-------|-------|-----|
| Intent router | GPT-4o-mini | ~50 tokens, ~300ms, ~$[X] per query |
| Conversational chat | Gemini 2.0 Flash | Cheap, fast, good Persian |
| Financial analysis | Gemini 2.5 Flash | Stronger reasoning over ratios |
| DCF / heavy modeling | Claude Opus 4.6 | Precision matters for valuation |

**Observability:** Prometheus metrics, JSON structured logging, request-ID tracing, Sentry error capture.

**Security:** JWT + 7-day refresh tokens, role-based access (admin/trader/viewer), bcrypt, Telegram HMAC auth, sliding-window rate limiting in Redis (4 tiers: default / heavy / scraper / auth).

**Performance** (`BENCHMARK.md`):
- 97.7% Redis cache hit rate
- 173 RPS at 520 KB payload, p99 < 80ms
- 1,000+ concurrent users on a single node
- Tag-based cache invalidation, trading-hours-aware TTL

---

## Slide 11 — Go-to-Market

### 3-phase GTM

```
Phase 1 (M1–M6): SEED GROWTH
┌─────────────────────────────────────────────┐
│ • Free tier launch (no friction signup)     │
│ • Telegram channel + financial content      │
│ • SEO: Persian finance keywords             │
│ • Target: [XX,XXX] MAU                      │
└─────────────────────────────────────────────┘

Phase 2 (M6–M18): MONETIZATION
┌─────────────────────────────────────────────┐
│ • AI features behind Pro paywall            │
│ • Nowruz annual plan campaign               │
│ • In-app upgrade nudges (usage-gated)       │
│ • Target: [X,XXX] Pro subscribers           │
└─────────────────────────────────────────────┘

Phase 3 (M18–M36): ENTERPRISE
┌─────────────────────────────────────────────┐
│ • Direct sales to [XX] brokerages           │
│ • API product for fintech startups          │
│ • White-label for digital banks             │
│ • Target: $[X.X]M ARR                       │
└─────────────────────────────────────────────┘
```

---

## Slide 12 — Financial Projections

| | Year 1 | Year 2 | Year 3 |
|--|-------:|-------:|-------:|
| **MAU** | [XX]K | [XXX]K | [XXX]K |
| **Pro subscribers** | [X,XXX] | [XX,XXX] | [XX,XXX] |
| **Enterprise contracts** | [X] | [X] | [XX] |
| **MRR (Pro)** | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |
| **ARR (total)** | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |
| **Gross margin** | [XX]% | [XX]% | [XX]% |
| **Team size** | [X] | [XX] | [XX] |

*Projections assume [X]% monthly Pro conversion, [X]% churn, FX at [XX,XXX] IRR/USD*

---

## Slide 13 — Use of Funds

**Seeking: $[XXX]K Seed**

```
┌─────────────────────────────────────────────────────────┐
│                $[XXX]K Allocation                       │
│                                                         │
│  Engineering ([X] hires)  ████████████████  [XX]%       │
│  AI / LLM API costs       ████████          [XX]%       │
│  Marketing & growth       ██████            [XX]%       │
│  Infrastructure           ████              [XX]%       │
│  Legal / compliance       ██                [XX]%       │
│  Reserve                  ████              [XX]%       │
└─────────────────────────────────────────────────────────┘

[XX]-month runway to Series A readiness at $[X]M ARR
```

---

## Slide 14 — Team

| Name | Role | Background |
|------|------|-----------|
| **[Founder]** | CEO & Product | TSE trading, product management |
| **[Co-Founder]** | CTO | Full-stack, FastAPI, AI/RAG systems |
| **[Advisor]** | Finance | CFA charterholder, investment banking |

**Looking to add:**
- Head of Growth (Telegram / SEO / content)
- Senior Backend Engineer (data pipelines)

---

## Slide 15 — Ask

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   We're raising $[XXX]K Seed to:                        │
│                                                         │
│   1. Public launch + Pro paywall                        │
│   2. Ship mobile app (React Native)                     │
│   3. Hire growth + senior data engineer                 │
│   4. Close first 3 enterprise contracts                 │
│                                                         │
│   ─────────────────────────────────────────            │
│                                                         │
│   Goal: [XX,XXX] Pro subscribers in 18 months           │
│   = $[X.X]M ARR → Series A ready                        │
│                                                         │
│   We are the Bloomberg Terminal                         │
│   for [XX] million Iranian investors —                  │
│   at $[X]/month, in Persian,                            │
│   on a network Bloomberg literally cannot reach.        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Appendix — Technical Architecture

See [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) for full system diagram, capacity analysis, and scaling knobs.

## Appendix — Benchmark Results

See [`BENCHMARK.md`](../BENCHMARK.md) for Apache Bench results across API, frontend, database, and RAG pipeline.

## Appendix — Financial Modeling Tools

See [`docs/financial_modeling_guide.md`](financial_modeling_guide.md) for the full catalog of 50+ valuation, risk, and analytics tools.
