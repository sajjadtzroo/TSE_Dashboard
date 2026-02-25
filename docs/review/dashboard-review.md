# Dashboard (TSE Market / Crypto / Loans) — Code Review & Scoring

**Date**: 2026-02-24
**Scope**: All dashboard pages, layout, data hooks, market/crypto/loans API routes, caching, auth
**Branch**: `feature/ds3-color-migration` (merged to develop)

---

## 1. Executive Summary

The TSE Dashboard frontend and backend are well-structured and production-conscious. The codebase shows strong engineering discipline: clean route architecture with `@cached` + `@handle_api_errors` decorator stacking, a composable `BaseLayout` across all three dashboard sections, TanStack Query for the majority of data fetching, and a solid auth flow with auto-refresh. A handful of real issues require attention before production load, led by a critical JWT secret key vulnerability, a frontend error-response format mismatch that silently discards all HTTP error messages, and an N+1 query in bank listings.

**Overall Grade: B+ (83/100)**

---

## 2. Frontend Dashboard UI

### 2.1 Routing & App Shell — Score: 9/10

| Aspect | Score | Notes |
|---|---|---|
| Lazy loading | 9/10 | `lazyRetry` with retry + session-guarded reload — excellent pattern |
| Error boundaries | 9/10 | `RouteErrorBoundary` isolates pages; shows bilingual Persian UI |
| Layout composition | 9/10 | `BaseLayout` + section-specific wrappers is DRY and extensible |
| Route organization | 9/10 | `dashboard/*` → `MainLayout`, `crypto/*` → `CryptoMainLayout`, `loans/*` → `LoanMainLayout` |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| Medium | `LoanRedirect` uses `window.location.pathname` instead of `useLocation()` — breaks if app is served under a base path | `App.jsx:237–240` | `const { pathname } = useLocation(); const rest = pathname.replace(...)` |
| Medium | Unknown routes redirect silently to `/dashboard` instead of a 404 page — masks broken links | `App.jsx:229` | Render `NotFoundPage` for `path="*"` |

---

### 2.2 Layout System — Score: 8.5/10

| Aspect | Score | Notes |
|---|---|---|
| `BaseLayout` | 9/10 | Clean composable wrapper; sidebar, breadcrumbs, mobile drawer all handled |
| Sidebar quick stats | 8/10 | TanStack Query for live stats — appropriate stale time |
| Mobile responsiveness | 7/10 | `useMediaQuery('(max-width: 48em)')` instantiated twice in `MainLayout.jsx` |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| Low | Duplicate `useMediaQuery('(max-width: 48em)')` — one in `SearchHeader()` (line 13), one in `MainLayout()` (line 41); two separate `matchMedia` listeners | `layout/MainLayout.jsx` | Hoist to `MainLayout`, pass as prop to `SearchHeader` |

---

### 2.3 Data Hooks — Score: 8.5/10

| Aspect | Score | Notes |
|---|---|---|
| TanStack Query usage | 9/10 | 33 files use TanStack Query; stale times domain-appropriate |
| `useMarketData.js` | 9/10 | Well-organized hooks per endpoint type |
| `useWebSocket.js` | 9/10 | Auto-reconnect with exponential backoff |
| Legacy `useApiData` | 6/10 | Still used in 10 files; creates dual data-fetching paradigms |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| High | `useApiData` uses `JSON.stringify(params)` as `useCallback` dep — anti-pattern; object key order variance can cause missed refetches | `hooks/useApiData.js:27` | Use `useMemo` to stabilize `params`, or migrate to TanStack Query |
| Low | 10 files still use `useApiData` alongside TanStack Query — dual paradigm increases maintenance burden | Various pages | Migrate all 10 files to TanStack Query hooks |

---

### 2.4 Auth Context — Score: 8.5/10

