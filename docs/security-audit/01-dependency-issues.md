# 01 — Dependency-Level CVEs, Advisories, and Known Bugs

## Executive Summary

This document enumerates known CVEs, GHSA advisories, and publicly documented bugs that affect the third-party libraries declared in `requirements.txt`, `requirements-dashboard.txt`, and `frontend/package.json`. **Two structural problems amplify the risk surface**: (1) every Python dependency in `requirements.txt` is declared with a `>=` lower bound and no upper cap and no lockfile, so the *minimum-acceptable* version range covers many vulnerable releases; and (2) the frontend ships `xlsx@0.18.5` (no fix available on npm), `axios@1.6.7` (16 advisories, including high-severity prototype pollution), and `vite@5.1.0` (multiple `server.fs.deny` bypasses). Live audit data: `npm audit` reports **8 vulnerabilities (5 high, 3 moderate)**; `pip-audit` of the dashboard image (`requirements-dashboard.txt`) reports 0 at resolved versions; `pip-audit` of the main scraper image (`requirements.txt`) reports **12 packages with 22 vulnerabilities** at resolved versions, including `pillow 11.3.0` (6 advisories — PSD/PDF DoS + memory corruption directly in the RAG ingestion path), `transformers 4.57.6` (Trainer pickle RCE — GHSA-69w3-r845-3855), `curl-cffi 0.13.0` (SSRF), `langsmith 0.4.37` (SSRF), `langchain-text-splitters 0.3.11` (SSRF), and `scrapy 2.13.4` (still vulnerable to the Referrer-Policy RCE GHSA-cwxj-rr6w-m6w7 — fixed only in 2.14.2).

---

## Critical

### Scrapy — Arbitrary Module Import via Referrer-Policy Header (GHSA-cwxj-rr6w-m6w7)
- **Affected**: scrapy < 2.14.2
- **Pinned version**: `scrapy>=2.11.0` (lower bound = 2.11.0 vulnerable; whatever resolves now may also be vulnerable if < 2.14.2)
- **Severity**: Critical (RCE-class — arbitrary Python import + call)
- **Description**: `RefererMiddleware` parses the `Referrer-Policy` response header value as a Python import path; a malicious site can set `Referrer-Policy: sys.exit` (or any callable) and Scrapy will import and invoke it. Combined with subprocess invocation in your spider runner, this is effectively unauthenticated RCE/process-kill against the scraper.
- **Fix**: Upgrade to **Scrapy 2.14.2+**, pin tightly (`scrapy>=2.14.2,<3`).
- **Source**: https://github.com/scrapy/scrapy/security/advisories/GHSA-cwxj-rr6w-m6w7

### aiohttp — Directory Traversal in Static Routes (CVE-2024-23334, GHSA-5h86-8mv2-jq9f)
- **Affected**: aiohttp ≤ 3.9.1
- **Pinned version**: `aiohttp>=3.9.0` — **3.9.0 and 3.9.1 are both vulnerable**
- **Severity**: Critical (unauthenticated path traversal, actively exploited by ShadowSyndicate ransomware crew)
- **Description**: When `follow_symlinks=True` is set on a static route, unauthenticated remote attackers can read files outside the server's static root.
- **Fix**: Pin `aiohttp>=3.10.11` (also covers CVE-2024-52304 request smuggling).
- **Source**: https://github.com/advisories/GHSA-5h86-8mv2-jq9f

### Jinja2 — Sandbox Escape via `|attr` filter and `format` (CVE-2025-27516, GHSA-cpwx-vrp4-4pq7)
- **Affected**: jinja2 ≤ 3.1.5
- **Pinned version**: not pinned directly; pulled transitively by FastAPI/starlette/templates and langchain-text-splitters
- **Severity**: Critical *if* user-controlled templates are rendered (template-injection-to-RCE in sandbox).
- **Description**: `|attr` filter can reach `str.format`, allowing escape from the sandboxed environment.
- **Fix**: Pin `jinja2>=3.1.6`.
- **Source**: https://github.com/advisories/GHSA-cpwx-vrp4-4pq7

---

## High

### xlsx (SheetJS) — Prototype Pollution + ReDoS (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9)
- **Affected**: xlsx < 0.20.2 (npm registry)
- **Pinned version**: `"xlsx": "^0.18.5"` — **vulnerable, and no fix available on npm registry**
- **Severity**: High (CVSS 7.8 prototype pollution; 7.5 ReDoS)
- **Description**: SheetJS pulled their fixed builds from npm. The npm registry version is permanently unpatched.
- **Fix**: Switch to the SheetJS CDN build (`https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`) or migrate to `exceljs`. `npm audit` flags `fixAvailable: false`.
- **Source**: https://github.com/advisories/GHSA-4r6h-8v6p-xvw6 ; https://github.com/advisories/GHSA-5pgg-2g8v-p4x9

