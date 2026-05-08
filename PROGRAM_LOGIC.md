# Program logic — the bel-mcp design, abstracted for reuse

_What this document is._ A portable explainer of the design pattern bel-mcp implements, written so you can apply the same pattern to a new app/vertical without copying the code. Reading time: ~15 min. After this you should be able to (a) explain why the pieces fit together the way they do, (b) draw the data-flow on a whiteboard, (c) decide which parts to reuse verbatim and which to redesign for your domain._

---

## 1. The mental model in one sentence

**A wiki where every section is stamped with a machine-readable marker, written only by deterministic extractors or LLM synthesis driven by a versioned schema, idempotent across re-runs, and exposed to any LLM client (Claude Desktop, Cowork, custom apps) via MCP.**

The point is to turn "institutional intelligence" — slide decks, spreadsheets, research reports — into a corpus of structured markdown that:

- Can be **re-generated** on demand without losing prior work (idempotency)
- Can be **partially updated** when one source file changes (marker-level granularity)
- Has **provenance** — every claim traces to a file + sheet/slide
- Is **readable by humans and LLMs** (it's just markdown)
- **Compounds** — adding a new client = copy methodology, replace substrate

---

## 2. The marker-block pattern (the load-bearing primitive)

Every wiki page is plain markdown, but inside it sit "marker blocks" delimited by HTML comments:

```markdown
# Brand X

## Compiled Truth
…analyst paragraph…

<!-- phase2d:sales2025 -->
## Sales Performance 2025
…content with tables, citations, any markdown…
| Year | Value |
|---|---|
| 2024 | 980,000 |
| 2025 | 1,387,000 |

**Source:** `BI-Jan2026.xlsm`, sheet `Data ValVol`
<!-- /phase2d:sales2025 -->

<!-- phase2e:zanbil_summer -->
## Household-Panel Reading
…
<!-- /phase2e:zanbil_summer -->
```

### Why this pattern works

1. **Idempotency comes for free.** A writer that "upserts marker X" replaces only the bytes between `<!-- X -->` and `<!-- /X -->`. Running the pipeline twice produces the same file (no duplication, no drift). This is the single most important property — without it, every re-ingest creates conflict.

2. **Markdown stays valid.** HTML comments render as nothing in any markdown viewer, so the wiki is human-readable verbatim. No special viewer needed.

3. **Granular updates are cheap.** Updating one marker doesn't touch the others. You can re-run sales extraction without losing the consumer-voice section.

4. **Markers are addressable.** A schema can declare "marker `phase2d:sales2025` is owned by extractor `xlsm_retail_audit_y2025`". The MCP tools `wiki_get_marker(page, marker)` and `wiki_upsert_marker(page, marker, content)` are then trivial.

5. **Phase taxonomy is portable.** `phaseXY:tag` is a domain convention bel-mcp inherited from V0 (`phase2d` = sales, `phase2e` = consumer panel, etc.). For a different vertical, you'd pick your own taxonomy — but the *pattern* of `<category>:<specifier>` survives.

### The recipe (35 lines of Python)

```python
def upsert_marker(page_path, marker, content):
    text = page_path.read_text() if page_path.exists() else ""
    block = f"<!-- {marker} -->\n{content}\n<!-- /{marker} -->"
    pattern = re.compile(rf"<!--\s*{re.escape(marker)}\s*-->.*?<!--\s*/{re.escape(marker)}\s*-->", re.DOTALL)
    if pattern.search(text):
        new_text = pattern.sub(block, text)  # replace
    else:
        new_text = text + ("\n\n" if text and not text.endswith("\n\n") else "") + block + "\n"  # append
    page_path.write_text(new_text)
```

That's it. The whole writer is one function. Every other tool stacks on top.

---

## 3. The four-layer architecture

```
                ┌──────────────────────────────┐
   Layer 4      │   MCP / DXT transport        │  Claude Desktop, Cowork, custom apps
                │   (stdio | streamable-http)  │  call tools and pass JSON args
                └──────────────────────────────┘
                          ▲
                          │  tools = thin wrappers
                ┌──────────────────────────────┐
   Layer 3      │   Tool surface               │  list_contexts, prepare_context,
                │   (MCP tool registrations)   │  wiki_get_*, wiki_upsert_marker,
                └──────────────────────────────┘  rebuild_wikis, list_skills, …
                          ▲
                          │
                ┌──────────────────────────────┐
   Layer 2      │   Domain logic               │  extractors, marker writer,
                │   (per-vertical Python)      │  synthesis_status, skills
                └──────────────────────────────┘
                          ▲
                          │  reads
                ┌──────────────────────────────┐
   Layer 1      │   Schema YAML                │  declares brands, sources,
                │   (data, not code)           │  markers, reconciliation rules
                └──────────────────────────────┘
                          ▲
                          │  describes
                ┌──────────────────────────────┐
   Layer 0      │   Raw source files           │  xlsx, pptx, pdf, csv, …
                │   (customer-provided)        │  in <workspace>/raw/
                └──────────────────────────────┘
```

### Layer 0 — Raw sources

Customer-provided files in a workspace directory. The pipeline reads, never writes here.

### Layer 1 — Schema

A versioned YAML that declares (a) what entities exist (brands, sources, methodologies), (b) what markers each entity should have, (c) what extractor produces each marker, (d) reconciliation rules between sources.

**The schema is data, not code.** It can be edited without rebuilding the bundle. This is what lets the same code serve many tenants — change the schema, change the domain.

### Layer 2 — Domain logic

Python that reads the schema and:
- Maps `(entity, marker) → extractor function` (e.g., `(rouzaneh, phase2d:sales2025) → xlsm_retail_audit_extractor("Cheese Bel Monthly BI", "Data ValVol", filter="Brand=Rouzaneh")`)
- Provides the marker-block writer
- Provides read tools (get marker, list markers, query content)
- Hosts skills — higher-level workflows that orchestrate multiple tools

### Layer 3 — Tool surface

Thin wrappers around layer 2 that the MCP framework registers as tools. Each tool is one decorator on one function. The tool surface is what the LLM client sees.

Naming convention:
- `<noun>_<verb>` for entity operations: `wiki_get_marker`, `wiki_upsert_marker`, `schema_describe_entity`
- `<verb>_<noun>` for actions: `prepare_context`, `extract_pptx`, `rebuild_wikis`
- Plurals for listings: `list_contexts`, `list_skills`

### Layer 4 — Transport

The MCP framework handles stdio (for Claude Desktop / DXT installs) and streamable-http (for hosted/Cowork connectors). Same tools, same logic — only the wire protocol changes.

---

## 4. The data flow

```
   raw files (Layer 0)
        │
        │  extractor reads filtered cells/slides
        ▼
   prepare_context(brand, marker)  ──►  payload + synthesis_hint
        │                                       │
        ├───── payload is "write-ready"          │
        │      (suggested_markdown present)      │
        │      ────► wiki_upsert_marker          │
        │                                       │
        └───── payload needs LLM synthesis ◄────┘
               ────► caller's LLM synthesizes
                      from payload + hint
                      ────► wiki_upsert_marker

   After every batch of writes:
        │
        ▼
   graphify.regenerate_graph()  ──►  _graph.json + _graph.md
   (auto-side-effect — wikis just changed,
   so the cross-reference graph regenerates)
```

### The synthesis loop pattern

This is the trick that lets the same MCP serve both deterministic and creative work. The server-side function returns either:

- **A write-ready payload** (`suggested_markdown` field present) — caller just calls `wiki_upsert_marker` with it. No LLM needed for this marker.
- **A raw-data payload + synthesis_hint string** — caller's LLM (Claude in chat, Trend's API key in production) reads the payload, synthesizes prose against the hint, and calls `wiki_upsert_marker` with the result.

