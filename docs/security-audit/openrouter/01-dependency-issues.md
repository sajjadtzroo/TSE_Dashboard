## Critical

No dependency CVEs/GHSAs were reported as **critical** in the provided `pip-audit` and `npm audit` outputs.

## High

### Axios multi-advisory chain (SSRF/prototype-pollution/header-injection/DoS)
- **Severity:** High
- **Location:** `frontend/package.json:24` (`"axios": "^1.6.7"`), resolved vulnerable per `/tmp/npm_audit.json`
- **Description:**  
  - **IDs:** GHSA-3p68-rc4w-qgx5, GHSA-fvcv-3m26-pcqx, GHSA-w9j2-pvgh-6h63, GHSA-pmwg-cvhr-8vh7, GHSA-3w6x-2g7m-8v23, GHSA-q8qp-cvcw-x6jj, GHSA-xhjh-pmcv-23jw, GHSA-445q-vr5w-6q77, GHSA-m7pr-hjqh-92cm, GHSA-62hf-57xw-28j9, GHSA-5c9x-8gcm-mpgx, GHSA-vf2m-468p-8v99, GHSA-pf86-5x62-jrwf, GHSA-6chq-wfr3-2hj9, GHSA-xx6v-rp6x-q39c  
  - **Affected range(s):** mostly `>=1.0.0 <1.15.1` / `<1.15.2` / `<1.15.0`  
  - **Resolved version:** vulnerable (audit reports affected installed version in `1.0.0 - 1.15.1/2` family)  
  - One-line: axios has multiple SSRF/proxy-bypass/prototype-pollution gadgets enabling request hijack, header injection, and resource-limit bypasses.
  - **Source URLs:**  
    https://github.com/advisories/GHSA-pmwg-cvhr-8vh7  
    https://github.com/advisories/GHSA-q8qp-cvcw-x6jj  
    https://github.com/advisories/GHSA-6chq-wfr3-2hj9
- **Exploit:** If attacker-controlled objects/URLs are passed into axios config or request-building paths, prototype pollution gadgets and NO_PROXY bypasses can route requests to internal targets, tamper headers, or bypass body/content caps.
- **Fix:** Pin axios to a patched release **>=1.15.2** (or newer), regenerate lockfile, and enforce strict input validation for request config objects.

### SheetJS `xlsx` vulnerabilities (prototype pollution + ReDoS) with no auto-fix in audit
- **Severity:** High
- **Location:** `frontend/package.json:43` (`"xlsx": "^0.18.5"`), `/tmp/npm_audit.json` shows `fixAvailable: false`
- **Description:**  
  - **IDs:** GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9  
  - **Affected range:** `<0.19.3` (pollution), `<0.20.2` (ReDoS)  
  - **Resolved version:** `0.18.5` (vulnerable)  
  - One-line: untrusted workbook parsing can trigger prototype pollution or regex-based DoS.
  - **Source URLs:**  
    https://github.com/advisories/GHSA-4r6h-8v6p-xvw6  
    https://github.com/advisories/GHSA-5pgg-2g8v-p4x9
- **Exploit:** A crafted spreadsheet uploaded/imported by users can poison object prototypes in process memory or consume CPU via catastrophic regex behavior, impacting integrity/availability.
- **Fix:** Migrate off vulnerable `xlsx` line (preferred: switch parser library). If you must keep SheetJS, pin to a patched branch/version that closes both advisories and gate/scan uploaded files.

### Scrapy Referrer-Policy import execution issue
- **Severity:** High
- **Location:** `requirements.txt:2` (`scrapy>=2.11.0`), resolved `scrapy 2.13.4` in `/tmp/pip_audit_main_real.json`
- **Description:**  
  - **ID:** GHSA-cwxj-rr6w-m6w7  
  - **Affected range:** `>=1.4.0 <2.14.2`  
  - **Resolved version:** `2.13.4` (vulnerable)  
  - One-line: malicious `Referrer-Policy` header may trigger unsafe import/call behavior in middleware.
  - **Source URL:** https://github.com/advisories/GHSA-cwxj-rr6w-m6w7
- **Exploit:** A hostile target site can return a crafted `Referrer-Policy` that is interpreted as an import path; this can force unexpected callable execution (e.g., process termination), causing crawler disruption.
- **Fix:** Upgrade Scrapy to **>=2.14.2** immediately. Temporary mitigation: disable referrer middleware (`REFERER_ENABLED=False`) or hard-set safe `referrer_policy` meta.

