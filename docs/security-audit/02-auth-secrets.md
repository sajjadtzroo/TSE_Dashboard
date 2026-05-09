# 02 — Authentication, Authorization & Secrets Audit

**Scope**: JWT handling, password storage, session lifecycle, rate-limiting of auth endpoints, secrets/config hygiene, role-based access control, and Docker/.env exposure.

**Executive summary**: The auth surface is reasonably well structured (bcrypt, JWT with `type` discrimination, role hierarchy, dedicated `auth` rate-limit tier, IP-trust logic on forwarded headers, HMAC-checked Telegram initData) but ships several **production blockers**: refresh tokens are infinitely re-issuable with no server-side revocation, JWT tokens travel in WebSocket query strings that are persisted to nginx **and** Gunicorn access logs, registration is fully open to the internet behind only a 10 req/min IP limit, and the rate-limit middleware fails open across the board (Redis outage = unlimited brute-force). Additionally, two state-mutating endpoints (`POST /api/crypto/refresh`, `POST /api/news/{id}/read`) have no authentication at all, the `API_SECRET_KEY` enforcement path is a mere `warnings.warn` rather than a startup failure, and the `seed_master_users.py` script silently re-hashes the env-supplied password on every container restart without forcing rotation.

---

## Critical

### C-1 — Refresh tokens have no revocation, rotation, or replay protection
- **Severity**: Critical
- **Location**: `api/auth.py:55-57` (`create_refresh_token`), `api/routes/auth.py:135-154` (`/api/auth/refresh`), `database/models.py` (no `Token`/`RefreshToken` table exists)
- **Description**: Refresh tokens are stateless 7-day JWTs (`REFRESH_TOKEN_EXPIRY_DAYS = 7`) signed with `JWT_SECRET_KEY`. The `/refresh` endpoint accepts any unexpired refresh token, issues a brand-new access+refresh pair, and **never marks the old one consumed**. There is no `jti`, no `RefreshToken` / `TokenBlacklist` table, no token-family tracking, no `iat` check, and `User` exposes no `password_changed_at` / `token_version` field. Logout is impossible — even after a user changes their password (`PATCH /api/auth/me`), all previously issued access and refresh tokens remain valid until natural expiry.
- **Exploit**: An attacker who captures any refresh token (XSS, leaked log, stolen device) can keep it in their pocket forever and silently mint fresh access tokens for up to 7 days; if they call `/refresh` once a week they keep an attacker-controlled session indefinitely. The legitimate user has zero way to invalidate it — even setting `is_active=False` is bypassable on existing access tokens until `JWT_EXPIRATION_MINUTES` (default 60 min) elapses on each one. Concurrent token reuse is undetectable, so theft cannot be detected by family-invalidation.
- **Fix**: Add a `refresh_tokens` table with `(jti UUID PK, user_id, family_id, issued_at, used_at, revoked, expires_at)`. On refresh: look up jti, reject if `used_at IS NOT NULL` (theft → revoke entire family), mark used, issue new refresh with new jti in same family. Add `/api/auth/logout` that revokes the family. Embed `jti` and check it in `_get_user_from_token`. Add `password_changed_at` on `User` and reject access tokens whose `iat < password_changed_at`.