The MCP server itself is **never** the LLM. It hands the LLM the data + the instructions and lets the LLM do the writing. This means:

- The server has no API key requirement (zero cost to host)
- The customer's existing Claude subscription powers the synthesis
- Each marker can independently choose deterministic vs LLM-synthesized

The driver is `synthesis_next()`:

```python
while True:
    nxt = synthesis_next(brand)
    if nxt["pending_count"] == 0:
        break
    # LLM (Claude) reads nxt["payload"] + nxt["synthesis_hint"], writes content
    wiki_upsert_marker(nxt["page"], nxt["marker"], synthesized_content)
```

The loop terminates cleanly because `synthesis_next` reports `pending_count` based on what's *not yet on disk*. Idempotency means re-running the loop is safe.

---

## 5. Idempotency invariant (the load-bearing rule)

**Running the entire pipeline N times against the same inputs produces the same output bytes.** This holds because:

1. The marker-block writer replaces, never appends-when-already-present
2. Extractors are pure functions of (raw file content + schema params)
3. Synthesis is given a deterministic seed via the synthesis_hint (LLM output isn't byte-deterministic, but the *pending set* is, so the same N markers get re-synthesized in the same order with the same prompts)
4. The graphify step re-derives the graph from the current wiki state (no incremental state to drift)

If your reuse breaks idempotency, you've broken the design. Common ways to break it:
- Appending instead of upserting
- Mutable global state in extractors
- Including timestamps in marker bodies (last_compiled in frontmatter is OK because frontmatter is outside marker blocks)
- LLM synthesis without a stable hint

---

## 6. The skills framework

Tools are atomic operations. **Skills** are higher-level curated workflows that combine several tools to accomplish a domain task. Examples in bel-mcp:

- `compiled_truth(brand)` — read every marker on a brand's page, derive frontmatter (sources cited, years covered), generate page-level scaffolding
- `graphify(wiki_dir, narrate=true)` — regenerate the cross-reference graph + optionally LLM-narrate

### Skill structure

```
skills/
  __init__.py        — registry: discover_skills(), list_skills(), run_skill(name, params)
  graphify/
    skill.yaml       — metadata (name, version, description, parameters, returns)
    skill.py         — class extending Skill with run(**params) -> dict
  compiled_truth/
    skill.yaml
    skill.py
```

### Why skills matter

1. **Hot-reloadable.** The registry calls `importlib.reload()` on every dispatch. Edit a skill's Python, next call picks it up. No process restart.

2. **Discoverable.** `list_skills()` returns name + version + 1-line description. The LLM client sees them in the tool list and can call `describe_skill(name)` for details.

3. **Centralized.** Skills live in the bundle. Hosting a remote MCP means new skills propagate to every connected client without a DXT reinstall.

4. **The synthesis loop pattern.** Same as `synthesis_next` — skills return `{payload, synthesis_hint}` and the caller's LLM does the prose. Server stays cheap.

---

## 7. Auto-side-effects (the graphify pattern)

Some work shouldn't require the user to remember to run it. Generating the cross-reference graph between wikis is a deterministic side-effect of any wiki change. So:

```python
def rebuild_wikis(...):
    # ... do the writes ...
    try:
        graph_result = graphify.regenerate_graph(wiki_dir)
    except Exception as e:
        graph_result, graph_error = None, repr(e)
    return {..., "graph": graph_result, "graph_error": graph_error}
```

**Rules**:
1. The side-effect is **non-fatal** — wrap in try/except so a graph failure never aborts the wiki write
2. The side-effect is **deterministic** — pure function of current state, not incremental
3. The side-effect's output is **co-located** with the inputs (graphify writes `_graph.md` into the wiki dir, prefixed with `_` so it's filtered from the brand-scan)
4. The side-effect's result is **reported in the return value** of the user-facing tool, not hidden

