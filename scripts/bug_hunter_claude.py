"""
Bug Hunter - Claude Code CLI Edition
=====================================
Spawns 5 parallel Claude Code subprocesses, one per codebase zone,
to scan for bugs and vulnerabilities. Consolidates results into a
Markdown report under reports/.

Usage:
    python scripts/bug_hunter_claude.py
"""

import os
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
import re

PROJECT_ROOT = Path(__file__).resolve().parent.parent
REPORTS_DIR = PROJECT_ROOT / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

TIMEOUT_SECONDS = 600  # 10 minutes per partition

# ── Codebase partitions ──────────────────────────────────────────────

ZONES = [
    {
        "name": "API & Routes",
        "globs": "api/*.py, api/routes/*.py",
        "focus": "SQL injection, auth bypass, CORS misconfiguration, input validation, "
                 "unvalidated query parameters, missing rate limiting, improper error disclosure",
    },
    {
        "name": "Database & ORM",
        "globs": "database/*.py",
        "focus": "Connection leaks, N+1 queries, transaction safety, missing indexes, "
                 "race conditions in upserts, unclosed sessions, raw SQL injection",
    },
    {
        "name": "Scraper Core",
        "globs": "tsetmc_scraper/items.py, tsetmc_scraper/pipelines.py, "
                 "tsetmc_scraper/settings.py, tsetmc_scraper/middlewares.py, "
                 "tsetmc_scraper/utils.py, tsetmc_scraper/utils/*.py, tsetmc_scraper/parsers/*.py",
        "focus": "Pipeline errors, memory leaks, data validation gaps, type conversion bugs, "
                 "unhandled exceptions in parsers, resource exhaustion",
    },
    {
        "name": "Spiders",
        "globs": "tsetmc_scraper/spiders/*.py",
        "focus": "HTTP error handling, infinite retry loops, timeout issues, missing error callbacks, "
                 "unhandled JSON decode errors, hardcoded URLs, spider contract violations",
    },
    {
        "name": "RAG & Integration",
        "globs": "rag/*.py, scheduler/*.py, config/*.py",
        "focus": "API key exposure, scheduling race conditions, error handling gaps, "
                 "prompt injection, unclosed file handles, missing timeouts on external calls",
    },
]

PROMPT_TEMPLATE = """\
You are a security-focused code auditor. Analyze the "{zone_name}" partition \
of the TSE Dashboard project for bugs and vulnerabilities.

Read ALL Python files matching these patterns: {globs}

Focus on: {focus}

Bug categories to check: security vulnerabilities, logic errors, resource leaks, \
race conditions, unhandled exceptions, SQL injection, data validation gaps, \
hardcoded secrets, improper error handling, type errors, off-by-one errors.

For each bug found, output EXACTLY this format:

### [SEVERITY] Category: Brief Title
- **File:** `path`
- **Line(s):** line_numbers
- **Description:** what is wrong
- **Impact:** consequences
- **Fix:** suggested solution

Where SEVERITY is one of: Critical, High, Medium, Low.
Report ALL bugs found. If no bugs found, say "No bugs found in this partition."
Do NOT output anything other than the bug reports. No preamble, no summary table.\
"""


def run_claude_zone(zone_index: int, zone: dict) -> dict:
    """Run a single Claude Code subprocess for one zone."""
    prompt = PROMPT_TEMPLATE.format(
        zone_name=zone["name"],
        globs=zone["globs"],
        focus=zone["focus"],
    )

    # Resolve full path to claude CLI once (avoids needing shell=True)
    claude_bin = shutil.which("claude")
    if not claude_bin:
        return {
            "zone_index": zone_index,
            "zone_name": zone["name"],
            "output": "",
            "error": "claude CLI not found. Install: npm install -g @anthropic-ai/claude-code",
            "timed_out": False,
            "duration": 0.0,
        }

    # Strip CLAUDECODE env var so subprocess doesn't think it's nested
    env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

    result = {
        "zone_index": zone_index,
        "zone_name": zone["name"],
        "output": "",
        "error": None,
        "timed_out": False,
        "duration": 0.0,
    }

    start = time.time()
    try:
        # Pass prompt as -p argument directly (no shell=True, no quoting issues)
        proc = subprocess.run(
            [claude_bin, "-p", prompt, "--dangerously-skip-permissions"],
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            cwd=str(PROJECT_ROOT),
            env=env,
            encoding="utf-8",
            errors="replace",
        )
        result["output"] = (proc.stdout or "").strip()
        # Only mark as error if there's no output AND returncode is non-zero
        if proc.returncode != 0 and not result["output"]:
            result["error"] = (proc.stderr or "").strip() or f"Exit code {proc.returncode}"
    except subprocess.TimeoutExpired:
        result["timed_out"] = True
        result["error"] = f"Timed out after {TIMEOUT_SECONDS}s"
    except Exception as e:
        result["error"] = str(e)
    finally:
        result["duration"] = time.time() - start

    return result