| Aspect | Score | Notes |
|---|---|---|
| Token refresh | 9/10 | Schedules refresh 1 min before expiry; ejects interceptors on cleanup |
| Telegram Mini App | 9/10 | Correct HMAC-based auto-login flow |
| Token validation on mount | 9/10 | Validates via `/api/auth/me` before rendering auth-gated content |
| Error normalization | 5/10 | `apiClient.js` reads `data?.detail` but backend sends `data?.error?.message` |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | `apiClient.js` normalizes errors via `error.response?.data?.detail` — but backend sends `{"error": {"code": ..., "message": ...}}`. All HTTP exception messages are silently discarded; users see generic network error | `services/apiClient.js:31` | Change to `data?.error?.message \|\| data?.detail \|\| error.message` |
| Medium | No automatic token refresh interceptor — when access token expires mid-session, the next API call returns 401 with no retry; user sees silent failure | `services/apiClient.js` | Add response interceptor: detect 401, call `POST /api/auth/refresh`, retry original request |

---

### 2.5 Theming & Design System — Score: 9/10

| Aspect | Score | Notes |
|---|---|---|
| Color tokens | 9/10 | Single `rallyColors.js` source of truth; DS3 blue migration complete |
| Mantine v7 | 9/10 | `createTheme` with custom color scales; `primaryColor: 'rally-primary'` |
| Dark theme | 9/10 | Comprehensive dark theme variables in `global.css` |
| DS3 migration | 9/10 | Green accent → primary blue across 100+ components; semantic greens preserved |

No significant issues. The theming system is well-organized and the DS3 migration is clean.

---

### 2.6 RTL / Accessibility — Score: 7/10

| Aspect | Score | Notes |
|---|---|---|
| RTL direction | 7/10 | Mixed approach: `dir="rtl"`, `direction: 'rtl'` inline, and `inset-inline-*` — not systematic |
| ARIA coverage | 7/10 | 130 `aria-label` occurrences across 72 files; sparse on data tables |
| `prefers-reduced-motion` | 10/10 | Comprehensively applied in `global.css` |
| Font loading | 9/10 | PELAK + Poppins self-hosted with `font-display: swap` |
| Persian number formatting | 7/10 | No `Intl.NumberFormat` locale for Persian digit rendering |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| Low | CLAUDE.md mandates `inset-inline-start/end` in landing pages; many components use `direction: 'rtl'` inline instead | Various | Establish one canonical RTL strategy: `dir="rtl"` (HTML attribute) + logical CSS properties |
| Low | No `Intl.NumberFormat` locale for Persian digits | Various | Decide on a consistent number formatting approach across the dashboard |

---

## 3. Backend API

### 3.1 Route Architecture — Score: 8.5/10

| Aspect | Score | Notes |
|---|---|---|
| Module organization | 9/10 | Feature-per-file; `all_routers` registry with feature flags |
| Decorator composition | 8/10 | `@cached` + `@handle_api_errors` stacking is clean |
| Pydantic v2 schemas | 8/10 | `from_attributes=True` throughout; response models well-defined |
| Service layer | 8/10 | `services_loans.py` correctly separates DB logic from route handlers |
| Feature flags | 9/10 | `ENABLE_LOANS`/`CRYPTO`/`VOICE` conditional router registration |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | `@cached` decorator uses a sync `wrapper` — silently returns a coroutine object if applied to an `async def` route. No guard exists. Currently safe, but a latent trap | `api/cache_decorators.py:39` | Add `if asyncio.iscoroutinefunction(func): raise TypeError(...)` at decoration time |
| Low | One `print()` call remains in `api/routes/scraper.py:25` | `scraper.py:25` | Replace with `logger.error()` |

---

### 3.2 Market Routes — Score: 8.5/10

| Aspect | Score | Notes |
|---|---|---|
| Cache coverage | 9/10 | All heavy endpoints use `@cached` with tag-based invalidation |
| Response models | 9/10 | Pydantic schemas for all endpoints |
| Error handling | 9/10 | `@handle_api_errors` wraps all non-HTTP exceptions |
| Query patterns | 8/10 | ORM-only; no raw SQL |

No significant issues. Market routes are well-structured and cache-aware.

---

### 3.3 Loans Routes — Score: 8/10