Apply the same pattern to any "should be obvious" derivative work.

---

## 8. Transport: how clients reach the MCP

The MCP protocol is request/response. Three transports the bel-mcp supports:

| Transport | Use | Auth |
|---|---|---|
| **stdio** | Claude Desktop with DXT install (most common customer-side) | None (local process) |
| **streamable-http** | Cowork remote-MCP, custom apps over HTTPS | Bearer-token API key OR OAuth 2.1 + DCR + PKCE + JWT |
| **sse** | Legacy; deprecated for hosted | None |

For the hosted (streamable-http) path, two auth modes coexist:
- **Static API key** — simple, fine for trusted clients (DXT, Trend internal)
- **OAuth 2.1 + DCR** — required by Anthropic Custom Connector spec (Cowork). The MCP exposes `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource` (RFC 9728), `/register` (DCR), `/authorize`, `/token`. Issued JWTs are HS256-signed.

The middleware accepts either — clients pick which one based on what they support.

---

## 9. What's generic vs vertical-specific

To port the bel-mcp design to a different domain, here's the abstraction line:

### Generic (reuse verbatim)

| Component | What it does |
|---|---|
| Marker-block writer (`upsert_marker`) | One function, ~35 LOC, zero dependencies |
| Marker-block reader tools (`wiki_get_marker`, `wiki_get_page`, `wiki_query`, `wiki_list_markers`) | Path resolution + regex |
| `wiki_get_provenance`, `wiki_get_freshness` | Frontmatter parsing |
| Skills framework | Hot-reload registry via importlib |
| Graphify | Generic — parses `[[Name]]` mentions from any wiki dir |
| MCP tool registrations + transport selection | Boilerplate |
| OAuth/auth scaffolding | Replace branding strings only |
| DXT bundle build script | Replace name + entry point only |