### `langchain-text-splitters` SSRF redirect bypass
- **Severity:** High
- **Location:** `requirements.txt:31` (`langchain-text-splitters>=0.3.0`), resolved `0.3.11`
- **Description:**  
  - **ID/CVE:** GHSA-fv5p-p927-qmxr / CVE-2026-41481  
  - **Affected range:** `<1.1.2`  
  - **Resolved version:** `0.3.11` (vulnerable)  
  - One-line: URL safety check can be bypassed via redirects in `split_text_from_url()`, enabling SSRF.
  - **Source URL:** https://github.com/advisories/GHSA-fv5p-p927-qmxr
- **Exploit:** An attacker-supplied public URL redirects to internal/metadata endpoints; the library fetches redirected content and may return sensitive internal data as parsed documents.
- **Fix:** Upgrade to **>=1.1.2** and stop using `split_text_from_url()` on untrusted input; fetch yourself with strict redirect/IP allowlisting.

### `curl-cffi` SSRF via unrestricted internal targets + redirects
- **Severity:** High
- **Location:** Transitive in `/tmp/pip_audit_main_real.json` (resolved `curl-cffi 0.13.0`, likely via `yfinance` chain from `requirements.txt:57`)
- **Description:**  
  - **ID/CVE:** GHSA-qw2m-4pqf-rmpp / CVE-2026-33752  
  - **Affected range:** `<0.15.0`  
  - **Resolved version:** `0.13.0` (vulnerable)  
  - One-line: attacker-controlled URLs can pivot to internal services through redirect-following SSRF.
  - **Source URL:** https://github.com/advisories/GHSA-qw2m-4pqf-rmpp
- **Exploit:** If any app path fetches user-provided URLs through a stack using curl-cffi, attacker can redirect requests to RFC1918/metadata IPs and read privileged responses.
- **Fix:** Force dependency upgrade to **>=0.15.0** (constraints/lockfile override) and enforce network egress/URL validation in application logic.

### Pillow multiple memory-corruption/DoS issues
- **Severity:** High
- **Location:** Transitive in `/tmp/pip_audit_main_real.json` (resolved `pillow 11.3.0`)
- **Description:**  
  - **IDs/CVEs:** GHSA-cfh3-3jmp-rvhc (CVE-2026-25990), GHSA-whj4-6x5x-4v2j (CVE-2026-40192), GHSA-wjx4-4jcj-g98j (CVE-2026-42308), GHSA-5xmw-vc9v-4wf2 (CVE-2026-42309), GHSA-r73j-pqj5-w3x7 (CVE-2026-42310), GHSA-pwv6-vv43-88gr (CVE-2026-42311)  
  - **Affected range:** mainly `>=10.3.0 <12.2.0` (or advisory-specific)  
  - **Resolved version:** `11.3.0` (vulnerable)  
  - One-line: crafted PSD/FITS/PDF/font/coordinate payloads can trigger OOB write, corruption, or DoS.
  - **Source URL:** https://github.com/advisories?query=pillow
- **Exploit:** Any user-controlled image/PDF processing path that touches Pillow can be crashed or corrupted using malformed files; some advisories include memory-corruption primitives.
- **Fix:** Upgrade Pillow to **>=12.2.0** and restrict accepted formats where possible (`Image.open(..., formats=[...])`).

### `transformers` checkpoint deserialization code-execution risk
- **Severity:** High
- **Location:** Transitive in `/tmp/pip_audit_main_real.json` (resolved `transformers 4.57.6`; direct root is `requirements.txt:43` `sentence-transformers`)
- **Description:**  
  - **ID/CVE:** GHSA-69w3-r845-3855 / CVE-2026-1839  
  - **Affected range:** vulnerable `transformers` line before fixed `5.0.0rc3` (with PyTorch-version caveats in advisory)  
  - **Resolved version:** `4.57.6` (flagged vulnerable)  
  - One-line: unsafe `torch.load()` in trainer RNG-state loading can execute attacker-controlled pickle payloads.
  - **Source URL:** https://github.com/advisories/GHSA-69w3-r845-3855
- **Exploit:** Loading a malicious checkpoint artifact (e.g., `rng_state.pth`) can execute arbitrary Python code during training/resume workflows.
- **Fix:** Upgrade to patched `transformers` branch (>=`5.0.0rc3` when stable in your stack), and never load untrusted checkpoints; enforce signed artifacts.

## Medium

### `python-dotenv` symlink overwrite vulnerability (main env set)
- **Severity:** Medium
- **Location:** `requirements.txt:9` (`python-dotenv>=1.0.0`), resolved `1.2.1` in main audit; dashboard has fixed `1.2.2`
- **Description:**  
  - **ID/CVE:** GHSA-mf9w-mj56-hr94 / CVE-2026-28684  
  - **Affected range:** `<1.2.2`  
  - **Resolved version:** `1.2.1` (main env vulnerable), `1.2.2` (dashboard OK)  
  - One-line: `set_key()/unset_key()` can follow symlinks and overwrite arbitrary writable files.
  - **Source URL:** https://github.com/advisories/GHSA-mf9w-mj56-hr94
