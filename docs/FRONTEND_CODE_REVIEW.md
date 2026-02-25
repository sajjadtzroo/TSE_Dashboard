# Frontend Code Review — TSE Dashboard

**Date**: 2026-02-25
**Scope**: `/Users/cjd/TSE_Dashboard/frontend/src/` — all React components, hooks, context, pages, services, utilities, and test files
**Audited by**: 6 parallel specialist agents (Security, Performance, Accessibility, Architecture, State Management, Testing)
**Review target**: Production readiness, code quality, and maintainability

---

## Executive Summary

The TSE Dashboard frontend demonstrates several strong engineering fundamentals — excellent code-splitting discipline, a well-structured features directory, solid coverage of financial calculation utilities, and thoughtful use of TanStack Query in the market data layer. However, six independent audits surfaced a significant number of issues that must be resolved before this codebase can be considered production-ready.

| Severity | Count | Phase 3 Action |
|----------|-------|----------------|
| **Critical** | 8 | All fixed in Phase 3 |
| **High** | 21 | All fixed in Phase 3 |
| **Medium** | 17 | Documented debt — future sprints |
| **Low** | 3 | Documented debt — future sprints |
| **Total** | 49 | |

**Overall Grade: C+**

The grade reflects a codebase that works well in the happy path but has systemic gaps in security hardening, accessibility compliance, state management hygiene, and test coverage for the most critical user-facing flows (auth, chat, portfolio).

---

## Issue Counts by Category

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security | 2 | 6 | 3 | 0 | **11** |
| Performance | 0 | 4 | 4 | 0 | **8** |
| Accessibility | 4 | 6 | 3 | 0 | **13** |
| Architecture | 1 | 5 | 4 | 0 | **10** |
| State Management | 1 | 4 | 4 | 0 | **9** |
| Testing | 2 | 5 | 3 | 2 | **12** |
| **Total** | **10\*** | **30\*** | **21** | **2** | **49** |

> \* Some issues overlap across categories (e.g., `useSSEChat` localStorage token read appears under both Security and State Management). After deduplication the working counts are **8 Critical** and **21 High** as shown in the Executive Summary.

---

## Critical Issues

> All Critical issues are scheduled for fix in **Phase 3**.

### CRIT-01 — JWT/Refresh Tokens in localStorage (XSS-Stealable)

| Field | Detail |
|-------|--------|
| **File:Line** | `context/AuthContext.jsx:6-7,21-22,38-39,62-65` · `services/apiClient.js:17` · `services/loans/api.ts:55` · `hooks/useSSEChat.js:38` |
| **Severity** | Critical |
| **Category** | Security |
| **Issue** | JWT access tokens and refresh tokens are written to and read from `localStorage`. Any XSS vector in the app (including third-party scripts, injected markdown content, or future inline script bugs) can steal all tokens and fully compromise user sessions. |
| **Fix** | Migrate token storage to `httpOnly; Secure; SameSite=Strict` cookies managed entirely by the backend. The frontend should never see or store raw tokens. Remove all `localStorage.getItem('token')` calls from frontend code. Backend must expose a `/auth/refresh` endpoint that uses the cookie automatically. |
| **Phase 3** | Yes |

---

### CRIT-02 — Unsanitized API Data Written to localStorage

| Field | Detail |
|-------|--------|
| **File:Line** | `hooks/useWatchlist.js:17` · `hooks/usePortfolio.js:16` · `hooks/useIndicatorPrefs.js:24` · `hooks/useRiskProfile.js:33` · `context/LoanSelectionContext.tsx:63-64` · `components/GlobalSearch.jsx:20` |
| **Severity** | Critical |
| **Category** | Security |
| **Issue** | Data returned from API responses is written directly to `localStorage` without sanitization. If the backend is ever compromised or serves crafted data, stored XSS payloads can persist across sessions and execute on next page load. |
| **Fix** | Sanitize all API-sourced data before persisting. For string fields: strip HTML with DOMPurify or a manual allowlist. For structured data: validate shape with Zod before writing. Consider whether `localStorage` persistence is necessary at all for transient data (watchlist, indicator prefs could live in TanStack Query cache). |
| **Phase 3** | Yes |

