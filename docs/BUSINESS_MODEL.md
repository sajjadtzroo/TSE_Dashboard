# TSE Dashboard — Business Model

> Iranian fintech SaaS: real-time multi-market data + AI-powered financial analysis

---

## 1. Executive Summary

TSE Dashboard is a **subscription-based SaaS platform** targeting Iranian retail investors, financial analysts, and institutions. It aggregates data from four fragmented markets (Tehran Stock Exchange, cryptocurrency, Iran Mercantile Exchange, and bank loans) and layers in AI-powered analysis tools — financial modeling, portfolio construction, document QA, and a conversational assistant.

**Revenue model**: Freemium SaaS with monthly/annual subscriptions (Pro) and custom enterprise licensing.

---

## 2. The Problem

Iranian investors face three compounding friction points:

| Pain | Impact |
|------|--------|
| **Data fragmentation** | TSE data, bank rates, crypto prices, and commodity futures live on 5+ separate portals with inconsistent UX and no API |
| **Analysis gap** | No affordable tool builds DCF models, compares loan products, or backtests portfolios — analysts do this in Excel manually |
| **Language & locale barrier** | Global platforms (Bloomberg, TradingView) don't support Jalali calendar, IRR pricing, or Farsi-language corporate filings (Codal) |

---

## 3. The Solution

A single platform that:

1. **Aggregates** live data from TSE, IME, crypto, and 50+ banks into one normalized API
2. **Analyzes** via 80+ AI tools — DCF, WACC, DDM, multiples, technical indicators, loan calculators, risk profiling
3. **Answers** natural-language questions in Persian and English via Claude Sonnet 4.6 with full tool access
4. **Exports** professional Excel workbooks (IB-grade financial models) on demand

---

## 4. Revenue Streams

### 4.1 Subscription (Primary)

| Tier | Price | Target User | Key Value |
|------|-------|-------------|-----------|
| **Free** | ۰ / month | Casual investors, students | TSE data, crypto prices, loan listings, heatmaps |
| **Pro** | ۲۹۹,۰۰۰ IRR / month *(~$7 USD)* | Active traders, retail investors | AI chat, financial modeling, portfolio tools, IME, options, alerts |
| **Pro Annual** | ۲,۸۷۰,۰۰۰ IRR / year *(~$68 USD)* | Price-sensitive power users | 20% discount vs monthly |
| **Enterprise** | Custom | Brokerages, funds, banks, wealth managers | API access, white-label, unlimited users, SLA, custom reports |

**Key pricing logic**: Pro is priced at < one hour of a retail broker's advisory fee, making self-service analysis economically dominant.

### 4.2 API Licensing (Secondary)

RESTful data API sold per-endpoint or as a monthly data bundle to:
- Independent fintech apps
- Academic researchers
- Corporate treasury teams

### 4.3 Data Licensing (Secondary)

Aggregated, cleaned market datasets (OHLCV, client-type flows, loan rate history) licensed annually to institutional buyers — hedge funds, economic research institutes.

### 4.4 White-Label / OEM (Upside)

Full-platform white-label for brokerage firms and digital banks that want to offer their customers an embedded analytics portal without building one internally.

---

## 5. Cost Structure

| Category | Type | Notes |
|----------|------|-------|
| **AI/LLM API** | Variable | OpenRouter (Claude Sonnet 4.6) — dominant COGS at scale; mid-tier queries ~$0.002 |
| **Hosting / Cloud** | Fixed + variable | Docker on VPS or cloud VM; scales with user count |
| **PostgreSQL / Redis** | Fixed | Managed DB adds marginal cost for HA |
| **Data Acquisition** | Fixed | TSE scraping (free); BRSAPI key for premium tick data (flat rate) |
| **Development** | Fixed | Small team (2–4 engineers) |
| **Support** | Variable | Enterprise SLA requires dedicated support |

**Unit economics target**: At 1,000 Pro subscribers × 299K IRR/month → ~299M IRR (~$7K USD/month) gross revenue. Server cost at 1K users: ~$200–400/month. **Gross margin > 90%** at steady state.

---

## 6. Market Sizing

### Total Addressable Market (TAM)
- **30M+ retail investors** registered on TSE (as of 2023 surge)
- **$150B+ daily TSE trading volume** at peak
- **Crypto adoption**: Iran is top-10 globally for crypto P2P activity (capital controls drive demand)
- **Bank loan market**: $50B+ annual lending across 50 domestic banks

### Serviceable Addressable Market (SAM)
- **~3M digitally active retail investors** who access TSE through online brokerages
- **~500K crypto-active Iranians** using local exchanges
- **~200 brokerage firms and wealth management shops** as enterprise targets