### Vertical-specific (rewrite per domain)

| Component | What it does | What changes |
|---|---|---|
| Schema YAML | Declares entities, sources, markers, reconciliation rules | Entirely. This IS the domain. |
| Extractors | Per-(entity, marker) Python functions that read raw files | Source-file shape determines the code |
| Synthesis hints | Per-marker prose telling the LLM how to write | Voice + tone of your domain |
| Skill bodies | Workflows like `compiled_truth` that bake in V0 voice | Replace with your domain's analyst voice |
| Brand/entity registry | Hardcoded list of pages | Move to schema YAML for portability |
| Phase taxonomy (`phase2d`, `phase2e`, …) | Marker namespacing | Pick your own |

### The future-state goal

Make Layer 2 (domain logic) generic too — schema YAML drives extractor dispatch, no per-marker Python. At that point a new client onboards by writing YAML, not Python. This is the `trend_mcp_core` + per-tenant plugin split flagged in `MULTI_TENANT.md`.

---

## 10. How to port this design to a new app

A 6-step recipe.

### Step 1 — Decide your marker taxonomy

Pick a `category:specifier` convention. For a different vertical:
- A legal-research app: `case:facts`, `case:holding`, `case:dissent`, `statute:elements`
- A clinical-trials app: `study:design`, `study:enrollment`, `arm:dosing`, `endpoint:primary`
- A product-research app: `feature:spec`, `feature:competitor_table`, `interview:quote`

The taxonomy is the spine of the schema. Get it right before writing any code.

### Step 2 — Implement the marker-block writer

Copy the 35-line recipe from §2. This is non-negotiable shared infrastructure. The same writer should serve every entity in your domain.

### Step 3 — Define your schema YAML

```yaml
schema_version: 1.0.0
vertical: clinical_trials
entities:
  - id: study_xyz
    type: study
    page: Study_XYZ
    markers:
      - id: study:design
        extractor: pdf_section_extractor
        params: { file: "protocol.pdf", sections: ["Study Design"] }
      - id: study:enrollment
        extractor: csv_aggregate_extractor
        params: { file: "enrollment.csv", group_by: "site" }
```

### Step 4 — Build extractors as pure functions of (file, params)

```python
def pdf_section_extractor(file, sections):
    text = pdfplumber.open(file).extract_text()
    extracted = filter_sections(text, sections)
    return {"suggested_markdown": format_as_markdown(extracted), "source_file": file}
```

Either return write-ready (`suggested_markdown`) or raw-data + synthesis_hint. Same contract as bel-mcp.

### Step 5 — Wrap as MCP tools

```python
@mcp.tool()
def wiki_upsert_marker(page, marker, content): ...
@mcp.tool()
def prepare_context(entity, marker): ...
@mcp.tool()
def synthesis_next(entity=None): ...
@mcp.tool()
def rebuild_wikis(entity=None, dry_run=False): ...
```