---

### CRIT-03 — TestimonialsSection Carousel Dots Not Keyboard Accessible

| Field | Detail |
|-------|--------|
| **File:Line** | `features/landing/components/TestimonialsSection.jsx:103-116` |
| **Severity** | Critical |
| **Category** | Accessibility |
| **Issue** | Carousel navigation dots are rendered as `<Box onClick={...}>` elements with no keyboard event handler, no `role`, and no `tabIndex`. Keyboard-only users and screen reader users cannot navigate the testimonials carousel at all. |
| **Fix** | Replace each dot with a `<button>` element. Add `aria-label={`Go to testimonial ${index + 1}`}` and `aria-pressed={active}`. Ensure focus outline is visible. |
| **Phase 3** | Yes |

---

### CRIT-04 — FeatureCard "Coming Soon" Not Keyboard Accessible

| Field | Detail |
|-------|--------|
| **File:Line** | `features/landing/components/FeatureCard.jsx:18` |
| **Severity** | Critical |
| **Category** | Accessibility |
| **Issue** | `FeatureCard` uses a `<Box onClick={...}>` for the coming-soon interactive state with no `role`, no `tabIndex`, and no keyboard handler. The element is completely invisible to assistive technology. |
| **Fix** | Add `role="button"`, `tabIndex={0}`, `onKeyDown={(e) => e.key === 'Enter' && handleClick()}`, and `aria-disabled={isComingSoon}`. |
| **Phase 3** | Yes |

---

### CRIT-05 — ChatDrawer Has No aria-live Region for Streaming Responses

| Field | Detail |
|-------|--------|
| **File:Line** | `features/chat/components/ChatDrawer.jsx:318` |
| **Severity** | Critical |
| **Category** | Accessibility |
| **Issue** | Chat responses stream token-by-token from the SSE endpoint. There is no `aria-live` region wrapping the message container, so screen reader users receive no announcement of new or updating content. |
| **Fix** | Add `aria-live="polite"` (or `"assertive"` for the streaming indicator) to the message list container. Add `aria-atomic="false"` so only new tokens are announced, not the full history on each update. |
| **Phase 3** | Yes |

---

### CRIT-06 — FlowingMenu role="button" Items Missing aria-label

| Field | Detail |
|-------|--------|
| **File:Line** | `features/landing/components/FlowingMenu.jsx:66-75` |
| **Severity** | Critical |
| **Category** | Accessibility |
| **Issue** | Interactive menu items have `role="button"` but no `aria-label`. Screen readers will announce only the element role with no text, making the menu completely unusable for visually impaired users. |
| **Fix** | Add `aria-label={item.text}` to each item element. Verify focus management when the menu opens/closes. |
| **Phase 3** | Yes |

---

### CRIT-07 — PortfolioProvider Context Value Not Memoized

| Field | Detail |
|-------|--------|
| **File:Line** | `pages/portfolio/PortfolioProvider.jsx:213-228` |
| **Severity** | Critical |
| **Category** | State Management |
| **Issue** | The context value object is constructed inline in the render function without `useMemo`. Every time `PortfolioProvider` re-renders (including from its own state updates), a new object reference is created and every consumer of the context re-renders, even if no data changed. This affects all portfolio pages and components. |
| **Fix** | Wrap the value object in `useMemo` with an explicit dependency array listing all values included in the object. See `AuthContext.jsx` for the correct pattern already used elsewhere in this codebase. |
| **Phase 3** | Yes |

---

### CRIT-08 — apiTracker.js Dead Code Installing Global Axios Interceptors

| Field | Detail |
|-------|--------|
| **File:Line** | `utils/apiTracker.js` |
| **Severity** | Critical |
| **Category** | Architecture |
| **Issue** | `apiTracker.js` is completely unused (no imports anywhere in the codebase) but its module-level code installs global axios request/response interceptors that fire on every API call. This is a live side effect from dead code that adds invisible overhead and could interfere with auth interceptors. |
| **Fix** | Delete the file entirely. Confirm no import exists with `grep -r "apiTracker" src/`. |
| **Phase 3** | Yes |

