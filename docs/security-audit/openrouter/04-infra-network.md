## Critical

### Public exposure of internal data/control plane services on all interfaces
- **Severity:** Critical
- **Location:** `docker-compose.yml:9, 30, 180, 246, 282, 314-315, 343, 377, 399, 415, 440, 540`
- **Description:** Multiple internal-only services are published to host ports without loopback binding, which means Docker will bind to `0.0.0.0` by default. This includes database (`db`), Redis, MinIO API/console, PgBouncer (primary/replica), exporters, Prometheus, Grafana, tick metrics, and the backend API itself.
- **Exploit:** An external attacker who can reach the host network can directly hit exposed infra services (DB, Redis, MinIO, observability endpoints), bypassing application-layer controls and significantly increasing attack surface (credential brute-force, data extraction, metadata leakage, service abuse).
- **Fix:** Default all non-public services to internal networking only (no `ports`), or bind strictly to loopback (e.g., `"127.0.0.1:5432:5432"`). Keep only `nginx` public. Put Prometheus/Grafana/exporters behind private network/VPN. Add host firewall rules as a second control.

---

## High

### Secrets stored in environment variables (inspectable at rest via container metadata)
- **Severity:** High
- **Location:** `docker-compose.yml` environment blocks across services, including `app`, `scheduler`, `db`, `redis`, `minio`, `dollar_ingestor`, `grafana`, exporters
- **Description:** Sensitive values are injected via env vars (e.g., `JWT_SECRET_KEY`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `MINIO_ROOT_PASSWORD`, `TELEGRAM_SESSION`, API keys). In Docker, env vars are retrievable via `docker inspect`, process environment, and often operational tooling/logging.
- **Exploit:** Any actor with Docker daemon access (or equivalent CI/CD/runtime access) can harvest long-lived credentials from container metadata and pivot into DB/object storage/external provider accounts.
- **Fix:** Move secrets to Docker secrets (or external secret manager: Vault, SOPS, cloud secret store). Mount as files with least privilege and short rotation intervals. Keep only non-sensitive config in env.

### Direct API publication bypasses reverse-proxy boundary
- **Severity:** High
- **Location:** `docker-compose.yml:29-30` (`app` publishes `8000`)
- **Description:** Backend API is publicly published in parallel with nginx. This undermines the intended reverse-proxy choke point and can bypass nginx-layer controls/headers/routing policy.
- **Exploit:** Attackers can target `:8000` directly, skipping nginx routing constraints and any future proxy-only protections (IP allowlists, WAF, mTLS, strict location controls).
- **Fix:** Remove `app` host port publication entirely; keep it only on the Docker network. Expose only nginx externally.

### Weak/guessable default admin usernames in production path
- **Severity:** High
- **Location:** `docker-compose.yml:50` (`MINIO_ACCESS_KEY` fallback), `docker-compose.yml:319` (`MINIO_ROOT_USER` fallback), `docker-compose.yml:442` (`GF_SECURITY_ADMIN_USER` fallback)
- **Description:** Compose uses predictable defaults (`minioadmin`, `admin`) for privileged usernames. Even with strong passwords, predictable principal names reduce entropy and aid automated attacks.
- **Exploit:** Internet-exposed admin interfaces (MinIO console, Grafana) can be brute-forced with well-known default usernames, improving attacker success rate.
- **Fix:** Remove insecure username fallbacks in production. Require explicit non-default admin usernames and enforce strong password policy + network restriction.

### Rate limiter fails open on Redis errors/outage
- **Severity:** High
- **Location:** `api/rate_limit.py:84-85, 117-119`
- **Description:** When Redis is unavailable or rate-limit operations error, middleware allows request flow (`return await call_next(request)`), effectively disabling throttling under failure.
- **Exploit:** An attacker can trigger/benefit from Redis instability and then flood auth/scraper/heavy endpoints with no effective API-level limit.
- **Fix:** Implement fail-closed (or degraded local token-bucket fallback) for sensitive tiers (`auth`, `scraper`). At minimum, apply strict in-process emergency limits when Redis is down.