### axios — Prototype Pollution / SSRF Cluster (16 advisories)
- **Affected**: axios 1.0.0 – 1.15.1 (the high-severity prototype-pollution advisories all fix in 1.15.1/1.15.2)
- **Pinned version**: `"axios": "^1.6.7"` (all 16 advisories apply)
- **Severity**: High (cluster includes 4 high-rated: GHSA-pmwg-cvhr-8vh7 SSRF via 127/8 NO_PROXY bypass CVSS 7.2; GHSA-q8qp-cvcw-x6jj prototype-pollution credential-injection 7.4; GHSA-pf86-5x62-jrwf prototype-pollution response tampering 7.4; GHSA-6chq-wfr3-2hj9 header injection 7.4)
- **Description**: Multiple prototype-pollution gadgets in `validateStatus`, `parseReviver`, `withXSRFToken`, header merging, and HTTP adapter; SSRF via NO_PROXY bypasses; CRLF injection via `blob.type`; unbounded recursion DoS in `toFormData`.
- **Fix**: Upgrade to `axios>=1.15.2`.
- **Source**: https://github.com/advisories/GHSA-q8qp-cvcw-x6jj (and 15 others — see /tmp/npm_audit.json)

### vite — Multiple `server.fs.deny` Bypasses (CVE-2025-30208, CVE-2024-31207, GHSA-4w7w-66w2-5vf9, GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583)
- **Affected**: vite ≤ 6.4.1 (and 7.0.0 – 7.3.1)
- **Pinned version**: `"vite": "^5.1.0"` — vulnerable to all of: `?raw??` bypass (CVE-2025-30208), `.map` path traversal (GHSA-4w7w-66w2-5vf9), arbitrary file read via WebSocket (GHSA-p9ff-h696-f583), picomatch bypass (CVE-2024-31207).
- **Severity**: High (file disclosure on dev server; only material if dev server is exposed beyond localhost)
- **Description**: Build-time only — does not affect production assets — but if any developer runs `vite --host` over a network, source/secret files can be read remotely.
- **Fix**: Upgrade to `vite@^6.4.x` (or `vite@^8.0.11` per npm audit auto-fix). Never run `vite dev` with `--host 0.0.0.0`.
- **Source**: https://github.com/advisories/GHSA-x574-m823-4x7w

### rollup (transitive via vite) — Path Traversal Arbitrary File Write (GHSA-mw96-cpmx-2vgc)
- **Affected**: rollup 4.0.0 – 4.58.x
- **Pinned version**: transitive from vite 5.1.0
- **Severity**: High
- **Description**: Path traversal in build output allows arbitrary file write — relevant only if untrusted input ever reaches a Rollup config or plugin.
- **Fix**: `rollup>=4.59.0` (lifts when vite is upgraded).
- **Source**: https://github.com/advisories/GHSA-mw96-cpmx-2vgc

### picomatch (transitive) — ReDoS via extglob quantifiers (GHSA-c2c7-rcm5-vvqj)
- **Affected**: picomatch 4.0.0 – 4.0.3
- **Severity**: High (CVSS 7.5 DoS)
- **Description**: ReDoS in glob matching; only relevant during build / dev tooling.
- **Fix**: `picomatch>=4.0.4` (transitively lifted).
- **Source**: https://github.com/advisories/GHSA-c2c7-rcm5-vvqj

### Pillow — DDS write buffer overflow (CVE-2025-48379, GHSA-xg8h-j46f-w952)
- **Affected**: pillow 11.2.0 – 11.2.x
- **Pinned version**: not pinned in requirements.txt directly, transitive via `pdf2image`, `pytesseract`, `sentence-transformers` etc.
- **Severity**: High *if* untrusted DDS images are saved (your RAG pipeline only handles PDFs/XLSX, so likely Info)
- **Description**: Heap buffer overflow when writing >64 KB DDS images.
- **Fix**: `pillow>=11.3.0`.
- **Source**: https://github.com/advisories/GHSA-xg8h-j46f-w952

### Pillow — `_imagingcms.c` strcpy Buffer Overflow (CVE-2024-28219)
- **Affected**: pillow < 10.3.0
- **Severity**: High (potential code execution)
- **Description**: `strcpy` instead of `strncpy` in ICC profile handling.
- **Fix**: `pillow>=10.3.0`.
- **Source**: https://github.com/advisories/GHSA-44wm-f244-xhp3