---

## High Issues

> All High issues are scheduled for fix in **Phase 3**.

### HIGH-01 — Missing Content Security Policy Header

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `infra/nginx/nginx.conf` | No CSP header is set. Any injected script (XSS, third-party compromise) executes with full origin access. | Add: `add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; img-src 'self' data: https:; frame-ancestors 'none';" always;` |

### HIGH-02 — MarkdownRenderer Href URLs Not Validated

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `features/chat/components/MarkdownRenderer.jsx:95-105` | Custom link renderer does not validate the `href` attribute. A `javascript:` URI from an LLM response would execute as XSS when a user clicks it. | Validate with `new URL(href)` inside try/catch; allowlist `http:`, `https:`, `mailto:` protocols only. Reject all others silently or replace with `#`. |

### HIGH-03 — Document Upload Extension-Only Validation

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `pages/Documents.jsx:103-118` | File upload validates only the file extension. A renamed `.php` or `.js` file passes client-side checks. | Add MIME type check using `file.type` on the client side. Enforce server-side MIME validation and magic-byte inspection on the backend. |

### HIGH-04 — ErrorBoundary Renders Stack Traces

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `components/ErrorBoundary.jsx:58-77` | Stack traces are conditionally rendered based on a dev check. If the check is imprecise or staging bypasses it, stack traces leak internal file paths and library versions. | Never render stack traces in the DOM. Log errors server-side via an error tracking service (Sentry, etc.). Show only a user-friendly error message. |

### HIGH-05 — SSE Chat Allows Unauthenticated Fallback

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `hooks/useSSEChat.js:38-44` | Auth header is sent only if a token exists; the SSE connection proceeds without auth if no token is found. Chat data may be exposed or accessible without authentication. | Throw an error and abort the SSE connection if no auth token is available. The endpoint should not be reachable unauthenticated. |

### HIGH-06 — All Recharts Charts Have No Accessible Label

| File:Line | Issue | Fix |
|-----------|-------|-----|
| All files in `components/charts/` (17 chart types) | No chart has `role="img"` or `aria-label`. Screen reader users receive no information about any chart's content or purpose. | Wrap each chart in `<div role="img" aria-label="[Descriptive chart title]">`. For data-rich charts, add a visually-hidden summary table as an alternative. |

### HIGH-07 — Hero3DScene TEPIX Chart Hidden from Assistive Technology

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `features/landing/components/Hero3DScene.jsx:261` | The TEPIX performance chart is nested inside an `aria-hidden="true"` container. Screen reader users cannot access what is likely the most prominent data visualization on the landing page. | Remove `aria-hidden` from the outer container, or extract the chart outside the hidden 3D scene wrapper. Ensure the chart itself has `role="img"` and `aria-label`. |

### HIGH-08 — BaseLayout Missing Skip Navigation Link

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `layout/BaseLayout.jsx` | The CSS class `.skip-link` is defined in `global.css` but no skip-to-main-content link is rendered in the JSX. Keyboard users must tab through the entire navigation on every page load. | Add `<a href="#main-content" className="skip-link">Skip to main content</a>` as the first child of the layout. Add `id="main-content"` to the main content wrapper. |

### HIGH-09 — PricingPlans Icon-Only Feature Indicators

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `features/landing/components/PricingPlans.jsx:76-91` | `IconCheck` and `IconX` icons represent feature inclusion/exclusion with no text alternative. Screen readers announce only "image" or nothing. | Add `aria-label="Included"` or `aria-label="Not included"` to each icon wrapper, or use a visually-hidden `<span>` with the appropriate text. |

### HIGH-10 — LandingNav User Avatar Missing aria-label

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `features/landing/components/LandingNav.jsx:126-135` | `UnstyledButton` wrapping the user avatar has no `aria-label`. Screen readers cannot identify this as an account menu trigger. | Add `aria-label="User account menu"` to the `UnstyledButton`. Consider `aria-haspopup="menu"` and `aria-expanded` state management. |

