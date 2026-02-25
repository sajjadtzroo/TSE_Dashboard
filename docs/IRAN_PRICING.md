# TSE Dashboard — Iran Cost & Pricing Analysis

> February 2026 · Free-market rate: **$1 = 1,600,000 IRR = 160,000 Toman**

---

## ⚠️ Critical: Exchange Rate Reality Check

The pitch deck states **"Pro: ۲۹۹,۰۰۰ IRR/month (~$7 USD)"**.
That math was correct at the old official rate. At today's free-market rate it is completely wrong.

| Rate | Source | USD value of ۲۹۹,۰۰۰ IRR |
|------|--------|--------------------------|
| Official (Central Bank) | ~1,297 IRR / $1 | $0.23 |
| **Free market (Feb 2026)** | **~1,631,000 IRR / $1** | **$0.18** |

> **The current Pro tier costs users less than 20 US cents per month.**
> LLM API costs alone exceed ۱,۲۰۰,۰۰۰ IRR per average user per month.
> **Every paying Pro user currently runs at a loss.**

---

## 1. Monthly Infrastructure Costs

Best local option: **[ArvanCloud](https://www.arvancloud.ir/en/pricing/cloud-server)** (Iranian cloud, equivalent of AWS).
Alternative: Hetzner (Germany) — ~€30/month total, needs foreign payment method.

| Service | Spec | IRR / month | USD equiv |
|---------|------|------------|-----------|
| App server (Gunicorn + FastAPI) | 4 vCPU / 8 GB RAM | ۱۵,۰۰۰,۰۰۰ | $9.4 |
| Database (PostgreSQL + pgvector) | 4 vCPU / 16 GB RAM | ۲۵,۰۰۰,۰۰۰ | $15.6 |
| Redis + PgBouncer | 2 vCPU / 4 GB RAM | ۸,۰۰۰,۰۰۰ | $5.0 |
| Bandwidth (1 TB — expensive in Iran) | — | ۱۲,۰۰۰,۰۰۰ | $7.5 |
| Domain / SSL / CDN | — | ۳,۰۰۰,۰۰۰ | $1.9 |
| **Infrastructure Total** | | **۶۳,۰۰۰,۰۰۰ IRR** | **~$39** |

---

## 2. LLM API Cost — The Dominant Variable

**Claude Sonnet 4.6 via [OpenRouter](https://openrouter.ai/anthropic/claude-sonnet-4.5):**

| Token type | Price |
|-----------|-------|
| Input | $3.00 / 1M tokens |
| Output | $15.00 / 1M tokens |
| **Average query** (4K input + 1K output) | **$0.027 per query** |

### Cost per user per month by usage level

| Usage tier | Queries / month | LLM cost (USD) | LLM cost (IRR) |
|-----------|----------------|----------------|----------------|
| Light | 10 | $0.27 | ۴۳۲,۰۰۰ |
| **Medium** | **30** | **$0.81** | **۱,۲۹۶,۰۰۰** |
| Heavy | 100 | $2.70 | ۴,۳۲۰,۰۰۰ |

### Scale: LLM cost at 1,000 Pro users (medium usage)

```
30 queries × 1,000 users × $0.027 = $810/month = ۱,۲۹۶,۰۰۰,۰۰۰ IRR/month
```

> **At medium usage, LLM costs alone are 4× the current Pro price per user.**

---

## 3. Personnel Costs

Source: [Glassdoor Iran 2025](https://www.glassdoor.com/Salaries/iran-senior-software-engineer-salary-SRCH_IL.0,4_IN118_KO5,29.htm)

| Role | Salary range (IRR/year) | Monthly (IRR) | Monthly (USD) |
|------|------------------------|--------------|--------------|
| Senior backend engineer | ۵۰۰M – ۱.۵B | ۴۲M – ۱۲۵M | $26 – $78 |
| Mid frontend engineer | ۲۵۰M – ۷۰۰M | ۲۱M – ۵۸M | $13 – $36 |
| Data / scraping engineer | ۳۰۰M – ۸۰۰M | ۲۵M – ۶۷M | $16 – $42 |
| Growth / marketing | ۲۰۰M – ۵۰۰M | ۱۷M – ۴۲M | $11 – $26 |

*Note: Senior Iranian engineers increasingly earn in USD via remote work. Locally-paid roles are in the lower range.*

---

## 4. Total Monthly Costs — Full Stack

Scenario: **1,000 Pro users, medium usage (30 AI queries/month each)**

| Category | IRR / month | USD / month |
|----------|------------|------------|
| Infrastructure (ArvanCloud) | ۶۳,۰۰۰,۰۰۰ | $39 |
| LLM API — Claude Sonnet 4.6 | ۱,۲۹۶,۰۰۰,۰۰۰ | $810 |
| LLM router — GPT-4o-mini | ۱,۵۰۰,۰۰۰ | $1 |
| 2 engineers (mid-level, local salary) | ۱۲۰,۰۰۰,۰۰۰ | $75 |
| Marketing + ops + misc | ۲۰,۰۰۰,۰۰۰ | $12 |
| **Total** | **~۱,۵۰۰,۵۰۰,۰۰۰ IRR** | **~$937** |
| **Cost per Pro user** | **~۱,۵۰۰,۵۰۰ IRR** | **~$0.94** |

---

## 5. Unit Economics per User

| Usage tier | Variable cost (LLM) | Fixed cost allocated | **Total cost / user** |
|-----------|--------------------|--------------------|----------------------|
| Light (10 queries) | ۴۳۲,۰۰۰ | ۱۸۳,۰۰۰ | **۶۱۵,۰۰۰ IRR** |
| Medium (30 queries) | ۱,۲۹۶,۰۰۰ | ۱۸۳,۰۰۰ | **۱,۴۷۹,۰۰۰ IRR** |
| Heavy (100 queries) | ۴,۳۲۰,۰۰۰ | ۱۸۳,۰۰۰ | **۴,۵۰۳,۰۰۰ IRR** |

*Fixed cost allocated = (infra + team + misc) ÷ 1,000 users = ۱۸۳,۰۰۰ IRR/user*

---

## 6. Recommended Pricing

### Pricing tiers

| Plan | Queries / month | Price (IRR) | Price (Toman) | USD equiv | Gross margin |
|------|----------------|-------------|--------------|-----------|-------------|
| **رایگان (Free)** | 3 AI queries | ۰ | ۰ | $0 | — |
| **پایه (Pro Basic)** | 20 | **۱,۹۰۰,۰۰۰** | ۱۹۰,۰۰۰ تومان | ~$1.19 | ~60% |
| **حرفه‌ای (Pro Plus)** | 80 | **۵,۵۰۰,۰۰۰** | ۵۵۰,۰۰۰ تومان | ~$3.44 | ~65% |
| **سالانه (Annual Plus)** | 80/month | **۵۲,۰۰۰,۰۰۰ / year** | ۵,۲۰۰,۰۰۰ تومان | ~$32.5/yr | 20% discount |
| **سازمانی (Enterprise)** | Unlimited | Custom | Custom | $50–200/mo | 70%+ |

### Query overage pricing

For Pro Plus users exceeding 80 queries:

```
۶۰,۰۰۰ IRR per additional query (~$0.038)
```

This passes through ~140% of API cost — small deterrent for casual overuse, not punitive for power users.

---

## 7. Comparison: Current vs. Recommended

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  CURRENT PRICING (outdated at today's FX rate)
  ──────────────────────────────────────────────
  Pro:  ۲۹۹,۰۰۰ IRR/month  ≈  $0.18/month
  → LLM cost at 30 queries: ۱,۲۹۶,۰۰۰ IRR
  → Net loss per user:      ۹۹۷,۰۰۰ IRR  ← losing money on every user

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  RECOMMENDED PRICING
  ──────────────────────────────────────────────
  Pro Basic:  ۱,۹۰۰,۰۰۰ IRR/month  ≈  $1.19/month  (20 queries)
  → Total cost at 20 queries:  ۹۵۲,۰۰۰ IRR
  → Gross profit per user:     ۹۴۸,۰۰۰ IRR  ← ~50% margin

  Pro Plus:  ۵,۵۰۰,۰۰۰ IRR/month  ≈  $3.44/month  (80 queries)
  → Total cost at 80 queries:  ۱,۶۳۸,۰۰۰ IRR
  → Gross profit per user:     ۳,۸۶۲,۰۰۰ IRR  ← ~70% margin

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 8. Break-even Analysis

### How many Pro users to cover all fixed costs?

Fixed monthly costs (infra + team + misc): **۲۰۳,۰۰۰,۰۰۰ IRR/month**

| Plan | Contribution margin / user | Users to break even |
|------|--------------------------|---------------------|
| Pro Basic (۱.۹M IRR) | ۹۴۸,۰۰۰ IRR | **215 users** |
| Pro Plus (۵.۵M IRR) | ۳,۸۶۲,۰۰۰ IRR | **53 users** |

> **With just 53 Pro Plus subscribers or 215 Pro Basic subscribers, the platform covers all non-LLM costs.
> LLM costs are purely variable and already factored into per-user margin.**

---

## 9. Purchasing Power Context

Source: [Iran International — minimum wage 2025](https://www.iranintl.com/en/202510087675)

| Benchmark | Monthly amount (IRR) |
|-----------|---------------------|
| Legal minimum wage (1403) | ~۹,۰۰۰,۰۰۰ |
| Average private-sector salary | ~۲۵,۰۰۰,۰۰۰ – ۵۰,۰۰۰,۰۰۰ |
| Median tech worker | ~۴۰,۰۰۰,۰۰۰ – ۱۲۰,۰۰۰,۰۰۰ |
| **Pro Basic (recommended)** | **۱,۹۰۰,۰۰۰ = ~4–8% of avg salary** ✅ |
| **Pro Plus (recommended)** | **۵,۵۰۰,۰۰۰ = ~11–22% of avg salary** ⚠️ high for consumers |

**Positioning**: Pro Plus is a professional tool priced like one. It targets analysts, traders, and fund managers — not casual consumers. For that segment, 5.5M IRR/month is comparable to a single hour of professional advisory fees.

Comparable Iranian SaaS tools:
- Consumer apps (Jobinja, Hamravesh): ۵۰۰K – ۲,۰۰۰K IRR/month
- Professional B2B tools: ۵,۰۰۰K – ۲۰,۰۰۰K IRR/month
- Bloomberg Terminal equivalent: Off-limits due to sanctions (~$2,000/month)

**TSE Dashboard fills the gap between consumer apps and Bloomberg** at a fraction of Bloomberg's price.

---

## 10. The Sanctions Problem

Operating this platform in Iran creates real operational challenges:

| Issue | Impact | Practical Workaround |
|-------|--------|---------------------|
| **Paying OpenRouter / Anthropic** | Iranian bank cards rejected | USDT/crypto payments, or route through foreign entity |
| **Paying for foreign cloud** (Hetzner, DO) | Same issue | Same as above |
| **Receiving user payments** | Stripe / PayPal blocked | [ZarinPal](https://zarinpal.com) or [IDPay](https://idpay.ir) — 1.5–2% fee |
| **Iranian diaspora users** | Want to pay in USD | Stripe via UAE/Turkey entity + show IRR pricing locally |
| **Internet filtering** | Platform could be blocked | Host on ArvanCloud + local DNS; avoid foreign-only CDNs |
| **Currency volatility** | IRR can drop 20%+ in a month | Quarterly repricing; or anchor pricing to USDT and convert |

### Recommended entity structure

```
┌─────────────────────────────────────────────────────────┐
│            UAE FreeZone / Turkey LLC                    │
│   ┌─────────────────┐    ┌──────────────────────┐       │
│   │ Stripe account  │    │ OpenRouter / Claude  │       │
│   │ (diaspora $USD) │    │ API payment (USDT)   │       │
│   └────────┬────────┘    └──────────────────────┘       │
└────────────┼────────────────────────────────────────────┘
             │ revenue share
┌────────────▼────────────────────────────────────────────┐
│              Iranian Operating Entity                   │
│   ┌────────────────┐   ┌─────────────────────────────┐  │
│   │ ZarinPal / IDPay│  │ ArvanCloud (infra in Iran)  │  │
│   │ (local IRR)     │  │ Data stays inside Iran      │  │
│   └────────────────┘   └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 11. Revenue Projections at Recommended Pricing

| Scenario | Pro Basic users | Pro Plus users | Monthly Revenue (IRR) | Monthly Revenue (USD) |
|----------|----------------|---------------|----------------------|-----------------------|
| **Early (month 6)** | 300 | 100 | ۱,۱۲۰,۰۰۰,۰۰۰ | $700 |
| **Growth (month 18)** | 2,000 | 800 | ۸,۲۰۰,۰۰۰,۰۰۰ | $5,125 |
| **Scale (month 36)** | 10,000 | 5,000 | ۴۶,۵۰۰,۰۰۰,۰۰۰ | $29,062 |
| **+ Enterprise (5 contracts × ۳۰M)** | — | — | +۱۵۰,۰۰۰,۰۰۰ | +$94 |

*At scale (month 36): ~$350K ARR in USD terms. Add diaspora USD subscriptions and enterprise to reach $500K–$1M ARR.*

---

## 12. Action Items

| Priority | Action |
|----------|--------|
| 🔴 **Immediate** | Update Pro price from ۲۹۹K → ۱,۹۰۰K IRR (Pro Basic) |
| 🔴 **Immediate** | Add query limits to Free (3/month) and Pro Basic (20/month) |
| 🟠 **This month** | Register foreign entity (UAE / Turkey) for API + diaspora payments |
| 🟠 **This month** | Integrate ZarinPal for domestic IRR payments |
| 🟡 **Next quarter** | Add quarterly repricing mechanism tied to USDT rate |
| 🟡 **Next quarter** | Implement prompt caching + model routing (cheap model for simple queries) |
| 🟢 **Ongoing** | Monitor LLM cost per user monthly; adjust query limits if needed |

---

## Sources

- [Free-market USD/IRR rate — Alanchand (Feb 2026)](https://alanchand.com/en/currencies-price/usd)
- [Live IRR rates — Bonbast](https://www.bonbast.com/)
- [Claude Sonnet pricing — OpenRouter](https://openrouter.ai/anthropic/claude-sonnet-4.5)
- [ArvanCloud server pricing](https://www.arvancloud.ir/en/pricing/cloud-server)
- [Senior engineer salaries Iran — Glassdoor 2025](https://www.glassdoor.com/Salaries/iran-senior-software-engineer-salary-SRCH_IL.0,4_IN118_KO5,29.htm)
- [Iran minimum wage decline — Iran International](https://www.iranintl.com/en/202510087675)
- [Iran fintech ecosystem — Shanbe](https://en.shanbemag.com/3039-iran-fintech-startup/)
