# React Frontend Code Review Guide — 2026 Edition

> Comprehensive checklist covering **Architecture, Performance, Accessibility, Security, Code Quality, Testing, and Modern Patterns** — updated for React 19, React Compiler, RSC, WCAG 2.2, and the current production ecosystem.

---

## What Changed Since the 2024 Guide

| Old Pattern | 2026 Standard |
|-------------|---------------|
| Manual `useMemo` / `useCallback` / `memo` everywhere | **React Compiler** handles this automatically at build time |
| `useEffect` for data fetching | `use()` hook + Suspense / TanStack Query |
| Optimistic UI = custom boilerplate | `useOptimistic` + `useActionState` built into React 19 |
| JSDOM component testing | **Vitest Browser Mode** — real browser, not simulation |
| Redux for everything | TanStack Query (server state) + Zustand (client state) |
| WCAG 2.1 "nice to have" | **WCAG 2.2 legally mandatory** in EU (EAA, June 2025) |
| `dangerouslySetInnerHTML` + DOMPurify | Still required — AND now also nonce-based CSP |
| TypeScript optional | TypeScript is the default; plain JS is the exception |

---

## 1. Architecture & Project Structure

### Feature-Based Folder Structure

```
src/
├── assets/              # Static files (images, fonts, logos)
├── components/          # Shared/reusable UI components
├── features/            # Feature modules — each owns its components, hooks, utils
│   └── featureName/
│       ├── components/
│       ├── hooks/
│       ├── utils/
│       └── index.ts     # Public API — only export what consumers need
├── hooks/               # Shared custom hooks
├── layouts/             # Page layout wrappers
├── pages/               # Route-level page components
├── routes/              # Routing configuration
├── services/            # API layer / service functions
├── store/               # Global state (Zustand stores, atoms)
├── utils/               # Pure utility/helper functions
├── constants/           # App-wide constants and enums
├── types/               # TypeScript types and interfaces
├── App.tsx
└── index.tsx
```

### Architectural Patterns to Check

| Pattern | What to Verify |
|---------|---------------|
| **Container / Presentational** | Presentational: data via props, renders UI only. Container: data fetching, state, business logic. |
| **Custom Hooks** | Logic is extracted. Hooks are not overused for trivial state. |
| **Service Layer** | API calls live in `services/` — not inside components or hooks. |
| **Composition over Inheritance** | Components composed from smaller parts, no deep inheritance. |
| **Single Responsibility** | Each component does one thing. No UI + API + state + effects in one file. |
| **Barrel files** | `index.ts` per feature — expose public API, hide internals. Don't re-export entire modules (breaks tree-shaking). |

### React 19: Server vs Client Components

> Only relevant if using Next.js App Router, React Router 7 Framework Mode, or Remix.

**Decision tree:**

```
Does it use hooks (useState, useEffect, useContext)?  → 'use client'
Does it need browser APIs (window, document)?         → 'use client'
Does it handle user interaction / events?             → 'use client'
Does it fetch data, access DB, or do heavy compute?   → Server Component (default)
Is it purely presentational with no interactivity?    → Server Component (default)
```

**Production rules:**
- **Server components at root and trunk, client components at leaves only**
- Mark `'use client'` as close to the leaf as possible — it adds every dependency to the JS bundle
- Co-locate data fetching with the component that uses it; don't pass data through layers
- Wrap slow server components in `<Suspense>` — enables streaming instead of blocking the whole page

### Anti-Patterns to Flag

- Prop drilling through 4+ levels → use Context, Zustand, or composition
- God components (UI + API + state + business logic in one file)
- `'use client'` on a parent component when only one child needs the browser
- Importing entire libraries: `import _ from 'lodash'` (blocks tree-shaking)
- `useEffect` for data fetching when TanStack Query / SWR is available
- Applying Clean Architecture / MVVM patterns — they fight React's model

---

## 2. Code Quality

### General Principles

- [ ] **DRY** — No code duplicated more than twice; extract to hook or utility
- [ ] **Readability** — Easy to understand at a glance
- [ ] **Naming** — PascalCase for components; camelCase for functions/variables; `UPPER_SNAKE` for constants
- [ ] **No dead code** — No commented-out blocks, unused imports, unused variables
- [ ] **No `console.log` / `debugger`** — Remove all debugging statements before merge
- [ ] **No magic numbers or strings** — Use named constants or enums
- [ ] **Comments explain *why*, not *how*** — If you need to explain *how*, the code is too complex
- [ ] **Zero linter warnings** — ESLint + Prettier passing cleanly

