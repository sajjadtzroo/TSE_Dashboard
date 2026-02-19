"""
Bug Hunter - OpenRouter Codex Edition
======================================
Reads codebase files per zone, sends them to OpenRouter (openai/gpt-5.2-codex)
in 5 parallel API calls, and consolidates results into a Markdown report.

Usage:
    python scripts/bug_hunter_codex.py

Requires:
    pip install openai python-dotenv
    OPENROUTER_API_KEY in .env
"""

import glob as globmod
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

try:
    from openai import OpenAI
except ImportError:
    print("ERROR: openai package not installed. Run: pip install openai")
    sys.exit(1)

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
REPORTS_DIR = PROJECT_ROOT / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

# Load .env
load_dotenv(PROJECT_ROOT / ".env")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "sk-or-v1-your-key-here":
    print("ERROR: OPENROUTER_API_KEY is not set or still has placeholder value.")
    print("Set it in your .env file: OPENROUTER_API_KEY=sk-or-v1-...")
    sys.exit(1)

MODEL = "openai/gpt-5.2-codex"
TIMEOUT_SECONDS = 300  # 5 minutes per API call
TEMPERATURE = 0.1

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

# ── Codebase partitions ──────────────────────────────────────────────

ZONES = [
    {
        "name": "API & Routes",
        "patterns": ["api/*.py", "api/routes/*.py"],
        "focus": "SQL injection, auth bypass, CORS misconfiguration, input validation, "
                 "unvalidated query parameters, missing rate limiting, improper error disclosure",
    },
    {
        "name": "Database & ORM",
        "patterns": ["database/*.py"],
        "focus": "Connection leaks, N+1 queries, transaction safety, missing indexes, "
                 "race conditions in upserts, unclosed sessions, raw SQL injection",
    },
    {
        "name": "Scraper Core",
        "patterns": [
            "tsetmc_scraper/items.py",
            "tsetmc_scraper/pipelines.py",
            "tsetmc_scraper/settings.py",
            "tsetmc_scraper/middlewares.py",
            "tsetmc_scraper/utils.py",
            "tsetmc_scraper/utils/*.py",
            "tsetmc_scraper/parsers/*.py",
        ],
        "focus": "Pipeline errors, memory leaks, data validation gaps, type conversion bugs, "
                 "unhandled exceptions in parsers, resource exhaustion",
    },
    {
        "name": "Spiders",
        "patterns": ["tsetmc_scraper/spiders/*.py"],
        "focus": "HTTP error handling, infinite retry loops, timeout issues, missing error callbacks, "
                 "unhandled JSON decode errors, hardcoded URLs, spider contract violations",
    },
    {
        "name": "RAG & Integration",
        "patterns": ["rag/*.py", "scheduler/*.py", "config/*.py"],
        "focus": "API key exposure, scheduling race conditions, error handling gaps, "
                 "prompt injection, unclosed file handles, missing timeouts on external calls",
    },
]

PROMPT_TEMPLATE = """\
You are a security-focused code auditor. Analyze the "{zone_name}" partition \
of the TSE Dashboard project for bugs and vulnerabilities.

Focus on: {focus}

Bug categories to check: security vulnerabilities, logic errors, resource leaks, \
race conditions, unhandled exceptions, SQL injection, data validation gaps, \
hardcoded secrets, improper error handling, type errors, off-by-one errors.

For each bug found, output EXACTLY this format:

### [{{SEVERITY}}] {{Category}}: {{Brief Title}}
- **File:** `{{path}}`
- **Line(s):** {{line_numbers}}
- **Description:** {{what_is_wrong}}
- **Impact:** {{consequences}}
- **Fix:** {{suggested_solution}}

Severity levels: Critical, High, Medium, Low.
Report ALL bugs found. If no bugs found, say "No bugs found in this partition."
Do NOT output anything other than the bug reports. No preamble, no summary table.

---

Here are the source files to analyze:

{file_contents}
"""


def collect_files(patterns: list[str]) -> str:
    """Read all files matching the glob patterns and return concatenated content."""
    seen = set()
    parts = []

    for pattern in patterns:
        full_pattern = str(PROJECT_ROOT / pattern)
        for filepath in sorted(globmod.glob(full_pattern, recursive=False)):
            fp = Path(filepath)
            if fp.is_file() and fp.suffix == ".py" and fp not in seen:
                seen.add(fp)
                rel = fp.relative_to(PROJECT_ROOT)
                try:
                    content = fp.read_text(encoding="utf-8", errors="replace")
                except Exception as e:
                    content = f"# ERROR reading file: {e}"
                parts.append(f"## File: {rel}\n```python\n{content}\n```")

    if not parts:
        return "# No Python files found for this zone."

    return "\n\n".join(parts)