- **Exploit:** Local attacker pre-places a symlink as `.env`; when privileged process mutates env keys, target file is overwritten.
- **Fix:** Pin **python-dotenv>=1.2.2** across all environments; avoid runtime `.env` rewrites in privileged contexts.

### `langsmith` tracing header injection / redaction bypass
- **Severity:** Medium
- **Location:** Transitive in `/tmp/pip_audit_main_real.json` (resolved `langsmith 0.4.37`, via langchain stack from `requirements.txt:31`)
- **Description:**  
  - **IDs/CVEs:** GHSA-v34v-rq6j-cj6p (CVE-2026-25528), GHSA-rr7j-v2q5-chgv (CVE-2026-41182)  
  - **Affected range:** `<0.6.3` and `<0.7.31`  
  - **Resolved version:** `0.4.37` (vulnerable)  
  - One-line: untrusted baggage headers can force trace exfil endpoints; streaming token events can bypass output-redaction settings.
  - **Source URLs:**  
    https://github.com/advisories/GHSA-v34v-rq6j-cj6p  
    https://github.com/advisories/GHSA-rr7j-v2q5-chgv
- **Exploit:** Public-facing traced endpoints can be induced to replicate sensitive traces externally; teams relying on `hide_outputs` still leak token streams.
- **Fix:** Upgrade `langsmith` to **>=0.7.31** and sanitize/strip `baggage` headers at ingress.

### Twisted DNS decompression DoS
- **Severity:** Medium
- **Location:** Transitive in `/tmp/pip_audit_main_real.json` (`twisted 25.5.0`, pulled via `scrapy`)
- **Description:**  
  - **ID/CVE:** GHSA-grgv-6hw6-v9g4 / CVE-2026-42304  
  - **Affected range:** vulnerable until fixed pre-release `26.4.0rc2` per advisory  
  - **Resolved version:** `25.5.0` (vulnerable)  
  - One-line: crafted DNS TCP packets can hang Twisted reactor via decompression pointer exhaustion.
  - **Source URL:** https://github.com/advisories/GHSA-grgv-6hw6-v9g4
- **Exploit:** If Twisted DNS components are exposed, a single malformed query can monopolize the event loop and deny service.
- **Fix:** Upgrade Twisted to fixed release once GA; avoid exposing Twisted DNS parser paths unnecessarily.

### `filelock` local symlink race vulnerabilities
- **Severity:** Medium
- **Location:** Transitive in `/tmp/pip_audit_main_real.json` (`filelock 3.19.1`, via ML/tooling deps)
- **Description:**  
  - **IDs/CVEs:** GHSA-w853-jp5j-5j7f (CVE-2025-68146), GHSA-qmgc-5h2g-mvrw (CVE-2026-22701)  
  - **Affected range:** `<3.20.1` and `<3.20.3`  
  - **Resolved version:** `3.19.1` (vulnerable)  
  - One-line: TOCTOU symlink races can truncate/corrupt files or break locking semantics.
  - **Source URLs:**  
    https://github.com/advisories/GHSA-w853-jp5j-5j7f  
    https://github.com/advisories/GHSA-qmgc-5h2g-mvrw
- **Exploit:** Local attacker in shared writable lock directories can race lock creation to redirect truncation/lock behavior to attacker-chosen files.
- **Fix:** Upgrade to **>=3.20.3** and place lock files in restricted (`0700`) directories.

### Frontend dev-toolchain file-read/write/traversal issues (Vite/Rollup/esbuild/picomatch)
- **Severity:** Medium
- **Location:** `frontend/package.json:52` (`vite`), `:54` (`vitest`), transitive nodes in `/tmp/npm_audit.json`
- **Description:**  
  - **IDs:** GHSA-4w7w-66w2-5vf9, GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583, GHSA-mw96-cpmx-2vgc, GHSA-67mh-4wv8-2f99, GHSA-c2c7-rcm5-vvqj, GHSA-3v7f-55p6-f55p  
  - **Affected ranges:** vite `<=6.4.1 || 7.0.0-7.3.1`, rollup `<4.59.0`, esbuild `<=0.24.2`, picomatch `>=4.0.0 <4.0.4`  
  - **Resolved versions:** vulnerable as audited; fix path suggests Vite `8.0.11` (semver-major)
  - One-line: development server/build chain has known traversal, file-read, CORS-like request abuse, and ReDoS weaknesses.
  - **Source URLs:**  
    https://github.com/advisories/GHSA-p9ff-h696-f583  
    https://github.com/advisories/GHSA-mw96-cpmx-2vgc  
    https://github.com/advisories/GHSA-67mh-4wv8-2f99
