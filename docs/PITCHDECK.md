# TSE Dashboard — Pitch Deck

---

## Slide 1 — Cover

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              📊  TSE Dashboard                          │
│                                                         │
│   AI-Powered Financial Intelligence                     │
│   for 30 Million Iranian Investors                      │
│                                                         │
│   Seed Round  ·  2026                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Slide 2 — The Problem

**Iranian investors are flying blind.**

> Iran has 30M+ registered stock market investors, yet the tools available to them look like 2005 web portals — no AI, no aggregation, no professional-grade analysis.

**Three compounding problems:**

```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  📂 FRAGMENTATION    │  │  🔧 ANALYSIS GAP     │  │  🌐 LOCALE BARRIER   │
│                      │  │                      │  │                      │
│  TSE data, bank      │  │  No tool builds DCF  │  │  Bloomberg, Trading  │
│  rates, crypto,      │  │  models, compares    │  │  View don't support  │
│  and commodity       │  │  loans, or analyzes  │  │  Jalali calendar,    │
│  futures live on     │  │  Codal reports       │  │  IRR, or Persian     │
│  5+ separate sites   │  │  automatically       │  │  corporate filings   │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

---

## Slide 3 — The Opportunity

**Iran's financial market is massive and underserved.**

| Indicator | Figure |
|-----------|--------|
| Registered TSE investors | **30M+** (post-2020 surge) |
| Daily TSE trading volume (peak) | **$150B+** |
| Crypto P2P volume (global rank) | **Top 10** |
| Banks offering loans | **50+** competing products |
| Annual bank lending | **$50B+** |

**No single product connects all of this.**

---

## Slide 4 — Our Solution

```
┌─────────────────────────────────────────────────────────────────┐
│                     TSE DASHBOARD                               │
│                                                                 │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐ │
│   │    TSE     │  │   Crypto   │  │    IME     │  │  Loans  │ │
│   │ Real-time  │  │  30+ coins │  │ Commodity  │  │ 50+     │ │
│   │ 300+ stocks│  │ Fear-greed │  │ futures    │  │ banks   │ │
│   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └────┬────┘ │
│         └───────────────┴───────────────┴──────────────┘       │
│                                │                                │
│              ┌─────────────────▼─────────────────┐             │
│              │    Claude Sonnet 4.6 AI Engine     │             │
│              │    80+ financial tools             │             │
│              │    Persian + English               │             │
│              └───────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

**One dashboard. All Iranian markets. AI-native.**

---

## Slide 5 — Product Demo

### Ask anything. Get professional analysis.

**User types:**
> "یک مدل DCF برای شرکت فولاد با WACC 22% بساز"
> *(Build a DCF model for Foolad with 22% WACC)*

**What happens in 3 seconds:**

```
1. Claude routes to financial_modeling agent
2. Calls compute_wacc → build_dcf_model → _build_dcf_workbook
3. Returns:
   • Enterprise value: 8,450 B IRR
   • Price per share: 3,240 IRR
   • Sensitivity table (9×5 WACC/TG grid)
   • ✅ Download: DCF-فولاد.xlsx
```

**Same for:**
- "بهترین وام مسکن بدون ضامن" → Loan comparison table
- "تکنیکال شبندر" → RSI, MACD, Bollinger Bands chart
- "پرتفوی با ریسک متوسط" → Asset allocation with Monte Carlo

---

## Slide 6 — Traction

```
         Users                      AI Queries/Day
           │                              │
  50K ─── │ ··············· (target)    │
           │          ···               │
  10K ─── │     ···                     │
           │  ··                         │
           └──────────────────────       └──────────────────

         MRR (IRR)                   Excel Models Generated
           │                              │
 400M ─── │ ·················            │
           │         ···                  │
  80M ─── │    ···                        │
           └──────────────────────       └──────────────────
              Q1  Q2  Q3  Q4                Q1  Q2  Q3  Q4
```

**Key milestones:**
- ✅ Production infrastructure deployed (Docker, Nginx, PostgreSQL, Redis)
- ✅ 60+ financial modeling tools live (DCF, DDM, WACC, EVA, multiples, …)
- ✅ AI chat with 10 specialized agents
- ✅ 50+ Iranian bank loan database
- ✅ Codal document QA pipeline
- 🔄 Mobile app in development

---

## Slide 7 — Business Model

### Freemium SaaS with Enterprise Licensing

```
┌──────────────────┬───────────────────┬────────────────────────┐
│     FREE         │       PRO         │      ENTERPRISE        │
│                  │                   │                         │
│  ۰ / month       │  ۲۹۹K IRR/month   │  Custom pricing         │
│                  │  (~$7 USD)        │                         │
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
- ARPU: ~$7/month
- Gross margin: >90% (SaaS + AI API costs only)
- CAC: <$5 (organic, Telegram community)
- LTV: $7 × 24 months × (1 − 4% churn) = **~$140**
- **LTV/CAC: ~28×**

---

## Slide 8 — Market Size

```
                    TAM
              ┌────────────────────┐
              │  30M+ TSE investors│
              │  $150B daily volume│
              │  ≈ $2B+ TAM        │
              └────────┬───────────┘
                       │
                    SAM
              ┌────────────────────┐
              │  3M digitally      │
              │  active investors  │
              │  ≈ $200M SAM       │
              └────────┬───────────┘
                       │
                    SOM (Y3)
              ┌────────────────────┐
              │  50K Pro users     │
              │  + 20 enterprise   │
              │  ≈ $4.3M ARR       │
              └────────────────────┘
