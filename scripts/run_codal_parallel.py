#!/usr/bin/env python3
"""
Parallel Codal scraping + parsing runner with job tracking and resume support.

Phase 1 — Metadata scraping:
  Runs N parallel `codal_financial` spiders, each covering a different Jalali date
  range. Uses Scrapy JOBDIR so that if a worker is interrupted it saves its pending
  request queue and can resume from the exact page it left off.

Phase 2 — Content download + parse:
  Runs N parallel `codal_content` spiders with modulo ID partitioning
  (id % num_workers == worker_id). Content spiders are DB-driven: unprocessed
  announcements remain unprocessed in the DB, so re-running with the same
  worker_id/num_workers automatically picks up where it left off — no JOBDIR needed.

Both phases run concurrently when neither --skip-scrape nor --skip-parse is set,
so all scrapers and parsers are active at the same time.

Job tracking:
  Every run gets a unique run_id and a directory under data/codal_jobs/{run_id}/.
  Each worker writes a JSON state file there (pending → running → completed/failed/interrupted).
  A global index (data/codal_jobs/runs.json) lists all runs.

Usage:
  # Full backfill (5 scrapers then 5 parsers):
  python scripts/run_codal_parallel.py

  # Financial statements only:
  python scripts/run_codal_parallel.py --letter-type 6

  # Only download + parse already-fetched metadata:
  python scripts/run_codal_parallel.py --skip-scrape --batch-size 10000

  # Resume an interrupted run (scrapers continue from saved page, parsers from DB):
  python scripts/run_codal_parallel.py --resume 20260223_143022_a1b2c3

  # List all past runs:
  python scripts/run_codal_parallel.py --list-runs

  # Detailed status of one run:
  python scripts/run_codal_parallel.py --status 20260223_143022_a1b2c3

  # Run inside the container (no docker exec wrapper):
  python scripts/run_codal_parallel.py --no-docker
"""

import argparse
import asyncio
import json
import logging
import signal
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ── Constants ─────────────────────────────────────────────────────────────────

CONTAINER = "main-app-1"

# Host-side jobs directory (mounted into the container as /app/data/codal_jobs)
JOBS_DIR = Path("data/codal_jobs")
# Same path inside the Docker container
JOBS_DIR_CONTAINER = "/app/data/codal_jobs"

# Date range partitions for the metadata scraper.
# Older years are sparse; recent years dense — partitioned accordingly.
DATE_RANGE_PRESETS: dict[int, list[tuple[str, str]]] = {
    1: [("1380/01/01", "1404/12/29")],
    2: [
        ("1380/01/01", "1400/12/29"),
        ("1401/01/01", "1404/12/29"),
    ],
    3: [
        ("1380/01/01", "1397/12/29"),
        ("1398/01/01", "1401/12/29"),
        ("1402/01/01", "1404/12/29"),
    ],
    5: [
        ("1380/01/01", "1393/12/29"),  # Worker 0: pre-2015 (sparse)
        ("1394/01/01", "1397/12/29"),  # Worker 1: 2015–2019
        ("1398/01/01", "1400/12/29"),  # Worker 2: 2019–2022
        ("1401/01/01", "1402/12/29"),  # Worker 3: 2022–2024
        ("1403/01/01", "1404/12/29"),  # Worker 4: 2024–now (densest)
    ],
}

STATUS_ICON = {
    "pending":     "○",
    "running":     "◉",
    "completed":   "✓",
    "failed":      "✗",
    "interrupted": "⚡",
}

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_run_id() -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    rand = uuid.uuid4().hex[:6]
    return f"{ts}_{rand}"


def get_date_ranges(n: int) -> list[tuple[str, str]]:
    """Return N Jalali date range tuples, using presets where available."""
    if n in DATE_RANGE_PRESETS:
        return DATE_RANGE_PRESETS[n]
    # Generate evenly for arbitrary N
    start_year, end_year = 1380, 1404
    span = (end_year - start_year + 1) / n
    ranges = []
    for i in range(n):
        y_start = start_year + int(i * span)
        y_end   = start_year + int((i + 1) * span) - 1
        if i == n - 1:
            y_end = end_year
        ranges.append((f"{y_start}/01/01", f"{y_end}/12/29"))
    return ranges