### gunicorn — HTTP Request Smuggling (CVE-2024-1135, CVE-2024-6827)
- **Affected**: gunicorn < 22.0.0 (CVE-2024-1135); < 23.0.0 (CVE-2024-6827)
- **Pinned version**: `gunicorn>=21.2.0` — **lower bound 21.2.0 is vulnerable to both**
- **Severity**: High (smuggling can bypass nginx-level auth/rate-limit)
- **Description**: `Transfer-Encoding` parsing flaw lets attackers smuggle requests past nginx — defeating the upstream rate-limit / auth tier.
- **Fix**: Pin `gunicorn>=23.0.0`.
- **Source**: https://github.com/advisories/GHSA-w3h3-4rj7-4ph4 ; https://github.com/advisories/ghsa-hc5x-x2vx-497g

### python-jose — Algorithm Confusion with OpenSSH ECDSA Keys (CVE-2024-33663, GHSA-6c5p-j8vq-pqhj)
- **Affected**: python-jose ≤ 3.3.0
- **Pinned version**: `python-jose[cryptography]>=3.3.0` — **3.3.0 itself is vulnerable**
- **Severity**: High (auth bypass / token forgery if asymmetric keys are used)
- **Description**: Library accepts a public key in formats whose `alg` semantic differs from the verified algorithm, enabling token forgery.
- **Fix**: Upgrade to `python-jose>=3.4.0`. **Better**: replace python-jose entirely with **PyJWT** (python-jose is effectively unmaintained — see Ecosystem section).
- **Source**: https://github.com/advisories/GHSA-6c5p-j8vq-pqhj

### python-jose — JWE Decompression Bomb DoS (CVE-2024-33664, GHSA-cjwg-qfpm-7377)
- **Affected**: python-jose ≤ 3.3.0
- **Pinned version**: `>=3.3.0` — vulnerable at floor
- **Severity**: High DoS
- **Description**: Crafted JWE token with extreme compression ratio depletes memory ("JWT bomb").
- **Fix**: Upgrade to `python-jose>=3.4.0`.
- **Source**: https://github.com/advisories/GHSA-cjwg-qfpm-7377

### ecdsa (transitive via python-jose) — Minerva Timing Attack (CVE-2024-23342)
- **Affected**: ecdsa ≤ 0.18.0 — **all versions; maintainers will not fix**
- **Pinned version**: pulled by `python-jose[cryptography]`
- **Severity**: High in adversarial timing-channel scenarios; Medium in our deployment behind nginx
- **Description**: `sign_digest` leaks the nonce via timing; private-key recovery possible.
- **Fix**: Stop using python-jose (which forces `ecdsa` in). Use PyJWT with `cryptography` backend.
- **Source**: https://nvd.nist.gov/vuln/detail/cve-2024-23342

### Starlette — Multipart DoS via Large File Rollover (CVE-2025-54121, GHSA-2c2j-9gv5-cj73)
- **Affected**: starlette ≤ 0.47.1
- **Pinned version**: transitive via `fastapi>=0.109.2` — depends on what FastAPI resolves
- **Severity**: High (event-loop block; service-wide DoS on a single host)
- **Description**: Spool-to-disk rollover blocks the event loop; one large multipart upload halts all concurrent requests. Critical for your `/api/rag/upload` endpoint.
- **Fix**: Pin `starlette>=0.47.2`. Confirm via `pip show starlette` in the running container.
- **Source**: https://github.com/advisories/GHSA-2c2j-9gv5-cj73

### Starlette — Multipart Form Field Memory Exhaustion (CVE-2024-47874, GHSA-f96h-pmfr-66vw)
- **Affected**: starlette < 0.40.0
- **Pinned version**: transitive
- **Severity**: High DoS
- **Description**: Form fields without filenames are buffered without size limit.
- **Fix**: `starlette>=0.40.0` (already covered by 0.47.2 fix above).
- **Source**: https://github.com/advisories/GHSA-f96h-pmfr-66vw

### python-multipart — ReDoS via Content-Type Header (CVE-2024-24762, GHSA-2jv5-9r88-3w3p) and Boundary DoS (CVE-2024-53981)
- **Affected**: python-multipart < 0.0.18
- **Pinned version**: `python-multipart>=0.0.9` — **floor is vulnerable**
- **Severity**: High DoS (any FastAPI endpoint that parses form data)
- **Description**: Two separate DoS vectors: regex backtracking on Content-Type header, and a malformed boundary that hangs the parser.
- **Fix**: Pin `python-multipart>=0.0.18`.
- **Source**: https://github.com/advisories/GHSA-2jv5-9r88-3w3p

