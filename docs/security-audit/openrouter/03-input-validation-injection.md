## Critical

_No critical findings in the provided scope._

## High

### SSRF bypass via redirect chain and DNS rebinding gap in web-scrape import
- **Severity:** High
- **Location:** `api/services_import.py:254-279` (`run_web_scrape`), `api/routes/import_loans.py:65-89` (`POST /api/loans/import/web`)
- **Description:** The endpoint validates the original hostname/IP before request, but then performs `httpx.get(..., follow_redirects=True)` without re-validating each redirect target. This allows SSRF bypass via attacker-controlled public URL that 302-redirects to internal/private targets. Also, DNS is validated separately from the actual HTTP request resolution (TOCTOU), enabling DNS rebinding-style bypass in some environments.
- **Exploit:** An authenticated trader submits `https://attacker.example/redirect` in `urls`. Initial DNS resolves to a public IP (passes checks), but server follows a 302 to `http://169.254.169.254/latest/meta-data/` (or internal host), exposing internal metadata/services to the scraper and persisting extracted data in import results.
- **Fix:** Disable auto redirects (`follow_redirects=False`) and manually follow redirects with per-hop validation (scheme, host, resolved IP class, optional port allowlist). Resolve and enforce destination IP at connect time if possible; reject private/loopback/link-local/reserved at each hop. Consider an outbound HTTP proxy with network-layer egress policy to enforce SSRF controls.

## Medium

### File upload validation trusts client MIME and extension, no magic-byte verification
- **Severity:** Medium
- **Location:** `api/services_import.py:35-75` (`save_upload`), `api/routes/import_loans.py:24-43`
- **Description:** Upload validation relies on `UploadFile.content_type` and extension fallback. `content_type` is client-controlled multipart metadata and can be spoofed. No magic-byte/signature validation is performed for PNG/JPEG/PDF.
- **Exploit:** A trader uploads a non-image/non-PDF payload with `Content-Type: application/pdf`. The file is accepted and stored; later OCR/parser stages attempt to process malformed content, causing processing failures or resource stress and polluting job records.
- **Fix:** Validate file signatures with trusted sniffing (e.g., `python-magic` or explicit header checks for PNG/JPEG/PDF), reject mismatches, and normalize accepted extensions based on detected type (not client metadata).

### OCR pipeline susceptible to resource exhaustion (PDF/image bombs)
- **Severity:** Medium
- **Location:** `api/services_import.py:136-174` (`run_ocr` with `pdf2image.convert_from_path`), `api/services_import.py:69-75` (size check only)
- **Description:** The system caps upload bytes (10MB) but does not cap PDF page count, rasterization DPI, image dimensions, OCR runtime, or per-job CPU/memory. Compressed PDFs/images can expand massively during OCR.
- **Exploit:** An authenticated user uploads a crafted small PDF with huge page geometry or many pages; conversion/OCR consumes high CPU/RAM, slowing or crashing worker processes (availability impact).
- **Fix:** Enforce hard limits before OCR (page count, dimensions, DPI, pixel count), run OCR in constrained worker/subprocess with timeout and memory limits, and reject files exceeding parsing safety thresholds.

### Weak request-body schema for web scraper endpoint (`dict` instead of strict Pydantic model)
- **Severity:** Medium
- **Location:** `api/routes/import_loans.py:65-89` (`scrape_web`)
- **Description:** Endpoint accepts raw `body: dict` and performs partial manual checks. No typed schema for URL format, item type, per-URL length, boolean coercion strictness, or unknown-field policy. This increases malformed-input paths and inconsistent validation.
- **Exploit:** Client sends mixed types (objects/arrays/non-URL strings) in `urls`; parser errors occur deeper in service code, causing noisy failures and possible import job state inconsistencies.
- **Fix:** Replace `dict` with strict Pydantic request model: `urls: list[HttpUrl]`, constrained list length, per-item max length, strict bool for `deepScrape`, optional validated `bankId`, and `extra="forbid"`.

### Unbounded remote response size in scraper fetch path
- **Severity:** Medium
- **Location:** `api/services_import.py:278-287` (`httpx.get` + `resp.text`)
- **Description:** HTTP fetch has timeout but no response size cap. Large responses can consume memory during `.text` decode and BeautifulSoup parse.
- **Exploit:** Attacker submits URL serving very large HTML body; service fetches and parses full content, causing high memory/CPU use and degraded availability.
- **Fix:** Stream responses and cap bytes read (e.g., max 2–5 MB), validate `Content-Type` to text/html before parsing, and abort on excessive `Content-Length` or streamed byte threshold.

## Low

### `X-Request-ID` header reflected without sanitization
- **Severity:** Low
- **Location:** `api/monitoring.py:35-40` (`RequestIDMiddleware`), `api/main.py:156-159` (`_get_request_id`)
- **Description:** Client-provided `X-Request-ID` is echoed into response header and error body unchanged. Although Starlette may reject invalid header characters, the app does not enforce a safe format/length.
- **Exploit:** Attacker sends oversized or malformed `X-Request-ID` values to induce response/header handling issues or log correlation pollution.
- **Fix:** Normalize request IDs to a strict pattern (e.g., `[A-Za-z0-9_-]{1,64}`), otherwise replace with generated UUID. Never reflect raw invalid IDs.

### User-controlled values are logged without newline normalization
- **Severity:** Low
- **Location:** `api/routes/auth.py:95-130` (register/login logging)
- **Description:** Usernames are logged directly (`%s` formatting is safe from format-string injection, but allows log-forging/newline pollution if upstream validation is bypassed elsewhere or future fields are loosened).
- **Exploit:** Crafted username containing control characters can poison plain logs in non-JSON handlers and complicate incident triage.
- **Fix:** Apply log-safe normalization for untrusted fields (strip/control-char filter) or structured logging fields with escaping guarantees.

