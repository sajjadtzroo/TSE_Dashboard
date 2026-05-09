# Audit 03 — Input Validation & Injection Surface (FastAPI Backend)

## Executive Summary

The TSE Dashboard backend is generally disciplined: SQLAlchemy ORM is used pervasively, the few raw `text()` queries bind parameters correctly, the `/api/scraper/run/{spider_name}` endpoint is gated by a `Literal` enum and admin role, and the most obvious foot-guns (shell=True, pickle, yaml.load, lxml on user input) are absent. Pydantic schemas use tight `Field` constraints (max_length, ge/le, regex patterns) on most authenticated endpoints.

That said, a small number of issues are **shippable risks**: a server-side request forgery (SSRF) endpoint with a TOCTOU-bypassable allow-list, two file-upload endpoints that trust the client-supplied `Content-Type` header without magic-byte verification or compression-bomb defense, a JSONB containment filter built with f-string interpolation, and a request-id reflection that lets a caller plant arbitrary strings into both response headers and the JSON error envelope. None are catastrophic, but every one of them should be fixed before going to production.

---

## Findings

### Critical

*(None — see High for the closest items.)*

---

### High

### H1. SSRF in `/api/loans/import/web` — TOCTOU bypass + redirect-follow + no port/scheme allow-list

- **Severity:** High
- **Location:** `api/services_import.py:208-292` (called from `api/routes/import_loans.py:70-93`)
- **Description:**
  The endpoint takes a list of arbitrary URLs from any `trader`-role user and fetches them server-side. The current SSRF defense:
  1. Rejects non-`http(s)` schemes.
  2. Resolves the hostname via `socket.getaddrinfo` and rejects the result if the IP is private/loopback/reserved/link-local.
  3. Then calls `httpx.get(url, timeout=30, follow_redirects=True)`.

  The defense is bypassable in three ways:
  - **DNS rebinding / TOCTOU:** the DNS lookup and the subsequent `httpx.get` are independent. An attacker-controlled DNS name can return a public IP for the validation lookup and a private IP (e.g., `169.254.169.254`, `127.0.0.1`, `10.0.0.0/8`) for the `httpx` lookup that happens microseconds later.
  - **`follow_redirects=True`:** the validated URL can 30x-redirect to `http://169.254.169.254/latest/meta-data/` (AWS IMDS), `http://metadata.google.internal/`, `http://localhost:6379/` (Redis), or `http://pgbouncer:6432/`. The redirect target is never re-validated against the IP allow-list.
  - **No port restriction:** scheme/IP are checked but ports `:6379`, `:5432`, `:6432`, `:9200`, `:11434` are all permitted. Combined with internal Docker DNS (`http://redis:6379/`, `http://db:5432/`) — though IP filter blocks private IPs *if resolved*, container DNS can resolve to a routable IP inside the compose network on some setups.
  - **Carbon-copy IPv6 issue:** `socket.getaddrinfo` returns *all* address families; the code iterates and rejects on any private match, but `ipaddress.ip_address(sockaddr[0])` expects a string — for IPv6 records `sockaddr` is a 4-tuple, so `sockaddr[0]` is the IP, but IPv6 mapped addresses (`::ffff:127.0.0.1`) and unique-local (`fc00::/7`) reachability via `is_private` works for the explicit IPv6 forms but not for IPv6-translated names.
- **Exploit (DNS rebinding / TOCTOU):**
  ```bash
  # Run an authoritative DNS server that returns 8.8.8.8 the first time
  # and 169.254.169.254 the second time. Then:
  curl -X POST https://api.example/api/loans/import/web \
       -H "Authorization: Bearer $TRADER_TOKEN" \
       -d '{"urls":["http://rebind.attacker.tld/"]}'
  # Server validates 8.8.8.8 → public, then httpx fetches 169.254.169.254
  # → AWS IMDS credentials returned in `data.text`.
  ```
- **Exploit (redirect):**
  ```bash
  # attacker.tld returns 302 → http://localhost:6379/INFO
  curl -X POST .../api/loans/import/web -d '{"urls":["http://attacker.tld/r"]}'
  ```