### urllib3 — Decompression Bomb DoS (CVE-2025-66471, CVE-2025-66418)
- **Affected**: urllib3 < 2.6.0
- **Pinned version**: transitive (requests, aiohttp); your dashboard pip-audit shows `urllib3 2.7.0` (safe) but `requests>=2.31.0` admits older urllib3.
- **Severity**: High DoS via streaming compressed responses (relevant: Scrapy spiders against attacker-controlled domains, RAG web fetches via Tavily).
- **Description**: Unbounded chained-encoding decompression and improper streaming-API handling cause unbounded memory.
- **Fix**: `urllib3>=2.6.0`.
- **Source**: https://github.com/advisories/GHSA-gm62-xv2j-4w53 ; https://github.com/advisories/GHSA-2xpw-w6gg-jr37

### requests — Session verify=False Persistence (CVE-2024-35195, GHSA-9wx4-h78v-vm56)
- **Affected**: requests < 2.32.0
- **Pinned version**: `requests>=2.31.0` — **floor is vulnerable**
- **Severity**: High (silent TLS-cert bypass for the entire connection pool)
- **Description**: First call with `verify=False` poisons the pool; subsequent `verify=True` calls still skip cert verification.
- **Fix**: Pin `requests>=2.32.4`.
- **Source**: https://github.com/advisories/GHSA-9wx4-h78v-vm56

### Scrapy — Brotli Decompression Bomb DoS (CVE-2025-6176, GHSA-2qfp-q593-8484)
- **Affected**: scrapy ≤ 2.13.3
- **Pinned version**: `scrapy>=2.11.0`
- **Severity**: High DoS
- **Description**: Brotli decompression bypasses the response-size limit; a hostile origin can crash the spider with a small payload.
- **Fix**: `scrapy>=2.14.2`.
- **Source**: https://github.com/advisories/GHSA-2qfp-q593-8484

### Scrapy — Authorization Header Leak on Cross-Origin Redirect (GHSA-4qqq-9vqf-3h3f)
- **Affected**: scrapy < 2.11.2
- **Pinned version**: `>=2.11.0` — floor vulnerable
- **Severity**: High (credential leak)
- **Description**: Auth header leaked when redirected to a different origin. Relevant to your BrsAPI codal spider since it uses bearer/auth tokens.
- **Fix**: `scrapy>=2.11.2` (already implied by 2.14.2 upgrade).
- **Source**: https://github.com/scrapy/scrapy/security/advisories/GHSA-4qqq-9vqf-3h3f

### Hugging Face Transformers — pickle.load() RCE (CVE-2024-11394)
- **Affected**: transformers (transitive via `sentence-transformers`)
- **Pinned version**: `sentence-transformers>=2.2.0` — pulls a wide transformers range
- **Severity**: Critical *if* you load model checkpoints from untrusted sources; otherwise High latent risk
- **Description**: `TFPreTrainedModel.load_repo_checkpoint()` uses `pickle.load()` on model files.
- **Fix**: Confirm reranker only loads from a trusted, hash-verified path. Pin `transformers` to a version with the patch and never accept user-uploaded model files.
- **Source**: https://www.sentinelone.com/vulnerability-database/cve-2024-11394/

---

## Medium

### postcss — XSS via unescaped `</style>` (GHSA-qx2v-qp2m-jg93)
- **Affected**: postcss < 8.5.10
- **Pinned version**: `"postcss": "^8.5.6"` — vulnerable
- **Severity**: Medium (CVSS 6.1)
- **Description**: Stringify output does not escape `</style>` inside CSS values; if attacker controls a CSS value rendered to HTML, XSS is possible. Build-time tool, low real-world impact for SPA.
- **Fix**: `postcss>=8.5.10`.
- **Source**: https://github.com/advisories/GHSA-qx2v-qp2m-jg93

### follow-redirects — Auth Header Leak Cross-Domain (GHSA-r4q5-vmmm-2653)
- **Affected**: follow-redirects ≤ 1.15.11
- **Pinned version**: transitive via axios
- **Severity**: Medium
- **Fix**: `follow-redirects>=1.15.12` (lifts with axios upgrade).
- **Source**: https://github.com/advisories/GHSA-r4q5-vmmm-2653

### esbuild — Dev-server Cross-Origin Request Read (GHSA-67mh-4wv8-2f99)
- **Affected**: esbuild ≤ 0.24.2
- **Pinned version**: transitive via vite 5
- **Severity**: Medium (dev only)
- **Fix**: Lifts when vite is upgraded.
- **Source**: https://github.com/advisories/GHSA-67mh-4wv8-2f99

### Pydantic — Email Regex ReDoS (CVE-2024-3772, GHSA-mr82-8j83-vxmv)
- **Affected**: pydantic < 2.4.0
- **Pinned version**: `pydantic>=2.9.0` — **safe** at floor; explicitly resolve to ≥2.9
- **Severity**: Medium (downgraded since FastAPI registration uses email validation)
- **Source**: https://github.com/advisories/GHSA-mr82-8j83-vxmv

