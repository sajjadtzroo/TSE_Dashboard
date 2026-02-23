# Dashboard UX Improvement Design
**Date**: 2026-02-23
**Scope**: TSE Dashboard — sidebar, all sections, mobile, search, functional gaps
**Priority**: Polish-first, then functional gaps

---

## Executive Summary

The dashboard has a strong, consistent design system (glassmorphic dark theme, RTL/Farsi, Bloomberg-inspired). The main problems fall into two buckets:

1. **Polish** — visual inconsistencies, missing empty states, sparse breadcrumbs, sidebar state management
2. **Functional gaps** — Crypto/Loans sections lack mobile bottom nav, search is symbol-only, no auto-refresh, no pagination

Total: **10 improvement areas** grouped into 4 phases.

---

## Audit Findings

### Sidebar

| Issue | Severity | Current State |
|-------|----------|--------------|
| Sidebar widgets use separate localStorage keys per widget | Low | Each collapses/expands independently with no global preference |
| No loading skeleton for sidebar widgets (MarketPulse, QuickStats) | Medium | Widgets render blank until data loads |
| SidebarQuickStats: no sparkline (MarketPulse has one, QuickStats doesn't) | Low | Advancers/Decliners shown as static numbers |
| No keyboard shortcut to toggle sidebar collapse | Low | Mouse-only |
| Sidebar section labels not visible in collapsed mode | Low | Labels disappear; only icons + tooltips remain |

### Navigation Inconsistencies

| Issue | Severity |
|-------|----------|
| Bottom nav exists only in MainLayout (TSE section) — Crypto and Loans lack it | **High** |
| No breadcrumbs on Crypto coin detail pages (`/crypto/coin/:symbol`) | Medium |
| No breadcrumbs on Loan detail pages (`/loans/list/:bankId/:loanId`) | Medium |
| "System" section appears in same nav level as "Markets" and "Tools" — feels misplaced | Low |
| Mobile: no swipe gesture between main sections (TSE → Crypto → Loans) | Low |

### Search

| Issue | Severity |
|-------|----------|
| Global search only covers TSE symbols — no bank names, loan types, coin names | **High** |
| No recent search history | Medium |
| Search results show no preview (no price, no sector) | Medium |
| Keyboard: Tab inside spotlight doesn't cycle results | Low |

### Data & Refresh

| Issue | Severity |
|-------|----------|
| No auto-refresh — all data is fetch-on-load only | **High** |
| DataFreshness component exists but not on all pages | Medium |
| No visual "stale data" warning after N minutes | Medium |
| No background sync indicator (spinning dots, pulse) | Low |

### Tables & Pagination

| Issue | Severity |
|-------|----------|
| Tables load all rows — no server-side pagination on large datasets | **High** |
| No infinite scroll fallback for large tables | Medium |
| Column filter UI (range sliders) only on Funds.jsx, not on MarketOverview or ClientType | Medium |

### Empty States

| Issue | Severity |
|-------|----------|
| Several pages show blank on 0 results instead of an empty state message | Medium |
| Watchlist empty state exists but lacks a CTA button to "Browse Market" | Low |
| Portfolio empty state lacks onboarding prompt | Low |

### Visual Consistency

| Issue | Severity |
|-------|----------|
| KPI card variants used inconsistently — some pages use `accent-bar`, some use default | Low |
| Chart margins vary page-to-page (some `{ left: 40 }`, some default) | Low |
| Page header height differs between TSE, Crypto, Loans sections | Low |
| Some pages wrap content in `PageShell`, others use raw `Stack` | Medium |

### Accessibility

| Issue | Severity |
|-------|----------|
| Focus trap not implemented in Chat Drawer | Medium |
| Spotlight search focus management: Escape key doesn't always return focus | Low |
| Some icon-only buttons missing aria-label (density toggle, column toggle) | Medium |

---

## Design Approach

**Balanced: Polish → Functional** in 4 phases:

### Phase 1 — Sidebar & Navigation Polish (Visual)
Quick wins, no API changes, isolated to layout files.

1. **Add loading skeletons to sidebar widgets** — SidebarMarketPulse and SidebarQuickStats show `RallyKPISkeleton` while data is pending
2. **Consolidate sidebar widget state** — single `sidebar-prefs` key in localStorage: `{ marketPulse: bool, quickStats: bool }`
3. **Breadcrumbs on all detail pages** — add `RallyBreadcrumbs` to:
   - `CoinDetail.jsx` (already has it on line 65 — verify and confirm all crypto detail pages)
   - `LoanDetail.tsx`, `LoanBankDetail.tsx`
   - `ETFDetail.jsx`
4. **Move "System" nav section** — relabel to "ادمین" and place at bottom of sidebar below a `<Divider />`, visually separated from user-facing sections
5. **Add `DataFreshness` to every page missing it** — MarketIndices, ETFNav, Codal, Screener, MarketPrices

### Phase 2 — Empty States & Consistency (Polish)

6. **Standardize empty states** — all list pages (Watchlist, Codal, Screener results, Options chain, Crypto Watchlist) use `RallyEmptyState` with:
   - Descriptive icon
   - Title + subtitle in Farsi
   - CTA button where applicable
7. **Standardize KPI card variant** — audit all pages, use `variant="accent-bar"` uniformly across TSE section; `variant="outline"` for Loans section
8. **Wrap all pages in `PageShell`** — pages using raw `Stack` should be migrated to `PageShell` for consistent loading/error handling
9. **Fix aria-labels** — add labels to: `DensityToggle`, `ColumnToggle`, `ExportButton`, `RefreshButton` (where missing)

### Phase 3 — Functional Gaps: Mobile + Auto-refresh

10. **Bottom nav parity** — add `BottomNavBar` to `CryptoMainLayout` and `LoanMainLayout`
    - Crypto tabs: داشبورد / نقشه / مقایسه / دیده‌بان / بیشتر
    - Loans tabs: داشبورد / بانک‌ها / وام‌ها / ماشین‌حساب / بیشتر
    - Apply same `paddingBottom` to main content as MainLayout

11. **Auto-refresh with TanStack Query** — configure `refetchInterval` on time-sensitive hooks:
    - `useMarketOverview`: 2 min during trading hours, 10 min off-hours
    - `useCryptoMarket`: 30s always
    - `useClientType`: 2 min during trading hours
    - Use `_is_trading_hours()` pattern from backend in a frontend `useTradingHours()` hook

12. **Stale data warning** — if `dataUpdatedAt` is > 5 min old, show a yellow `Alert` banner:
    > "داده‌ها قدیمی هستند — آخرین به‌روزرسانی ۵ دقیقه پیش"

### Phase 4 — Functional Gaps: Search & Tables

13. **Cross-section search** — extend `GlobalSearch` to include:
    - TSE symbols (existing)
    - Crypto coins (from `useCryptoMarket` data, cached)
    - Bank names (from loan API, cached)
    - Page shortcuts (existing)
    - Recent searches stored in localStorage (last 10)
    - Show price + 24h change in result rows for symbols/coins

14. **Column filter parity** — add `useColumnFilters` + `ColumnFilter` to:
    - `MarketOverview.jsx` (currently missing)
    - `ClientType.jsx` (currently missing)
    Use `MARKET_RANGE_FILTER_COLS` constant already extracted

15. **Table pagination** — add server-side pagination to high-row-count pages:
    - `Codal.jsx` (107K rows in DB) — already has `page`/`per_page` params in `useCodal` hook
    - `MarketOverview.jsx` — add `perPage` selector (50/100/200)
    - `ClientType.jsx` — same

---

## Component Inventory — Files to Change

### Phase 1
| File | Change |
|------|--------|
| `layouts/components/sidebar/SidebarMarketPulse.jsx` | Add skeleton while loading |
| `layouts/components/sidebar/SidebarQuickStats.jsx` | Add skeleton; consolidate localStorage key |
| `layout/BaseLayout.jsx` | Consolidate sidebar widget localStorage into one key |
| `pages/crypto/CoinDetail.jsx` | Verify breadcrumbs present |
| `pages/crypto/CoinFundamentals.jsx` | Add breadcrumbs |
| `pages/MarketIndices.jsx` | Add DataFreshness |
| `pages/ETFNav.jsx` | Add DataFreshness |
| `pages/Codal.jsx` | Add DataFreshness |
| `pages/Screener.jsx` | Add DataFreshness |
| `pages/MarketPrices.jsx` | Add DataFreshness |
| `constants/navigation.js` | Move "System" section to bottom with Divider |
| `layout/MainLayout.jsx` | Render Divider + System item separately at nav bottom |

### Phase 2
| File | Change |
|------|--------|
| `pages/Watchlist.jsx` | Replace blank with `RallyEmptyState` + CTA |
| `pages/crypto/CryptoWatchlist.jsx` | Same |
| `pages/Documents.jsx` | Add empty state |
| `pages/Screener.jsx` | Add empty state for 0 results |
| All KPI pages | Audit and standardize `variant="accent-bar"` |
| All pages using raw `Stack` | Wrap in `PageShell` |
| `components/DensityToggle.jsx` | Add `aria-label` |
| `components/ColumnToggle.jsx` | Add `aria-label` |

### Phase 3
| File | Change |
|------|--------|
| `layout/CryptoMainLayout.jsx` | Add `BottomNavBar` with crypto tabs |
| `layout/LoanMainLayout.jsx` | Add `BottomNavBar` with loan tabs |
| `constants/cryptoBottomNav.js` | Create (if not exists) |
| `constants/loanBottomNav.js` | Create |
| `hooks/useTradingHours.js` | New hook: returns `{ isOpen, minutesUntilClose }` |
| `hooks/useMarketData.js` | Add `refetchInterval` driven by `useTradingHours` |
| `hooks/useCryptoData.js` | Add `refetchInterval: 30_000` |
| `components/StaleDataAlert.jsx` | New component: banner when data > 5min old |

### Phase 4
| File | Change |
|------|--------|
| `components/GlobalSearch.jsx` | Add crypto, bank, loan, recent-searches |
| `pages/MarketOverview.jsx` | Add `useColumnFilters` |
| `pages/ClientType.jsx` | Add `useColumnFilters` |
| `pages/Codal.jsx` | Add visible pagination controls |

---

## Success Criteria

- [ ] All detail pages have breadcrumbs
- [ ] All list pages have empty states with CTAs
- [ ] Crypto and Loans sections have bottom nav on mobile
- [ ] Market data auto-refreshes during trading hours
- [ ] Global search returns results across all sections
- [ ] No page renders blank on 0 results
- [ ] Sidebar widgets show skeletons while loading
- [ ] All interactive icon buttons have aria-labels
- [ ] `DataFreshness` present on every data page

---

## Out of Scope

- Full TypeScript migration of `.jsx` → `.tsx`
- New data sources or API endpoints
- Redesign of landing page (done separately)
- i18n for Farsi strings (requires separate language system)
- Server-side search API (search remains client-side cached)