# ── Job state ─────────────────────────────────────────────────────────────────

class WorkerJob:
    """Persistent state for a single spider worker within a run."""

    def __init__(
        self,
        run_id: str,
        phase: str,           # "scraper" | "parser"
        worker_id: int,
        spider: str,
        label: str,
        spider_args: dict,
        scrapy_jobdir: Optional[str] = None,
    ):
        self.run_id       = run_id
        self.phase        = phase
        self.worker_id    = worker_id
        self.spider       = spider
        self.label        = label
        self.spider_args  = spider_args
        self.scrapy_jobdir = scrapy_jobdir  # container path; None for parsers

        # Mutable state
        self.status       = "pending"   # pending|running|completed|failed|interrupted
        self.started_at: Optional[str]   = None
        self.updated_at: Optional[str]   = None
        self.completed_at: Optional[str] = None
        self.exit_code: Optional[int]    = None
        self.error: Optional[str]        = None

    # ── Persistence ───────────────────────────────────────────────────────────

    @property
    def path(self) -> Path:
        return JOBS_DIR / self.run_id / f"worker_{self.phase}_{self.worker_id}.json"

    def save(self) -> None:
        self.updated_at = _now_iso()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.__dict__, indent=2, default=str))

    @classmethod
    def load(cls, path: Path) -> "WorkerJob":
        data = json.loads(path.read_text())
        job = cls.__new__(cls)
        job.__dict__.update(data)
        return job

    # ── State transitions ─────────────────────────────────────────────────────

    def mark_running(self) -> None:
        self.status     = "running"
        self.started_at = _now_iso()
        self.save()

    def mark_completed(self, exit_code: int) -> None:
        self.status       = "completed" if exit_code == 0 else "failed"
        self.exit_code    = exit_code
        self.completed_at = _now_iso()
        self.save()

    def mark_interrupted(self) -> None:
        self.status = "interrupted"
        self.save()

    @property
    def needs_resume(self) -> bool:
        return self.status in ("interrupted", "failed")


class RunManifest:
    """Global index of all runs stored at data/codal_jobs/runs.json."""

    INDEX = JOBS_DIR / "runs.json"

    @classmethod
    def register(cls, run_id: str, description: str, worker_count: int) -> None:
        entries = cls._load()
        entries.append({
            "run_id":       run_id,
            "created_at":   _now_iso(),
            "description":  description,
            "worker_count": worker_count,
            "status":       "running",
        })
        cls._save(entries)

    @classmethod
    def set_status(cls, run_id: str, status: str) -> None:
        entries = cls._load()
        for e in entries:
            if e["run_id"] == run_id:
                e["status"]     = status
                e["updated_at"] = _now_iso()
                break
        cls._save(entries)

    @classmethod
    def all(cls) -> list[dict]:
        return cls._load()

    @classmethod
    def _load(cls) -> list:
        if cls.INDEX.exists():
            try:
                return json.loads(cls.INDEX.read_text())
            except Exception:
                return []
        return []

    @classmethod
    def _save(cls, entries: list) -> None:
        cls.INDEX.parent.mkdir(parents=True, exist_ok=True)
        cls.INDEX.write_text(json.dumps(entries, indent=2))


# ── Shutdown coordination ─────────────────────────────────────────────────────

# All currently-running subprocesses; populated by run_worker().
_active_procs: list[asyncio.subprocess.Process] = []
_shutdown_requested = False


def _request_shutdown() -> None:
    """Called on SIGINT / SIGTERM.  Sends SIGTERM to all workers so Scrapy
    has a chance to flush its JOBDIR before exiting."""
    global _shutdown_requested
    if _shutdown_requested:
        return
    _shutdown_requested = True
    logger.warning("")
    logger.warning("⚡ Interrupt received — stopping workers gracefully...")
    logger.warning("   Scrapy will save its pending request queue (JOBDIR).")
    for proc in list(_active_procs):
        try:
            proc.terminate()
        except Exception:
            pass


def _register_signal_handlers(loop: asyncio.AbstractEventLoop) -> None:
    """Register SIGINT/SIGTERM handlers in an asyncio-safe way.
    Falls back to signal.signal() on Windows where loop.add_signal_handler()
    is not supported."""
    try:
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, _request_shutdown)
    except (NotImplementedError, AttributeError):
        # Windows
        signal.signal(signal.SIGINT,  lambda s, f: _request_shutdown())
        if hasattr(signal, "SIGTERM"):
            signal.signal(signal.SIGTERM, lambda s, f: _request_shutdown())