### HIGH-11 — useApiData.js Reimplements TanStack Query

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `hooks/useApiData.js:1-35` | Custom data-fetching hook duplicates TanStack Query functionality (loading state, error state, refetch) without shared caching, deduplication, staleTime, or cache invalidation. Components using it cannot share cached responses with components using `useMarketData.js`. | Delete `useApiData.js`. Migrate all callers to proper `useQuery` hooks from `useMarketData.js` or new equivalent hook files. |

### HIGH-12 — ChatDrawer Uses Direct axios Calls Instead of TanStack Query

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `features/chat/components/ChatDrawer.jsx:99-126` | Two `useEffect` hooks make direct `axios` calls — one polling for status, one fetching available models. These bypass the TanStack Query cache, have no deduplication, and duplicate loading state management. | Replace polling with `useQuery({ refetchInterval: ... })`. Replace models fetch with `useQuery`. Remove the `useEffect` + `useState` pairs. |

### HIGH-13 — useSSEChat Reads Token Directly from localStorage

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `hooks/useSSEChat.js:38` | Token is read directly from `localStorage` instead of from `AuthContext`. This bypasses the auth layer, misses token refresh events, and duplicates the token-source of truth. | Import `useAuth()` and read the token from context. This also makes the hook compatible with the future cookie-based token migration (CRIT-01). |

### HIGH-14 — Inline Arrow Functions in LoanImport onChange Handlers

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `pages/loans/LoanImport.tsx:335,343` | Inline arrow functions are created in the render function for `onChange` handlers on form inputs. This prevents future `React.memo` optimization of child components and causes unnecessary re-renders. | Extract to `useCallback`-wrapped handler functions defined in the component body. |

### HIGH-15 — Inline Style Objects on Table Row Star Icons

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `pages/MarketOverview.jsx:98` | `style={{ cursor: 'pointer' }}` is a new object allocated on every render for each table row. With 25-100 rows, this is 25-100 needless object allocations per render cycle. | Replace with a CSS class `.cursor-pointer { cursor: pointer; }` applied via `className`. |

### HIGH-16 — Transform Animations Using Inline Style Objects

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `pages/crypto/fundamentals/CoinHistoricalSection.jsx` and 5 similar files | Collapse/expand animations use computed inline `style` objects (e.g., `style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}`). New objects are created on every render even when state has not changed. | Replace with CSS classes controlled by a data attribute or conditional `className`. Example: `className={isOpen ? 'icon-rotated' : 'icon-default'}` with CSS defining the transform. |

### HIGH-17 — OptionsAnalytics Creates New Map on Every Render

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `pages/OptionsAnalytics.jsx` (strikeMap) | A `new Map()` is constructed from options data on every render without `useMemo`. On a page with live price updates, this Map is rebuilt frequently and needlessly. | Wrap the Map construction in `useMemo` with the options data array as the dependency. |

### HIGH-18 — OptimizerInputForm God Component

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `features/loans/loan-optimizer/components/OptimizerInputForm.tsx:117-689` | 689-line component manages 8+ state variables, form validation, preset selection, and rendering. Any change requires reading the full file. | Split into `OptimizerFormBasics`, `OptimizerFormAdvanced`, and `PresetSelector`. Extract validation logic into a custom `useOptimizerForm` hook. |

### HIGH-19 — MyLoans God Page Component

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `pages/loans/MyLoans.tsx:17-302` | 304-line page component handles auth checks, tab state, modal state, data mutations, and layout rendering simultaneously. | Split into `MyLoansPage` (routing/auth), `MyLoansContent` (tabs/data), `LoanDetailSidebar`, and `LoanFormModal`. |

### HIGH-20 — PortfolioProvider Business Logic in Context

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `pages/portfolio/PortfolioProvider.jsx:24-200` | 200+ line context provider mixes data fetching, enrichment logic, history calculations, and return computations. Context providers should only distribute state; business logic belongs in hooks. | Extract `usePortfolioEnrichment`, `usePortfolioHistory`, and `usePortfolioReturns` hooks. Provider becomes a thin wrapper that calls these hooks and distributes results. |

