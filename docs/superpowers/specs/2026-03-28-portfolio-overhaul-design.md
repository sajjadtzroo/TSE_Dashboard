# Portfolio Overhaul — Design Spec

**Date**: 2026-03-28
**Approach**: Hybrid (C) — Backend core first, progressive UI upgrade
**Audience**: Retail investors + professional users (progressive complexity)

---

## Phases

| Phase | Scope | Depends On |
|-------|-------|------------|
| 1 | DB schema + API + Transaction Ledger + P&L page (TWRR, IRR) | — |
| 2 | Migrate existing 6 pages to new backend data | Phase 1 |
| 3 | Full UI/UX overhaul (KPI cards, charts, interactivity) | Phase 2 |
| 4 | Goals, alerts, tax reporting, multi-portfolio | Phase 1 |

---

## Phase 1: Backend Core + Accounting Pages

### Data Model

**New tables** (Alembic migration):

```sql
-- portfolios: container for holdings, supports multi-portfolio in Phase 4
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'سبد اصلی',
    currency VARCHAR(3) NOT NULL DEFAULT 'IRR',  -- IRR or USD
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- transactions: full ledger of all portfolio activity
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(30) NOT NULL,
    market_type VARCHAR(10) NOT NULL DEFAULT 'tse',  -- tse, crypto
    tx_type VARCHAR(20) NOT NULL,  -- buy, sell, dividend, fee, deposit, withdrawal
    quantity NUMERIC(18, 8) NOT NULL DEFAULT 0,
    price NUMERIC(18, 4) NOT NULL DEFAULT 0,
    fee NUMERIC(18, 4) NOT NULL DEFAULT 0,
    executed_at TIMESTAMPTZ NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_portfolio ON transactions(portfolio_id, executed_at DESC);
CREATE INDEX idx_transactions_symbol ON transactions(portfolio_id, symbol);

-- Phase 4 tables (designed now, created later)
-- portfolio_goals (id, portfolio_id, name, target_value, target_date, created_at)
-- portfolio_alerts (id, portfolio_id, alert_type, symbol, threshold, is_active, created_at)
```

**Holdings are computed**, not stored. A service function aggregates:
- Current quantity per symbol: `SUM(quantity WHERE buy) - SUM(quantity WHERE sell)`
- Cost basis (FIFO): ordered buy transactions, matched against sells chronologically
- Realized P&L: `sell_proceeds - FIFO_cost_basis - fees`
- Unrealized P&L: `current_market_value - remaining_cost_basis`

### API Endpoints