### Component Standards

- [ ] Components over **200 lines** should be split (heuristic — apply judgement; a clear 250-line component is fine, a tangled 150-line one is not)
- [ ] JSX markup no more than **50 lines** per component
- [ ] Props destructured at function signature level
- [ ] No unused props passed
- [ ] Functional components only (class components only if an error boundary)

### React-Specific Checks

- [ ] **Hooks rules** — Not called inside loops, conditions, or nested functions
- [ ] **Key props** — Unique and stable on all list items. Never use array index as key for dynamic/reorderable lists
- [ ] **`useEffect` dependency arrays** — No missing or spurious dependencies (`eslint-plugin-react-hooks` catches most)
- [ ] **Cleanup** — Event listeners, timers, subscriptions, WebSocket connections all cleaned up in `useEffect` return function
- [ ] **No stale closures** — Functions referenced inside `useEffect` are either listed as dependencies or moved inside the effect
- [ ] **Zero React warnings in console**

### React 19 Pattern Checks

- [ ] **`use()` hook** — Used for reading context and resolving promises during render; does not replace `useEffect` for side effects
- [ ] **`useOptimistic`** — Optimistic updates are lean/pure; rollback is handled on failure; updater function has no expensive operations
- [ ] **`useFormStatus`** — Used in submit button to track nearest form's pending state; eliminates manual `isSubmitting` state
- [ ] **`useActionState`** — Used for form action state + error handling; replaces custom `useState` + `try/catch` patterns
- [ ] **Actions** — Async transitions pass pending/error state automatically; no manual `isPending` state needed

### TypeScript Checks

- [ ] No `any` without explicit justification and suppression comment
- [ ] Use `unknown` instead of `any` for values of uncertain type (requires explicit narrowing)
- [ ] Component props typed via interfaces, not inline type literals
- [ ] `strict: true` in `tsconfig.json`
- [ ] `forwardRef` typed correctly: `React.forwardRef<HTMLElement, Props>`
- [ ] Generic components used for reusable list/table patterns
- [ ] Utility types used: `React.ComponentProps<'button'>`, `React.PropsWithChildren`, `Partial<T>`, `Required<T>`

### Dependency Management

- [ ] New packages are justified and not duplicating existing functionality
- [ ] No duplicate libraries for the same job (e.g., `date-fns` AND `moment`)
- [ ] Named imports for tree-shaking: `import { format } from 'date-fns'` not `import * as dateFns`
- [ ] No barrel file re-exports of entire modules (`export * from 'library'`)
- [ ] `npm audit` passes with no high/critical vulnerabilities
- [ ] Lock file committed and reviewed for unexpected changes

---

## 3. State Management

### Choosing the Right Tool

| State Type | Tool | Why |
|------------|------|-----|
| **Server / API data** | TanStack Query (React Query) | Caching, background refetch, deduplication, DevTools |
| **Local UI state** | `useState` / `useReducer` | Co-located, no overhead |
| **Global client state** | Zustand | ~3KB, simple API, no boilerplate |
| **Complex derived/interdependent state** | Jotai | Atomic fine-grained reactivity, SSR support |
| **Theme / auth / locale** | React Context | Low-frequency, no performance concern |
| **Enterprise / complex business logic** | Redux Toolkit | Mature DevTools, time-travel, team tooling |
| **Form state** | React Hook Form + `useActionState` | Uncontrolled with validation, or native React 19 actions |

### What to Check

- [ ] Server state not duplicated in component state — TanStack Query is the single source of truth
- [ ] State is **co-located** — lives as close as possible to where it's used
- [ ] State is **lifted** only when multiple siblings need it; not lifted preemptively
- [ ] No state mutations in reducers — immutable updates only
- [ ] Context is split into small focused providers — `ThemeContext`, `AuthContext`, not one mega `AppContext`
- [ ] Derived state is **computed**, not stored: `useMemo(() => items.filter(...), [items])` not `useState(filteredItems)`
- [ ] Async state updates don't fire after component unmount (TanStack Query handles this automatically)
- [ ] Zustand stores are split by domain (auth store, UI store, market store) not a single monolithic store