The tool layer is thin. Each tool is one decorator on one function.

### Step 6 — Add the auto-side-effect (whatever your "graphify" is)

Find the work that should obviously happen after a wiki change. For legal research, maybe a citation graph. For clinical trials, maybe an enrollment dashboard. Wire it as a non-fatal side-effect of `rebuild_wikis`.

---

## 11. Anti-patterns to avoid

Hard-won lessons from this codebase, listed so you don't repeat them:

1. **Don't hardcode filenames in extractor code.** Use content-fingerprint matching (sheet names for xlsx, slide-title regex for pptx). When the customer renames the file, the pipeline shouldn't break. (We hit this; the fix is in flight.)

2. **Don't use `os.environ.get("X")` as a truthy check.** DXT user_config can leak literal strings like `"${user_config.extracted_path}"` if optional fields are blank. Use a centralized `env_value_or_none()` helper that rejects empty + placeholder strings.

3. **Don't diverge read/write paths.** If `rebuild_wikis` writes to `BEL_WIKIS_WRITE_PATH` but `wiki_get_page` reads from `BEL_WIKIS_PATH`, the customer sees "0 pages available" after a successful write. Read tools must use the same priority chain as the writer.

4. **Don't do server-side LLM synthesis at the start.** Let the customer's existing LLM (Claude Desktop, Cowork) do the synthesis. Server costs $0 to host. Add server-side synthesis later when you have an API-key billing path.

5. **Don't make synthesis blocking on a single LLM.** The synthesis_next loop returns one marker at a time so the loop is interruptible, restartable, and parallelizable.

6. **Don't append metadata to marker bodies.** `<!-- phase2d:sales2025 generated_at=2026-05-07 -->` breaks the regex and the upsert. Frontmatter is the right place for time/source metadata.

7. **Don't auto-trigger the side-effect on every single marker write.** Trigger after a *batch* of writes (`rebuild_wikis`), not after every `wiki_upsert_marker` call. Otherwise a synthesis loop of N markers triggers N graph regens.

8. **Don't bundle a prebuilt artifact without a content-fingerprint check.** When you ship a DXT, write a smoke test that runs against the bundled Python (not your dev Python). Otherwise you'll ship a build that imports fine on your machine and fails on the customer's.

---

## 12. Where to look in this codebase for each piece

For someone reading this doc next to the code:

| Concept | File |
|---|---|
| Marker-block writer | `bel_mcp/tools/writer.py` |
| Marker-block readers | `bel_mcp/tools/wiki.py` |
| Path resolution chain | `bel_mcp/_paths.py` + `wiki._resolve_read_dir` |
| Extractor registry | `bel_mcp/tools/context.py` |
| Synthesis loop | `bel_mcp/tools/synthesis.py` |
| Batch rebuild + auto-graphify | `bel_mcp/tools/batch.py` |
| Skills registry | `bel_mcp/skills/__init__.py` |
| Example skills | `bel_mcp/skills/compiled_truth/`, `bel_mcp/skills/graphify/` |
| Graphify (auto-side-effect) | `bel_mcp/graphify.py` |
| MCP tool registrations | `bel_mcp/server.py` |
| Auth middleware | `bel_mcp/middleware.py` |
| OAuth 2.1 + DCR | `bel_mcp/oauth.py` |
| Schema (Bel-specific) | `Bel/V0/Schema/bel_schema_v1.yaml` |
| DXT bundle build | `Bel/V1/dxt/build.sh` |
| DXT manifest | `Bel/V1/dxt/manifest.json` |
| Multi-tenant pattern | `Bel/V1/MULTI_TENANT.md` |

---

## 13. The single line to take with you

If you remember one thing from this doc:

> **A marker-stamped wiki + a deterministic-or-synthesis-hint extractor + an idempotent upsert writer is enough to build a productizable institutional-intelligence layer that any LLM client can read and any vertical can fill.**

Everything else — the MCP transport, the OAuth dance, the skills framework, the graphify side-effect — is plumbing around that core idea.