All under `/api/portfolios`, auth required (viewer+ tier):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/portfolios` | List user's portfolios |
| `POST` | `/api/portfolios` | Create portfolio |
| `GET` | `/api/portfolios/:id` | Get portfolio detail |
| `PUT` | `/api/portfolios/:id` | Update name/currency |
| `DELETE` | `/api/portfolios/:id` | Delete portfolio + transactions |
| `GET` | `/api/portfolios/:id/transactions` | List transactions (paginated, filterable) |
| `POST` | `/api/portfolios/:id/transactions` | Add transaction |
| `PUT` | `/api/portfolios/:id/transactions/:txId` | Edit transaction |
| `DELETE` | `/api/portfolios/:id/transactions/:txId` | Delete transaction |
| `GET` | `/api/portfolios/:id/holdings` | Computed holdings from transactions |
| `GET` | `/api/portfolios/:id/performance` | TWRR, IRR, period returns |
| `GET` | `/api/portfolios/:id/accounting` | Realized/unrealized P&L, cost basis, fee summary |
| `POST` | `/api/portfolios/:id/import` | Import from localStorage JSON |

**Query params for transactions**: `?symbol=`, `?tx_type=`, `?from=`, `?to=`, `?page=`, `?per_page=`

**Query params for performance**: `?period=1m|3m|6m|ytd|1y|all`

### Migration Path

On first login with existing localStorage data:
1. Frontend detects `tse-portfolio` in localStorage + user is authenticated
2. Shows "Import local portfolio" banner
3. On click: POST `/api/portfolios/:id/import` with the JSON array
4. Backend creates default portfolio + buy transactions with `executed_at = addedAt`
5. Frontend clears localStorage flag, switches to API-backed data

### Performance Calculations (Backend)

**TWRR (Time-Weighted Rate of Return)**:
- Split portfolio timeline at each external cash flow (buy/sell/deposit/withdrawal)
- Compute sub-period returns between cash flows
- Chain-link: `TWRR = (1+r1)(1+r2)...(1+rn) - 1`
- Annualize: `(1+TWRR)^(365/days) - 1`

**IRR (Internal Rate of Return / Money-Weighted)**:
- Cash flows: negative for buys/deposits, positive for sells/withdrawals/dividends
- Terminal value: current portfolio market value as final positive cash flow
- Solve: `NPV(IRR, cash_flows) = 0` using Newton-Raphson
- Annualize from daily rate

**FIFO Cost Basis**:
- Queue buy transactions per symbol ordered by `executed_at`
- On sell: dequeue from oldest buys, compute realized gain
- Remaining queue = unrealized cost basis

### New Frontend Pages

**1. Transaction Ledger** (`/portfolio/transactions`)
- Full-width table with columns: Date, Type (badge), Symbol, Quantity, Price, Fee, Total Value, Running Balance
- Filters: symbol dropdown, type dropdown, date range picker
- Actions: "+ Add Transaction" button opens modal, inline edit/delete
- Export: CSV/Excel download
- Color-coded type badges: buy (green), sell (red), dividend (purple), fee (yellow)

**2. Profit & Loss** (`/portfolio/pnl`)
- Period selector: Monthly / Quarterly / Yearly / Since Inception
- 4 summary KPI cards: Realized P&L, Unrealized P&L, TWRR (annualized), IRR (annualized)
- Cash Flow Waterfall chart: Capital → Buys → Sells → Dividends → Fees → Current Value
- Per-symbol P&L breakdown table: Cost Basis, Current Value, Realized, Unrealized, Dividends, Fees, Total Return %
- TWRR vs IRR comparison card with gap analysis

---

## Phase 2: Migrate Existing Pages to Backend

Replace `usePortfolio` localStorage hook with API-backed hooks:

- `usePortfolioList()` — fetches user's portfolios
- `usePortfolioHoldings(portfolioId)` — computed holdings from transactions API
- `usePortfolioPerformance(portfolioId, period)` — TWRR, IRR, returns from API
- `usePortfolioTransactions(portfolioId, filters)` — paginated transaction list

**PortfolioProvider** refactored:
- Receives `portfolioId` from URL or default portfolio
- Fetches holdings + performance from API instead of computing client-side
- `enriched` array built from API holdings + live market prices (same as now)
- `portfolioReturns` comes from API performance endpoint
- Risk metrics (beta, VaR, etc.) still computed client-side from return series

**Existing pages updated**:
- PortfolioDashboard: uses API holdings, hero shows TWRR/IRR from API
- PortfolioPerformance: uses API performance data
- PortfolioRisk: same client-side computation, fed by API return series
- PortfolioSimulation: same, fed by API data
- PortfolioAnalyst: unchanged (risk questionnaire is client-side)
- PortfolioOptimization: unchanged (Markowitz is client-side)

**Backward compatibility**: Anonymous users (not logged in) continue using localStorage with current behavior. API features require auth.

---

## Phase 3: UI/UX Overhaul

### KPI Card Redesign (`RallyKPICard` v2)

Upgrade the existing `RallyKPICard` component:
- Colored left border accent (3px, matches card color)
- Subtle radial gradient glow in top-right corner
- Icon in small rounded badge (top-right)
- Primary value: 22px, font-weight 800, tabular-nums
- Secondary comparison line: "vs benchmark: +X%" in smaller text
- Progress bar at bottom (thin 3px gradient bar)
- Animated number counter on mount/value change (spring physics)
- `compact` variant preserved for hero usage

### Wealth Summary Hero Redesign

Replace current `WealthSummaryHero`:
- Larger total value display (32px, full number not abbreviated)
- Change badge: pill with arrow + percentage + "since inception" label
- Sparkline in top-right corner (stays)
- **5 KPI cards** instead of 3: Today P&L, Realized P&L, Unrealized P&L, TWRR, IRR
- Each card has colored left border + sub-label
- Subtle gradient background on the hero card (blue → purple, 6% → 4% opacity)

### Performance Chart Upgrade

Replace current simple AreaChart:
- **Period selectors**: 1M, 3M, 6M, YTD, 1Y, All (replaces current 30/90/365 SegmentedControl)
- **Brush zoom**: Recharts `<Brush>` component below chart for time range selection
- **Enhanced tooltip**: shows portfolio value, benchmark value, alpha difference
- **LOG toggle**: logarithmic Y-axis option
- **BM toggle**: show/hide benchmark line
- Summary line below chart: period return + benchmark return

### New Chart Components

**Monthly Returns Heatmap** (`PortfolioPerformance` page):
- Persian calendar grid (Farvardin → Esfand)
- Cell color: green intensity for positive, red for negative
- Row per year, column per month
- Yearly total in last column
- Built with HTML table + dynamic cell backgrounds

**Holdings Treemap** (`PortfolioDashboard` page):
- Replace or complement current pie chart
- Rectangle size = portfolio weight
- Rectangle color = return (green gradient → red gradient)
- Click rectangle → navigate to stock detail
- Built with Recharts `<Treemap>` component

**Cash Flow Waterfall** (`/portfolio/pnl` page):
- Bars: Initial Capital, Buys (stacked up), Sells (step down), Dividends (step up), Fees (step down), Final Value
- Color-coded per type
- Built with Recharts `<BarChart>` with custom bar positioning

**TWRR vs IRR Card** (`/portfolio/pnl` page):
- Side-by-side large numbers
- Gap analysis text explaining the difference
- Small cumulative line chart showing both over time

### Interactive Features

**Brush Zoom**: Recharts `<Brush>` on performance AreaChart. Mini overview bar shows full range context.

**Crosshair Sync**: Shared hover state via React context. When hovering any chart, all charts on same page show crosshair at same date. Uses `onMouseMove` → context → all charts read same `activeDate`.

**Click-to-Drill**:
- Pie/treemap slices: `navigate(/dashboard/stock/${symbol})` or `navigate(/crypto/coin/${symbol})`
- Waterfall bars: open transaction filter for that type
- Holdings table symbols: already implemented (keep)

**Export**:
- Charts: `html2canvas` or Recharts' built-in `toDataURL` for PNG
- Tables: existing `ExportButton` component (already supports CSV)

**Animated Transitions**:
- KPI number counters: `framer-motion` `useSpring` for value interpolation
- Card entry: existing staggered `animStyles.cardEnter` (keep, refine timing)
- Chart data transitions: Recharts `isAnimationActive` with custom easing

### Period Returns Bar

New component below hero, above charts:
- Horizontal row of period return pills: 1W, 1M, 3M, 6M, YTD, 1Y
- Each pill shows return % with green/red coloring
- Compact, single-line, tabular-nums

---

## Phase 4: Advanced Features

### Multi-Portfolio
- Portfolio selector dropdown in header/sidebar
- Each portfolio has own transactions, performance, accounting
- "All Portfolios" aggregate view
- Default portfolio auto-selected

### Goal Tracking (`/portfolio/goals`)
- Create goals: name, target amount, target date
- Progress bar with projected completion date
- Monte Carlo projection: "X% chance of reaching goal by target date"
- Visual: goal line overlaid on cumulative return chart

### Alerts (`/portfolio/alerts`)
- Types: price alert, drawdown alert, rebalancing reminder, stop-loss
- Delivery: in-app notification badge + optional WebSocket push
- Management table: active/paused/triggered status

### Tax Reporting (`/portfolio/tax`)
- Capital gains summary by tax year (Solar Hijri)
- FIFO lot matching detail
- Exportable report (PDF/Excel) for tax filing
- Fee deduction summary

---

## Navigation Update

Expand `portfolioNav.js` to two sections:

```js
export const portfolioMenuSections = [
  {
    label: 'سبد سرمایه‌گذاری',
    items: [
      { text: 'داشبورد', icon: IconBriefcase, path: '/portfolio' },
      { text: 'عملکرد', icon: IconChartLine, path: '/portfolio/performance' },
      { text: 'تحلیل ریسک', icon: IconShieldCheck, path: '/portfolio/risk' },
      { text: 'شبیه‌سازی', icon: IconAtom, path: '/portfolio/simulation' },
      { text: 'مشاور سرمایه‌گذاری', icon: IconUserCheck, path: '/portfolio/analyst' },
      { text: 'بهینه‌سازی سبد', icon: IconTargetArrow, path: '/portfolio/optimization' },
    ],
  },
  {
    label: 'حسابداری و گزارش',
    items: [
      { text: 'دفتر معاملات', icon: IconReceipt, path: '/portfolio/transactions' },
      { text: 'سود و زیان', icon: IconCash, path: '/portfolio/pnl' },
      { text: 'گزارش مالیاتی', icon: IconFileInvoice, path: '/portfolio/tax' },       // Phase 4
      { text: 'اهداف مالی', icon: IconFlag, path: '/portfolio/goals' },               // Phase 4
      { text: 'هشدارها', icon: IconBell, path: '/portfolio/alerts' },                  // Phase 4
    ],
  },
];
```

---

## File Changes Summary

### Backend (new files)
| File | Purpose |
|------|---------|
| `database/models.py` | Add `Portfolio`, `Transaction` models |
| `alembic/versions/xxx_add_portfolio_tables.py` | Migration |
| `api/routes/portfolios.py` | CRUD + import endpoint |
| `api/routes/portfolio_transactions.py` | Transaction CRUD + filters |
| `api/routes/portfolio_performance.py` | TWRR, IRR, period returns |
| `api/routes/portfolio_accounting.py` | P&L, cost basis, fee summary |
| `api/services/portfolio_service.py` | Holdings aggregation, FIFO, TWRR/IRR computation |

### Frontend (new files)
| File | Purpose |
|------|---------|
| `pages/portfolio/TransactionLedger.jsx` | Transaction journal page |
| `pages/portfolio/ProfitAndLoss.jsx` | P&L + accounting page |
| `pages/portfolio/components/AddTransactionModal.jsx` | Transaction entry modal |
| `pages/portfolio/components/WaterfallChart.jsx` | Cash flow waterfall |
| `pages/portfolio/components/MonthlyReturnsHeatmap.jsx` | Calendar heatmap |
| `pages/portfolio/components/HoldingsTreemap.jsx` | Treemap chart |
| `pages/portfolio/components/TWRRvsIRRCard.jsx` | Comparison card |
| `pages/portfolio/components/PeriodReturnsBar.jsx` | Quick return pills |
| `hooks/usePortfolioAPI.js` | API-backed portfolio hooks |

### Frontend (modified files)
| File | Change |
|------|--------|
| `components/RallyKPICard.jsx` | v2 upgrade: left border, glow, progress bar, animated counter |
| `pages/portfolio/PortfolioDashboard.jsx` | New hero, treemap, period returns bar |
| `pages/portfolio/PortfolioCharts.jsx` | Brush zoom, enhanced tooltip, period selectors |
| `pages/portfolio/PortfolioPerformance.jsx` | Monthly heatmap, TWRR/IRR card |
| `pages/portfolio/PortfolioProvider.jsx` | API-backed data fetching (Phase 2) |
| `constants/portfolioNav.js` | Add accounting section |
| `App.jsx` | Add routes for transactions, pnl, tax, goals, alerts |

---

## Technical Constraints

- **Auth required**: All portfolio API endpoints require `viewer+` role
- **Rate limiting**: `default` tier (100 req/min) for reads, `heavy` tier (30 req/min) for writes
- **Cache**: Tag portfolio data with `portfolio_{user_id}`, invalidate on transaction write
- **Multi-currency**: Store transactions in native currency (IRR for TSE, USD for crypto). Conversion happens at display time using live exchange rate.
- **TWRR/IRR computation**: Server-side in Python (numpy for Newton-Raphson IRR). Cached with 5-min TTL during trading hours.
- **Existing localStorage**: Continues working for anonymous users. Backend sync only for authenticated users.