- **Fix:**
  1. Use a custom `httpx.HTTPTransport` that validates the resolved IP on **every** connect (including redirect hops) — or pre-resolve the hostname yourself, pin the IP into the connection, and pass it via `transport`.
  2. Set `follow_redirects=False`. If redirects are needed, inspect each `Location` header manually and re-run the IP validation.
  3. Restrict to ports `80, 443` only.
  4. Reject IPv6 mapped/unique-local explicitly: `ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local or ip.is_multicast or (ip.version == 6 and ipaddress.ip_address(ip.ipv4_mapped or ip).is_private)`.
  5. Cap the response body size (use `httpx.stream` with byte counter — current `resp.text` reads the whole body and only trims afterwards, allowing DoS via 10 GB response).
  6. Consider requiring `admin` role rather than `trader`, given the scrape capability is a privileged operation.

---

### H2. RAG document upload trusts client-supplied `Content-Type` — no magic-byte / structural check, decompression-bomb exposure

- **Severity:** High
- **Location:** `api/routes/rag.py:362-486` (`/api/rag/upload`)
- **Description:**
  `file.content_type` is read directly from the multipart part header, which is fully attacker-controlled. The check `if not file.content_type or file.content_type not in ALLOWED_MIME_TYPES` only verifies the *string the client claimed*, not the file. An attacker can upload arbitrary binary content with `Content-Type: application/pdf`. Downstream, `process_single_document(session, doc_id)` runs the PDF/DOCX through `rag/extractor.py` and OCR — neither of which is hardened against:
  - **PDF compression bombs** (`/JBIG2Decode`, deeply nested object streams, encrypted PDFs that hang qpdf).
  - **DOCX zip-bombs** (`document.xml` decompresses 10⁹ bytes from a 50 KB upload — DOCX is just a zip, and Python's `zipfile`/`lxml` will happily expand it).
  - **PDF with embedded JavaScript / XFA** that some downstream tools render.

  The 50 MB byte-stream cap is good, but it's a *compressed* cap. Same issue in `api/services_import.py:save_upload` (10 MB raw cap, but no extension/MIME cross-check beyond the same trust-the-client `content_type`).
- **Exploit:**
  ```bash
  curl -X POST .../api/rag/upload \
       -H "Authorization: Bearer $ADMIN" \
       -F 'file=@bomb.docx;type=application/pdf' \
       -F 'doc_category=codal'
  # Worker thread expands document.xml from 30 KB → 4 GB → OOM kill.
  ```
- **Fix:**
  - Use `python-magic` (libmagic) to verify the magic bytes match the declared MIME type.
  - For DOCX, validate it's a ZIP and pre-flight by walking the central directory: reject if any single member's *uncompressed size* > 50 MB or if the ratio compressed:uncompressed > 100:1.
  - For PDF, run a structural validator (`pdfplumber.open` with a page count cap) before queuing.
  - Move processing off the API process so a hostile document can't OOM the request handler.

---

### H3. Cache key built from raw user input + Pydantic-loose float keys → cross-user cache collision / poisoning

- **Severity:** High
- **Location:** `api/cache_decorators.py:43-50` and `api/cache.py:94-99` (used by 30+ endpoints).
- **Description:**
  `@cached()` builds the params hash from *every* keyword argument that isn't `db` or doesn't have an `execute` attribute. The hash is `md5(json.dumps(filtered, default=str, sort_keys=True))[:12]` — 12 hex chars = 48 bits, fine in normal use, but the **filter dropping `None` values** plus the **lack of user-id/auth-tier in the key** means:

  1. `/api/rag/search` *does* manually fold `user_id` into its hash (good — see `api/routes/rag.py:75`), but the generic `@cached()` decorator does **not**. Any `@cached`-decorated route that ever changes its response based on auth will leak data across users via Redis.
  2. Currently no `@cached` route is user-personalized, so this is latent — but it's a footgun: the next engineer who adds a "show only my watchlist" endpoint and slaps `@cached` on it will leak watchlists between users.
  3. The `default=str` JSON serializer on `cache_manager.hash_params` means objects that look the same after `str()` collide. e.g. `Decimal("1.0")` and `1.0` produce different hashes (good), but a Pydantic model and a dict with the same `__str__` could collide (less likely in practice, but worth noting).
  4. **Untruncated user input is hashed but not bound:** because the key is `cache:{module}:{endpoint}:{12hex}`, an attacker who knows the module/endpoint and can make 2⁴⁸ requests (impractical) could birthday-collide. More realistic concern: anyone who can write to Redis directly (e.g., a compromised scheduler container) can poison any cache entry, and downstream `JSONResponse` serves the poisoned content directly with no integrity check — though this is a Redis-trust issue, not strictly user input.
- **Exploit (latent):** add a `user`-scoped endpoint with `@cached` and forget to include `user_id` in the cache key — every user gets the first user's response.
- **Fix:**
  - In `cache_decorators.py`, automatically inject `user_id` from a `_user`-named kwarg into the params hash *or* require an explicit `vary_by` argument on the decorator.
  - Document the constraint clearly: "`@cached` MUST NOT be applied to user-scoped endpoints unless `vary_by=('user_id',)`".
  - Switch to a 16+ byte hash (`sha256[:32]`) — md5 is fine for a cache key but the truncation to 48 bits is the weak link.

---

### H4. JSONB containment filter built with f-string in `/api/news?symbol=…`

- **Severity:** High
- **Location:** `api/routes/news.py:60-64`
  ```python
  query = query.filter(
      NewsArticle.related_symbols.op("@>")(f'["{symbol}"]')
  )
  ```
- **Description:**
  The query parameter `symbol` is interpolated into a JSON literal string with a single, naive `"…"` wrap and no escaping. While the value is then bound as a parameter (so this isn't textbook SQL injection), the `@>` containment operator parses the string as JSON, which means:
  1. A `symbol` like `\","\` produces `["\","\"]` — invalid JSON, raises a 500 (DoS through `@handle_api_errors` returning 500).
  2. A `symbol` of `","extra":"x` produces `["","extra":"x"]` — also invalid JSON → 500.
  3. More interesting: a `symbol` like `BTC"]` makes the filter collapse to checking containment of `["BTC"]"]` — JSON parse error, 500. There's no Pydantic constraint on `symbol` at this endpoint (no `Field(pattern=...)`).

  This is not classic SQLi (params are still bound) but it's an injection into a JSON-typed column-comparison — and it converts every news fetch with a hostile symbol into a 500. A real exploit could come if PostgreSQL's JSON parser ever differs from CPython's.
- **Exploit:**
  ```
  GET /api/news?symbol=%22%5D --> 500
  ```
- **Fix:**
  ```python
  import json
  query = query.filter(
      NewsArticle.related_symbols.op("@>")(json.dumps([symbol]))
  )
  ```
  And add `symbol: str | None = Query(None, max_length=30, pattern=r"^[A-Za-z0-9_\-\.]+$")`.

---

### H5. `Header / Body reflection` of attacker-supplied `X-Request-ID`

- **Severity:** High (CRLF risk) / Medium (in modern Starlette)
- **Location:** `api/monitoring.py:38-43`, `api/utils.py:51-56`, `api/main.py:158-177`
- **Description:**
  `RequestIDMiddleware` accepts `X-Request-ID` from the client headers (no length cap, no pattern), stuffs it into `request.state.request_id`, then echoes it back into the response `X-Request-ID` header **and** into every error JSON body via `build_error_response(...)`. Starlette's MutableHeaders sanitizes obvious CRLF, but the body reflection bypasses that — anyone calling the API can pin arbitrary strings into error responses (log-pollution, social-engineering, XSS-via-error-page if a frontend renders `error.request_id` unescaped).

  Additionally, by setting `X-Request-ID: <victim-tag>` an attacker can correlate their requests with another user's logs (impacts log-based attribution, supports session-fixation against tracing tools).
- **Exploit:**
  ```bash
  curl -H 'X-Request-ID: <script>alert(1)</script>' .../api/missing
  # Response body:
  # {"error":{"code":404,...,"request_id":"<script>alert(1)</script>"}}
  ```
- **Fix:**
  ```python
  raw = request.headers.get("X-Request-ID", "")
  if raw and re.fullmatch(r"[A-Za-z0-9\-]{1,64}", raw):
      request_id = raw
  else:
      request_id = uuid.uuid4().hex[:16]
  ```

---

### Medium

### M1. `/api/loans/import/web` accepts raw `body: dict` instead of typed schema

- **Severity:** Medium
- **Location:** `api/routes/import_loans.py:70-93`
- **Description:**
  Even though `WebScrapingRequest` exists in `api/schemas_loans.py`, the handler is declared `body: dict` and pulls `urls`, `deepScrape`, `bankId` by `body.get(...)`. This bypasses Pydantic — there is no max-length on individual URL strings (we only cap the list at 20), no validation that `urls[i]` is a string, no rejection of nested objects masquerading as URLs. This compounds the SSRF surface (H1).
- **Fix:** declare `body: WebScrapingRequest`. Tighten that schema:
  ```python
  class WebScrapingRequest(BaseModel):
      urls: list[HttpUrl] = Field(min_length=1, max_length=20)
      bankId: str | None = Field(default=None, max_length=50)
      deepScrape: bool = False
  ```

---

### M2. Risk-profile / portfolio endpoints accept untyped `dict` fields

- **Severity:** Medium
- **Location:**
  - `api/routes/risk_profile.py:25` — `answers: dict`
  - `api/routes/risk_profile.py:36-37` — `target_allocation: dict`, `risk_constraints: dict | None`
  - `api/schemas_loans.py:62-64` — `LoanBankDetail.scoring_system/digital_branch/extra_bank_data: dict | None` (response-only, lower risk)
- **Description:**
  Open `dict` accepts any depth of nesting. FastAPI relies on Starlette's default request size cap (typically generous — depends on uvicorn / nginx config). Deeply nested dicts (`{"a":{"a":{...}}}` × 10⁵) cause Pydantic / JSON to spend O(depth) on validation; combined with the absence of explicit recursion-depth or item-count caps, this is a small but real DoS path on authenticated `trader+` endpoints.

  Also: `answers: dict` is then **persisted as JSONB** (`UserRiskProfile.answers`), so any structure the client sends ends up in the DB unfiltered.
- **Fix:** define a typed schema (`dict[str, int]`-keyed with bounded keys/values), or wrap with a validator that enforces max depth/keys.

---

### M3. Upload filename used in MinIO key/object path; only basic regex sanitization

- **Severity:** Medium
- **Location:** `api/services_storage.py:49-58`, `api/routes/rag.py:393-444`
- **Description:**
  - `safe_name = Path(file.filename).name` strips path components but preserves bytes like `\0`, control characters that some downstream tools (S3 SDKs, MinIO, antivirus scanners) treat oddly. The follow-up `dest.resolve().is_relative_to(upload_dir.resolve())` *does* defend against traversal — that's good — but the same sanitization isn't applied before the MinIO `upload_key()` call, which only goes through `_safe()` on the filename, and inserts the raw `doc_id` (a UUID4 string here, fine).
  - `upload_source_url = f"upload://{file.filename}"` stores the *raw* untrimmed filename in `PDFDocument.source_url`. Anything reading that column and treating it as a URL (e.g., a UI link) gets attacker-controlled content with a custom scheme.
- **Fix:**
  - Strip C0 control characters (`re.sub(r"[\x00-\x1f\x7f]", "_", name)`) on every filename before persistence/use.
  - Store `f"upload://{safe_name}"` (already-sanitized form) instead of the raw filename.

---

### M4. `CORS_ORIGINS_LIST` + `allow_credentials=True` + `allow_methods=["*"]`

- **Severity:** Medium (config-dependent)
- **Location:** `api/main.py:196-203`
- **Description:**
  CORS is configured with `allow_origins=CORS_ORIGINS_LIST` (good — assumes that's a strict list), but `allow_credentials=True` combined with `allow_methods=["*"]` and `allow_headers=["*"]` means **any** origin in that list can perform any state-changing request with the user's cookies/Bearer token. If `CORS_ORIGINS_LIST` ever includes a wildcard, a `*.example.com`, or a development URL that's accidentally left in production, every authenticated endpoint is reachable via cross-origin CSRF.
  Worth confirming `config/settings.py` parses `CORS_ORIGINS_LIST` strictly and rejects `*`. Out of scope for full review (auth agent), but flag.
- **Fix:** ensure the deployed `CORS_ORIGINS_LIST` is an explicit, exhaustive list. Pin `allow_methods` to the actual set (`["GET","POST","PUT","PATCH","DELETE"]`) and `allow_headers` to required headers only.

---

### M5. `/api/scraper/run/{spider_name}` — admin-only, but no audit log of who triggered what

- **Severity:** Medium (defense-in-depth)
- **Location:** `api/routes/scraper.py:31-43`
- **Description:**
  The `SpiderName` Literal restricts the value, the `subprocess.run([..., spider, ...])` invocation is a list (no shell), and admin role is required — this is **not** a command-injection vector. However:
  - The print on failure (`print(f"Spider {spider} failed: {e}")`) goes to stdout, not the structured logger — this loses the structured user/spider-name correlation.
  - There is no record of *which admin* triggered which spider — no audit trail.
- **Fix:** replace `print(...)` with `logger.error("Spider failed", extra={"spider": spider, "error": str(e)})` and add `logger.info("Scraper triggered", extra={"user_id": user.id, "spider": spider_name})` in `run_scraper`.

---

### M6. WebSocket endpoints don't validate query params for log injection

- **Severity:** Medium
- **Location:** `api/routes/voice.py:105`
  ```python
  logger.info(f"Voice call started: user={username}, model={model}, voice={voice}")
  ```
- **Description:**
  `model` is validated against `model_ids`. `voice` is *not* validated — `Query(default="")` accepts arbitrary strings. While the JSON formatter from `python-json-logger` will JSON-escape the string (so CRLF can't fake new log lines), the value is still attacker-controlled and ends up in observability tooling unfiltered. The same applies to `_log_prefix` in `ConnectionManager` (set in code, not user input — fine).
- **Fix:** validate `voice` against `available_voices` for the chosen model before opening the session; reject and close 4002 otherwise.

---

### Low

### L1. `/api/scheduler/status` reads `scheduler:status` from Redis with `json.loads` — trusts whatever's in Redis

- **Severity:** Low
- **Location:** `api/routes/scraper.py:68-81`
- **Description:** Redis is in the trusted network, so this is a defense-in-depth note: `r.get("scheduler:status")` returns bytes that are `json.loads`-ed and returned directly. If Redis is ever exposed (or compromised), an attacker can inject arbitrary JSON that's served back to clients. No deserialization risk (json.loads doesn't execute code) but worth noting.
- **Fix:** wrap the JSON return through a Pydantic model so it's at least shape-validated.

---

### L2. `/api/codal/financials/{announcement_id}/raw` — gzip file served with `Content-Encoding: gzip`

- **Severity:** Low
- **Location:** `api/routes/tools.py:159-185`
- **Description:** `is_relative_to(DATA_DIR.resolve())` correctly defends against path traversal. The file is served with `Content-Encoding: gzip`, which means the browser auto-decompresses. If the on-disk gzipped HTML was ever influenced by user input (it's currently spider-written, so no), a decompression bomb would blow up the *client*. Lower-priority because the file source is internal and bounded.
- **Fix (defense-in-depth):** verify file size on disk before serving (`if file_path.stat().st_size > 10*1024*1024: raise 413`).

---

### L3. `_resolve_security` raises 404 with reflected `symbol` value

- **Severity:** Low
- **Location:** `api/routes/ticks.py:42-53`, `api/helpers.py:63-85`
  ```python
  raise HTTPException(status_code=404, detail=f"Symbol '{symbol}' not found")
  ```
- **Description:** `symbol` already passes `validate_symbol` (allow-list regex), so this is fine in practice; just noting that the pattern of reflecting user-supplied values into error messages is everywhere. If the validation regex is ever loosened, errors become an XSS reflection vector for clients that render `detail` unescaped.
- **Fix:** keep `validate_symbol` strict; never reflect raw input in 4xx detail strings.

---

### L4. `/api/loans/import/list?import_type=...` — silently ignores invalid filter

- **Severity:** Low (UX/log-pollution)
- **Location:** `api/services_import.py:323-348`
- **Description:**
  ```python
  try:
      it = ImportType(import_type)
      query = query.filter(LoanImport.import_type == it)
  except ValueError:
      pass  # Ignore invalid filter
  ```
  Silently dropping a filter to "show me everything" is surprising. Not a security risk on its own but it can mask a misconfigured client. Recommend `raise HTTPException(400, ...)`.

---

### L5. `BackgroundTasks` runs untrusted-context work in the API process

- **Severity:** Low
- **Location:** `api/routes/rag.py:480` (`background_tasks.add_task(_process, result["id"])`), `api/routes/scraper.py:38, 60`
- **Description:** Long-running RAG processing and spider invocations run inside the API worker via `BackgroundTasks`, blocking the worker's event-loop slot while the in-process pipeline (PDF extraction, embedding, etc.) runs. A malicious upload that consumes lots of CPU/memory can starve the worker. Move to a real queue (Celery/RQ/Arq) — already partially done via the scheduler; just make uploads enqueue rather than run inline.
- **Fix:** use the scheduler queue for `_process` and `_run_spider_task`.

---

### Info

### I1. ✅ No `subprocess(..., shell=True)`, no `os.system`, no `os.popen` in the audited code paths — good.

### I2. ✅ No `pickle.load(s)`, no `yaml.load` (default loader), no `marshal` — good.

### I3. ✅ No `lxml.etree` parsing of user input. The single HTML parsing path uses `BeautifulSoup(text, "html.parser")` (`api/services_import.py:263`) which is XXE-safe (Python's stdlib parser doesn't resolve entities). However, that response is fetched from an attacker-supplied URL (see H1) — XXE there would be moot vs. the SSRF.

### I4. ✅ Random tokens use `secrets.token_hex` (auth.py:269,274). No `random.random()` for security purposes.

### I5. ✅ `subprocess.run(..., text=True, capture_output=True)` everywhere (scheduler/jobs.py, scraper.py). All argv lists, all values come from internal config or `Literal`-validated enums.

### I6. ✅ Path-traversal defenses are present and consistent: `is_relative_to` checks in `main.py:287-296` (SPA fallback), `tools.py:171-173` (Codal raw), `rag.py:445-447` (uploads), `financial_modeling.py:25` (downloads).

### I7. ✅ Pydantic schemas use bounded `Field(max_length=...)` on most user-supplied strings. No `extra="allow"` anywhere.

### I8. RAG / LLM prompt-injection surface: the `model` field in `ChatRequest` (`api/schemas.py:647`) is forwarded to the LLM client. **Out of scope** for this audit — flagged for the LLM-prompt-injection auditor. Same for `req.message`, `req.symbol`, and chat history — all flow into the agent loop.

### I9. RequestIDMiddleware UUID truncated to 8 chars (32 bits) — fine for log correlation, weak as a security identifier. Not a finding because it's not used as one.

---

## Routes Inventory

Auth tier reflects the dependency on the route. "Public" = no auth. `viewer/trader/admin` per `ROLE_HIERARCHY` in `api/auth.py:27`.

| Route | Method | Auth | Input shape | Validation | Notes |
|---|---|---|---|---|---|
| `/health`, `/health/deep` | GET | public | — | n/a | health.py |
| `/cache/stats` | GET | public | — | n/a | health.py — leaks Redis stats publicly |
| `/api/auth/register` | POST | public | RegisterRequest | tight (regex username, length email/pw) | log-pollution caveat (M5) |
| `/api/auth/login` | POST | public | LoginRequest | tight | rate-limited via `auth` tier |
| `/api/auth/refresh` | POST | public | RefreshRequest | typed | auth-adjacent, out of scope |
| `/api/auth/me` (PATCH) | GET/PATCH | viewer | PasswordChangeRequest | tight | |
| `/api/auth/telegram` | POST | public | TelegramAuthRequest | HMAC-verified | auth-adjacent |
| `/api/companies` | GET | public | sector/type/market_type/page/per_page | partial (page/per_page bounded; sector/type free strings, ORM-bound) | safe |
| `/api/sectors` | GET | public | — | n/a | safe |
| `/api/market-overview` | GET | public | sector, limit | bounded | safe |
| `/api/client-type` | GET | public | sector, limit | bounded | safe |
| `/api/stats` | GET | public | — | n/a | safe |
| `/api/market/indices` | GET | public | date | typed | safe |
| `/api/market/indices/{name}/history` | GET | public | name path, days | days bounded; name has `_INDEX_ALIASES` but free-string fallback (ORM-bound) | safe |
| `/api/market/etf-nav` | GET | public | symbol, fund_type, date | typed/bounded | safe |
| `/api/market/etf-nav/{symbol}/history` | GET | public | symbol, days | days bounded; symbol via `validate_symbol` | safe |
| `/api/market/prices` | GET | public | market_type, date | typed | safe |
| `/api/dollar/latest`, `/api/dollar/history` | GET | public | days | bounded | safe |
| `/api/gold/latest`, `/api/gold/history` | GET | public | symbol (whitelist) | strict | safe |
| `/api/stocks/{symbol}` (+ /history /orderbook /shareholders /tick-trades) | GET | public | symbol, days, limit, date | symbol via validate_symbol; bounds on numbers | safe |
| `/api/options`, `/api/options/chain`, `/api/options/underlyings` | GET | public | underlying, option_type, expiry_date | ORM-bound | safe |
| `/api/ime/...` | GET | public | various | typed | safe |
| `/api/codal` | GET | public | symbol, category, search, dates, page | search free string but ILIKE param-bound | safe |
| `/api/codal/symbols` | GET | public | — | — | safe |
| `/api/codal/financials` | GET | public | various | typed | safe |
| `/api/codal/financials/{announcement_id}/raw` | GET | public | int id | typed; path-traversal defended | L2 |
| `/api/codal/{announcement_id}/download/{file_type}` | GET | public | id, file_type, expires | file_type whitelist; expires bounded | safe |
| `/api/ticks/snapshot`, `/api/ticks/{symbol}` (+ /ohlcv) | GET | public | symbol, limit, trade_date, interval, days | parameterized SQL; interval regex-pattern | safe |
| `/ws/ticks` | WS | viewer (JWT via query) | — | token validated | safe |
| `/ws/market` | WS | viewer (JWT) | — | token validated | safe |
| `/ws/crypto` | WS | public | — | none | broadcast only |
| `/ws/voice` | WS | viewer (JWT) | model, voice query | model whitelist; voice not validated (M6) | M6 |
| `/api/voice/models` | GET | public | — | — | safe |
| `/api/events/market` | GET (SSE) | viewer | — | — | safe |
| `/api/rag/search` | POST | viewer | RAGSearchRequest | tight (max_length on query/symbol) | safe |
| `/api/rag/chat` | POST | viewer | RAGChatRequest | tight | I8 (RAG/prompt) |
| `/api/rag/financial-analysis` | POST | viewer | _FinancialAnalysisRequest | symbol/statement_type/format/language all bound | I8 |
| `/api/rag/ratio-explain` | POST | viewer | _RatioExplainRequest | typed | I8 |
| `/api/rag/status` | GET | public | — | — | safe |
| `/api/rag/process` | POST | admin | — | — | safe |
| `/api/rag/upload` | POST | admin | UploadFile + form fields | content_type checked against allow-list **string only**; size streamed | **H2** |
| `/api/rag/documents` | GET | admin | skip, limit, doc_category | bounded | safe |
| `/api/rag/documents/{doc_id}` | DELETE | admin | int id | typed | safe |
| `/api/rag/documents/{doc_id}/download` | GET | viewer | id, expires | bounded | safe |
| `/api/chat/models` | GET | public | — | — | safe |
| `/api/chat`, `/api/chat/stream` | POST | viewer | ChatRequest | bounded; model field free string up to 100 chars | I8 |
| `/api/chat/sessions` (+ CRUD) | GET/POST/PUT/DELETE | viewer | typed | scoped to `user.id` | safe |
| `/api/scraper/run/{spider_name}` | POST | admin | SpiderName Literal | strict | safe (M5 audit-log gap) |
| `/api/scraper/update-all` | POST | admin | — | — | safe |
| `/api/scheduler/status` | GET | public | — | trusts Redis JSON | L1 |
| `/api/portfolios` (+ CRUD, transactions, holdings, performance, accounting, import, goals, alerts, tax) | GET/POST/PUT/PATCH/DELETE | viewer (`get_current_user`) | typed schemas (PortfolioCreate, TransactionCreate, ImportRequest, GoalCreate, AlertCreate, etc.) | tight (regex patterns, decimal_places, max_length) | safe; M2 for `dict` fields if added |
| `/api/loans/...` (banks/products/analytics) | GET | public | category, method (free strings), bank_id (int) | partial — strings ORM-bound | safe |
| `/api/loans/my-loans` (+ schedule, mark-paid, alerts) | GET/POST/PATCH/DELETE | trader | UserLoanCreate, PaymentMarkPaid | typed | safe |
| `/api/loans/import/upload` | POST | trader | UploadFile | content_type whitelist (string only) | similar to H2 (smaller blast radius) |
| `/api/loans/import/ocr/{file_id}` | POST | trader | language form | language whitelist | safe |
| `/api/loans/import/web` | POST | trader | `body: dict` | **only manual** dict access | **H1, M1** |
| `/api/loans/import/status/{import_id}` | GET | viewer | uuid string | unvalidated regex | safe |
| `/api/loans/import/list` | GET | viewer | limit, import_type | bounded; invalid filter silently ignored | L4 |
| `/api/loans/import/stats` | GET | viewer | — | — | safe |
| `/api/persian-loan/credit-guide` | GET | public | — | — | safe |
| `/api/persian-loan/stats` | GET | public | — | — | safe |
| `/api/persian-loan/chat` | POST | viewer | PersianLoanChatRequest | tight (score bounded, message max_length=500) | I8 |
| `/api/crypto/...` (market, stats/global, fear-greed-history, movers, signals, refresh, news-sentiment/...) | GET/POST | public | various | typed/bounded | safe |
| `/api/crypto/{symbol}/ohlcv` | GET | public | symbol, interval (regex), days (bounded) | safe; view name from whitelist dict | safe |
| `/api/crypto/{symbol}` | GET | public | symbol | resolved through CMC_TO_FA map then validate_symbol | safe |
| `/api/news` (+ /trending /sources /{id} /{id}/read) | GET/POST | public | source_type, category, language, symbol, search, dates, paging | symbol UN-validated, **f-string into JSONB filter** | **H4** |
| `/api/commodity/...` | GET | public | symbol (uppercased), period (regex) | typed | safe |
| `/api/financial-modeling/download/{file_id}` | GET | public | UUID4 | strict regex + path traversal defense | safe |

**Disabled-in-default-build routers** (`risk_profile`, `subscriptions`, `financial_modeling`) are excluded from `all_routers` per `api/routes/__init__.py` but conditionally included in `main.py` for `ENABLE_LOANS` / `ENABLE_CRYPTO` / `ENABLE_NEWS` / `ENABLE_VOICE`. Audit covers them on the assumption they will be re-enabled.

---

## Cross-Cutting Recommendations

1. **Body-size middleware:** add a Starlette `Middleware` enforcing `Content-Length <= N` per route group. FastAPI/uvicorn relies on the front-proxy (nginx) to cap; if nginx config drifts, multipart endpoints become DoS vectors.
2. **A common request-validator:** centralize symbol / id / pagination validation (`validate_symbol` is a good start — extend to news/portfolio symbols).
3. **Magic-byte verification:** add `python-magic` and a small `verify_upload(file, allowed_mime)` helper used by both `rag/upload` and `loans/import/upload`.
4. **SSRF helper:** ship one trusted `safe_http_get(url, *, allowed_ports={80,443}, max_bytes=...)` helper that does pinned-IP, no-redirect, size-capped fetching, and route every "fetch URL on user's behalf" call through it.
5. **Cache key auth-vary:** add `vary_by` to `@cached`; default to `()` but document loudly.
6. **Audit-trail logger:** every admin-only mutation should structured-log `{event, user_id, target}`.