| Aspect | Score | Notes |
|---|---|---|
| Service layer | 9/10 | Clean `services_loans.py` separation |
| Loan calculator | 8/10 | IRR, NPV, WACC all computed server-side |
| Auth guards | 9/10 | `require_role("viewer")` on all protected endpoints |
| N+1 query | 5/10 | Bank listing issues one COUNT query per bank in a Python loop |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **High** | N+1 query in `get_banks()`: issues one `SELECT COUNT(*)` per bank in a Python loop. Cached after first hit, but cold start or cache invalidation causes burst of queries | `api/services_loans.py:28–41` | Single `GROUP BY bank_id` aggregated query replacing the for-loop |

**Fix pattern:**
```python
counts = (
    db.query(LoanProduct.bank_id, func.count(LoanProduct.id).label("cnt"))
    .filter(LoanProduct.is_active.is_(True))
    .group_by(LoanProduct.bank_id)
    .all()
)
count_map = {row.bank_id: row.cnt for row in counts}
for bank in banks:
    bank.products_count = count_map.get(bank.id, 0)
```

---

### 3.4 Crypto Routes — Score: 8/10

| Aspect | Score | Notes |
|---|---|---|
| Cache TTL | 9/10 | Short TTLs for live prices; longer for fundamentals |
| Data validation | 8/10 | Decimal→float conversion guarded via `to_float()` |
| Error handling | 9/10 | Consistent with other route modules |

No significant issues.

---

## 4. Caching & Performance

### 4.1 Cache Layer — Score: 8.5/10

| Aspect | Score | Notes |
|---|---|---|
| Redis connection pool | 9/10 | `max_connections=100`; retry; timeout configured |
| Tag-based invalidation | 9/10 | Pipeline-based SADD + EXPIRE is correct |
| Trading-hours TTL | 9/10 | `_is_trading_hours()` correctly checks weekday (Sat–Wed) |
| Cache warming | 7/10 | Only warms `latest_date:daily_ohlcv`; market overview not pre-warmed |
| Key collision risk | 7/10 | MD5 hash truncated to 12 chars |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| Low | Expired cache key references accumulate in tag sets (SADD but no SREM on expiry) — minor memory leak, not a correctness issue | `api/cache.py` | Use sorted set with score=expiry for TTL-aware membership, or accept as-is |

---

### 4.2 Rate Limiting — Score: 8/10

| Aspect | Score | Notes |
|---|---|---|
| Sliding window | 9/10 | Redis sorted-set sliding window is correct |
| IP extraction | 8/10 | Prefers `X-Real-IP` from Nginx; falls back to `X-Forwarded-For` |
| Tiers | 9/10 | `auth`/`scraper`/`heavy`/`default` cover expected patterns |
| Documentation accuracy | 6/10 | CLAUDE.md says "default: 100/min, heavy: 30/min"; code is 300/min and 60/min |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| Low | CLAUDE.md rate limit values are stale (100/30 vs actual 300/60) | `CLAUDE.md` | Update CLAUDE.md to reflect actual limits |

---

## 5. Authentication & Security

### 5.1 JWT Backend Auth — Score: 7.5/10

| Aspect | Score | Notes |
|---|---|---|
| Token creation | 9/10 | Signed with `JWT_ALGORITHM`; type-checked (`access` vs `refresh`) |
| Role hierarchy | 9/10 | `ROLE_HIERARCHY` dict with numeric comparison |
| Token validation | 9/10 | Validates token type, username, and active status |
| WebSocket auth | 8/10 | `authenticate_ws` closes with code 4001 on invalid token |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **Critical** | `JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")` — if unset, returns `None`. `python-jose` accepts `None` as a signing key, making all JWTs trivially forgeable | `config/settings.py:115` | Add: `if not JWT_SECRET_KEY: raise ValueError("JWT_SECRET_KEY is required")` |
| Medium | No JWT token revocation — `PATCH /api/auth/me` (password change) does not invalidate existing tokens | `api/routes/auth.py:168` | Store JTI in Redis deny-list on password change and logout |

---

### 5.2 Security Headers — Score: 7/10

| Aspect | Score | Notes |
|---|---|---|
| HSTS | ⚠️ | Set but ineffective on HTTP-only (no TLS) |
| CSP | ⚠️ | Includes `'unsafe-inline'` for scripts and styles (required by Mantine) |
| X-XSS-Protection | ❌ | Deprecated header — removed from Chrome 78+, can create vulnerabilities in IE |
| CORS | ✓ | Origin allowlist configured |
| SQL injection | ✓ | SQLAlchemy ORM only, no raw SQL |

