# 04 — Infrastructure & Network Security Audit

## Executive summary

The TSE Dashboard stack ships several solid hardening choices: the API and worker images run as a non-root `appuser`, nginx applies a baseline of security headers and per-zone `limit_req`, the rate limiter validates `X-Forwarded-For` against a `TRUSTED_PROXY_CIDR`, and `.env` is excluded from the build context via `.dockerignore`. However, **every stateful service (Postgres primary, Postgres replica, PgBouncer ×2, Redis, MinIO API, MinIO Console, Prometheus, Grafana, postgres/redis exporters, and the tick-ingestor metrics endpoint) publishes its host port on `0.0.0.0`**, which on any cloud VM means full Internet exposure of databases, caches, object storage, and metrics — by far the dominant risk class. Compounding this, the deployment is HTTP-only (no TLS terminator, yet HSTS is sent), and CORS is configured with `allow_credentials=True` together with `allow_methods=["*"]`/`allow_headers=["*"]`, which violates the credentialed-CORS spec contract and is brittle if `CORS_ORIGINS` is ever broadened. Container hardening, secrets handling (env-injected, not file-mounted), and observability exposure also need attention before shipping.

No `.env` file exists in the audited tree — only `.env.example` and `.env.template` are present. All "default" values in this report are taken from `docker-compose.yml` interpolation defaults (`:-minioadmin`, etc.) and templates; **no live secret values were read or echoed**.

---

## Critical

### Postgres primary exposed on the public Internet

- **Severity**: Critical
- **Location**: `docker-compose.yml:263-264` (`db.ports: "${POSTGRES_PORT:-5432}:5432"`), `infra/postgres/postgresql.conf:5` (`listen_addresses = '*'`)
- **Description**: The `db` service binds host port 5432 with no interface qualifier, which Docker maps to `0.0.0.0:5432`. The database accepts TCP connections from any source, authenticated only by `POSTGRES_PASSWORD` (a static env-injected secret). `pg_hba.conf` is not in the audit set, so it likely defaults to `host all all all md5`/`scram-sha-256`, i.e., no source-IP restriction.
- **Exploit**: Any attacker who scans port 5432 (Shodan trivially indexes this) can attempt unlimited password guessing against `postgres`. Once authenticated they have full DB read/write, can pivot via `COPY ... PROGRAM` (superuser-only but the default user is the superuser) to RCE, exfiltrate user PII / JWT secrets stored in tables, or enable replication for slow exfil.
- **Fix**: Bind to loopback or remove the `ports:` entry entirely (services on the same Docker network reach `db:5432` via DNS). Either:
  ```yaml
  ports:
    - "127.0.0.1:5432:5432"   # admin SSH-tunnel only
  ```
  …or delete the mapping. Same change applies to `db-replica` (which currently has *no* host port — good — keep it that way). Tighten `pg_hba.conf` to allow only the Docker bridge CIDR. Confirm `postgres` is not the runtime application user.

### Redis exposed on the public Internet