### sentry-sdk — Env Vars Leak to Subprocess (CVE-2024-40647, GHSA-g92j-qhmh-64v2)
- **Affected**: sentry-sdk < 2.8.0
- **Pinned version**: `sentry-sdk[fastapi]>=2.0.0` — **floor vulnerable**
- **Severity**: Medium (env-var disclosure when subprocess is spawned with `env={}`)
- **Description**: Bug exposes parent process env to children even when `env={}` is set; high relevance because Scrapy and `gost` subprocesses spawn from the same image.
- **Fix**: Pin `sentry-sdk>=2.8.0`.
- **Source**: https://github.com/advisories/GHSA-g92j-qhmh-64v2

### sentry-sdk — Sensitive Headers Leaked when sendDefaultPii=true (CVE-2025-65944, GHSA-6465-jgvq-jhgp)
- **Affected**: sentry-sdk older releases when `send_default_pii=True`
- **Severity**: Medium config-dependent
- **Fix**: Set `send_default_pii=False` and upgrade SDK.
- **Source**: https://github.com/advisories/GHSA-6465-jgvq-jhgp

### Twisted — twisted.web HTTP Pipeline Out-of-Order (CVE-2024-41671, GHSA-c8m8-j448-xjx7)
- **Affected**: twisted (transitive via Scrapy)
- **Severity**: Medium info-disclosure between concurrent pipelined requests
- **Fix**: `twisted>=24.7.0`.
- **Source**: https://github.com/advisories/ghsa-c8m8-j448-xjx7

### lxml — XXE in default `iterparse`/`ETCompatXMLParser` config (CVE-2026-41066)
- **Affected**: lxml < 6.1.0 — `iterparse()` and `ETCompatXMLParser()` keep `resolve_entities=True` by default
- **Pinned version**: transitive (Scrapy + feedparser)
- **Severity**: Medium (XXE → local-file read) **if** untrusted XML is parsed by spiders or feed parser
- **Description**: lxml ≥5 fixed `XMLParser`/`HTMLParser` defaults but missed iterparse and ETCompatXMLParser. Scrapy 2.11.1 fixed this in its own selector code, but any direct lxml use in spiders is still risky.
- **Fix**: `lxml>=6.1.0`; never parse untrusted XML with `resolve_entities=True`.
- **Source**: https://advisories.gitlab.com/pypi/lxml/CVE-2026-41066/

### cryptography — Bundled OpenSSL CVEs in wheels (GHSA-79v4-65xg-pq4g)
- **Affected**: cryptography 42.0.0 – 44.0.0 (vulnerable OpenSSL bundled in PyPI wheels)
- **Pinned version**: dashboard pip-audit shows 48.0.0 (safe)
- **Severity**: Medium — only relevant if older floor is installed (`>=` constraint admits old)
- **Fix**: `cryptography>=44.0.1`.
- **Source**: https://github.com/pyca/cryptography/security/advisories/GHSA-79v4-65xg-pq4g

### cryptography — pkcs12 NULL-deref (CVE-2024-26130)
- **Affected**: cryptography 38.0.0 – 42.0.3
- **Severity**: Medium (process crash DoS)
- **Fix**: `cryptography>=42.0.4`.
- **Source**: https://github.com/advisories/GHSA-6vqw-3v5j-54x4

### redis-py — Async Pipeline Cross-Connection Data Leak (CVE-2023-28858 / CVE-2023-28859)
- **Affected**: redis-py < 4.5.3 (CVE-2023-28858); incomplete fix lingers in some 4.x releases
- **Pinned version**: `redis>=5.0.0` (safe at floor) — confirm
- **Severity**: Medium (off-by-one cross-tenant data mix — the OpenAI ChatGPT incident)
- **Fix**: `redis>=5.0.0` (already enforced).
- **Source**: https://github.com/advisories/GHSA-24wv-mv5m-xv4h

### PrismJS (transitive via react-syntax-highlighter) — DOM Clobbering (CVE-2024-53382)
- **Affected**: prismjs < 1.30.0
- **Pinned version**: `react-syntax-highlighter ^16.1.0` likely uses refractor → prismjs <1.30 (depends on resolution)
- **Severity**: Medium XSS (DOM clobbering on untrusted HTML)
- **Description**: `document.currentScript` lookup can be shadowed; relevant when ChatDrawer renders LLM output containing arbitrary HTML.
- **Fix**: Override resolution to `prismjs@>=1.30.0` via package.json `overrides`.
- **Source**: https://github.com/advisories/GHSA-x7hr-w5r2-h6wg