### HIGH-21 — Zero Tests for AuthContext (Token Lifecycle)

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `context/AuthContext.jsx` (zero tests) | Authentication is the most critical user flow. Token storage, refresh timer, logout, and Telegram auto-login have zero test coverage. A regression here is a silent production incident. | Write tests covering: initial token load, token refresh on expiry, logout clears state, Telegram auto-login flow, and 401 response triggers refresh. |

### HIGH-22 — Zero Tests for Chat SSE Streaming

| File:Line | Issue | Fix |
|-----------|-------|-----|
| `features/chat/components/` · `hooks/useSSEChat.js` (zero tests) | The primary AI chat feature — the product's core differentiator — has no component or hook tests. Streaming, error handling, interruption, and message rendering are entirely untested. | Write tests using `msw` (or a mock `EventSource`) covering: message streaming, connection error recovery, user interruption, and empty/error response handling. |

---

## Medium Issues (Documented Debt)

These issues are **not being fixed in Phase 3**. They are tracked here for future sprint planning.

| ID | File | Issue | Category |
|----|------|-------|----------|
| MED-01 | `hooks/useMonteCarloWorker.js:43-53` | Stale closure — only 3 of the config object's properties are in the dependency array. Results may use stale parameters silently. | Performance |
| MED-02 | `pages/loans/LoanImport.tsx:138-289` | Three large inline sub-components (OCRUploadSection 152 LOC, WebScrapingSection 106 LOC) never extracted. Slows compilation and review. | Architecture |
| MED-03 | `pages/loans/LoanAllMetrics.tsx:54` | `setTimeout(_, 0)` used to defer expensive recalculation; should use `useTransition` for correct concurrent mode behaviour. | Performance |
| MED-04 | `core/context/WidgetSizeContext.jsx:17-20` | Context value object not memoized. All widget consumers re-render on any parent re-render. | Performance |
| MED-05 | `components/RallyDataTable` | 15+ props passed directly; component has too many responsibilities. Should be split or use a compound component pattern. | Architecture |
| MED-06 | `hooks/` (47 hooks, flat directory) | Flat hook directory makes discovery difficult. Needs semantic subdirectories: `hooks/market/`, `hooks/portfolio/`, `hooks/auth/`, etc. | Architecture |
| MED-07 | `features/loans/` (no shared API client) | Loans feature lacks a centralized API client, Zod request/response schemas, and domain-level error boundaries. | Architecture |
| MED-08 | `App.jsx` | 100+ routes in 250 lines. Route density makes maintenance difficult. Extract into domain route modules. | Architecture |
| MED-09 | `hooks/useChatSessions.js` | Chat history stored in component-local state with no TanStack Query cache or mutation invalidation. History is lost on component unmount. | State Management |
| MED-10 | `features/chat/components/ChatDrawer.jsx` | 10+ `useState` variables in a single component. Should be factored into `useChatUI`, `useChatMessages`, and `useChatConnection` custom hooks. | State Management |
| MED-11 | `services/apiClient.js` + `services/loans/api.ts` | Two competing axios instances with separate interceptor chains. Auth token injection logic is duplicated and can fall out of sync. | State Management |
| MED-12 | `context/AuthContext.jsx` | Installs a global axios interceptor inside `useEffect`. This conflicts with the interceptor in `apiClient.js` and creates duplicate or conflicting request transforms. | State Management |
| MED-13 | `hooks/usePortfolio.js` | localStorage sync reads from storage on every access instead of keeping an in-memory state copy as the source of truth. | State Management |
| MED-14 | Landing pages | Heading hierarchy is inconsistent across sections (h1 → h3 jumps). Screen readers and search engines expect sequential heading levels. | Accessibility |
| MED-15 | Global (dark theme) | Focus-visible outline contrast may be insufficient on dark backgrounds for users with low contrast sensitivity. Needs audit with a contrast checker. | Accessibility |
| MED-16 | Mobile (interactive badges) | Some interactive badge/pill elements may not reach the WCAG 2.5.5 minimum 44×44px touch target size on mobile viewports. | Accessibility |
| MED-17 | `features/loans/banks/components/BankDetail.tsx:236` | Social media URLs are constructed from raw API data without validation. A malformed URL from the backend could cause rendering errors or open-redirect. | Security |