## Info

### Raw SQL usage is mostly parameterized; dynamic table/view selection is allowlisted
- **Severity:** Info
- **Location:** `api/routes/crypto.py:383-392`, `api/routes/ticks.py:170-190`, multiple `text(..., params)` usages
- **Description:** Reviewed raw SQL calls use bound params. The only f-string SQL interpolation (`FROM {view}`) is constrained by a hardcoded allowlist (`_CRYPTO_OHLCV_VIEWS`) and validated `interval`.
- **Exploit:** N/A (good practice observed)
- **Fix:** Keep allowlist enforcement; avoid future interpolation from non-allowlisted input.

### Subprocess usage does not use `shell=True` and spider input is typed
- **Severity:** Info
- **Location:** `api/routes/scraper.py:22-30`, `scheduler/jobs.py:192-207`
- **Description:** Command execution uses argument arrays, no shell invocation. `/api/scraper/run/{spider_name}` uses typed enum (`SpiderName`) reducing command injection risk.
- **Exploit:** N/A
- **Fix:** Maintain enum allowlists and array-style subprocess calls.

## Verified-OK

- Checked for SQL injection patterns (`text()` with f-strings/raw concat): no direct user-to-SQL interpolation found in provided files; parameter binding used consistently.
- Checked command injection vectors: no `shell=True`; subprocess arguments are array-based; user-facing spider selector is enum-typed.
- Checked path traversal protections:
  - SPA static serving uses `resolve()` + parent check (`api/main.py`).
  - Financial model download enforces UUID4 and directory containment (`api/routes/financial_modeling.py`).
  - Codal raw file serving validates resolved path under `DATA_DIR` (`api/routes/tools.py`).
- Checked deserialization risks: no `pickle.loads`/`yaml.load` unsafe usage in provided scope.
- Checked insecure randomness: security-sensitive token generation uses `secrets` where applicable (`api/routes/auth.py` Telegram user bootstrap).
- Checked upload size limits:
  - Loan import upload has 10MB limit (`api/services_import.py`).
  - RAG upload streams with 50MB hard cap (`api/routes/rag.py`).
- Checked regex/query constraints: many route params use `Query(..., ge/le/pattern)` and typed path params, reducing injection surface.

## Routes inventory

| Route | Auth tier | Input shape | Validation | Notes |
|---|---|---|---|---|
| `POST /api/loans/import/upload` | trader | multipart `file` | Content-Type allowlist + 10MB max + non-empty | **Needs magic-byte validation** |
| `POST /api/loans/import/ocr/{file_id}` | trader | path `file_id`, form `language` | language allowlist in service | OCR resource limits missing |
| `POST /api/loans/import/web` | trader | JSON `dict` (`urls`, `deepScrape`, `bankId`) | manual checks: list/non-empty/max 20 | **Untyped body; SSRF controls incomplete** |
| `GET /api/loans/import/status/{import_id}` | viewer | path id | existence check | No injection concerns |
| `GET /api/loans/import/list` | viewer | query `limit`, `import_type` | numeric bounds; enum parse fallback | Invalid `import_type` ignored silently |
| `GET /api/loans/import/stats` | viewer | none | n/a | Safe |
| `POST /api/rag/upload` | admin | multipart file + form metadata | MIME allowlist + 50MB + filename sanitization + path containment | **No magic-byte validation** |
| `GET /api/rag/documents` | admin | query pagination/filter | `ge/le` bounds | Safe |
| `DELETE /api/rag/documents/{doc_id}` | admin | path int | source check (`upload` only) | Safe |
| `GET /api/rag/documents/{doc_id}/download` | viewer | path int, `expires` | `expires` bounded 60–86400 | Redirect to presigned URL |
| `GET /api/codal` | public | query filters (`search`, dates, pagination) | max lengths/bounds; ORM filters | Parameterized; no SQLi seen |
| `GET /api/codal/financials` | public | query filters/pagination | typed params + bounds | Safe |
| `GET /api/codal/financials/{announcement_id}/raw` | public | path int | DB lookup + resolved path under data dir | Traversal-safe |
| `GET /api/codal/{announcement_id}/download/{file_type}` | public | path + query `expires` | file_type allowlist + bounds | Safe |
| `POST /api/scraper/run/{spider_name}` | admin | path enum | enum validation | No shell injection path |
| `POST /api/scraper/update-all` | admin | none | n/a | Internal constants only |
| `GET /api/ticks/{symbol}/ohlcv` | public | path `symbol`, query interval/days | regex + bounds | SQL uses fixed query map |
| `GET /api/crypto/{symbol}/ohlcv` | public | path/query | regex + allowlist membership | dynamic SQL table from allowlist |
| `GET /{full_path:path}` (SPA fallback) | public | path | `resolve()` + prefix check | Traversal mitigated |
| `GET /api/financial-modeling/download/{file_id}` | public (if router enabled) | path UUID | UUIDv4 regex + `is_relative_to` | Traversal mitigated |

## Audit caveats

- This audit is limited to the provided files. Critical dependencies were not provided and may contain additional input/injection risk: `api/auth.py`, `api/services_storage.py`, `services_loans.py`, `services_portfolio.py`, `services_risk.py`, `rag/*` internals, `database/models.py`, and settings/env handling.
- Some line references are approximate based on provided excerpts.
- Feature-flagged routers (`financial_modeling`, `risk_profile`, `subscriptions`) are included in findings where code was provided, but runtime exposure depends on actual router registration/config.