### lodash (transitive) — Prototype Pollution in `_.unset` / `_.omit` (CVE-2025-13465)
- **Affected**: lodash 4.0.0 – 4.17.22
- **Pinned version**: transitive (recharts, @mantine, react-syntax-highlighter chains)
- **Severity**: Medium
- **Fix**: Force `lodash>=4.17.23` via npm override.
- **Source**: https://github.com/advisories/GHSA-xxjr-mmjv-4gpg

### PyMuPDF — CLI Path Traversal Arbitrary File Write (CVE-2026-3029)
- **Affected**: pymupdf ≤ 1.26.5
- **Pinned version**: `PyMuPDF>=1.24.0`
- **Severity**: Medium *only if* using the `pymupdf` CLI to extract embedded files; the project uses the library API, so likely not exploitable. Worth confirming none of the RAG ingestion path exposes embedded-file extraction.
- **Fix**: `PyMuPDF>=1.26.7`.
- **Source**: https://advisories.gitlab.com/pkg/pypi/pymupdf/CVE-2026-3029/

### PyJWT — Weak-key Acceptance (CVE-2025-45768)
- **Affected**: pyjwt 2.10.1
- **Pinned version**: not directly used (you use python-jose) — applies if you migrate
- **Severity**: Medium (does not enforce minimum HMAC key length)
- **Source**: https://www.sentinelone.com/vulnerability-database/cve-2025-45768/

---

### Pillow — Multiple OOB write / decompression-bomb / memory-corruption (GHSA-cfh3-3jmp-rvhc, GHSA-whj4-6x5x-4v2j, GHSA-wjx4-4jcj-g98j, GHSA-5xmw-vc9v-4wf2, GHSA-r73j-pqj5-w3x7, GHSA-pwv6-vv43-88gr)
- **Affected**: pillow 10.3.0 – 12.1.x (mix of fix versions: 12.1.1, 12.2.0)
- **Pinned version**: pip-audit shows installed 11.3.0 — vulnerable to ALL six
- **Severity**: High aggregate (PSD OOB write → potential code execution; FITS GZIP decompression bomb; PDF infinite-loop CPU DoS; coordinate-path memory corruption)
- **Description**: Six concurrent advisories. Most relevant in our stack: **GHSA-r73j-pqj5-w3x7** (malicious PDF → 100% CPU hang) — directly in the RAG ingestion path; **GHSA-pwv6-vv43-88gr** (PSD memory corruption → potential RCE).
- **Fix**: `pillow>=12.2.0`.
- **Source**: https://github.com/advisories/GHSA-r73j-pqj5-w3x7

### Twisted — twisted.names DNS Decompression DoS (GHSA-grgv-6hw6-v9g4)
- **Affected**: twisted < 26.4.0rc2
- **Pinned version**: pip-audit shows 25.5.0 — vulnerable
- **Severity**: High DoS (resource exhaustion during DNS name decompression). Scrapy uses Twisted reactor for DNS resolution; a hostile DNS response can hang the spider.
- **Fix**: Upgrade Twisted to 26.4.0+ once stable, or restrict resolver to fixed list.
- **Source**: https://github.com/advisories/GHSA-grgv-6hw6-v9g4

### langchain-text-splitters — SSRF in `HTMLHeaderTextSplitter.split_text_from_url()` (GHSA-fv5p-p927-qmxr)
- **Affected**: langchain-text-splitters < 1.1.2 (also `langchain-core`); installed 0.3.11
- **Pinned version**: `langchain-text-splitters>=0.3.0` — **vulnerable**
- **Severity**: High — SSRF in the RAG ingestion path
- **Description**: `validate_safe_url()` is called on the initial URL but the actual fetch follows redirects via `requests.get()` without re-validating, so a server returning a 302 to `http://169.254.169.254/...` reaches AWS metadata.
- **Fix**: Upgrade or stop using `split_text_from_url`. If you control input URLs (your code does), risk is contained but should still be patched.
- **Source**: https://github.com/advisories/GHSA-fv5p-p927-qmxr

### LangSmith SDK — SSRF and Output Redaction Bypass (GHSA-v34v-rq6j-cj6p, GHSA-rr7j-v2q5-chgv)
- **Affected**: langsmith < 0.6.3 / < 0.7.31; installed 0.4.37 — vulnerable
- **Pinned version**: transitive via langchain-text-splitters
- **Severity**: High — SSRF via tracing headers; redaction bypass in streaming
- **Description**: SSRF via attacker-controlled tracing headers; `hide_outputs=True` does not redact streaming token events.
- **Fix**: Upgrade `langsmith>=0.7.31` (or remove if not used).
- **Source**: https://github.com/advisories/GHSA-v34v-rq6j-cj6p