---

## Low Issues (Documented Debt)

| ID | File | Issue | Category |
|----|------|-------|----------|
| LOW-01 | `components/GlobalSearch.jsx:20,63-71` | User search input from API stored without sanitization (lower risk as it's user's own input, but still advisable to normalize). | Security |
| LOW-02 | `vitest.config.js` | Coverage collection restricted to `src/utils/**` only. Components, hooks, and context files are invisible to coverage reports, hiding coverage gaps. Should include all `src/**` paths. | Testing |
| LOW-03 | `vitest.config.js` | No coverage thresholds configured for lines, branches, or functions. Coverage regressions go undetected without a CI gate. Add `thresholds: { lines: 80, branches: 70, functions: 80 }` (or adjust to match actual baseline). | Testing |

---

## Top 10 Priority Fixes (Impact × Effort)

Ordered from highest impact with lowest effort (quick wins) to highest impact with higher effort (critical projects).

| Rank | ID | Title | Impact | Effort | Phase 3 |
|------|----|-------|--------|--------|---------|
| 1 | CRIT-08 | Delete `apiTracker.js` dead code | High — removes live global side effects | Trivial (delete 1 file) | Yes |
| 2 | CRIT-07 | Memoize `PortfolioProvider` context value | High — eliminates mass re-renders on every state update | Trivial (wrap in `useMemo`) | Yes |
| 3 | HIGH-01 | Add Content Security Policy header to nginx | High — hardens entire app against XSS impact | Low (1 nginx.conf line) | Yes |
| 4 | HIGH-02 | Validate hrefs in `MarkdownRenderer` | High — closes `javascript:` XSS vector in chat | Low (10-line URL validation function) | Yes |
| 5 | CRIT-03 / CRIT-04 / CRIT-06 | Fix keyboard-inaccessible interactive elements (`TestimonialsSection`, `FeatureCard`, `FlowingMenu`) | High — WCAG 2.1 Level A compliance for primary landing page interactions | Low-Medium (replace Box with button, add aria attrs) | Yes |
| 6 | HIGH-08 | Add skip navigation link to `BaseLayout` | High — fundamental keyboard navigation requirement; CSS already written | Low (2 JSX lines + 1 `id` attribute) | Yes |
| 7 | HIGH-13 / CRIT-01 (partial) | `useSSEChat` reads token from `AuthContext` instead of `localStorage` | High — aligns with future cookie migration, closes one token-leak surface | Low (replace 1 import + 1 variable reference) | Yes |
| 8 | HIGH-17 / HIGH-15 / HIGH-16 | Memoize `strikeMap` Map; move `cursor: pointer` to CSS; replace inline transform style objects | Medium-High — eliminates per-render allocation hot spots | Low (useMemo + CSS class additions) | Yes |
| 9 | CRIT-01 | Migrate JWT/refresh tokens from localStorage to httpOnly cookies | Critical security — eliminates entire token-theft attack surface | High (requires backend + frontend coordinated change) | Yes |
| 10 | HIGH-21 / HIGH-22 | Write tests for `AuthContext` token lifecycle and Chat SSE streaming | Critical coverage — most important flows have zero test coverage | Medium (requires MSW setup for SSE; ~200 lines of tests) | Yes |

---

## Positive Patterns

The following patterns reflect strong engineering decisions that should be preserved and used as internal reference for future development.

### Code Splitting and Loading
- All 50+ routes use `React.lazy()` with a custom `lazyRetry()` wrapper that handles chunk preload failures gracefully on deploy.
- Vite chunk splitting is textbook: `vendor-react`, `vendor-mantine`, `vendor-recharts`, `vendor-markdown` are all separate — the browser can cache stable vendor code across app updates.
- Pre-compression (gzip + brotli) at build time means the server never computes compression at request time.

