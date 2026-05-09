## Critical

_None._

## High

### Refresh tokens are not revocable and can be replayed until expiry
- **Severity:** High
- **Location:** `api/routes/auth.py:132-155`, `api/auth.py:35-52`
- **Description:** Refresh tokens are stateless JWTs with 7-day expiry and no server-side storage (`jti`, session table, denylist, or rotation tracking). The refresh endpoint issues a new refresh token but does not invalidate the presented one, so stolen refresh tokens remain usable until expiration.
- **Exploit:** If an attacker exfiltrates one refresh token (browser storage compromise, proxy log leak, client-side malware), they can continuously mint fresh access tokens for up to 7 days, even after the legitimate user refreshes their own token, because prior refresh tokens are still valid.
- **Fix:** Add refresh-token rotation with one-time-use semantics: include `jti`, persist active refresh token/session in DB/Redis, invalidate old `jti` on refresh, and reject reused/unknown `jti`. Add explicit revocation on logout/password change/account disable.

### Authentication rate limiting fails open when Redis is unavailable
- **Severity:** High
- **Location:** `api/main.py:201-205`, `api/rate_limit.py:84-87`, `api/rate_limit.py:132-135`
- **Description:** Auth brute-force controls depend entirely on Redis middleware. If Redis is disabled/unavailable, middleware is skipped or exceptions are swallowed and requests are allowed.
- **Exploit:** An attacker can brute-force `/api/auth/login` and `/api/auth/register` during Redis outage/misconfiguration without throttling, because the middleware explicitly permits traffic on backend failure.
- **Fix:** Enforce fail-closed behavior for auth endpoints (at least for `/auth/login`, `/auth/refresh`, `/auth/register`) when limiter backend is unavailable. Add an in-process fallback limiter and alerting when Redis limiter is degraded.

### Mutating endpoint protection is optional and defaults to insecure behavior if unset
- **Severity:** High
- **Location:** `config/settings.py:97-107`
- **Description:** `API_SECRET_KEY` is optional; when missing, code warns but allows scraper/upload/delete endpoints to be publicly accessible (“dev mode”). This is a production footgun.
- **Exploit:** A production deployment with missing `API_SECRET_KEY` (common env drift) exposes sensitive mutating APIs without authentication, enabling unauthorized data manipulation/deletion.
- **Fix:** Make `API_SECRET_KEY` mandatory in non-dev environments and hard-fail startup if absent. Gate “open dev mode” behind explicit `ENV=development` check, never by missing secret.

## Medium

### JWT secret quality is not validated (entropy/length), and example secret is weakly specified
- **Severity:** Medium
- **Location:** `config/settings.py:120-127`, `.env.example:31-32`
- **Description:** `JWT_SECRET_KEY` is only checked for presence, not minimum entropy/length/format. `.env.example` includes a human-readable placeholder that may be copied into real environments.
- **Exploit:** If operators set a short/guessable JWT secret, attackers can offline-bruteforce HS256 tokens and forge valid admin/trader tokens.
- **Fix:** Enforce minimum requirements at startup (e.g., >=32 bytes random, reject common placeholders), and document generation via cryptographically strong random values.

### Trusted proxy range is broad; forwarded IP handling can be spoof-prone depending on proxy config
- **Severity:** Medium
- **Location:** `config/settings.py:84-87`, `api/rate_limit.py:15-37`
- **Description:** `TRUSTED_PROXY_CIDR` defaults to `172.16.0.0/12` (very broad). When peer is “trusted,” code accepts `X-Real-IP` or first `X-Forwarded-For` value directly, without strict IP parsing.
- **Exploit:** In containerized environments with lateral access, or with misconfigured nginx header sanitation, attackers can inject spoofed forwarded IPs to evade per-IP auth throttling and poison limiter keys.
- **Fix:** Narrow trust CIDR to exact proxy IP/subnet, parse/validate forwarded IP values, and rely on proxy-overwritten headers only (never client-supplied chain head unless guaranteed sanitized).

### Brute-force defense is IP-only; no user/account lockout or progressive delay
- **Severity:** Medium
- **Location:** `api/rate_limit.py:45-60`, `api/routes/auth.py:106-116`
- **Description:** Login protection is per-IP (`auth: 10/min`) only. There is no per-username throttling, temporary account lockout, or exponential backoff after repeated failures.
- **Exploit:** Distributed attacks (botnets/residential proxies) can bypass IP-based limits and repeatedly target known usernames (`master_admin`, typical users) with password spraying.
- **Fix:** Add per-account and per-IP+account counters, temporary lockouts/delays after repeated failures, and high-signal alerting on credential-stuffing patterns.