### transformers — Trainer `_load_rng_state` RCE (GHSA-69w3-r845-3855)
- **Affected**: transformers < 5.0.0rc3 (current stable line); installed 4.57.6
- **Pinned version**: transitive via sentence-transformers
- **Severity**: High RCE — second pickle-based RCE in transformers besides CVE-2024-11394
- **Description**: `Trainer._load_rng_state` deserializes attacker-controlled RNG state.
- **Fix**: Upgrade transformers to a 5.x release; or never load checkpoints from untrusted sources.
- **Source**: https://github.com/advisories/GHSA-69w3-r845-3855

### curl-cffi — SSRF via Auto-Redirects to Internal IP Ranges (GHSA-qw2m-4pqf-rmpp)
- **Affected**: curl-cffi < 0.15.0; installed 0.13.0
- **Pinned version**: transitive (likely via yfinance / a scraping helper)
- **Severity**: High SSRF
- **Description**: Does not restrict redirects to internal IPs; libcurl follows them automatically. Tavily/RAG fetches via curl-cffi can hit metadata endpoints.
- **Fix**: `curl-cffi>=0.15.0`.
- **Source**: https://github.com/advisories/GHSA-qw2m-4pqf-rmpp

### orjson — Deeply Nested JSON Recursion DoS (GHSA-hx9q-6w63-j58v)
- **Affected**: orjson < 3.11.6; installed 3.11.5
- **Severity**: Medium-High (stack-overflow / DoS on deeply nested JSON)
- **Fix**: `orjson>=3.11.6`.
- **Source**: https://github.com/advisories/GHSA-hx9q-6w63-j58v

### filelock — TOCTOU Symlink Race (GHSA-w853-jp5j-5j7f, GHSA-qmgc-5h2g-mvrw)
- **Affected**: filelock < 3.20.3; installed 3.19.1
- **Severity**: Medium (local-only, container-local; matters because the scraper, scheduler, and API share a volume)
- **Fix**: `filelock>=3.20.3`.
- **Source**: https://github.com/advisories/GHSA-w853-jp5j-5j7f

### requests — extract_zipped_paths Predictable Filename (GHSA-gc5v-m9x4-r6x2)
- **Affected**: requests < 2.33.0; installed 2.32.5
- **Severity**: Low-Medium (utility function only, unlikely to be hit unless user code uses it)
- **Fix**: `requests>=2.33.0`.
- **Source**: https://github.com/advisories/GHSA-gc5v-m9x4-r6x2

### python-dotenv — Symlink Following on `set_key`/`unset_key` (GHSA-mf9w-mj56-hr94)
- **Affected**: python-dotenv < 1.2.2; installed 1.2.1
- **Severity**: Low (local file-overwrite; only matters if your code rewrites `.env` based on user input)
- **Fix**: `python-dotenv>=1.2.2`.
- **Source**: https://github.com/advisories/GHSA-mf9w-mj56-hr94

### Scrapy — Memory Exhaustion via Large Response Files (GHSA-h7wm-ph43-c39p)
- **Affected**: Old advisory dating to Scrapy 1.4; **no fix version listed in advisory** — disputed
- **Severity**: Info (Scrapy maintainers consider this a configuration concern, mitigated via DOWNLOAD_MAXSIZE).
- **Source**: https://github.com/advisories/GHSA-h7wm-ph43-c39p

---

## Low

### picomatch — POSIX Char Class Method Injection (GHSA-3v7f-55p6-f55p)
- **Affected**: picomatch 4.0.0 – 4.0.3 — fixes alongside the ReDoS issue.
- **Severity**: Low (CVSS 5.3)
- **Source**: https://github.com/advisories/GHSA-3v7f-55p6-f55p

### axios — Null Byte Injection in URLSearchParams (GHSA-xhjh-pmcv-23jw)
- **Severity**: Low (CVSS 3.7); resolved by axios upgrade above.
- **Source**: https://github.com/advisories/GHSA-xhjh-pmcv-23jw

---

## Info

### Pillow — multiple older CVEs (CVE-2024-28219 etc.)
Already covered above; flagged Info if your installed pillow is current (>=11.3.0). Verify with `pip show pillow` in the actual app/scheduler container.

### urllib3 — redirects-not-disabled-with-retries=0 (CVE-2025-50181)
- Low-relevance unless you instantiate `PoolManager(retries=0)`.
- **Source**: https://github.com/advisories/GHSA-pq67-6m6q-mj2v

---

## Ecosystem-level concerns (non-CVE risks)

### 1. `python-jose` is effectively abandoned
Last release 3.4.0 was a security fix shipped only after community pressure; the maintainer has signaled in issue trackers they cannot keep up. The forced `ecdsa` dependency carries unfixed Minerva timing attack (CVE-2024-23342) and the maintainers say they will not fix it. **Action: migrate to PyJWT (with `cryptography` backend) before launch.** FastAPI's own docs now advise against python-jose. The dashboard already pulls `cryptography>=48.0.0` so PyJWT migration is dependency-neutral.