---

## Medium

### Overly broad trusted proxy CIDR for forwarded-IP trust
- **Severity:** Medium
- **Location:** `config/settings.py:93`, `api/rate_limit.py:15-31`
- **Description:** `TRUSTED_PROXY_CIDR` defaults to `172.16.0.0/12`, trusting forwarded headers from a very broad private range. In multi-network/containerized environments, this can include non-nginx peers.
- **Exploit:** A compromised or rogue container within trusted CIDR can spoof `X-Forwarded-For`/`X-Real-IP` to evade per-IP limits or frame traffic as other clients.
- **Fix:** Narrow to exact proxy subnet(s) or static nginx container IP range. Prefer explicit `set_real_ip_from`/`real_ip_header` chain at nginx and pass sanitized client IP downstream.

### Unauthenticated operational endpoint exposure via nginx
- **Severity:** Medium
- **Location:** `infra/nginx/nginx.conf:123-127` (`location /cache/`), `infra/nginx/nginx.conf:115-121` (`/health`)
- **Description:** `/cache/` and `/health` are reachable without auth and outside rate-limit blocks. Operational endpoints are commonly abused for reconnaissance and load amplification.
- **Exploit:** Attackers can poll operational endpoints for system behavior, cache state hints, and service liveness; high-frequency requests may still consume backend resources.
- **Fix:** Restrict with auth/IP allowlist, or make internal-only. Add rate limiting for non-user operational endpoints exposed publicly.

### Missing hardening in nginx container runtime user context
- **Severity:** Medium
- **Location:** `Dockerfile:94-101` (nginx stage)
- **Description:** nginx image runs with default user context (typically root master process). Other app images correctly drop privileges to `appuser`; nginx stage does not.
- **Exploit:** A successful nginx/container breakout primitive has higher impact under root context than under unprivileged runtime.
- **Fix:** Run nginx as non-root where feasible (`USER` + unprivileged port mapping, or hardened base image), with read-only FS and dropped capabilities in compose.

### Healthcheck coverage gaps for long-running services
- **Severity:** Medium
- **Location:** `docker-compose.yml` (`nginx`, `gost`, `dollar_ingestor` services lack `healthcheck`)
- **Description:** Critical edge/proxy and ingestion components are missing healthchecks, reducing ability to detect degraded states and increasing fail-open operational risk.
- **Exploit:** Service hangs or partial failures can persist unnoticed, causing routing instability or stale ingestion while containers remain “running.”
- **Fix:** Add robust HTTP/TCP/file heartbeat healthchecks for `nginx`, `gost`, and `dollar_ingestor`; wire dependent services to health conditions where applicable.

---

## Low

### `server_tokens` not explicitly disabled in nginx
- **Severity:** Low
- **Location:** `infra/nginx/nginx.conf` (http/server block; directive absent)
- **Description:** nginx version tokens are not explicitly suppressed, potentially leaking server fingerprint details.
- **Exploit:** Fingerprinting helps attackers tailor exploit attempts to known nginx/CVE version families.
- **Fix:** Add `server_tokens off;` in `http` block.

### CORS safety depends entirely on environment hygiene (no guardrail against wildcard + credentials)
- **Severity:** Low
- **Location:** `api/main.py:191-197`, `config/settings.py:100-102`
- **Description:** `allow_credentials=True` is set with env-driven origins. Current defaults are explicit localhost origins, but there is no startup validation preventing insecure wildcard origin policy in production config.
- **Exploit:** Misconfigured `CORS_ORIGINS` in deployment could unintentionally permit credentialed cross-origin requests from untrusted origins.
- **Fix:** Enforce config validation at startup: reject `*` when credentials are enabled; require explicit origin allowlist in non-dev environments.

---

## Info