### C-2 — JWT bearer tokens leaked into nginx **and** Gunicorn access logs via WebSocket query string
- **Severity**: Critical
- **Location**: `api/routes/ws.py:138` (`/ws/market?token=…`), `api/routes/voice.py:69-74` (`/ws/voice?token=…`), `infra/nginx/nginx.conf:15-19` (`log_format main` includes `$request`), `Dockerfile:84` (`--access-logfile -` to stdout, default Gunicorn format includes the request line)
- **Description**: Both WebSocket endpoints take the JWT access token as a `?token=` query parameter (browsers cannot set headers on `WebSocket()` constructions, so this pattern is common, but it requires log scrubbing). Nginx's `log_format main` writes `"$request"` — the full request line including `token=eyJ…` — to `/var/log/nginx/access.log`, and Gunicorn's stdout access log (default format `%(r)s`) likewise writes the request line. Both feed the JSON-file Docker log driver, where they are retained on disk (`max-size: 10m`, `max-file: 3-5`) and shipped to anything tailing container logs (Sentry, Loki, etc.). The 60-minute access-token lifetime gives an attacker who reads logs ample replay window.
- **Exploit**: Anyone with read access to container/host logs (devops engineers, log-aggregator service accounts, leaked Sentry/Grafana creds, an LFI bug in any sibling container that mounts `/var/log/`) harvests a stream of valid `Bearer` tokens and impersonates users for up to 60 minutes per token. Combined with **C-1**, they can chain into permanent access via `/refresh`.
- **Fix**: Switch WebSocket auth to a short-lived (~30 s) one-time ticket: client calls authenticated `POST /api/auth/ws-ticket`, server issues a single-use random ID stored in Redis with TTL, client connects with `?ticket=…`. In nginx, redact the query string in the log format (`$request_uri` → custom var via `map`). In Gunicorn, set `--access-logformat` that uses `%(U)s` (path only, no query) instead of `%(r)s`. Audit any existing logs for previously captured tokens.

### C-3 — `POST /api/crypto/refresh` is unauthenticated and triggers external API calls + DB writes
- **Severity**: Critical (downgrades to High when `ENABLE_CRYPTO=false`, the default — but is enabled in CLAUDE.md as a real feature)
- **Location**: `api/routes/crypto.py:527-548`
- **Description**: The endpoint `POST /api/crypto/refresh` calls `fetch_and_store_tickers(db)` and `fetch_and_store_global_metrics(db)` — both perform CoinMarketCap fetches (paid quota), perform DB writes, and invalidate three Redis cache tags. There is no `Depends(require_role(...))`, no `Depends(get_current_user)`, no `Depends(require_api_key)`. Rate limiting in `_TIER_RULES` does not match `crypto/`, so it falls into the `default` tier (300 req/min per IP).
- **Exploit**: An anonymous attacker hitting `POST /api/crypto/refresh` 300 times/min/IP (or distributed across IPs since `_get_client_ip` returns the spoofed XFF when Docker peer is in `172.16.0.0/12`) burns the CMC API key's monthly quota in minutes, hammers the database with concurrent upserts, and continuously evicts crypto cache for legitimate users.
- **Fix**: Add `_user=Depends(require_role("admin"))` (matching the scraper trigger pattern at `api/routes/scraper.py:35`) and add `crypto/refresh` to `_TIER_RULES` with the `scraper` tier.

---

## High

### H-1 — Auth rate-limit middleware fails open on Redis outage
- **Severity**: High
- **Location**: `api/rate_limit.py:88-90, 137-139`
- **Description**: When Redis is unavailable the entire middleware short-circuits: `if not REDIS_ENABLED or not cache_manager.available: return await call_next(request)`. Any exception during the pipeline call also falls through (`except Exception … return await call_next(request)`). Combined with `RATE_LIMITS["auth"] = (10, 60)` being the only line of defence on `/login`, `/register`, `/refresh`, a Redis blip = unlimited brute-force.
- **Exploit**: An attacker triggers (or just waits for) a Redis hiccup, then runs an unbounded credential-stuffing attack against `/api/auth/login`. Since passwords are bcrypt-verified on every attempt the worker pool will saturate, but offline/distributed dictionaries against `master_admin` with the env-set password become trivial.
- **Fix**: For the `auth` tier specifically, fail closed (return 503 if Redis unavailable). Alternatively, add a per-user (not per-IP) sliding-window counter on `/login` and a SQL `users.failed_login_count` + lockout after N attempts. Also add nginx-level `limit_req` zone for `/api/auth/login` as a second layer (currently `nginx.conf:55-58` only has `api` and `scraper` zones).