### 2. `passlib` is unmaintained and Python 3.13-incompatible
Last release was 2020. Raises `crypt`-deprecation warnings on Python 3.13 and will break entirely on 3.14. Consider `pwdlib` or direct `bcrypt`/`argon2-cffi`. Bcrypt itself is now considered legacy; OWASP recommends Argon2id.

### 3. Lower-bound-only Python pinning + no lockfile
Every line in `requirements.txt` and `requirements-dashboard.txt` is `>=`. There is no `requirements.lock` or `pip-tools`-generated pin file in the repo. Two consequences:
- **Reproducibility**: Docker rebuilds can pull a different version than the audited version. `pip-audit` of one image is not authoritative for the next build.
- **Floor-version exposure**: A new contributor running `pip install -r requirements.txt --no-cache` against a stale wheel index could install the floor (e.g., `python-jose==3.3.0`), which is vulnerable to CVE-2024-33663/33664. **Recommendation**: add `pip-compile`-generated `requirements.lock` and rebuild Docker from the lock.

### 4. `xlsx` (SheetJS) on the npm registry has no fix path
SheetJS removed the patched 0.20.x from the registry. The only supported route is the CDN tarball or migrating to `exceljs`. `npm audit` shows `fixAvailable: false`. Treat as a known-vulnerable-with-no-upgrade dependency until you migrate.

### 5. `aioredis` is deprecated (merged into redis-py asyncio)
Last release Dec 2021. `requirements.txt` lists `aioredis>=2.0.0` AND `redis>=5.0.0` — pulling both is wasteful and ambiguous; the redis-py async API supersedes aioredis.

### 6. `lxml` XXE-by-default before 5.x
While main `XMLParser`/`HTMLParser` defaults are now safe in lxml ≥5, anywhere your code calls `lxml.etree.iterparse(...)` or `ETCompatXMLParser()` without `resolve_entities=False`, untrusted XML can read local files (CVE-2026-41066). Audit any `iterparse` usage in spiders.

### 7. `pickle` deserialization in transformers / sentence-transformers
`sentence-transformers>=2.2.0` pulls `transformers`, which has a documented `pickle.load()` RCE in `TFPreTrainedModel.load_repo_checkpoint` (CVE-2024-11394). Confirm your reranker only loads from a trusted, hash-verified path and never accepts a user-supplied checkpoint file.

### 8. Subprocess invocation surface
The codebase spawns `gost` (HTTP→SOCKS5 bridge) and `scrapy crawl` from the API process. Any `sentry-sdk<2.8.0` would leak `OPENAI_API_KEY`, `JWT_SECRET`, and DB credentials into the child env (CVE-2024-40647) regardless of `env={}`. Pin `sentry-sdk>=2.8.0`.

### 9. `python-multipart` floor allows two known DoS vectors
`>=0.0.9` admits CVE-2024-24762 (Content-Type ReDoS) and CVE-2024-53981 (boundary DoS). Both kill the FastAPI worker thread on a single multipart request — directly relevant to `/api/rag/upload` and OpenAPI's automatic form parsing.

### 10. Dev-server exposure (vite)
The cluster of Vite `server.fs.deny` bypasses (CVE-2025-30208 family) is harmless if you only run `vite dev` on localhost, but if any developer ever runs `vite --host` to test on a phone or VM, an attacker on the same LAN can read `.env`, source maps, and credentials. Add a comment to `package.json` and CI to forbid `--host` in dev.

### 11. Frontend `axios` prototype-pollution cluster vs. application code
16 axios advisories in the cluster all assume the attacker can influence either headers or response JSON. Your app proxies all backend traffic through axios; if any LLM/Tavily-fetched URL ever lands in axios's request URL or headers, the prototype-pollution gadgets become live. Upgrade axios to ≥1.15.2 even if you can't reproduce an exploit.

### 12. `scrapy>=2.11.0` floor admits the Referrer-Policy RCE
Of all findings, **Scrapy GHSA-cwxj-rr6w-m6w7 is the single highest-priority pin**: any spider crawling a site that returns a hostile `Referrer-Policy` header will import and call arbitrary Python. Pin `scrapy>=2.14.2,<3` immediately.

### 13. No SBOM / no continuous dep scanning
There is no `cyclonedx-python` or `npm sbom` artifact in the repo, no Dependabot config, and no scheduled `pip-audit`/`npm audit` in CI. For a stack of this size with weekly trading-hours-driven traffic, monthly auto-scan + Dependabot PRs are table stakes.