### HSTS header is set at nginx but TLS termination posture is not shown in scope
- **Severity:** Info
- **Location:** `infra/nginx/nginx.conf:63`
- **Description:** `Strict-Transport-Security` is set, which is good only when HTTPS is consistently enforced at the client-facing edge. Current nginx listens on port 80 in provided config.
- **Exploit:** If deployment serves plain HTTP directly, HSTS effectiveness is limited and can create false confidence.
- **Fix:** Ensure TLS termination is always-on at public edge and redirects HTTP→HTTPS before relying on HSTS policy.

---

## Verified-OK

- `Dockerfile` does **not** copy `.env` into images (no `COPY .env` observed).
- App/scheduler/ingestor Python runtime stages run as non-root `appuser` (`Dockerfile:57, 73, 85, 95`).
- No `privileged: true` or `cap_add` found in `docker-compose.yml`.
- Reverse-proxy security headers are largely present (XFO, XCTO, Referrer-Policy, CSP, Permissions-Policy) in `infra/nginx/nginx.conf:58-66`.
- nginx request throttling exists for `/api/` and stricter limits for `/api/scraper/` (`infra/nginx/nginx.conf:44-45, 89-111`).
- API rate limiter correctly avoids trusting forwarded headers unless peer IP is in trusted CIDR (`api/rate_limit.py:18-31`).
- CORS is configured with explicit default origins (localhost dev origins), not wildcard by default (`config/settings.py:100-102`).
- `JWT_SECRET_KEY` and MinIO key presence are enforced at startup (`config/settings.py:124-129, 181-186`).

## Network exposure matrix

| Service | Host port | Bind interface | Who-should-reach | What-currently-reaches |
|---|---:|---|---|---|
| nginx | `${NGINX_HTTP_PORT:-80}` | `0.0.0.0` (default) | Public users | Public internet/host-reachable clients |
| app | `${API_PORT:-8000}` | `0.0.0.0` | Internal (via nginx only) | Public internet/host-reachable clients |
| tick_ingestor | `${TICK_METRICS_PORT:-9091}` | `0.0.0.0` | Internal monitoring only | Public internet/host-reachable clients |
| db (PostgreSQL) | `${POSTGRES_PORT:-5432}` | `0.0.0.0` | Internal app/ops only | Public internet/host-reachable clients |
| pgbouncer | `6432` | `0.0.0.0` | Internal app/ops only | Public internet/host-reachable clients |
| minio API | `${MINIO_API_PORT:-9000}` | `0.0.0.0` | Internal app/ops only | Public internet/host-reachable clients |
| minio console | `${MINIO_CONSOLE_PORT:-9001}` | `0.0.0.0` | Admin/VPN only | Public internet/host-reachable clients |
| redis | `${REDIS_PORT:-6379}` | `0.0.0.0` | Internal app only | Public internet/host-reachable clients |
| postgres-exporter | `9187` | `0.0.0.0` | Prometheus only | Public internet/host-reachable clients |
| redis-exporter | `9121` | `0.0.0.0` | Prometheus only | Public internet/host-reachable clients |
| prometheus | `${PROMETHEUS_PORT:-9090}` | `0.0.0.0` | Admin/VPN only | Public internet/host-reachable clients |
| grafana | `${GRAFANA_PORT:-3002}` | `0.0.0.0` | Admin/VPN only | Public internet/host-reachable clients |
| pgbouncer-replica | `6433` | `0.0.0.0` | Internal app/ops only | Public internet/host-reachable clients |

## Audit caveats

- Only the provided files were reviewed. Additional deployment controls (cloud firewall/security groups, reverse proxy at edge, Kubernetes manifests, compose overrides, `.env` content, and secret manager integration) were not provided and may materially change risk.
- `infra/postgres/pg_hba.conf`, `infra/prometheus/prometheus.yml`, and external ingress/TLS configuration were not included; conclusions about authn/authz and scrape exposure are based on visible compose/nginx settings only.
- Line references are based on the supplied artifact text and may shift if files changed after extraction.