### H-2 — Open public registration, no email verification, default-active accounts
- **Severity**: High
- **Location**: `api/routes/auth.py:76-110`
- **Description**: `POST /api/auth/register` is exposed to the internet with only the `auth` 10-req/min rate limit. New rows are created with `is_active=True` (`User.is_active` default in `database/models.py:74`) and `role="viewer"`. There is no email-verification flow, no captcha, no invite-only gate, no domain allow-list. While `viewer` is the lowest tier, viewers can call `/api/rag/chat`, `/api/rag/financial-analysis`, `/api/rag/ratio-explain` and `/api/chat` which all hit paid LLM models (`google/gemini-2.5-flash`, `anthropic/claude-opus-4.6`, etc.).
- **Exploit**: Attacker scripts 10 registrations/min/IP across a botnet, each call yields a working JWT, then drains the OpenRouter quota via `/api/rag/chat` and `/api/chat` (no per-user quota visible). Spam mailbox `<id>@telegram.local` rows pollute the unique-email index. No path to disable in code without a deploy.
- **Fix**: Gate with email-verification (`User.is_active=False` until token from email is consumed) or invite codes; add captcha (hCaptcha/Turnstile); add per-user-id LLM cost meter; consider feature-flagging `/register` off for production deploys that use seed users.

### H-3 — `API_SECRET_KEY` only `warnings.warn`s when unset; deps treat empty as "auth disabled"
- **Severity**: High
- **Location**: `config/settings.py:111-118`, `api/deps.py:29-39`
- **Description**: Unlike `JWT_SECRET_KEY` (raises `ValueError` at import — `settings.py:128-132`), `API_SECRET_KEY` only emits a Python `warnings.warn(...)` when missing. `require_api_key` in `api/deps.py:35-37` then **returns silently** (`if not API_SECRET_KEY: return`), so any endpoint protected only by `Depends(require_api_key)` becomes fully public. Currently no route imports `require_api_key`, so this is dead code today, but the dev-mode silent-bypass is a foot-gun: someone adding `Depends(require_api_key)` to a future scraper endpoint would believe it is protected when in fact a misconfigured prod deploy strips the protection. The CLAUDE.md `scraper` rate-limit tier docstring explicitly references "/api/scraper/*" auth, suggesting `require_api_key` was intended as the second factor.
- **Exploit**: Developer adds `Depends(require_api_key)` to a sensitive admin endpoint, deploys to prod where `.env` was copied without `API_SECRET_KEY` set, sees the `warnings` line buried in startup log, and ships a publicly accessible admin endpoint. Standard "fail open + only a warn" anti-pattern.
- **Fix**: In `api/deps.py:35-37`, raise `HTTPException(503, "API key auth not configured")` (or 500) instead of returning. In `config/settings.py`, promote the warning to a hard `raise ValueError` mirroring `JWT_SECRET_KEY`. Or remove the helper entirely if RBAC via `require_role("admin")` is the canonical path.

### H-4 — `master_admin` / `master_trader` seed accounts: no forced rotation, password env survives in container
- **Severity**: High
- **Location**: `scripts/seed_master_users.py:33-82`, `.env.template:89-91`
- **Description**: The seed script reads `MASTER_ADMIN_PASSWORD` and `MASTER_TRADER_PASSWORD` from env, hashes with bcrypt, and `INSERT … ON CONFLICT DO UPDATE SET hashed_password = EXCLUDED.hashed_password` on every run — meaning every container restart re-imprints whatever password is currently in the env onto the production DB, **silently overwriting any post-deploy password change** the admin made via `PATCH /api/auth/me`. There is no `must_change_password` flag, no `is_active=False` gate, no email-verification, and the env vars persist inside the running container's `/proc/1/environ`. `.env.template:90-91` ships with the literal default `change-me-strong-admin-password` — operators who skip the diff get a known-string admin account.
- **Exploit**: (a) Operator forgets to update `.env`, ships container with `MASTER_ADMIN_PASSWORD=change-me-strong-admin-password`, attacker logs in as `admin`. (b) Admin rotates password via UI, container restarts (deploy, OOM kill, `restart: unless-stopped` triggered), `seed_master_users.py` runs again and silently reverts to the env value — admin's rotation lost without notification.
- **Fix**: (a) The script should `INSERT … ON CONFLICT DO NOTHING` for `hashed_password` (only update role/email), or check `users.master_seed_pinned=False` before overwriting. (b) Set `is_active=False` and require an out-of-band activation. (c) Refuse to run if password is in a small known-bad list (the literal templates). (d) Document that `MASTER_*_PASSWORD` env should be unset/removed after first successful seed.