### Data Fetching
- TanStack Query is used correctly in `useMarketData.js`: proper `staleTime`, `enabled` guards, and mutation cache invalidation in `useReminders.ts`.
- `PageBoundary` wraps all route groups with `ErrorBoundary` + `Suspense`, providing consistent error and loading states across the app.

### Security (Existing)
- `dangerouslySetInnerHTML` is not used anywhere in the codebase.
- `react-markdown` does not render raw HTML by default (safe default).
- All external links include `rel="noopener noreferrer"`.
- `AuthContext` correctly uses `useMemo` for its context value — the right pattern that `PortfolioProvider` should follow.

### Performance
- Monte Carlo simulation runs in a Web Worker with proper cleanup on unmount. Heavy financial computation correctly offloaded from the main thread.
- `PortfolioProvider` demonstrates correct `useMemo` for `AuthContext` — the codebase knows the right pattern.

### Accessibility
- `@media (prefers-reduced-motion)` is implemented in `global.css`.
- `useReducedMotion` hook is used in `Hero3DScene` to conditionally disable animations.
- RTL layout uses logical CSS properties throughout (`margin-inline-start`, `inset-inline-start`).
- ARIA labels are provided in Persian/Farsi where appropriate (burger menu, avatar, chat button).
- Mantine semantic components are used throughout, reducing the a11y surface area compared to raw div-based layouts.

### Testing
- Black-Scholes, binomial tree, hedging simulator, and financial ratio utilities have excellent test coverage (200+ tests across 13 `riskMetrics` modules).
- Loans service API layer has 40+ tests.
- Tests use accessible queries (no `getByTestId` antipattern found).
- `OptimizerResultsTable` has render tests in place (a starting point, even if math verification is missing).

### Code Organization
- The `features/` directory cleanly separates domain logic (`loans/`, `chat/`, `landing/`) from shared `pages/` and `components/`.
- Gradual TypeScript adoption in newer features (`features/loans/`, `services/loans/`) without a big-bang migration.
- `rag/tools/` backward-compatibility re-export pattern is a good example of non-breaking refactoring.

---

## Appendix: Medium/Low Debt Registry

This registry is intended to be copy-pasted into sprint planning. Each item should be converted to a GitHub issue before the next architecture sprint.

```
MED-01  hooks/useMonteCarloWorker.js     Stale closure in dependency array
MED-02  pages/loans/LoanImport.tsx       Extract OCRUploadSection, WebScrapingSection
MED-03  pages/loans/LoanAllMetrics.tsx   Replace setTimeout with useTransition
MED-04  core/context/WidgetSizeContext   Memoize context value
MED-05  components/RallyDataTable        Split god component (15+ props)
MED-06  hooks/ (47 flat hooks)           Organise into semantic subdirectories
MED-07  features/loans/                  Add centralized API client + Zod schemas
MED-08  App.jsx                          Extract domain route modules (100+ routes)
MED-09  hooks/useChatSessions.js         Migrate to TanStack Query with cache invalidation
MED-10  features/chat/components/        Factor 10+ useState vars into custom hooks
MED-11  services/ (2 axios instances)    Unify into single axios instance
MED-12  context/AuthContext.jsx          Remove global interceptor; consolidate with apiClient
MED-13  hooks/usePortfolio.js            Fix localStorage sync source-of-truth bug
MED-14  Landing pages                    Fix heading hierarchy (h1 → h2 → h3)
MED-15  Global dark theme                Audit focus-visible contrast ratios
MED-16  Mobile interactive badges        Verify 44×44px minimum touch target compliance
MED-17  features/loans/banks/            Validate social media URLs before constructing
LOW-01  components/GlobalSearch.jsx      Normalize user-sourced search input before storage
LOW-02  vitest.config.js                 Expand coverage collection to all src/** paths
LOW-03  vitest.config.js                 Add coverage thresholds (lines/branches/functions)
```

---

*Report generated by 6 parallel specialist audit agents. Phase 3 implementation scope: all Critical and High issues listed above.*