def count_severities(text: str) -> dict:
    """Count bug severities from the combined output.

    Handles many formats Claude might use:
      ### [Critical] Category: Title
      ### CRITICAL - Title
      ## CRITICAL Findings  (section headers — don't count these)
      ### 1. Title  (numbered under a CRITICAL section)
      | C1 | Critical | ... |  (table rows)
    """
    counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}

    # Pattern 1: Explicit bracket format  ### [Critical] ...
    for m in re.finditer(r"###\s*(?:#\s*)?\[(Critical|High|Medium|Low)\]", text, re.IGNORECASE):
        counts[m.group(1).capitalize()] += 1

    # If bracket format found any, use those counts
    if sum(counts.values()) > 0:
        return counts

    # Pattern 2: Count numbered items under severity section headers
    # e.g. "## CRITICAL Findings\n### 1. ...\n### 2. ..."
    current_sev = None
    for line in text.splitlines():
        # Check for section headers like "## CRITICAL Findings" or "## High Severity"
        header = re.match(r"^##\s+(Critical|High|Medium|Low)\b", line, re.IGNORECASE)
        if header:
            current_sev = header.group(1).capitalize()
            continue
        # Count ### items under current severity section
        if current_sev and re.match(r"^###\s+\d+\.", line):
            counts[current_sev] += 1
            continue
        # Reset section on new ## header
        if re.match(r"^##\s+", line) and not header:
            current_sev = None

    # Pattern 3: Table rows like "| C1 | Critical | ..."
    if sum(counts.values()) == 0:
        for m in re.finditer(r"\|\s*\w+\s*\|\s*(Critical|High|Medium|Low)\s*\|", text, re.IGNORECASE):
            counts[m.group(1).capitalize()] += 1

    return counts


def build_report(results: list[dict], start_time: datetime, end_time: datetime) -> str:
    """Build the consolidated Markdown report."""
    duration = (end_time - start_time).total_seconds()

    # Combine all outputs for severity counting
    all_output = "\n".join(r["output"] for r in results if r["output"])
    counts = count_severities(all_output)
    total = sum(counts.values())

    timeouts = [r["zone_name"] for r in results if r["timed_out"]]
    errors = [f'{r["zone_name"]}: {r["error"]}' for r in results if r["error"] and not r["timed_out"]]

    lines = [
        "# Bug Hunt Report",
        f'**Model:** Claude Code CLI (claude -p)',
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
        lines.append("")
        if r["timed_out"]:
            lines.append(f'> **TIMEOUT** — this zone was killed after {TIMEOUT_SECONDS}s.')
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
    lines.append(f"*Per-zone durations: {durations}*")

    return "\n".join(lines)


def main():
    print(f"[bug_hunter_claude] Starting bug hunt across {len(ZONES)} zones...")
    print(f"[bug_hunter_claude] Project root: {PROJECT_ROOT}")
    print(f"[bug_hunter_claude] Timeout per zone: {TIMEOUT_SECONDS}s")
    print()

    start_time = datetime.now()
    results = []

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(run_claude_zone, i, zone): zone
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
    report_path = REPORTS_DIR / f"bugs_claude_{timestamp}.md"
    report_path.write_text(report, encoding="utf-8")

    total_bugs = sum(count_severities(report).values())
    print()
    print(f"[bug_hunter_claude] Done! Found {total_bugs} bugs.")
    print(f"[bug_hunter_claude] Report: {report_path}")


if __name__ == "__main__":
    main()
