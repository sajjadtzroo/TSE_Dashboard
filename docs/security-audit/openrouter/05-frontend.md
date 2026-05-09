## Critical

### Exposed private credential via `VITE_*` env variable in client bundle
- **Severity:** Critical
- **Location:** `frontend/src/services/deribit.js:4`
- **Description:** `DERIBIT_ACCESS_TOKEN` is read from `import.meta.env.VITE_DERIBIT_ACCESS_TOKEN`. In Vite, all `VITE_*` variables are intentionally embedded into the shipped JS bundle and are readable by any user in browser devtools/source.
- **Exploit:** Any user (or attacker with browser access, proxy logs, source-map/bundle inspection, or XSS foothold) can extract the Deribit token and reuse it outside your app. If the token grants private-channel or account-level access, this is credential compromise.
- **Fix:** Never place private/API secrets in frontend `VITE_*` env vars. Move Deribit private calls to backend proxy endpoints; keep token server-side only. Rotate/revoke any currently exposed token immediately.

## High

### JWT auth token is taken from `localStorage` (XSS-stealable session material)
- **Severity:** High
- **Location:** `frontend/src/services/loans/api.ts:56`
- **Description:** Request interceptor reads `auth_token` from `localStorage` and sends it as `Authorization: Bearer ...`. Any successful XSS can trivially read/exfiltrate this token.
- **Exploit:** An attacker who lands DOM/script execution once (via dependency compromise, injected script, or future XSS bug) can run `localStorage.getItem('auth_token')` and hijack user sessions/API access from another device.
- **Fix:** Move auth to secure, `HttpOnly`, `Secure`, `SameSite` cookies; enforce short token TTL + refresh rotation + server-side revocation. If SPA bearer must remain, use strict CSP + Trusted Types + no inline scripts, but cookie-based auth is preferred.

### CSP permits `'unsafe-inline'` scripts, reducing XSS containment
- **Severity:** High
- **Location:** `infra/nginx/nginx.conf:64`, `frontend/index.html:31-33`
- **Description:** CSP includes `script-src 'unsafe-inline'`, which allows inline script execution and weakens one of the primary mitigations against DOM/script injection.
- **Exploit:** If any HTML/JS injection point appears, inline payload execution is much easier because CSP already allows inline script; attacker does not need nonce/hash bypass in many cases.
- **Fix:** Remove `'unsafe-inline'` from `script-src`. Use nonce- or hash-based CSP for required bootstrap code. Move inline script in `index.html` to external static JS file with nonce/hash.

### Third-party script loaded without SRI and broad trust in CSP
- **Severity:** High
- **Location:** `frontend/index.html:30`, `infra/nginx/nginx.conf:64`
- **Description:** Telegram SDK is loaded from `https://telegram.org/js/telegram-web-app.js` without Subresource Integrity (`integrity`) and CSP explicitly allows `https://telegram.org` scripts.
- **Exploit:** If third-party delivery path is compromised (supply chain/CDN/domain hijack scenario), malicious JS executes in origin context and can read tokens, data, and perform privileged actions.
- **Fix:** Prefer self-hosted pinned SDK (version-locked). If remote is mandatory, use SRI with fixed version URL, strict CSP allowlist to exact host/path, and remove inline script allowance.

### Known vulnerable `axios` version in production dependencies
- **Severity:** High
- **Location:** `frontend/package.json:22`, `/tmp/npm_audit.json` (`axios` advisory set)
- **Description:** Project pins `axios` as `^1.6.7`; audit reports multiple high-severity advisories affecting `<1.15.2` (prototype pollution gadgets, header injection chains, SSRF-related bypasses in some adapters).
- **Exploit:** In browser contexts, prototype pollution gadgets and request/response tampering primitives can be chained with unsafe object merges or polluted globals; in mixed runtimes/tooling, impact can expand.
- **Fix:** Upgrade to patched axios release (`>=1.15.2`) and lock via lockfile. Add CI gate (`npm audit --omit=dev` / SCA policy) to block vulnerable production deps.