def run_codex_zone(zone_index: int, zone: dict) -> dict:
    """Send one zone's files to OpenRouter and get bug analysis."""
    result = {
        "zone_index": zone_index,
        "zone_name": zone["name"],
        "output": "",
        "error": None,
        "timed_out": False,
        "duration": 0.0,
        "files_count": 0,
    }

    start = time.time()
    try:
        file_contents = collect_files(zone["patterns"])
        result["files_count"] = file_contents.count("## File:")

        prompt = PROMPT_TEMPLATE.format(
            zone_name=zone["name"],
            focus=zone["focus"],
            file_contents=file_contents,
        )

        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a senior security auditor specializing in Python web applications. "
                               "Be thorough but precise — only report real bugs, not style issues.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=TEMPERATURE,
            timeout=TIMEOUT_SECONDS,
        )

        result["output"] = response.choices[0].message.content.strip()

    except Exception as e:
        err_str = str(e)
        if "timeout" in err_str.lower() or "timed out" in err_str.lower():
            result["timed_out"] = True
            result["error"] = f"Timed out after {TIMEOUT_SECONDS}s"
        else:
            result["error"] = err_str
    finally:
        result["duration"] = time.time() - start

    return result


def count_severities(text: str) -> dict:
    """Count bug severities from the combined output."""
    counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for match in re.finditer(r"###\s*\[(Critical|High|Medium|Low)\]", text):
        sev = match.group(1)
        if sev in counts:
            counts[sev] += 1
    return counts


def build_report(results: list[dict], start_time: datetime, end_time: datetime) -> str:
    """Build the consolidated Markdown report."""
    duration = (end_time - start_time).total_seconds()

    all_output = "\n".join(r["output"] for r in results if r["output"])
    counts = count_severities(all_output)
    total = sum(counts.values())

    timeouts = [r["zone_name"] for r in results if r["timed_out"]]
    errors = [f'{r["zone_name"]}: {r["error"]}' for r in results if r["error"] and not r["timed_out"]]

    lines = [
        "# Bug Hunt Report",
        f"**Model:** {MODEL} (via OpenRouter)",
        f'**Generated:** {end_time.strftime("%Y-%m-%d %H:%M:%S")}',
        f"**Duration:** {duration:.1f}s",
        "",
        "## Summary",
        "| Severity | Count |",
        "|----------|-------|",
        f'| Critical | {counts["Critical"]} |',
        f'| High     | {counts["High"]} |',
        f'| Medium   | {counts["Medium"]} |',
        f'| Low      | {counts["Low"]} |',
        f"| **Total** | **{total}** |",
        "",
        "---",
        "",
    ]

    for r in sorted(results, key=lambda x: x["zone_index"]):
        idx = r["zone_index"] + 1
        lines.append(f'## Zone {idx}: {r["zone_name"]}')
        lines.append(f"*({r['files_count']} files analyzed)*")
        lines.append("")
        if r["timed_out"]:
            lines.append(f"> **TIMEOUT** — this zone timed out after {TIMEOUT_SECONDS}s.")
            lines.append("")
        if r["error"] and not r["timed_out"]:
            lines.append(f'> **ERROR:** {r["error"]}')
            lines.append("")
        if r["output"]:
            lines.append(r["output"])
        elif not r["error"]:
            lines.append("No output received.")
        lines.append("")
        lines.append("---")
        lines.append("")

    lines.extend([
        "## Execution Metadata",
        f'- **Start:** {start_time.strftime("%Y-%m-%d %H:%M:%S")}',
        f'- **End:** {end_time.strftime("%Y-%m-%d %H:%M:%S")}',
        f"- **Timeouts:** {', '.join(timeouts) if timeouts else 'None'}",
        f"- **Errors:** {'; '.join(errors) if errors else 'None'}",
        "",
        "---",
    ])
    durations = ", ".join(f"{r['zone_name']}={r['duration']:.1f}s" for r in results)
    file_counts = ", ".join(f"{r['zone_name']}={r['files_count']}" for r in results)
    lines.append(f"*Per-zone durations: {durations}*")
    lines.append(f"*Per-zone file counts: {file_counts}*")

    return "\n".join(lines)


def main():
    print(f"[bug_hunter_codex] Starting bug hunt across {len(ZONES)} zones...")
    print(f"[bug_hunter_codex] Model: {MODEL}")
    print(f"[bug_hunter_codex] Project root: {PROJECT_ROOT}")
    print(f"[bug_hunter_codex] Timeout per zone: {TIMEOUT_SECONDS}s")
    print()

    # Pre-check: count files per zone
    for zone in ZONES:
        fc = collect_files(zone["patterns"])
        n = fc.count("## File:")
        print(f"  Zone '{zone['name']}': {n} files")
    print()

    start_time = datetime.now()
    results = []

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(run_codex_zone, i, zone): zone
            for i, zone in enumerate(ZONES)
        }

        for future in as_completed(futures):
            zone = futures[future]
            result = future.result()
            status = "TIMEOUT" if result["timed_out"] else ("ERROR" if result["error"] else "OK")
            print(f"  [{status}] Zone: {zone['name']} ({result['duration']:.1f}s)")
            results.append(result)

    end_time = datetime.now()
    report = build_report(results, start_time, end_time)

    timestamp = start_time.strftime("%Y%m%d_%H%M%S")
    report_path = REPORTS_DIR / f"bugs_codex_{timestamp}.md"
    report_path.write_text(report, encoding="utf-8")

    total_bugs = sum(count_severities(report).values())
    print()
    print(f"[bug_hunter_codex] Done! Found {total_bugs} bugs.")
    print(f"[bug_hunter_codex] Report: {report_path}")


if __name__ == "__main__":
    main()