```

---

## Slide 9 — Competitive Advantage

| | TSE Dashboard | TSETMC Portal | Tadbir Pardaz | TradingView |
|---|:---:|:---:|:---:|:---:|
| Real-time TSE data | ✅ | ✅ | ✅ | ❌ |
| AI chat assistant | ✅ | ❌ | ❌ | ❌ |
| Financial modeling (DCF, DDM) | ✅ | ❌ | ⚠️ basic | ❌ |
| Iranian bank loans | ✅ | ❌ | ❌ | ❌ |
| Crypto + IME | ✅ | ❌ | ❌ | ⚠️ crypto only |
| Persian/Jalali-native | ✅ | ✅ | ✅ | ❌ |
| Codal document QA | ✅ | ❌ | ❌ | ❌ |
| Excel export (IB-grade) | ✅ | ❌ | ❌ | ❌ |
| Portfolio + risk profiling | ✅ | ❌ | ⚠️ basic | ❌ |

**4 defensible moats:**
1. **Data**: Proprietary scrapers — 6+ months to replicate
2. **AI depth**: 80+ domain tools wired to LLM — 12+ months to build
3. **Persian-first**: Jalali, Codal, RTL — not a localization patch
4. **Network**: Community watchlists, model history, loan trackers → stickiness

---

## Slide 10 — Technology

**Production-grade stack, built to scale:**

```
                        Users
                          │
                    ┌─────▼──────┐
                    │   Nginx    │  Rate limiting, gzip, CDN-ready
                    └─────┬──────┘
                          │
                    ┌─────▼──────┐
                    │  FastAPI   │  Async, 4 Gunicorn workers
                    │ + Uvicorn  │  Prometheus metrics
                    └──┬──────┬──┘
                       │      │
              ┌────────▼─┐  ┌─▼────────┐
              │PostgreSQL│  │  Redis   │
              │+ pgvector│  │ cache +  │
              │(vectors, │  │ rate lim │
              │ ORM, RAG)│  └──────────┘
              └──────────┘

         LLM: Claude Sonnet 4.6 via OpenRouter
         Router: GPT-4o-mini (intent classification)
         Embeddings: Sentence Transformers + pgvector
```

**Performance benchmark:**
- API p95 latency: < 80ms (cached endpoints)
- AI chat response: < 3s (streaming starts in < 500ms)
- Concurrent users supported: 1,000+ (single node)
- Cache hit rate: > 85% (Redis tag-based invalidation)

---

## Slide 11 — Go-to-Market

### 3-phase GTM

```
Phase 1 (M1–M6): SEED GROWTH
┌─────────────────────────────────────────────┐
│ • Free tier launch (no friction signup)     │
│ • Telegram channel + financial content      │
│ • SEO: Persian finance keywords             │
│ • Target: 10,000 MAU                        │
└─────────────────────────────────────────────┘

Phase 2 (M6–M18): MONETIZATION
┌─────────────────────────────────────────────┐
│ • AI features behind Pro paywall            │
│ • Nowruz annual plan campaign               │
│ • In-app upgrade nudges (usage-gated)       │
│ • Target: 3,000 Pro subscribers             │
└─────────────────────────────────────────────┘

Phase 3 (M18–M36): ENTERPRISE
┌─────────────────────────────────────────────┐
│ • Direct sales to 15 brokerages             │
│ • API product for fintech startups          │
│ • White-label for digital banks             │
│ • Target: $4.3M ARR                         │
└─────────────────────────────────────────────┘
```

---

## Slide 12 — Financial Projections

| | Year 1 | Year 2 | Year 3 |
|--|-------:|-------:|-------:|
| **MAU** | 50K | 150K | 400K |
| **Pro subscribers** | 2,000 | 10,000 | 50,000 |
| **Enterprise contracts** | 2 | 8 | 20 |
| **MRR (Pro)** | 600M IRR | 3B IRR | 15B IRR |
| **ARR (total)** | ~$1.7M | ~$8.5M | ~$43M |
| **Gross margin** | 88% | 91% | 92% |
| **Team size** | 5 | 12 | 25 |

*Projections assume 3% monthly Pro conversion, 4% churn, FX at 43,000 IRR/USD*

---

## Slide 13 — Use of Funds

**Seeking: $500K Seed**

```
┌─────────────────────────────────────────────────────────┐
│                   $500K Allocation                      │
│                                                         │
│  Engineering (2 hires)    ████████████████  40%  $200K │
│  AI / LLM API costs       ████████          20%  $100K │
│  Marketing & growth       ██████            15%   $75K │
│  Infrastructure           ████              10%   $50K │
│  Legal / compliance       ██                 5%   $25K │
│  Reserve                  ████              10%   $50K │
└─────────────────────────────────────────────────────────┘

18-month runway to Series A readiness at $4M ARR
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
│   We're raising $500K Seed to:                          │
│                                                         │
│   1. Launch Pro tier with full AI paywall               │
│   2. Ship mobile app (React Native)                     │
│   3. Hire growth + engineering                          │
│   4. Close first 3 enterprise contracts                 │
│                                                         │
│   ─────────────────────────────────────────            │
│                                                         │
│   Goal: 10,000 Pro subscribers in 18 months             │
│   = $840K ARR → Series A ready                         │
│                                                         │
│   We are the Bloomberg Terminal                         │
│   for 30 million Iranian investors —                    │
│   at $7/month.                                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Appendix — Technical Architecture

See [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) for full system diagram, capacity analysis, and scaling knobs.

## Appendix — Benchmark Results

See [`BENCHMARK.md`](../BENCHMARK.md) for Apache Bench results across API, frontend, database, and RAG pipeline.

## Appendix — Financial Modeling Tools

See [`docs/financial_modeling_guide.md`](financial_modeling_guide.md) for the full catalog of 60+ valuation, risk, and analytics tools.
