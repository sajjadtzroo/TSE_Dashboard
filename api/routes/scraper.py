"""
Scraper control endpoints: run spiders, update all, scheduler status
Protected: requires admin role
"""

import subprocess
import sys

from fastapi import APIRouter, BackgroundTasks, Depends

from api.auth import require_role
from config.spiders import SpiderName

router = APIRouter(tags=["scraper"])


def _run_spider_task(spider: str):
    try:
        subprocess.run(
            [sys.executable, "-m", "scrapy", "crawl", spider, "-s", "LOG_LEVEL=INFO"],
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError as e:
        print(f"Spider {spider} failed: {e}")


@router.post("/api/scraper/run/{spider_name}")
def run_scraper(
    spider_name: SpiderName,
    background_tasks: BackgroundTasks,
    _user=Depends(require_role("admin")),
):
    """Trigger a scraper manually (admin only)"""
    background_tasks.add_task(_run_spider_task, spider_name)
    return {
        "status": "started",
        "spider": spider_name,
        "message": f"Scraper {spider_name} started in background.",
    }


@router.post("/api/scraper/update-all")
def update_all_data(
    background_tasks: BackgroundTasks,
    _user=Depends(require_role("admin")),
):
    """Run both market_watch and instrument_details scrapers (admin only)"""

    def run_all_spiders():
        from concurrent.futures import ThreadPoolExecutor

        spiders = ["market_watch", "instrument_details"]
        with ThreadPoolExecutor(max_workers=2) as executor:
            executor.map(_run_spider_task, spiders)

    background_tasks.add_task(run_all_spiders)
    return {
        "status": "started",
        "spiders": ["market_watch", "instrument_details"],
        "message": "All scrapers started in parallel.",
    }


@router.get("/api/scheduler/status")
def get_scheduler_status():
    """Get scheduler status and job list — reads from Redis (published by scheduler container)."""
    try:
        import json
        import redis as _redis
        from config.settings import REDIS_URL
        r = _redis.Redis.from_url(REDIS_URL, socket_connect_timeout=2)
        raw = r.get("scheduler:status")
        if raw:
            return json.loads(raw)
    except Exception:
        pass
    return {"running": False, "timezone": "Asia/Tehran", "job_count": 0, "jobs": []}