---

## 4. Performance

### React Compiler (Stable since October 2025)

The React Compiler is now the primary performance optimization tool. It replaces most manual memoization:

- [ ] **React Compiler installed** (`babel-plugin-react-compiler`) — if not, manual checks below apply
- [ ] If compiler is installed: confirm it compiled your components (check build output for compiler stats)
- [ ] If compiler is NOT installed: manual `useMemo`, `useCallback`, `React.memo` checks apply as before

**If manually optimizing (no compiler):**
- [ ] `React.memo` on components that re-render frequently with unchanged props
- [ ] `useMemo` for expensive calculations — not for every derived value
- [ ] `useCallback` for functions passed as props to memoized children
- [ ] No inline anonymous functions in JSX (`onClick={() => fn()}` defeats memoization)
- [ ] No new object/array literals passed as props on every render

### Concurrent Features

- [ ] **`useTransition`** — Heavy state updates (search, filter, sort) wrapped to keep input responsive
- [ ] **`useDeferredValue`** — Defers re-rendering of expensive trees without debouncing
- [ ] **Suspense boundaries** — Slow components wrapped so the rest of the page doesn't block
- [ ] Suspense fallback content is meaningful, not a blank `<div />`

### Bundle Size & Loading

- [ ] **Code splitting** — Routes and heavy components use `React.lazy()` + `Suspense`
- [ ] **Dynamic imports** — Large third-party libraries (chart libs, PDF viewers) loaded on demand
- [ ] **Tree-shaking verified** — Named imports; no barrel re-exports of full libraries
- [ ] **Bundle analysis run** — Use `vite-bundle-analyzer` or `source-map-explorer` to identify bloat
- [ ] **Images** — WebP/AVIF format, explicit `width`/`height` to prevent layout shift, `loading="lazy"` for below-fold
- [ ] **Pre-compression** — gzip + brotli static assets served via `gzip_static` / `brotli_static` (no runtime cost)

### List & Data Performance

- [ ] **Virtualization** — Lists with 100+ items use `react-window`, `react-virtual` (TanStack Virtual), or the component library's built-in virtual scroll
- [ ] **Pagination / infinite scroll** — Large datasets fetched in pages, not all at once
- [ ] **Debouncing** — Search inputs and resize handlers debounced (16–300ms depending on UX)
- [ ] **Throttling** — Scroll handlers throttled, not debounced

### Key Metrics

| Metric | Target | Tool |
|--------|--------|------|
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse |
| INP (Interaction to Next Paint) | < 200ms | Chrome UX Report |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| Initial JS bundle (gzipped) | < 200KB | Bundle Analyzer |
| Component render time | < 16ms | React DevTools Profiler |
| TTFB (Time to First Byte) | < 800ms | WebPageTest |

> **Note:** FID is deprecated. INP is the replacement metric as of 2024.

---

## 5. Accessibility (WCAG 2.2 — Now Legally Required in EU)

> The European Accessibility Act (EAA) came into force **June 28, 2025**. WCAG 2.2 Level AA is now a legal requirement for commercial web products in the EU.

### Semantic HTML

- [ ] Semantic elements: `<header>`, `<main>`, `<nav>`, `<footer>`, `<section>`, `<article>`, `<aside>`
- [ ] Heading hierarchy is logical: `h1 → h2 → h3`, no skipped levels
- [ ] `<button>` for actions, `<a>` for navigation — never `<div onClick>`
- [ ] All `<img>` have `alt` text (empty `alt=""` for decorative images)
- [ ] Form inputs linked to `<label>` via `htmlFor`

### Keyboard Navigation

- [ ] All interactive elements reachable via Tab, operable via Enter/Space/Escape/Arrow keys
- [ ] Focus indicators visible on all focusable elements (never `outline: none` without a visible replacement)
- [ ] Tab order is logical and follows visual flow
- [ ] **Focus management** — Modals trap focus inside; focus restored to trigger element on close
- [ ] Skip link present to jump past navigation

### ARIA & Screen Readers

- [ ] ARIA only where semantic HTML is insufficient
- [ ] `aria-live` regions for dynamic content (toasts, form errors, loading updates)
- [ ] `aria-label` or `aria-labelledby` on icon-only buttons
- [ ] `role="dialog"` + `aria-modal="true"` on modals
- [ ] `aria-busy="true"` on loading regions
- [ ] Page `<title>` updated on route changes