# ── Core worker runner ────────────────────────────────────────────────────────

async def run_worker(job: WorkerJob, cmd: list[str]) -> int:
    """
    Launch one Scrapy spider subprocess, stream its stdout, and update the
    job state file throughout.  Returns the process exit code (0 = success,
    -1 = interrupted, 1+ = failure).
    """
    job.mark_running()
    logger.info(f"[{job.label}] ▶ starting")

    proc: Optional[asyncio.subprocess.Process] = None
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        _active_procs.append(proc)

        async for raw in proc.stdout:
            line = raw.decode("utf-8", errors="replace").rstrip()
            if line:
                logger.info(f"[{job.label}] {line}")

        await proc.wait()

    except asyncio.CancelledError:
        if proc:
            try:
                proc.terminate()
                await proc.wait()
            except Exception:
                pass
        job.mark_interrupted()
        logger.warning(f"[{job.label}] ⚡ cancelled → interrupted")
        raise

    except Exception as exc:
        job.error = str(exc)
        job.mark_completed(exit_code=1)
        logger.error(f"[{job.label}] ✗ exception: {exc}")
        return 1

    finally:
        if proc and proc in _active_procs:
            _active_procs.remove(proc)

    # If a graceful shutdown was requested and the process exited non-zero,
    # treat it as interrupted (Scrapy JOBDIR was saved).
    if _shutdown_requested and proc.returncode != 0:
        job.mark_interrupted()
        logger.warning(f"[{job.label}] ⚡ interrupted (JOBDIR saved if scraper)")
        return -1

    job.mark_completed(proc.returncode)
    icon = STATUS_ICON.get(job.status, "?")
    logger.info(f"[{job.label}] {icon} {job.status} (exit {proc.returncode})")
    return proc.returncode


# ── Command builders ──────────────────────────────────────────────────────────

def _build_cmd(
    spider: str,
    spider_args: dict[str, str],
    settings: dict[str, str],
    scrapy_jobdir: Optional[str],
    use_docker: bool,
) -> list[str]:
    parts: list[str] = ["python", "-m", "scrapy", "crawl", spider]
    for k, v in spider_args.items():
        parts += ["-a", f"{k}={v}"]
    for k, v in settings.items():
        parts += ["-s", f"{k}={v}"]
    if scrapy_jobdir:
        parts += ["-s", f"JOBDIR={scrapy_jobdir}"]
    if use_docker:
        return ["docker", "exec", CONTAINER] + parts
    return parts


# ── Job factory helpers ───────────────────────────────────────────────────────

def create_scraper_jobs(
    run_id: str,
    n: int,
    letter_type: int,
    use_docker: bool,
) -> list[tuple[WorkerJob, list[str]]]:
    """Build WorkerJob + cmd pairs for the metadata-scraping phase."""
    pairs: list[tuple[WorkerJob, list[str]]] = []
    for i, (from_date, to_date) in enumerate(get_date_ranges(n)):
        # Container-side JOBDIR path (same volume as host ./data → /app/data)
        scrapy_jobdir = f"{JOBS_DIR_CONTAINER}/{run_id}/scrapy_scraper_{i}"
        label         = f"Scraper-{i}  {from_date} → {to_date}"
        spider_args   = {
            "from_date":    from_date,
            "to_date":      to_date,
            "letter_type":  str(letter_type),
        }
        job = WorkerJob(
            run_id=run_id, phase="scraper", worker_id=i,
            spider="codal_financial", label=label,
            spider_args=spider_args, scrapy_jobdir=scrapy_jobdir,
        )
        job.save()
        cmd = _build_cmd("codal_financial", spider_args, {}, scrapy_jobdir, use_docker)
        pairs.append((job, cmd))
    return pairs