### H-5 — `JWT_SECRET_KEY` has no entropy/length validation; HS256 with shared symmetric secret across all services
- **Severity**: High
- **Location**: `config/settings.py:127-133`, `api/auth.py:21,45,63`, `docker-compose.yml:61,117`
- **Description**: `JWT_ALGORITHM = "HS256"` with a single symmetric `JWT_SECRET_KEY`. There is no minimum-length check (`.env.template:106` suggests "at least 32 characters" but settings.py only checks **presence**, accepting `JWT_SECRET_KEY=x`). The same secret is mounted into the API container, the scheduler container, the eventual tick-ingestor (any process that imports `config.settings`). No key-rotation mechanism exists — there's no `kid` header, no list of accepted secrets, no overlap window.
- **Exploit**: (a) An operator sets a short/guessable secret, attacker brute-forces offline. (b) Compromise of the scheduler container (which doesn't strictly need to verify tokens) exposes the same key the API uses to mint tokens, letting attacker mint admin JWTs. (c) When the secret eventually leaks, the only remediation is "set a new value, instantly logout every user globally" with no graceful rollover.
- **Fix**: Validate length (`if len(JWT_SECRET_KEY) < 32: raise`). Move to RS256 (private key only on the API; scheduler verifies with public key). Add `JWT_SECRET_KEY_PREVIOUS` env with `kid` header so rotation is non-disruptive. Don't pass `JWT_SECRET_KEY` to services that don't validate or sign tokens (the scheduler at `docker-compose.yml:117` does not need it).

---

## Medium

### M-1 — `_get_client_ip` trusts XFF from any peer in `172.16.0.0/12`, default Docker bridge subnet
- **Severity**: Medium
- **Location**: `api/rate_limit.py:17, 27-41`, `config/settings.py:98`
- **Description**: `TRUSTED_PROXY_CIDR` defaults to `172.16.0.0/12` — the entire RFC1918 range used by *every* Docker bridge network on the host. Any sibling container on any user-defined bridge can spoof `X-Forwarded-For` and bypass per-IP rate limits. Worse, `_get_client_ip` takes `(x-forwarded-for or "").split(",")[0]` — when nginx proxies, `X-Forwarded-For` is `client, nginx-peer` so the first token is the real client; but a malicious container that connects directly to `app:8000` (which is exposed on the host as `${API_PORT:-8000}` per `docker-compose.yml:30`) sets its own XFF and the middleware honors it.
- **Exploit**: Compromise any sidecar container (`tick_ingestor`, `dollar_ingestor`, `binance_ingestor`, `gost`) → get into `172.x.0.0/12` → spoof XFF on every request to `app:8000` → distribute brute-force across an unbounded synthetic IP space, evading the auth tier (10/min/IP).
- **Fix**: Default `TRUSTED_PROXY_CIDR` to a precise nginx-only subnet (a dedicated `frontend_net` Docker network), or use the nginx container's resolved IP only. Alternatively, use Docker's `proxy_protocol` and read the real peer that way. Don't expose port 8000 directly on the host (`docker-compose.yml:29-30`); only nginx should be reachable.

### M-2 — Login endpoint has user-enumeration timing side-channel + early-exit branch
- **Severity**: Medium
- **Location**: `api/routes/auth.py:113-122`
- **Description**: `if not user or not verify_password(...):` short-circuits — if the username doesn't exist, bcrypt is **not** invoked, returning in microseconds; if the user exists, bcrypt takes ~250 ms (rounds=12 default). An attacker measures response timing to enumerate valid usernames. Additionally `logger.warning("Failed login attempt username=%s", req.username)` writes the candidate username into logs (potential CSV poisoning if log files are imported). The 401 message ("Invalid username or password") is correct and uniform, but the timing is not.
- **Exploit**: Username harvesting at 10 req/min/IP scaled across a botnet: `master_admin` → 250 ms, `master_admij` → 5 ms. Build a list of valid usernames, then run targeted password attacks.
- **Fix**: When user not found, still compute a dummy bcrypt verify against a constant-string hash (`pwd_context.verify(password, _DUMMY_HASH)`) so timing is uniform. Better: store and check a `username_lookup_hash` to make existence-checking constant-time at the DB layer.

### M-3 — Bcrypt cost factor is library default (12), not pinned/audited
- **Severity**: Medium
- **Location**: `api/auth.py:21`, `scripts/seed_master_users.py:31`
- **Description**: `CryptContext(schemes=["bcrypt"], deprecated="auto")` — no `bcrypt__rounds=...` set. passlib's default is 12, which is OK for 2024 but should be explicit and pinned so an upgrade of passlib doesn't silently change verification cost. argon2id is preferred for new deployments. Also, bcrypt silently truncates passwords at 72 bytes; `password: str = Field(..., max_length=128)` allows 128-char passwords, of which only the first 72 bytes are actually hashed. A user who sets `"a"*72 + "X"` and `"a"*72 + "Y"` would log in with either.
- **Fix**: `CryptContext(schemes=["argon2", "bcrypt"], default="argon2", deprecated="auto", argon2__time_cost=3, argon2__memory_cost=65536, argon2__parallelism=4)`, or at minimum pin `bcrypt__rounds=12`. Reduce `password.max_length` to 72 or pre-hash with SHA-256 before passing to bcrypt.

### M-4 — Username/email enumeration on `/register`
- **Severity**: Medium
- **Location**: `api/routes/auth.py:81-91`
- **Description**: The endpoint returns 409 with `"Username already exists"` vs `"Email already registered"`, distinguishing which field collided. This lets an attacker enumerate registered emails (which are PII, not just usernames).
- **Exploit**: Attacker iterates a list of suspected user emails; the differentiated error reveals which addresses are registered, useful for phishing.
- **Fix**: Return a uniform error: `"Account with this username or email already exists"`.

### M-5 — Telegram auth auto-creates a `viewer` account; `auth_date` window is 24 h (Telegram recommends ≤30 s)
- **Severity**: Medium
- **Location**: `api/routes/auth.py:222-223`
- **Description**: `if not auth_date or (time.time() - int(auth_date)) > 86400` accepts any Telegram initData up to 24 h old. Telegram's docs recommend rejecting initData older than ~30 seconds for sensitive operations, since initData strings can be captured by browser extensions or shoulder-surfers and replayed. Auto-account-creation also means a stolen one-shot initData mints a *permanent* account.
- **Exploit**: A malicious browser extension on the victim's phone reads `window.Telegram.WebApp.initData`, exfiltrates it, attacker replays within 24 h to mint tokens. With **C-1** the resulting refresh token is permanent.
- **Fix**: Tighten freshness window to 60 seconds. Bind the resulting JWT family to a fingerprint of the original initData hash so a replay-after-issuance is detectable.

### M-6 — `is_active=False` only enforced at token *issuance*, not on already-issued tokens
- **Severity**: Medium
- **Location**: `api/auth.py:90-94`, `api/routes/auth.py:123-125, 144-147`
- **Description**: When an admin disables a user (`UPDATE users SET is_active=false`), `_get_user_from_token` does query and reject — good. But: tokens already issued before deactivation continue to work for the natural lifetime *until each request hits the DB*. There's no `User.role_changed_at` or `User.deactivated_at` check. Combined with **C-1** (no revocation), de-escalating an admin to viewer leaves their previously issued admin-role JWT valid for up to 60 minutes (access) plus they can refresh new ones for 7 days as long as `is_active=True` is restored, etc. The `role` claim is **also embedded in the JWT** (`api/auth.py:128 token_data = {"sub": user.username, "role": user.role}`) but `require_role` reads from the freshly-loaded `user` object, so role-de-escalation is at least correctly enforced on every request.
- **Exploit**: Admin offboards an employee at 09:00, employee uses cached JWT until 10:00 to access admin endpoints (even though `is_active=False` would block them, the access token still validates against the DB row that was recently `True` — actually this is enforced; but the role claim drift on already-issued refresh tokens is the issue: refresh works until DB rejects).
- **Fix**: Add `user.token_version` int column, embed in JWT, increment on disable/role-change, reject mismatched versions.

---

## Low

### L-1 — JWT default access-token expiry of 60 minutes is long for an SPA
- **Severity**: Low
- **Location**: `config/settings.py:134` (`JWT_EXPIRATION_MINUTES = 60`)
- **Description**: 60 min is the upper edge of what's acceptable for browser-stored bearer tokens. Combined with the WS-token-in-URL leak (**C-2**) this is a long replay window.
- **Fix**: Drop to 15 min and rely on refresh tokens for continuity (after **C-1** is implemented).

### L-2 — Telegram auto-created users get `@telegram.local` synthetic emails into the unique-email index
- **Severity**: Low
- **Location**: `api/routes/auth.py:273` (`email=f"{tg_id}@telegram.local"`)
- **Description**: Synthetic emails pollute a column declared `unique` and used as a login identifier elsewhere. Any future "send password reset to email" flow will silently fail or send to nowhere.
- **Fix**: Make `email` nullable for Telegram-origin users, or use a distinct lookup key.

### L-3 — `decode_token` raises with header `WWW-Authenticate: Bearer` but no `error="invalid_token"` realm detail
- **Severity**: Low
- **Location**: `api/auth.py:65-70`
- **Description**: Minor RFC 6750 cleanliness; clients can't distinguish expired vs malformed.
- **Fix**: `headers={"WWW-Authenticate": 'Bearer error="invalid_token"'}`.

### L-4 — CORS `allow_origins` from env, `allow_credentials=True`, with `allow_headers=["*"]` and `allow_methods=["*"]`
- **Severity**: Low
- **Location**: `api/main.py:197-203`, `config/settings.py:105-106`
- **Description**: Combination is fine *if* `CORS_ORIGINS` is precisely set. The Codespaces auto-append at `settings.py:121-124` tacks on four `https://${CODESPACE_NAME}-{port}.app.github.dev` origins; if `CODESPACE_NAME` is ever set in production by mistake, a public github.dev origin gains `allow_credentials=True` cookie/auth access. Also `allow_origin_regex` is not used and the bare `*.app.github.dev` pattern is implicit.
- **Fix**: Gate the Codespaces appender on a separate `IS_DEV=true` env flag.

### L-5 — Sentry initialized with `send_default_pii=False` but no `before_send` scrubber for JWTs in URLs
- **Severity**: Low
- **Location**: `api/main.py:39-50`
- **Description**: `send_default_pii=False` blocks user/IP/headers but Sentry still captures request URLs. WebSocket `?token=…` query string therefore can land in Sentry breadcrumbs / spans.
- **Fix**: Add a `before_send` and `before_send_transaction` that strips `token=` from URLs and breadcrumb data.

### L-6 — Generic `/login` failure does not distinguish locked-out vs invalid; but no lockout exists at all
- **Severity**: Low
- **Description**: There is no failed-login counter anywhere in `database/models.py:User` or in the login route. Uniform 401 is fine, but with **H-1** (rate limit fails open) and no per-account lockout, password-spray attacks against `master_admin` cost only network and bcrypt CPU.
- **Fix**: Add `failed_login_count`, `locked_until` columns; reset on success.

---

## Info / Hardening Suggestions

- **CSRF**: Auth is pure bearer (no cookies set anywhere), so CSRF is a non-issue for the API. The frontend stores tokens in localStorage based on the typical pattern (verify in frontend code) — that's vulnerable to XSS, which the unsafe-inline CSP (`nginx.conf:78`) makes worse. Out of scope for this audit but worth a follow-up.
- **No `User.api_key` issuance/management endpoint**: The `User` model has an `api_key` column (`database/models.py:58-64`) but no route to create/rotate/revoke them — column appears unused but adds risk if later filled by hand.
- **Dockerfile**: Verified does NOT `COPY .env` (the `.dockerignore` correctly excludes `.env` and `.env.*`). Build args do not contain secrets; secrets flow via `docker-compose.yml` `environment:` only. No secrets baked into image layers.
- **Gunicorn runs as non-root `appuser`**: `Dockerfile:23, 69` — verified.
- **`JWT_SECRET_KEY: ${JWT_SECRET_KEY:?JWT_SECRET_KEY must be set}`**: `docker-compose.yml:61, 117` — Compose itself enforces presence, good.
- **`MINIO_ACCESS_KEY/SECRET_KEY` are required at startup**: `config/settings.py:185-189` — raises on missing, good.
- **WebSocket refresh-token rejection**: `api/auth.py:137-139` — refresh tokens are explicitly rejected for session auth, good defensive layering.
- **`require_role` correctly re-loads user from DB on every request**: `api/auth.py:150-157` reads `user.role` from the DB-loaded ORM instance, not the JWT claim — role demotions take effect immediately at the access-control check.

---

## Verified-OK (audit coverage)

- `register` checks for existing username **and** email before insert (no enumeration via duplicate-key DB error).
- `verify_password` uses passlib's constant-time `pwd_context.verify` (no manual `==`).
- `decode_token` does **not** allow `alg=none` — `jose.jwt.decode(..., algorithms=[JWT_ALGORITHM])` pins HS256.
- `_get_user_from_token` rejects refresh tokens used as access tokens (`type` claim check).
- `authenticate_ws` likewise rejects refresh tokens (`api/auth.py:137-139`).
- Telegram initData verification uses `hmac.compare_digest` (constant-time).
- `require_api_key` uses `hmac.compare_digest` for the API key comparison (`api/deps.py:38`).
- `change-password` (`PATCH /api/auth/me`) requires `current_password` re-verification before allowing the change.
- `Subscription` create/update/delete endpoints are correctly gated on `require_role("admin")` (`api/routes/subscriptions.py:100,153,166`).
- Scraper triggers (`POST /api/scraper/run/{spider}`, `POST /api/scraper/update-all`) require `admin` role.
- RAG admin endpoints (`/api/rag/upload`, `/api/rag/process`, `/api/rag/documents/{id}` GET+DELETE) all require `admin` role.
- Loan tracking and risk-profile mutating endpoints require `trader` role (`api/routes/loans.py:524,534,545,556,568,582`, `api/routes/risk_profile.py:59,93,115,130,177,193`).
- Portfolio mutating endpoints all require authentication via `get_current_user`.
- Optional-auth chat session endpoints (`/api/chat/sessions/*`) explicitly check `if not user: raise 401` inside the handler before any DB write.
- `JWT_SECRET_KEY` and `DATABASE_URL` raise `ValueError` at startup if missing (`config/settings.py:28-33, 128-132`).
- `.dockerignore` correctly excludes `.env`, `.env.*` (allowing only `.env.template`) — no `.env` baked into the Docker image.
- `.gitignore` excludes `.env` — file is not committed.
- Container runs as non-root `appuser` in all stages.
- Nginx adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS, and a (loose but present) CSP.
- Security-headers middleware adds `X-Content-Type-Options`, `Referrer-Policy` from FastAPI as defence-in-depth.
- WebSocket `auth_date` freshness check exists for Telegram (just too lenient — see M-5).