### WCAG 2.2 New Criteria (Not in 2.1)

- [ ] **Focus not obscured** (2.4.11 AA) — Focused element not fully covered by sticky headers/footers/chat widgets
- [ ] **Focus appearance** (2.4.13 AAA) — Focus indicator meets size + contrast requirements
- [ ] **Dragging alternatives** (2.5.7 AA) — Any drag operation has a single-pointer alternative
- [ ] **Target size minimum** (2.5.8 AA) — Interactive targets ≥ 24×24px (AA); aim for 44×44px
- [ ] **Consistent help** (3.2.6 A) — Help mechanisms (support links, chat) appear in same location across pages
- [ ] **Redundant entry** (3.3.7 A) — Users not asked to re-enter info they already provided in the same session
- [ ] **Accessible authentication** (3.3.8 AA) — No cognitive test required for authentication (no "solve this puzzle to log in")

### Visual Accessibility

- [ ] Color contrast meets WCAG AA (4.5:1 normal text, 3:1 large text, 3:1 UI components)
- [ ] Information is not conveyed by color alone
- [ ] Text resizable to 200% without content loss
- [ ] Animations respect `prefers-reduced-motion`

### Testing Tools

| Tool | Type | Purpose |
|------|------|---------|
| `eslint-plugin-jsx-a11y` | Static | Catch issues in JSX at dev time |
| `@axe-core/react` | Runtime | DOM audit in development |
| `axe-playwright` | Automated | Accessibility checks in E2E tests |
| `jest-axe` | Automated | Component-level accessibility tests |
| Lighthouse CI | Automated | Scoring in CI pipeline |
| VoiceOver / NVDA / JAWS | Manual | Real screen reader verification |

> Automated tools catch ~40% of WCAG issues. Manual testing is required for focus management, cognitive criteria, and assistive technology compatibility.

---

## 6. Security

### XSS Prevention

- [ ] **Never use `dangerouslySetInnerHTML` with unsanitized input.** If required, sanitize with DOMPurify:
  ```jsx
  import DOMPurify from 'dompurify';
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
  ```
- [ ] Never set `innerHTML` via refs
- [ ] Validate URLs before rendering — block `javascript:` protocol:
  ```ts
  function isSafeUrl(url: string): boolean {
    try {
      const { protocol } = new URL(url);
      return protocol === 'http:' || protocol === 'https:';
    } catch { return false; }
  }
  ```
- [ ] React's JSX `{}` auto-escaping is relied upon (don't bypass it)

### Content Security Policy (CSP)