### Permanent seeded privileged usernames increase targeted attack surface
- **Severity:** Medium
- **Location:** `scripts/seed_master_users.py:8-13`, `scripts/seed_master_users.py:36-49`
- **Description:** The system defines permanent, predictable privileged accounts (`master_admin`, `master_trader`). Predictable admin usernames materially reduce attacker search space.
- **Exploit:** Attackers can focus brute-force and credential-stuffing campaigns on known high-value usernames, increasing compromise likelihood when password hygiene or rate limiting degrades.
- **Fix:** Avoid fixed privileged usernames in production; create tenant-specific admin accounts during provisioning, enforce MFA for privileged roles, and disable/remove bootstrap accounts after setup.

## Low

### Open self-registration without verification enables account farming
- **Severity:** Low
- **Location:** `api/routes/auth.py:77-104`
- **Description:** `/api/auth/register` is open and immediately activates accounts (`role="viewer"`), with no email verification, CAPTCHA, or abuse checks.
- **Exploit:** Attackers can automate mass account creation for scraping, abuse, or token farming, increasing operational and fraud risk.
- **Fix:** Add CAPTCHA/human checks, optional email verification, disposable-email controls, and tighter registration quotas.

### Potential token leakage risk in WebSocket auth flow (depends on route implementation)
- **Severity:** Low
- **Location:** `api/auth.py:108-128`
- **Description:** `authenticate_ws(websocket, token: str)` suggests token is externally passed as a raw string; common implementations pass JWT via query string, which leaks to logs/proxies/history.
- **Exploit:** If WS routes pass `?token=...`, any intermediary/access logs can capture bearer tokens and enable session hijack.
- **Fix:** Authenticate WS via `Authorization` header during handshake or short-lived one-time WS tickets; avoid query-string bearer tokens.

## Info

### JWT algorithm choice (HS256) is acceptable but centralizes trust in one symmetric secret
- **Severity:** Info
- **Location:** `config/settings.py:128-129`, `api/auth.py:40-42`, `api/auth.py:56-58`
- **Description:** HS256 is implemented correctly with explicit algorithm allowlist on decode. However, any service knowing `JWT_SECRET_KEY` can mint tokens.
- **Exploit:** Compromise of any component/environment exposing the shared secret allows full token forgery across the system.
- **Fix:** For multi-service zero-trust separation, migrate to asymmetric signing (RS256/EdDSA) with private key isolation and public-key verification.

### Login logging includes usernames (not passwords/tokens)
- **Severity:** Info
- **Location:** `api/routes/auth.py:86-93`, `api/routes/auth.py:109-121`, `api/routes/auth.py:146-149`
- **Description:** Auth logs include usernames for failed/successful events. This is useful for detection but is still identity metadata.
- **Exploit:** If logs are exposed, attackers gain a list of valid/target usernames and activity patterns.
- **Fix:** Keep logs access-controlled and retention-limited; consider hashing/redacting usernames in lower environments.

## Verified-OK

- JWT decode uses explicit algorithm allowlist and rejects invalid/expired tokens (`api/auth.py:56-66`).
- Refresh tokens are explicitly blocked from being used as access tokens (`api/auth.py:70-75`, `api/auth.py:121-124`).
- Role escalation via registration is blocked at API level (`role="viewer"` enforced in register flow, `api/routes/auth.py:96-101`).
- DB-level role constraint exists (`ck_users_role`) to restrict role values to `viewer|trader|admin` (`database/models.py:64-66`).
- Passwords are hashed with `passlib` bcrypt (no plaintext password storage observed in provided files) (`api/auth.py:20`, `api/auth.py:29-33`, `api/routes/auth.py:99`, `database/models.py:33-36`).
- JWT secret is required at startup (application fails if missing) (`config/settings.py:121-127`).
- Telegram Mini App auth correctly verifies HMAC signature and checks freshness (`api/routes/auth.py:198-226`).
- `hmac.compare_digest` is used for Telegram signature comparison (timing-safe compare) (`api/routes/auth.py:219-221`).

## Audit caveats

- Authorization coverage (`require_role`) could not be fully verified across endpoints because route handler files (e.g., `api/routes/scraper.py`, `api/routes/rag.py`, `api/routes/ws.py`, etc.) were not included in this artifact set.
- WebSocket bearer-token transport method could not be conclusively verified without `api/routes/ws.py`.
- `database/models.py` was explicitly truncated to first 600 lines; only visible sections were assessed.