def create_parser_jobs(
    run_id: str,
    n: int,
    batch_size: int,
    letter_type: Optional[int],
    use_docker: bool,
) -> list[tuple[WorkerJob, list[str]]]:
    """Build WorkerJob + cmd pairs for the content-download/parse phase."""
    # Scale down per-worker concurrency to avoid overwhelming codal.ir
    concurrency = str(max(1, 6 // n))
    pairs: list[tuple[WorkerJob, list[str]]] = []
    for i in range(n):
        label = f"Parser-{i}   (id % {n} == {i})"
        spider_args: dict[str, str] = {
            "batch_size":  str(batch_size),
            "worker_id":   str(i),
            "num_workers": str(n),
        }
        if letter_type is not None:
            spider_args["letter_type"] = str(letter_type)
        job = WorkerJob(
            run_id=run_id, phase="parser", worker_id=i,
            spider="codal_content", label=label,
            spider_args=spider_args, scrapy_jobdir=None,
        )
        job.save()
        cmd = _build_cmd(
            "codal_content", spider_args,
            {"CONCURRENT_REQUESTS": concurrency},
            None, use_docker,
        )
        pairs.append((job, cmd))
    return pairs


# ── Phase runner ──────────────────────────────────────────────────────────────

async def run_phase(pairs: list[tuple[WorkerJob, list[str]]], phase_name: str) -> list[int]:
    """Run all workers in a phase concurrently and return their exit codes."""
    logger.info(f"Launching {len(pairs)} workers for {phase_name}...")
    tasks   = [run_worker(job, cmd) for job, cmd in pairs]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    codes   = [r if isinstance(r, int) else 1 for r in results]
    ok      = sum(1 for c in codes if c == 0)
    logger.info(f"{phase_name} finished: {ok}/{len(pairs)} succeeded")
    return codes


# ── Resume helpers ────────────────────────────────────────────────────────────

def load_run_workers(run_id: str) -> list[WorkerJob]:
    run_dir = JOBS_DIR / run_id
    if not run_dir.exists():
        raise FileNotFoundError(f"Run directory not found: {run_dir}")
    jobs = []
    for p in sorted(run_dir.glob("worker_*.json")):
        try:
            jobs.append(WorkerJob.load(p))
        except Exception as exc:
            logger.warning(f"Could not load {p.name}: {exc}")
    return jobs


def build_resume_pairs(
    jobs: list[WorkerJob],
    use_docker: bool,
) -> list[tuple[WorkerJob, list[str]]]:
    """
    For each interrupted/failed worker, rebuild its command:
    - Scrapers:  reuse the same JOBDIR → Scrapy resumes from the saved request queue.
    - Parsers:   re-run with the same worker_id/num_workers → DB picks up unprocessed rows.
    """
    pairs: list[tuple[WorkerJob, list[str]]] = []
    for job in jobs:
        if not job.needs_resume:
            logger.info(f"  skip  [{job.label}] — {job.status}")
            continue
        logger.info(f"  queue [{job.label}] — was {job.status} → will resume")
        # Reset status so run_worker tracks the new attempt correctly
        job.status     = "pending"
        job.exit_code  = None
        job.error      = None
        job.save()

        settings: dict[str, str] = {}
        if job.phase == "parser":
            n = int(job.spider_args.get("num_workers", 1))
            settings["CONCURRENT_REQUESTS"] = str(max(1, 6 // n))

        cmd = _build_cmd(
            job.spider, job.spider_args, settings,
            job.scrapy_jobdir,  # None for parsers
            use_docker,
        )
        pairs.append((job, cmd))
    return pairs


# ── Display helpers ───────────────────────────────────────────────────────────

def _print_run_summary(run_id: str, jobs: list[WorkerJob]) -> None:
    logger.info("")
    logger.info(f"  Run : {run_id}")
    logger.info(f"  {'Phase':<9} {'#':<4} {'Status':<13} Label")
    logger.info("  " + "─" * 66)
    for job in sorted(jobs, key=lambda j: (j.phase, j.worker_id)):
        icon = STATUS_ICON.get(job.status, "?")
        logger.info(
            f"  {job.phase:<9} {job.worker_id:<4} "
            f"{icon} {job.status:<11}  {job.label}"
        )
    counts: dict[str, int] = {}
    for job in jobs:
        counts[job.status] = counts.get(job.status, 0) + 1
    bar = "  ".join(
        f"{STATUS_ICON.get(s, '?')} {s}: {n}"
        for s, n in sorted(counts.items())
    )
    logger.info("  " + "─" * 66)
    logger.info(f"  {bar}")
    logger.info("")


# ── Sub-commands ──────────────────────────────────────────────────────────────

def cmd_list_runs() -> None:
    runs = RunManifest.all()
    if not runs:
        print("No runs recorded yet.")
        return
    print(f"\n  {'Run ID':<30} {'Created':<20} {'W':<4} {'Status':<13} Description")
    print("  " + "─" * 88)
    for r in reversed(runs):
        run_id  = r["run_id"]
        created = r.get("created_at", "")[:19].replace("T", " ")
        n       = r.get("worker_count", "?")
        status  = r.get("status", "?")
        desc    = r.get("description", "")
        icon    = STATUS_ICON.get(status, "?")
        # Also show per-status counts from worker files
        worker_files = list((JOBS_DIR / run_id).glob("worker_*.json")) \
            if (JOBS_DIR / run_id).exists() else []
        counts: dict[str, int] = {}
        for wf in worker_files:
            try:
                s = json.loads(wf.read_text()).get("status", "?")
                counts[s] = counts.get(s, 0) + 1
            except Exception:
                pass
        detail = " ".join(
            f"{STATUS_ICON.get(s,'?')}{c}" for s, c in sorted(counts.items())
        ) if counts else ""
        print(f"  {run_id:<30} {created:<20} {n:<4} {icon} {status:<11} {detail}  {desc}")
    print()


def cmd_status(run_id: str) -> None:
    try:
        jobs = load_run_workers(run_id)
    except FileNotFoundError as exc:
        print(f"Error: {exc}")
        sys.exit(1)
    _print_run_summary(run_id, jobs)
    for job in jobs:
        if job.error:
            logger.info(f"  [{job.label}] error: {job.error}")
        if job.scrapy_jobdir:
            # Map container path back to host path
            host_jdir = JOBS_DIR / run_id / f"scrapy_scraper_{job.worker_id}"
            queue_file = host_jdir / "requests.queue"
            if queue_file.exists():
                logger.info(
                    f"  [{job.label}] JOBDIR saved — "
                    f"resume will continue from saved page"
                )


# ── Async entrypoints ─────────────────────────────────────────────────────────

async def async_main(args: argparse.Namespace) -> None:
    global _shutdown_requested

    loop = asyncio.get_running_loop()
    _register_signal_handlers(loop)

    use_docker         = not args.no_docker
    run_id             = _make_run_id()
    scrape_letter_type = args.letter_type if args.letter_type is not None else -1
    description        = (
        f"scrapers={args.scrapers} parsers={args.parsers} "
        f"batch={args.batch_size} lt={args.letter_type or 'all'}"
    )
    total_workers = (
        (0 if args.skip_scrape else args.scrapers)
        + (0 if args.skip_parse  else args.parsers)
    )

    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    RunManifest.register(run_id, description, total_workers)

    logger.info("=" * 60)
    logger.info("Codal Parallel Runner")
    logger.info(f"  Run ID      : {run_id}")
    logger.info(f"  Job dir     : {JOBS_DIR / run_id}")
    logger.info(f"  Scrapers    : {args.scrapers}"
                + ("  (skipped)" if args.skip_scrape else ""))
    logger.info(f"  Parsers     : {args.parsers}"
                + ("  (skipped)" if args.skip_parse else ""))
    logger.info(f"  Batch size  : {args.batch_size}")
    logger.info(f"  Letter type : {args.letter_type or 'ALL'}")
    logger.info(f"  Docker      : {use_docker}  (container: {CONTAINER})")
    logger.info(f"  Resume cmd  : python scripts/run_codal_parallel.py --resume {run_id}")
    logger.info("=" * 60)

    try:
        # Build job lists up-front so both phases can launch together
        phase_coroutines = []

        if not args.skip_scrape:
            logger.info("")
            logger.info("━" * 60)
            logger.info("  PHASE 1 — METADATA SCRAPING")
            logger.info("━" * 60)
            scraper_pairs = create_scraper_jobs(
                run_id, args.scrapers, scrape_letter_type, use_docker
            )
            phase_coroutines.append(run_phase(scraper_pairs, "Phase 1 (scrapers)"))

        if not args.skip_parse:
            logger.info("")
            logger.info("━" * 60)
            logger.info("  PHASE 2 — CONTENT DOWNLOAD + PARSE")
            logger.info("━" * 60)
            parser_pairs = create_parser_jobs(
                run_id, args.parsers, args.batch_size, args.letter_type, use_docker
            )
            phase_coroutines.append(run_phase(parser_pairs, "Phase 2 (parsers)"))

        if phase_coroutines and not _shutdown_requested:
            await asyncio.gather(*phase_coroutines)

    except asyncio.CancelledError:
        pass

    finally:
        all_jobs    = load_run_workers(run_id)
        interrupted = [j for j in all_jobs if j.status == "interrupted"]
        failed      = [j for j in all_jobs if j.status == "failed"]
        final_status = "interrupted" if (interrupted or failed) else "completed"
        RunManifest.set_status(run_id, final_status)

        _print_run_summary(run_id, all_jobs)

        if interrupted or failed:
            logger.warning(
                f"  {len(interrupted)} interrupted, {len(failed)} failed."
            )
            logger.warning(
                f"  ▶ python scripts/run_codal_parallel.py --resume {run_id}"
            )
        else:
            logger.info("  All workers completed successfully.")


async def async_resume(args: argparse.Namespace) -> None:
    global _shutdown_requested

    run_id     = args.resume
    use_docker = not args.no_docker

    try:
        all_jobs = load_run_workers(run_id)
    except FileNotFoundError:
        logger.error(f"Run not found: {run_id}")
        logger.error(f"Check available runs with:  python scripts/run_codal_parallel.py --list-runs")
        sys.exit(1)

    logger.info(f"Resuming run {run_id}")
    _print_run_summary(run_id, all_jobs)

    pairs = build_resume_pairs(all_jobs, use_docker)
    if not pairs:
        logger.info("Nothing to resume — all workers already completed.")
        return

    logger.info(f"Re-launching {len(pairs)} workers...")

    loop = asyncio.get_running_loop()
    _register_signal_handlers(loop)
    RunManifest.set_status(run_id, "running")

    try:
        await run_phase(pairs, "Resume")
    except asyncio.CancelledError:
        pass
    finally:
        all_jobs    = load_run_workers(run_id)
        interrupted = [j for j in all_jobs if j.status == "interrupted"]
        failed      = [j for j in all_jobs if j.status == "failed"]
        final_status = "interrupted" if (interrupted or failed) else "completed"
        RunManifest.set_status(run_id, final_status)

        _print_run_summary(run_id, all_jobs)

        if interrupted or failed:
            logger.warning(
                f"  ▶ python scripts/run_codal_parallel.py --resume {run_id}"
            )
        else:
            logger.info("  All workers completed successfully.")


# ── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Parallel Codal scraper + parser with job tracking and resume",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("--scrapers",    type=int, default=5,
                   help="Parallel metadata scrapers (default: 5)")
    p.add_argument("--parsers",     type=int, default=5,
                   help="Parallel content parsers (default: 5)")
    p.add_argument("--batch-size",  type=int, default=5000,
                   help="Max announcements per parser worker (default: 5000)")
    p.add_argument("--letter-type", type=int, default=None,
                   help="Filter: 6=financial statements, omit=all types")
    p.add_argument("--skip-scrape", action="store_true",
                   help="Skip Phase 1 (metadata scraping)")
    p.add_argument("--skip-parse",  action="store_true",
                   help="Skip Phase 2 (content download + parse)")
    p.add_argument("--no-docker",   action="store_true",
                   help="Run scrapy directly (use when already inside the container)")
    p.add_argument("--resume",      metavar="RUN_ID",
                   help="Resume interrupted/failed workers from a previous run")
    p.add_argument("--list-runs",   action="store_true",
                   help="List all past runs")
    p.add_argument("--status",      metavar="RUN_ID",
                   help="Show detailed status of a specific run")
    return p


def main() -> None:
    args = _build_parser().parse_args()

    if args.list_runs:
        cmd_list_runs()
        return

    if args.status:
        cmd_status(args.status)
        return

    if args.resume:
        asyncio.run(async_resume(args))
        return

    asyncio.run(async_main(args))


if __name__ == "__main__":
    main()