**Issues:**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| Low | `X-XSS-Protection: 1; mode=block` is deprecated and counterproductive in modern browsers | `api/main.py:183`, `nginx.conf:68` | Remove this header; CSP already provides the intended protection |
| Low | `/api/scheduler/status` is unauthenticated and exposes job names, intervals, and timezone | `api/routes/scraper.py:66–73` | Add `require_role("admin")` or remove the public status endpoint |

---

## 6. Overall Grades

| Component | Arch | Quality | Security | Perf | Completeness | Grade |
|-----------|------|---------|----------|------|--------------|-------|
| App.jsx / Routing | 9 | 9 | 8 | 9 | 9 | **A** |
| Layout System | 9 | 8 | 8 | 7 | 9 | **A-** |
| Data Hooks | 9 | 8 | 8 | 9 | 9 | **A** |
| Auth Context | 9 | 8 | 8 | 9 | 9 | **A-** |
| `apiClient.js` | 8 | 7 | 7 | 8 | 7 | **B+** |
| Theming / DS3 | 9 | 9 | — | 8 | 9 | **A** |
| RTL / Accessibility | 7 | 7 | — | 7 | 7 | **B** |
| Market Routes | 9 | 8 | 8 | 8 | 9 | **A-** |
| Loans Routes | 8 | 8 | 9 | 7 | 9 | **B+** |
| Crypto Routes | 8 | 8 | 8 | 8 | 9 | **B+** |
| Cache Layer | 9 | 8 | 8 | 8 | 8 | **A-** |
| Rate Limiting | 8 | 9 | 8 | 9 | 8 | **A-** |
| JWT Auth Backend | 8 | 9 | 7 | 9 | 9 | **B+** |
| **WEIGHTED OVERALL** | | | | | | **B+ (83/100)** |

---

## 7. Top Issues Summary

| # | Severity | Confidence | File | Issue |
|---|----------|------------|------|-------|
| 1 | **Critical** | 95 | `config/settings.py:115` | `JWT_SECRET_KEY` can be `None` — JWTs are trivially forgeable |
| 2 | **High** | 90 | `services/apiClient.js:31` | Error response format mismatch — all HTTP error messages silently discarded |
| 3 | **High** | 85 | `api/services_loans.py:28–41` | N+1 query: one `COUNT(*)` per bank in Python loop |
| 4 | **High** | 83 | `api/cache_decorators.py:39` | `@cached` silently returns coroutine if applied to `async def` handler |
| 5 | **High** | 82 | `hooks/useApiData.js:27` | `JSON.stringify(params)` as `useCallback` dep — anti-pattern |
| 6 | **High** | 80 | `App.jsx:237–240` | `LoanRedirect` uses `window.location.pathname` instead of `useLocation()` |

---

## 8. Recommendations

**Immediate (security)**
1. Add startup guard in `config/settings.py`: `if not JWT_SECRET_KEY: raise ValueError(...)`
2. Fix `apiClient.js` error normalization: `data?.error?.message || data?.detail || error.message`

**Short-term**
3. Fix N+1 in `services_loans.py:get_banks()` with a single aggregated `GROUP BY` query
4. Add `asyncio.iscoroutinefunction` guard to `@cached` decorator — fail loudly if applied to `async def`
5. Fix `LoanRedirect` to use `useLocation()` from React Router
6. Add automatic token refresh interceptor in `apiClient.js` (detect 401, refresh, retry)
7. Replace `print()` in `scraper.py:25` with `logger.error()`

**Medium-term**
8. Migrate remaining 10 `useApiData` files to TanStack Query — eliminate dual data-fetching paradigm
9. Fix duplicate `useMediaQuery` in `MainLayout.jsx`
10. Remove `X-XSS-Protection` header from both `main.py` and `nginx.conf`
11. Implement JWT token revocation (JTI deny-list in Redis) — triggered on password change / logout
12. Update CLAUDE.md rate limits: default is 300/min, heavy is 60/min (not 100/30 as documented)
13. Establish consistent RTL strategy: `dir="rtl"` (HTML attribute) + logical CSS properties throughout