### Serviceable Obtainable Market (SOM) — Year 3
- **50,000 Pro subscribers** × $7/month = **$4.2M ARR**
- **20 enterprise contracts** × $5,000/year average = **$100K ARR**
- **Total SOM Year 3**: ~**$4.3M ARR**

---

## 7. Go-to-Market Strategy

### Phase 1: Community & SEO (Months 1–6)
- Launch free tier with no sign-up friction
- Persian-language content marketing: stock analysis tutorials, Codal report walkthroughs, loan comparison guides
- Telegram channel + community (primary distribution channel in Iran)
- SEO targeting high-volume Persian finance queries ("قیمت دلار", "بهترین سهام", "وام مسکن")

### Phase 2: Conversion (Months 6–18)
- Paywall premium AI features (chat, financial modeling, portfolio)
- Email and in-app nudges: "You used the DCF tool 3 times this week — upgrade to save models"
- Annual plan promotion in Nowruz (Iranian New Year) peak

### Phase 3: Enterprise (Year 2+)
- Direct sales to brokerages (15 firms > $100M AUM each)
- API product for fintech startups
- Partnership with Codal/TSETMC for official data licensing

---

## 8. Competitive Landscape

| Competitor | Strength | Gap TSE Dashboard fills |
|------------|----------|------------------------|
| **TSETMC portal** | Official data source | No AI, no multi-market, terrible UX |
| **Tadbir Pardaz / Rahavard** | Desktop analytics | No AI chat, no loans, no crypto, desktop-only |
| **TradingView** | World-class charts | No Jalali, no IRR, no Codal, no loan tools |
| **Local crypto exchanges (Nobitex, Wallex)** | Crypto only | No TSE, no loans, no financial modeling |
| **Bank portals** | Loan products | One bank only, no comparison |

**Defensible moats:**
1. **Data network**: Proprietary scrapers for TSETMC + Codal + bank loan databases (months to replicate)
2. **AI tooling**: 80+ financial tools wired to LLM — depth takes 12+ months to build
3. **Persian-first UX**: Jalali dates, RTL layout, Farsi corporate filings — not a localization afterthought
4. **Switching costs**: Saved watchlists, risk profiles, model history create stickiness

---

## 9. Product Roadmap

### Now (Live)
- TSE real-time data, options, IME, crypto, loans
- AI chat (Claude Sonnet 4.6) with 80+ tools
- Financial modeling with Excel export (DCF, P&L, DDM, multiples)
- Portfolio risk profiling and allocation
- Codal document QA

### Next (6 months)
- Mobile app (React Native)
- Push alerts (price, volume, portfolio triggers)
- Screener saved filters + email digest
- Broker integration (direct order execution)

### Future (12–24 months)
- Portfolio tracking with cost-basis import from broker statements
- Tax reporting assistant (Islamic Republic tax law)
- API marketplace for third-party tool developers
- Social layer: shared watchlists, analyst leaderboards

---

## 10. Key Metrics

| Metric | Definition | Target (Year 1) |
|--------|-----------|----------------|
| **MAU** | Monthly active users | 50,000 |
| **Pro conversion rate** | Free → Pro | 3–5% |
| **MRR** | Monthly recurring revenue | 400M IRR |
| **Churn** | Monthly Pro cancellations | < 4% |
| **LTV/CAC** | Lifetime value / acquisition cost | > 3× |
| **AI queries/day** | Claude API calls | 10,000 |
| **Excel models generated/month** | FM tool usage | 5,000 |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| **Currency devaluation (IRR)** | High | Price in USD-equivalent anchors; adjust quarterly |
| **Internet restrictions / filtering** | Medium | Local CDN + anti-filter proxying; offline export features |
| **TSETMC API changes** | Medium | Multiple scraper paths; fallback to HTML parsing |
| **LLM cost increase** | Low | Prompt caching; tiered model routing (gpt-4o-mini for simple intents) |
| **Regulatory** | Low | No trading execution → not a broker; data aggregation is legal |
| **Competitor copies features** | Medium | Speed of shipping + data moat + community lock-in |

---

## 12. Team Requirements

| Role | Responsibility |
|------|---------------|
| **Full-Stack Engineer** | Feature development (API + React) |
| **Data Engineer** | Scrapers, scheduler, data quality |
| **ML/AI Engineer** | RAG pipeline, prompt engineering, financial tool accuracy |
| **Growth/Marketing** | Telegram community, SEO, content |
| **Finance Domain Expert** | Validate modeling outputs, enterprise sales |