- [ ] CSP delivered via **HTTP response headers** (not `<meta>` — meta-tag CSP doesn't support all directives)
- [ ] `default-src 'self'` baseline with explicit allowlists
- [ ] **CSS-in-JS libraries (Emotion, Mantine, MUI) require nonce-based CSP** — `'unsafe-inline'` in `style-src` is a fallback, not the right approach:
  ```ts
  // Server: generate nonce per request
  const nonce = crypto.randomBytes(16).toString('base64');

  // Pass to Emotion cache
  import createCache from '@emotion/cache';
  const cache = createCache({ key: 'emotion', nonce });

  // Render
  <CacheProvider value={cache}><App /></CacheProvider>
  ```
- [ ] Script nonces or hashes for any inline scripts
- [ ] `object-src 'none'` to block Flash / plugin injection

### CSRF Protection

- [ ] Anti-CSRF tokens included in state-changing requests (POST/PUT/DELETE)
- [ ] Cookies use `SameSite=Strict` (or `Lax`), `HttpOnly`, and `Secure` flags
- [ ] Custom request headers (`X-Requested-With: XMLHttpRequest`) for additional CSRF protection on API calls

### Authentication & Token Security

- [ ] **Auth tokens NOT in `localStorage` or `sessionStorage`** — vulnerable to XSS from any script on the page
- [ ] **Prefer `httpOnly` cookies** — immune to XSS, only sent over HTTPS, not readable by JavaScript
- [ ] JWT secret rotation policy in place
- [ ] Sessions regenerated after login; old sessions invalidated
- [ ] All authorization enforced **server-side** — client-side is for UX only, never security

### Dependency Security

- [ ] `npm audit` passes with no critical/high CVEs
- [ ] `package-lock.json` committed and reviewed for unexpected entries
- [ ] Beware lifecycle scripts (`preinstall`, `postinstall`) in new packages
- [ ] React 19.0.2+ required (patches CVE-2025-55182 critical RCE, CVE-2025-55183 source exposure, CVE-2025-55184/CVE-2025-67779 DoS)

### Data & Environment Security

- [ ] No hardcoded secrets, API keys, or credentials in source
- [ ] `.env` files not committed (in `.gitignore`)
- [ ] HTTPS enforced for all environments
- [ ] Sensitive data masked in error messages and logs

---

## 7. Error Handling

- [ ] **Error Boundaries** at appropriate levels — route level, feature level, and around third-party widgets
- [ ] Error boundaries provide useful fallback UI (not a blank white page)
- [ ] **API failure states** show clear fallback UI — no silent failures or frozen screens
- [ ] `null` and `undefined` handled defensively — never assume data exists
- [ ] `try/catch` around risky code: JSON parsing, localStorage access, data transforms
- [ ] Async code does not update state after unmount (TanStack Query and `useOptimistic` handle this; manual `useEffect` needs cleanup)
- [ ] **Loading states** shown during async operations
- [ ] **Empty states** designed: when the API returns but data is empty, show a helpful message
- [ ] Error messages are **helpful and actionable** — not raw error codes or stack traces
- [ ] Errors logged (to Sentry or equivalent) with enough context to reproduce

---

## 8. Testing

### Coverage Strategy

| Layer | What to Test | Tools |
|-------|-------------|-------|
| **Unit** | Utility functions, custom hooks, business logic | Vitest |
| **Component** | User interactions, state changes, render output | Vitest Browser Mode or RTL |
| **Integration** | Multi-component workflows, form submissions | Vitest + MSW |
| **E2E** | Critical user journeys (auth, checkout, core flows) | Playwright |
| **Accessibility** | Component-level a11y audit | jest-axe / axe-playwright |
| **Visual regression** | UI snapshot comparison | Chromatic or Percy |

### 2026 Testing Stack

```
Unit/Component:   Vitest + Vitest Browser Mode (real browser, not JSDOM)
API mocking:      MSW (Mock Service Worker) — works in browser and Node
E2E:              Playwright
Accessibility:    axe-playwright (E2E) + jest-axe (unit)
Coverage:         @vitest/coverage-v8
```

> **Vitest Browser Mode** runs tests in a real browser (Chromium via Playwright). This makes tests more reliable than JSDOM — browser APIs work correctly, CSS is real, layout is real. No more "works in tests, broken in browser" surprises.

### Test Best Practices

- [ ] Test **behavior** not implementation — what the user sees and does, not internal state
- [ ] Prefer **accessible queries**: `getByRole`, `getByLabelText`, `getByText`; use `getByTestId` only as last resort
- [ ] Tests describe what they test: `it('shows an error when form submitted without email')`
- [ ] Tests are not brittle — don't break on unrelated refactors
- [ ] API calls mocked with MSW (real HTTP mock), not `jest.mock('axios')`
- [ ] Edge cases covered: empty states, error states, boundary values, loading states
- [ ] Accessibility assertion in every component test: `expect(await axe(container)).toHaveNoViolations()`
- [ ] No tests that test the framework itself

---

## 9. Styling & Responsiveness

- [ ] Consistent approach — one styling system per project (no mix of Tailwind + CSS Modules + inline styles)
- [ ] Style files preferred over inline `style={{}}` for anything beyond truly dynamic one-off values
- [ ] **Responsive design** tested at mobile (375px), tablet (768px), and desktop (1280px+)
- [ ] Touch targets ≥ **44×44px** for mobile (WCAG 2.5.8 requires minimum 24×24px)
- [ ] All component visual states covered: default, hover, focus, active, disabled, loading, error, empty
- [ ] RTL layout supported where required — use CSS logical properties:
  - `margin-inline-start` not `margin-left`
  - `inset-inline-start` not `left`
  - `padding-inline` not `padding-left`/`padding-right`
- [ ] No layout shift on load — images and dynamic content have explicit dimensions
- [ ] `prefers-color-scheme` respected if dark mode is supported
- [ ] `prefers-reduced-motion` respected for all animations

---

## 10. Internationalization (i18n)

- [ ] All user-facing strings externalized — no hardcoded text in components
- [ ] Translation keys are descriptive and namespaced
- [ ] RTL (Right-to-Left) layout supported using logical CSS properties
- [ ] Date, number, and currency formats use `Intl.*` APIs or a locale-aware library
- [ ] Pluralization rules handled correctly for the target locale
- [ ] Persian/Farsi text: verify `dir="rtl"` set on root or page, and Jalali calendar formatting used

---

## 11. Developer Experience & CI/CD

### Tooling

- [ ] **ESLint** with `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`
- [ ] **Prettier** enforcing consistent formatting
- [ ] **TypeScript** in strict mode
- [ ] **Husky + lint-staged** — linting and type-checking on pre-commit, no broken code committed
- [ ] `.gitignore` excludes `dist/`, `node_modules/`, `.env`, IDE files, generated files

### CI Pipeline

- [ ] Linting runs on every PR (`eslint --max-warnings 0`)
- [ ] TypeScript type-check runs (`tsc --noEmit`)
- [ ] Tests run on every PR — all passing
- [ ] Bundle size monitored — fail if initial JS increases beyond threshold
- [ ] Lighthouse CI or axe in CI pipeline for accessibility regression
- [ ] Security audit runs (`npm audit --audit-level=high`)

### React Router 7 / Remix (if applicable)

| Mode | When to use |
|------|-------------|
| **Declarative Mode** | Traditional SPA with `<Routes>` and `<Route>` — maximum control |
| **Data Router Mode** | Build custom framework with loaders/actions |
| **Framework Mode** | Remix-like file-based routing, SSR, loaders built in |

> React Router v7 merged with Remix. What was planned as Remix v3 shipped as React Router v7. Remix v2 users should upgrade directly.

### Documentation

- [ ] README with setup instructions, architecture overview, and contribution guide
- [ ] Complex components have JSDoc or Storybook documentation
- [ ] API contracts and data models documented
- [ ] PR descriptions are clear and link to related issues

---

## 12. Review Process

- **Keep PRs small** — Reviewers give more attention to smaller diffs. Large PRs get rubber-stamped.
- **Automate everything you can** — Linters handle formatting, CI handles tests, Lighthouse handles performance. Human reviewers focus on **logic, architecture, and risk**.
- **Ask questions, don't assume** — "What's the reason for this approach?" instead of "This is wrong."
- **Focus on knowledge sharing** — Reviews are for learning, not gatekeeping.
- **Review the behavior, not just the code** — Does it handle edge cases? Does it degrade gracefully?
- **React Compiler changes what you review** — If the compiler is enabled, stop reviewing for `useMemo`/`useCallback` correctness. Focus on data flow and correctness instead.

---

## Quick Reference: State Management Decision Matrix

| Use Case | Tool | Notes |
|----------|------|-------|
| Server/API state | TanStack Query | Caching, background refetch, DevTools |
| Simple local UI state | `useState` / `useReducer` | Co-located, zero overhead |
| Global client state | Zustand (~3KB) | Simple, performant, no boilerplate |
| Complex derived state | Jotai | Fine-grained atoms, SSR support |
| Form state | `useActionState` (React 19) or React Hook Form | Native for simple forms, RHF for complex |
| Optimistic UI | `useOptimistic` | Built into React 19, no custom code needed |
| Enterprise global state | Redux Toolkit | Mature DevTools, team tooling |
| Minimal bundle SPA | SWR (5.3KB) + Context | When bundle size is critical constraint |

---

## Quick Reference: React 19 Hooks

| Hook | Replaces | Use for |
|------|----------|---------|
| `use(promise)` | `useEffect` + `useState` for data | Reading async resources during render |
| `useOptimistic` | Custom optimistic boilerplate | Instant UI feedback before server confirms |
| `useFormStatus` | Manual `isSubmitting` state | Button pending state tied to parent form |
| `useActionState` | `useState` + `try/catch` in handlers | Form action state, errors, pending |

---

*Updated February 2026 — based on React 19.0.2, React Compiler 1.0, Next.js 15, Vitest 4, Playwright 1.5x, WCAG 2.2, European Accessibility Act enforcement, and production patterns from the React, Vercel, and Meta engineering teams.*