### Known high-severity `xlsx` vulnerabilities with no upstream fix available in npm report
- **Severity:** High
- **Location:** `frontend/package.json:41`, `/tmp/npm_audit.json` (`xlsx`)
- **Description:** `xlsx@^0.18.5` is flagged for prototype pollution and ReDoS; report indicates no fix available for current package line.
- **Exploit:** If users import attacker-controlled spreadsheet content, maliciously crafted files can trigger heavy regex processing (DoS) or object pollution effects in parsing flows.
- **Fix:** Replace `xlsx` with a maintained alternative or isolate parsing in sandboxed worker/backend service with strict size/time limits. Enforce file size/type quotas and parsing timeout guards.

## Medium

### Dev/build toolchain vulnerabilities (Vite/Rollup/esbuild/picomatch/postcss)
- **Severity:** Medium
- **Location:** `frontend/package.json:30,51`, `/tmp/npm_audit.json` (`vite`, `rollup`, `esbuild`, `picomatch`, `postcss`)
- **Description:** Audit reports multiple vulnerabilities in dev/build-time dependencies. Some affect dev server file exposure/traversal; others affect build ecosystem integrity.
- **Exploit:** If dev server is exposed beyond localhost, an attacker may read local files via known Vite/esbuild issues. In CI/shared runners, vulnerable tooling increases supply-chain/build compromise risk.
- **Fix:** Upgrade Vite/toolchain to patched versions (or latest safe major where required), pin lockfile, restrict dev server binding, and block internet exposure of dev instances.

### Overly broad `connect-src` allows exfiltration to arbitrary HTTPS/WSS origins
- **Severity:** Medium
- **Location:** `infra/nginx/nginx.conf:64`
- **Description:** CSP `connect-src 'self' ws: wss: https:` permits network connections to essentially any secure origin.
- **Exploit:** Under XSS conditions, attacker can exfiltrate sensitive in-page data to attacker-controlled HTTPS/WSS endpoints without CSP blocking.
- **Fix:** Narrow `connect-src` to explicit API/WebSocket endpoints actually used by the app.

## Low

### Obsolete `X-XSS-Protection` header is enabled
- **Severity:** Low
- **Location:** `infra/nginx/nginx.conf:59`
- **Description:** `X-XSS-Protection` is deprecated/ignored by modern browsers and can create false confidence.
- **Exploit:** No direct modern exploit, but teams may overestimate protection and under-prioritize CSP/encoding hardening.
- **Fix:** Remove this header; rely on modern controls (strict CSP, output encoding, Trusted Types, dependency hygiene).

## Info

### Inline boot script currently forces weaker CSP design
- **Severity:** Info
- **Location:** `frontend/index.html:31-33`
- **Description:** Color-scheme bootstrap script is inline, which pressures policy to keep `'unsafe-inline'`.
- **Exploit:** Not directly exploitable by itself (static constant), but it blocks adoption of nonce/hash-only CSP unless refactored.
- **Fix:** Move this script to external file and authorize via nonce/hash to enable strict CSP.

## XSS sink inventory

| Sink type | Location | Snippet | Source trust | Notes |
|---|---|---|---|---|
| `dangerouslySetInnerHTML` | None found in provided files | — | — | Searched provided frontend artifacts only |
| `innerHTML = ...` | None found in provided files | — | — | No direct DOM HTML assignment found |
| `eval` / `new Function` / `document.write` | None found in provided files | — | — | No direct dynamic code execution sink found |

## Verified-OK

- `react-markdown` usage does **not** enable raw HTML rendering (`rehypeRaw` not present), reducing markdown-to-HTML XSS risk (`frontend/src/features/chat/components/MarkdownRenderer.jsx:139-141`).
- Markdown link rendering applies protocol allowlist (`http/https/mailto`) and falls back to `#` for unsafe links (`frontend/src/features/chat/components/MarkdownRenderer.jsx:73-82,109-120`).
- `frame-ancestors 'none'` is set in CSP and `X-Frame-Options: DENY` is present (good clickjacking baseline) (`infra/nginx/nginx.conf:58,64`).
- No production source-map enablement was found in provided Vite config (`frontend/vite.config.js`): `build.sourcemap` not enabled explicitly.
- No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, or `document.write` sinks were found in the provided frontend files.

## Audit caveats

- Audit was limited to the supplied files only; most React page/component files were not provided, so additional sinks may exist outside this subset.
- No `package-lock.json`/`pnpm-lock.yaml` was provided; dependency findings rely on `/tmp/npm_audit.json` and declared ranges, not exact resolved transitive versions in your build.
- Backend/session-cookie configuration was out of scope here; token storage risk was assessed from frontend behavior only.