- **Exploit:** When dev server is exposed beyond localhost or CI/build inputs are attacker-influenced, adversaries can read arbitrary files or trigger resource exhaustion.
- **Fix:** Upgrade Vite/toolchain to patched major versions and never expose dev server to untrusted networks.

## Low

### Requests temp-file path predictability in `extract_zipped_paths()`
- **Severity:** Low
- **Location:** `requirements.txt:17` (`requests>=2.31.0`), resolved `2.32.5`
- **Description:**  
  - **ID/CVE:** GHSA-gc5v-m9x4-r6x2 / CVE-2026-25645  
  - **Affected range:** `<2.33.0`  
  - **Resolved version:** `2.32.5` (vulnerable)  
  - One-line: predictable temp filename in a utility function can permit local file pre-placement attacks.
  - **Source URL:** https://github.com/advisories/GHSA-gc5v-m9x4-r6x2
- **Exploit:** Only relevant if your code directly calls `requests.utils.extract_zipped_paths()` in a shared temp directory where attackers can write.
- **Fix:** Upgrade to **requests>=2.33.0**; as interim, set `TMPDIR` to a restricted directory.

## Info

### Additional Python advisories with limited/conditional impact still present
- **Severity:** Info
- **Location:** `/tmp/pip_audit_main_real.json` (resolved deps)
- **Description:**  
  - `orjson` GHSA-hx9q-6w63-j58v / CVE-2025-67221 (`<3.11.6`, resolved `3.11.5`) recursion-limit DoS risk.  
  - `PyMuPDF` GHSA-cxqh-p2w9-fmr7 / CVE-2026-3029 (`<1.26.7`, resolved `1.26.5`) path traversal/arbitrary write in embedded `get` helper.  
  - `scrapy` GHSA-h7wm-ph43-c39p / CVE-2017-14158 historical memory DoS issue (no fix version listed in audit DB).
  - **Source URLs:**  
    https://github.com/advisories/GHSA-hx9q-6w63-j58v  
    https://github.com/advisories/GHSA-cxqh-p2w9-fmr7  
    https://github.com/advisories/GHSA-h7wm-ph43-c39p
- **Exploit:** These can still be abused in specific high-risk code paths (deep JSON dumps, vulnerable PyMuPDF helper path, large-file scraping/storage interactions).
- **Fix:** Bump `orjson>=3.11.6`, `PyMuPDF>=1.26.7`, and review Scrapy file-handling controls/memory limits.

## Ecosystem-level concerns

- **Unpinned Python dependencies (`>=` only):** `requirements.txt` and `requirements-dashboard.txt` are lower-bound only; this weakens reproducibility and can silently pull future vulnerable/breaking versions.
- **No Python lockfile in scope:** No `requirements.lock`/`pip-tools` compile output provided; harder to guarantee prod parity with audited graph.
- **No npm lockfile shown:** `package-lock.json`/`pnpm-lock.yaml` not provided; exact resolved versions in deployed frontend are unverifiable from source alone.
- **No SBOM/automation evidence in scope:** No visible Dependabot/Renovate policy, OSV/GHSA CI gate, or SBOM generation (CycloneDX/SPDX).
- **Transitive-risk-heavy ML stack:** `sentence-transformers/transformers/torch/langchain` bring serialization and network-fetch footguns; enforce signed artifact and untrusted-input boundaries.
- **Deprecated/legacy package risk:** `aioredis` is effectively superseded by `redis` asyncio support; consider migration to reduce maintenance/security lag.
- **Known parser attack surface:** image/PDF/HTML parsing libs are present (`Pillow`, `PyMuPDF`, `pdf2image`, `lxml` transitive). Keep strict file-type allowlists, size/depth limits, and sandboxing.

## Verified-OK

- Reviewed provided dependency manifests: `requirements.txt`, `requirements-dashboard.txt`, `frontend/package.json`.
- Reviewed provided vulnerability scans as authoritative for resolved versions: `/tmp/pip_audit_main_real.json`, `/tmp/pip_audit_dashboard.json`, `/tmp/npm_audit.json`.
- Confirmed **dashboard Python environment** scan reports **no current vulns** in listed resolved packages.
- Confirmed no currently reported CVEs for key dashboard runtime packages in provided scan (FastAPI/Starlette/Uvicorn/Redis/Sentry SDK paths).
- Confirmed `python-dotenv` is already fixed in dashboard env (`1.2.2`), but not in main env (`1.2.1`).

## Audit caveats

- No application source code was provided, so exploitability is assessed from dependency presence/advisory preconditions, not confirmed vulnerable call paths.
- No lockfiles were provided (`package-lock.json` / pinned Python lock), so manifest intent may differ from actual deployed resolution.
- JSON audit files are minified single-line content; precise line-level references inside those files are not practical.