- **Severity**: Critical
- **Location**: `docker-compose.yml:351-352`
- **Description**: `redis` publishes 6379 on `0.0.0.0`. AUTH is enabled (`--requirepass ${REDIS_PASSWORD}`) which mitigates anonymous-write, but Redis 7 still ships dangerous commands enabled by default (`CONFIG`, `DEBUG`, `SCRIPT`, `MODULE LOAD` if a module exists). The instance is also AOF-persisted — a successful attacker can persist a malicious key.
- **Exploit**: Brute-force `AUTH` against the configured password (no rate-limiting at the Redis layer). Password policy is template-driven (`change-me-strong-redis-password`) — if the operator picks something weak, full cache takeover. Compromise yields: read every cached query result (market data, RAG embeddings, JWTs in cache if any), read auth-tier rate-limit counters, write fake responses (cache poisoning to all API consumers), and use `CONFIG SET dir / dbfilename authorized_keys` style tricks if the Redis container were ever run as a privileged user (it isn't here, but principle applies).
- **Fix**: Drop `ports:` for `redis` (only `app`, `scheduler`, `tick_ingestor`, `binance_ingestor` need it, and they reach it over the Docker network). If host access is genuinely needed for ops, bind `127.0.0.1:6379:6379` and require an SSH tunnel. Add `rename-command CONFIG ""`, `rename-command DEBUG ""` to the redis-server args.

### MinIO root credentials and S3 API exposed on the public Internet

- **Severity**: Critical
- **Location**: `docker-compose.yml:322-324`
- **Description**: MinIO publishes both `9000` (S3 API) and `9001` (admin console) on `0.0.0.0`. Authentication is the *root* user (`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`) — there are no scoped service accounts. The same value is reused as both `MINIO_ROOT_PASSWORD` and `MINIO_SECRET_KEY` per `.env.template:79-81`, meaning an S3 credential leak = full admin compromise. `MINIO_SECURE: "false"` confirms cleartext HTTP between app and MinIO.
- **Exploit**: Brute-force the root console at `:9001`, use stolen creds at `:9000` to enumerate/exfil all buckets (PDFs, scraped data, anything in `tsetmc` bucket), or upload malicious objects served by API consumers. Default `MINIO_ROOT_USER=minioadmin` from the compose interpolation default makes username enumeration unnecessary.
- **Exploit (secondary)**: Because the S3 API speaks HTTP, anyone on-path between containers (none, on a single host) or anyone who can MITM a misconfigured remote MinIO sees keys in the `Authorization` header.
- **Fix**: Remove host port mappings for both 9000 and 9001 — the app reaches MinIO at `minio:9000` over the internal network. If console access is needed, route it through the same nginx with auth + IP allow-list. Create a dedicated service account for the application via `mc admin user svcacct add` instead of using root keys. Remove the `:-minioadmin` interpolation default in compose so a missing env aborts deployment instead of using `minioadmin/minioadmin`.

### Grafana exposed on the public Internet with templated default credentials

- **Severity**: Critical
- **Location**: `docker-compose.yml:459-463`
- **Description**: Grafana publishes 3000→3002 on `0.0.0.0`. `GF_SECURITY_ADMIN_USER` defaults to `admin` (compose interpolation). `GRAFANA_PASSWORD` is required from env, but the template literal is `change-me-strong-grafana-password` and there is no enforcement that it actually changed. Grafana exposes datasource queries — once authenticated, an attacker can pivot to `prometheus:9090` and (depending on datasource setup) to PostgreSQL with the saved DB datasource credentials.
- **Exploit**: Credential stuffing / weak-password brute force against `/login`. Grafana has had multiple recent CVEs (CVE-2024-1313 IDOR, CVE-2023-3128 OAuth bypass — patch level 10.4.2 is from May 2024 and several post-disclosure CVEs apply).
- **Fix**: Remove host port mapping; expose Grafana only through nginx with an additional auth layer (HTTP basic, SSO, or IP allow-list). Pin a current Grafana minor (10.4.x → 11.x LTS). Make admin password mandatory with no template default.

---

## High

### All infrastructure ports bind to 0.0.0.0 — uniform exposure pattern

- **Severity**: High (rolled up)
- **Location**: `docker-compose.yml:264, 297, 323, 324, 352, 388, 411, 431, 460, 565, 192`
- **Description**: Beyond the four Critical findings above, the same anti-pattern applies to:
  - PgBouncer primary `6432:5432` — bypasses Postgres directly (same auth surface).
  - PgBouncer replica `6433:5432` — same.
  - postgres-exporter `9187` — leaks DB internals (table names, query patterns) without auth.
  - redis-exporter `9121` — same for Redis.
  - Prometheus `9090` — *no auth*; exposes every metric, supports `--web.enable-lifecycle` (HTTP `POST /-/reload`, `POST /-/quit` — see below).
  - tick_ingestor `9091` — Prometheus scrape endpoint, leaks ingestion timing/volume.
- **Exploit**: Information leak via metrics (cardinality, request volumes, hostnames, label values), attack-surface enumeration. `prometheus --web.enable-lifecycle` plus open `:9090` lets anyone shut down Prometheus with one HTTP POST.
- **Fix**: Same pattern — bind `127.0.0.1:` or remove `ports:`. Move Prometheus + exporters behind nginx with basic-auth or IP allow-list. Drop `--web.enable-lifecycle` in production.

### TLS missing end-to-end; HSTS sent over HTTP

- **Severity**: High
- **Location**: `infra/nginx/nginx.conf:67` (`listen 80;`), `:75` (`add_header Strict-Transport-Security ...`)
- **Description**: nginx only listens on HTTP/80. There is no `listen 443 ssl;` block, no certs, no HTTP→HTTPS redirect. Yet the response includes `Strict-Transport-Security: max-age=31536000; includeSubDomains`. Browsers will obey HSTS once seen — but until then, every login, JWT bearer, and CSRF-relevant request travels in cleartext. `MINIO_SECURE: "false"` confirms internal traffic is also HTTP.
- **Exploit**: Passive sniffing of JWTs (Authorization header), session hijack, login credential capture on any shared/hostile network. SSL-stripping with HSTS bootstrap window.
- **Fix**: Terminate TLS at nginx (or front the stack with a managed LB / Cloudflare). Add `listen 443 ssl http2;`, modern cipher suite (`ssl_protocols TLSv1.2 TLSv1.3;`), and a `:80` block that 301s to `:443`. Only emit HSTS once HTTPS is the canonical scheme. Add `ssl_stapling on;`.

### CORS: `allow_credentials=True` with `allow_methods=["*"]` and `allow_headers=["*"]`

- **Severity**: High
- **Location**: `api/main.py:197-203`, `config/settings.py:105-124`
- **Description**: Starlette/FastAPI's `CORSMiddleware` does the right thing when `allow_origins` is a finite list (it echoes only matching origins), but the combination `allow_credentials=True` + `allow_methods=["*"]` + `allow_headers=["*"]` is fragile:
  1. The CORS spec forbids `Access-Control-Allow-Credentials: true` together with `Access-Control-Allow-Origin: *` — Starlette papers over this by reflecting the request origin if it's in the list, but operators often "fix CORS errors" by adding `*` to `CORS_ORIGINS`, which would *silently* enable credentialed wildcard CORS (full account takeover via any third-party site).
  2. The Codespaces auto-add at `settings.py:121-124` appends `https://${CODESPACE_NAME}-{port}.app.github.dev` whenever `CODESPACE_NAME` is set in the environment. If that env leaks into a production deploy (it's plumbed through compose at `:63`: `CODESPACE_NAME: ${CODESPACE_NAME:-}`), arbitrary github.dev origins could be granted credentialed access.
  3. Origin matching is exact-string; no scheme/port normalization. Adding `https://app.example.com` does not match `https://app.example.com:443` (rare in practice but worth knowing).
- **Exploit**: Misconfigured `CORS_ORIGINS=*` → any site can issue authenticated XHRs against `/api/*` using the victim's JWT cookie/header. Codespaces leakage → GitHub-hosted attacker pages can act as the user.
- **Fix**: Replace `allow_methods=["*"]` with the actual set used (`["GET","POST","PUT","DELETE","PATCH","OPTIONS"]`) and `allow_headers=["*"]` with explicit headers (`["Authorization","Content-Type","X-Request-ID"]`). Reject `*` wildcard at config-validation time when `JWT_SECRET_KEY` is set. Gate the Codespaces auto-add behind `SENTRY_ENVIRONMENT != "production"` or an explicit `ENABLE_DEV_CORS` flag.

### Secrets injected as environment variables (visible in `docker inspect`)

- **Severity**: High
- **Location**: `docker-compose.yml:38-73, 102-122, 178-189, 224-232, 258-262, 290-295, 326-327, 408-409, 462-463, 494-500`
- **Description**: Every secret (DB password, Redis password, MinIO root creds, JWT secret, BRSAPI key, OpenRouter / OpenAI / Gemini / xAI / Tavily / CMC API keys, Telegram session string, Grafana password, replication password) is passed via `environment:` blocks. This means:
  - Any process with Docker socket access (or `docker exec ... env`) sees them.
  - They appear in `docker inspect` output, which is often logged/snapshotted.
  - They appear in Sentry breadcrumbs / crash reports unless explicitly scrubbed.
  - On Linux, they appear in `/proc/<pid>/environ` — readable by any process running as the same UID inside the container (the app), enabling lateral leakage via dependency-supply-chain attacks.
- **Exploit**: A single RCE inside the `app` container exfils not just the DB password but every API key including the long-lived `TELEGRAM_SESSION` (a Telethon session string is functionally a password — it grants ongoing account access without re-auth).
- **Fix**: Move to Docker secrets or file-mounted env (`secrets:` block + `_FILE` env vars where the image supports it). At minimum: split the API-key-bearing env into a dedicated secret config, scrub them from Sentry via `before_send`, and avoid `environment:` interpolation defaults that reveal the existence of dev fallbacks. Scope MinIO to a service account, not the root keys.

### Rate limiter fails open when Redis is unavailable

- **Severity**: High
- **Location**: `api/rate_limit.py:88-90, 137-139`
- **Description**: `RateLimitMiddleware.dispatch()` early-returns without rate-limiting if `not REDIS_ENABLED or not cache_manager.available`, and the per-request `try/except Exception` at `:137-139` *also* lets the request through on any Redis error (logged at DEBUG). This is fail-open by design.
- **Exploit**: Anyone who can briefly DoS or partition Redis (or trigger a transient connection error during a burst) bypasses the entire rate-limit layer — including the `auth: 10/min` brute-force tier on `/auth/login`. Combined with the public Redis port (Critical above), an attacker who guesses the Redis password can `DEBUG SLEEP` or `CLIENT KILL` to induce errors.
- **Fix**: Fail-closed for the `auth` tier specifically (return 503 on Redis error for login/register/refresh). Keep fail-open for read tiers if availability matters more than abuse, but emit a Prometheus counter and alert. Also: `nginx.conf` has `limit_req zone=api burst=50 nodelay;` (30 r/s + burst 50) which is a useful belt-and-braces — keep it.

### `/metrics` and exporter endpoints have no authentication or IP allow-list

- **Severity**: High
- **Location**: `api/main.py:188` (`setup_prometheus(app)` mounts `/metrics`), `infra/nginx/nginx.conf` (no block restricting `/metrics`)
- **Description**: nginx has no `location = /metrics { ... deny all; }` rule, so `/metrics` is reachable from the public Internet. Prometheus client metrics leak: route paths (cardinality), per-route status code distributions (oracle for valid endpoints), database/Redis up/down state, and Python GC/memory stats. Postgres-exporter and redis-exporter (also on public ports) leak much more (table sizes, replication lag, slow-query patterns).
- **Exploit**: Reconnaissance — an attacker enumerates valid endpoints, identifies low-traffic ones for blind injection probing, and watches DB/Redis health for outage windows.
- **Fix**: In nginx, block `/metrics` from the public path entirely — Prometheus scrapes the API container directly over the Docker network using the in-container port (already the pattern). Add:
  ```nginx
  location = /metrics { deny all; return 403; }
  ```
  Move postgres-exporter and redis-exporter ports off `0.0.0.0`.

### `nginx server_tokens` not disabled — version disclosure

- **Severity**: High (low impact, easy fix)
- **Location**: `infra/nginx/nginx.conf` (no `server_tokens off;`)
- **Description**: Default is `on`; nginx version (1.27) appears in error pages and `Server:` header. CVE matching becomes trivial.
- **Exploit**: Targeted CVE selection.
- **Fix**: Add `server_tokens off;` to the `http {}` block. Also consider `more_clear_headers Server;` (requires `headers-more` module) to remove the `Server: nginx` line entirely.

---

## Medium

### Dockerfile API image runs CMD via `sh -c` and has no `HEALTHCHECK` instruction

- **Severity**: Medium
- **Location**: `Dockerfile:74-84` (api stage), `Dockerfile:90-93` (scheduler), `Dockerfile:99-104` (tick_ingestor)
- **Description**: The compose-file healthchecks are correct (`docker-compose.yml:77-82`), but the *image* itself has no `HEALTHCHECK` directive, which means anyone running the image without compose (CI, manual `docker run`) gets no health signal. Less severe but worth noting: the API CMD shells out via `sh -c "exec gunicorn ..."`. The `exec` keeps PID 1 correct, but a stray quote in any of the env vars would break parsing.
- **Fix**: Add `HEALTHCHECK CMD curl -fsS http://localhost:8000/health || exit 1` to the api stage. (Curl isn't installed — use the same `python -c "import urllib.request..."` invocation as compose.) Same for tick_ingestor (`/metrics` endpoint).

### `apt-get install gcc libpq-dev` retained in the final image (build tooling leak)

- **Severity**: Medium
- **Location**: `Dockerfile:18-20` (python-base, inherited by api/scheduler/tick_ingestor/dollar_ingestor/binance_ingestor)
- **Description**: `gcc` and `libpq-dev` are installed in `python-base` so wheels can compile, but `python-base` is the runtime base for every Python service. `gcc` in a production container means:
  - Larger attack surface (a CVE in gcc/libgomp suddenly matters).
  - An attacker with code execution can compile arbitrary C code in-container (e.g., kernel exploit primitives, custom Postgres extensions).
  - Larger image, slower pulls.
- **Fix**: Use a builder/runtime split: install gcc + libpq-dev in a `python-builder` stage, `pip wheel` everything to `/wheels`, then in the runtime stage start from `python:3.11-slim` and only `pip install --no-index /wheels/*.whl` + `libpq5` (the runtime lib, not `-dev`). Halves the image and removes the compiler.

### `.env` not listed in `.gitignore` of the audit copy (template only)

- **Severity**: Medium
- **Location**: `.dockerignore:8-10` (correctly excludes `.env*` but allowlists `.env.template`); main `.gitignore` not provided in audit set
- **Description**: `.dockerignore` correctly keeps `.env` out of build context (good). But `.env.template:78-81` shows the deployment pattern reuses `MINIO_ROOT_PASSWORD` and `MINIO_SECRET_KEY` to the same value, and reuses `REDIS_PASSWORD` inside `REDIS_URL` — meaning a single weak password compromises multiple services. Templates also embed credentials inline in URLs (`postgresql://postgres:change-me-...@db:5432/tsetmc`), encouraging operators to keep them inline rather than splitting.
- **Fix**: Split URLs from passwords: `POSTGRES_PASSWORD` only, then construct `DATABASE_URL` in the entrypoint script. Force MinIO service-account creation post-bootstrap and never expose root keys to the API.

### Bind-mount `./data` writable and `./logs` writable from multiple services

- **Severity**: Medium
- **Location**: `docker-compose.yml:74-76, 132-134, 193-194, 501-502`
- **Description**: `./data` is mounted `rw` into `app` and `scheduler`, and as `:ro` into `db`. `./logs` is mounted `rw` into `app`, `scheduler`, `tick_ingestor`, `dollar_ingestor`. Multiple containers writing to a shared host path means:
  - A compromise in any container can write malicious files visible to the others (e.g., a poisoned scraper output read by the API).
  - Host filesystem leakage: anything the host puts in `./data` is readable by every container.
- **Fix**: Use named volumes for inter-container data, only bind-mount when host visibility is genuinely needed. Add `:ro` where the container only reads. Run an audit of what each service actually needs.

### CSP allows `'unsafe-inline'` for scripts and styles

- **Severity**: Medium (operators have explicitly flagged this — see TODO in nginx.conf)
- **Location**: `infra/nginx/nginx.conf:76-78`
- **Description**: `script-src 'self' 'unsafe-inline' https://telegram.org` defeats the main protection CSP provides (XSS mitigation). Any reflected/stored XSS becomes immediately exploitable. The inline TODO acknowledges this. `style-src 'self' 'unsafe-inline'` is less critical but still allows style-based exfil.
- **Fix**: Move inline scripts to nonced/hashed external files. Use `'strict-dynamic'` with a build-generated nonce per request. Vite supports CSP-friendly builds with `cspNonce`. Ship a CSP-report endpoint to monitor breakage before flipping enforcement.

### Sliding window allows 2× burst at window edges

- **Severity**: Medium
- **Location**: `api/rate_limit.py:107-114`
- **Description**: The "sliding window" implementation removes entries older than `now - window` and then counts the remainder — this is technically a sliding window, not a fixed bucket, so it doesn't actually have the 2× edge problem (good). However, the `pipe.zadd` happens **before** the limit check (after `zcard`), so the current request always counts toward the next. Acceptable behavior. The bigger concern: `auth` tier of 10/min/IP is low enough but the window is unauthenticated by IP — distributed brute-force across many IPs (cheap on residential botnets) is undetected. Add per-username throttling on `/auth/login` if not already done elsewhere.
- **Fix**: Add a username-keyed `auth:user:<email>` zone (5 attempts / 15 min) on top of the per-IP zone. Trip CAPTCHA after N failures. Out of scope for this audit (auth) — flagged for completeness.

### `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for` appends client-supplied header

- **Severity**: Medium
- **Location**: `infra/nginx/nginx.conf:117, 130`
- **Description**: `$proxy_add_x_forwarded_for` is "client-supplied XFF + comma + `$remote_addr`". The rate limiter at `api/rate_limit.py:34-37` takes the *first* comma-separated value (`split(",")[0]`). Combined with the trusted-proxy check, this is *correct* — nginx is the trusted peer, and it appends its own view of the client. But: if a misconfigured upstream LB ever fronts nginx and the LB doesn't strip XFF, an attacker can prepend an arbitrary first value and the rate limiter will key on it.
- **Exploit**: Behind a non-stripping LB, `X-Forwarded-For: 1.1.1.1, 2.2.2.2, ...` makes every request key on `1.1.1.1` — no, wait — the limiter takes the *first* value, so attacker-controlled. With one attacker rotating XFF values, rate limits don't apply.
- **Fix**: Use `proxy_set_header X-Forwarded-For $remote_addr;` (replace, don't append) when nginx is the public ingress. If a future LB is added, configure the LB to strip and rewrite XFF. Alternative: take the *last* trusted value in the chain by counting backwards from `len(chain) - 1 - trusted_proxy_count`.

### Gzip on for application/json — BREACH-class side channel

- **Severity**: Medium (theoretical for this app)
- **Location**: `infra/nginx/nginx.conf:35-52`, `api/main.py:193`
- **Description**: gzip is enabled for `application/json` and the FastAPI `GZipMiddleware` is also active. BREACH attacks require (a) reflected user input in the response, (b) a secret in the same response, (c) compression. The TSE Dashboard largely returns market data, but the `/api/chat` RAG endpoint returns user query echoes alongside potentially sensitive system prompts / RAG sources. Low likelihood, non-zero impact.
- **Fix**: Disable gzip on auth-bearing JSON responses (set `Content-Encoding: identity` middleware-side when the response includes user input + auth context). Or add per-request random padding (`Vary: ...; X-Padding: <random>`). For most read-only endpoints, leave gzip on.

### `/openapi.json`, `/docs`, `/redoc` exposed to the Internet

- **Severity**: Medium
- **Location**: `api/main.py:149-154` (no `docs_url=None`)
- **Description**: `FastAPI(...)` is constructed without `docs_url=None, redoc_url=None, openapi_url=None`. Anyone hitting `https://host/docs` gets the full interactive API explorer including the rate-limit-bypass-friendly admin endpoints. `openapi.json` discloses the full route inventory.
- **Exploit**: Recon — every endpoint signature, parameter, and auth requirement is documented for the attacker.
- **Fix**: Disable in production:
  ```python
  app = FastAPI(
      ...,
      docs_url="/docs" if SENTRY_ENVIRONMENT != "production" else None,
      redoc_url=None,
      openapi_url="/openapi.json" if SENTRY_ENVIRONMENT != "production" else None,
  )
  ```
  Or gate behind auth via a custom route.

---

## Low

### `node_modules` installed via `npm install` (not `npm ci`)

- **Severity**: Low
- **Location**: `Dockerfile:8`
- **Description**: `npm install` resolves the lockfile loosely; `npm ci` enforces exact lockfile match and is faster. Affects reproducibility of the frontend build.
- **Fix**: Replace with `RUN npm ci`.

### `gost:latest` floating tag

- **Severity**: Low
- **Location**: `docker-compose.yml:156` (`image: ginuerzh/gost:latest`), also `minio:latest` at `:320`
- **Description**: `:latest` makes the build non-reproducible and silently introduces upstream changes (including malicious ones if the registry account is compromised).
- **Fix**: Pin: `ginuerzh/gost:2.11.5` (or current), `minio/minio:RELEASE.2024-...`.

### Frontend Sentry DSN ships in client bundle

- **Severity**: Low (informational — Sentry DSNs are designed to be public)
- **Location**: `.env.template:143` (`VITE_SENTRY_DSN`)
- **Description**: `VITE_*` vars are baked into the client bundle. Sentry DSNs are intentionally public-safe (they accept events but can't read them). However, an attacker can flood your Sentry quota by submitting fake events to your DSN. Throttle inbound rate limits in the Sentry project settings.
- **Fix**: Configure Sentry inbound rate-limit and event filter; consider a Relay proxy if quota cost is a concern.

### `/health` endpoint may expose version info

- **Severity**: Low
- **Location**: `api/main.py:152` (`version="3.0.0"`)
- **Description**: Health checks often return version strings. The audit didn't read the health route handler, but if it returns the FastAPI version field, that's a minor info leak. CVE matching becomes easier.
- **Fix**: Health endpoint should return `{"status":"ok"}` only — no version, no git SHA, no build date in the public response.

### `redis-cli -a $PASSWORD` in healthcheck leaks via process listing

- **Severity**: Low
- **Location**: `docker-compose.yml:367`
- **Description**: `redis-cli -a "$REDIS_PASSWORD" ping` puts the password in `argv`, visible to any process inside the redis container via `ps`. Inside that container only the redis user runs, so impact is small, but `redis-cli` itself emits a stderr warning recommending `REDISCLI_AUTH` env var or `-a <password>` via stdin.
- **Fix**: Use `REDISCLI_AUTH` env var:
  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "REDISCLI_AUTH=$$REDIS_PASSWORD redis-cli ping"]
  ```

### `DEFAULT_STATISTICS_TARGET` and Postgres logging settings disclose query patterns

- **Severity**: Low
- **Location**: `infra/postgres/postgresql.conf:50-55`
- **Description**: `log_min_duration_statement = 500` will log any slow query (with bind values if `log_parameter_max_length_on_error` is non-zero). Slow-query logs contain sensitive parameters. `log_temp_files = 0` logs every temp file creation.
- **Fix**: Set `log_parameter_max_length = 0` to elide bind values, and `log_parameter_max_length_on_error = 0`. Ship logs to a controlled sink, not to the container stdout if it's tailed broadly.

---

## Info

### `.env` not present in audit tree

`.env.example` and `.env.template` are present and clearly placeholder-only (all values are literal `change-me-...` or empty). No live secrets were observed. The `.dockerignore` correctly excludes `.env`.

### Multi-stage Dockerfile is well-structured

Frontend build is isolated; the python-base layer is reused across api/scheduler/tick_ingestor/dollar_ingestor/binance_ingestor (good cache reuse). Non-root `appuser` is set on every runtime stage. `--no-install-recommends` and `rm -rf /var/lib/apt/lists/*` are correctly used.

### Trusted-proxy CIDR is sensible

`TRUSTED_PROXY_CIDR=172.16.0.0/12` covers the default Docker bridge networks (`172.17.0.0/16`, `172.18.0.0/16`, etc.) without being overly broad (RFC1918 private only, never matches a public peer). The middleware correctly rejects forwarded headers from non-trusted peers and falls back to TCP `peer.host`.

### Healthcheck strategy is good

Each service has a meaningful healthcheck with start_period and retries. Scheduler uses a heartbeat file (good for "is it actually doing work" rather than just "is the process alive").

---

## Network exposure matrix

Assuming default `docker-compose.yml` on a single-host deployment (no external LB, no firewall), the following table shows what is currently exposed to the public Internet vs. what should be:

| Service              | Host port      | Bind interface | Who should reach it                              | What currently reaches it                              | Status   |
|----------------------|----------------|----------------|--------------------------------------------------|--------------------------------------------------------|----------|
| nginx                | 80             | 0.0.0.0        | Public (Internet)                                | Public — correct                                       | OK       |
| nginx                | 443 (missing)  | —              | Public — TLS                                     | Not configured                                         | High     |
| app (FastAPI)        | 8000           | 0.0.0.0        | nginx only (Docker network)                      | Public — bypasses nginx rate-limit / CSP               | High     |
| db (Postgres)        | 5432           | 0.0.0.0        | app, scheduler, pgbouncer (Docker network)       | Public — full DB exposed                               | Critical |
| db-replica           | (none)         | —              | pgbouncer-replica (Docker network)               | Internal only — correct                                | OK       |
| pgbouncer            | 6432           | 0.0.0.0        | app, scheduler                                   | Public                                                 | High     |
| pgbouncer-replica    | 6433           | 0.0.0.0        | app (read queries)                               | Public                                                 | High     |
| redis                | 6379           | 0.0.0.0        | app, scheduler, ingestors                        | Public — AUTH only                                     | Critical |
| minio (S3 API)       | 9000           | 0.0.0.0        | app, scheduler                                   | Public — root creds                                    | Critical |
| minio (Console)      | 9001           | 0.0.0.0        | Operator (via VPN/SSH tunnel)                    | Public — root login                                    | Critical |
| postgres-exporter    | 9187           | 0.0.0.0        | prometheus only                                  | Public — no auth                                       | High     |
| redis-exporter       | 9121           | 0.0.0.0        | prometheus only                                  | Public — no auth                                       | High     |
| prometheus           | 9090           | 0.0.0.0        | Operator only                                    | Public — no auth, lifecycle enabled                    | Critical |
| grafana              | 3002           | 0.0.0.0        | Operator only                                    | Public — admin login                                   | Critical |
| tick_ingestor        | 9091           | 0.0.0.0        | prometheus only                                  | Public — metrics leak                                  | High     |
| gost (proxy bridge)  | (none)         | —              | scheduler, tick_ingestor (internal)              | Internal only — correct                                | OK       |
| dollar_ingestor      | (none)         | —              | (worker only)                                    | Internal only — correct                                | OK       |
| binance_ingestor     | (none)         | —              | (worker only)                                    | Internal only — correct                                | OK       |

**Recommended action**: 80% of these findings collapse to a single change — replace every `"PORT:PORT"` with `"127.0.0.1:PORT:PORT"` on every line except `nginx`. Then expose the *operator* services (Grafana, Prometheus, MinIO console) through nginx with auth + IP allow-list.

---

## Suggested remediation order

1. **Today**: Bind every non-nginx host port to `127.0.0.1` (one-line per service in `docker-compose.yml`). Removes 4 Critical and 5 High findings instantly.
2. **This week**: Add TLS (or front with Cloudflare/managed LB). Fix CORS to enumerate methods/headers and gate the Codespaces auto-add. Disable `/docs` + `/openapi.json` in production. Block `/metrics` at nginx.
3. **Pre-launch**: Move secrets to Docker secrets / file mounts. Split build/runtime Dockerfile stages to drop `gcc`. Tighten CSP. Add fail-closed auth-tier rate-limiting. Pin `:latest` images. Replace `npm install` with `npm ci`.
4. **Post-launch**: Move to a managed Postgres (RDS/Cloud SQL) with IAM-auth, a managed Redis, and managed object storage. Drop self-hosted Grafana for a hosted observability stack or put it behind an SSO-protected reverse proxy.
