"""
Health check endpoints
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.deps import get_db
from api.helpers import get_latest_date
from database.models import DailyOHLCV

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """Basic health check - returns 200 OK if service is running"""
    return {"status": "healthy", "version": "3.0.0"}


def _check_database(db: Session) -> tuple[dict, str | None]:
    """Check database connectivity. Returns (component_dict, degraded_status_or_None)."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "message": "Database connection successful"}, None
    except Exception as e:
        logger.warning("Health check: database connection failed: %s", e)
        return {"status": "unhealthy", "message": "Database connection failed"}, "unhealthy"


def _check_redis() -> tuple[dict, str | None]:
    """Check Redis availability. Returns (component_dict, degraded_status_or_None)."""
    from api.cache import cache_manager

    try:
        if cache_manager.available:
            stats = cache_manager.get_stats()
            return {
                "status": "healthy",
                "hit_rate": f"{stats.get('hit_rate', 0)}%",
                "used_memory": stats.get("used_memory_human", "N/A"),
                "keys": stats.get("keys", 0),
            }, None
        else:
            logger.warning("Health check: Redis unavailable (falling back to no-cache)")
            return {
                "status": "degraded",
                "message": "Redis unavailable (falling back to no-cache)",
            }, "degraded"
    except Exception as e:
        logger.warning("Health check: Redis check failed: %s", e)
        return {"status": "unhealthy", "message": f"Redis check failed: {e}"}, None


def _check_scheduler() -> tuple[dict, str | None]:
    """Check scheduler status. Returns (component_dict, degraded_status_or_None)."""
    from scheduler.scheduler import get_scheduler

    try:
        sched = get_scheduler()
        if sched and sched.scheduler.running:
            status = sched.get_status()
            return {
                "status": "healthy",
                "running": True,
                "job_count": status.get("job_count", 0),
            }, None
        else:
            logger.warning("Health check: scheduler is not running")
            return {
                "status": "degraded",
                "running": False,
                "message": "Scheduler is not running",
            }, "degraded"
    except Exception as e:
        logger.warning("Health check: scheduler check failed: %s", e)
        return {"status": "unhealthy", "message": "Scheduler check failed"}, "unhealthy"


def _check_data_freshness(db: Session) -> tuple[dict, str | None]:
    """Check OHLCV data freshness. Returns (component_dict, degraded_status_or_None)."""
    try:
        latest_date = get_latest_date(db, DailyOHLCV)
        if not latest_date:
            return {"status": "unhealthy", "message": "No data found in database"}, "unhealthy"

        age_days = (datetime.now().date() - latest_date).days
        if age_days == 0:
            data_status = "fresh"
        elif age_days <= 3:
            data_status = "acceptable"
        else:
            data_status = "stale"

        return {
            "status": "healthy" if data_status == "fresh" else "degraded",
            "latest_date": str(latest_date),
            "age_days": age_days,
            "assessment": data_status,
        }, "degraded" if data_status == "stale" else None
    except Exception as e:
        logger.warning("Health check: data freshness check failed: %s", e)
        return {"status": "unhealthy", "message": "Data freshness check failed"}, "unhealthy"


@router.get("/health/deep")
def deep_health_check(db: Session = Depends(get_db)):
    """Deep health check - verifies database, Redis, scheduler, data freshness."""
    overall_status = "healthy"

    checks = {
        "database": _check_database(db),
        "redis": _check_redis(),
        "scheduler": _check_scheduler(),
        "data_freshness": _check_data_freshness(db),
    }

    components = {}
    for name, (component, severity) in checks.items():
        components[name] = component
        if severity == "unhealthy":
            overall_status = "unhealthy"
        elif severity == "degraded" and overall_status == "healthy":
            overall_status = "degraded"

    return {
        "status": overall_status,
        "version": "3.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "components": components,
    }


@router.get("/cache/stats")
def cache_stats():
    """Get Redis cache statistics for monitoring"""
    from api.cache import cache_manager

    return cache_manager.get_stats()
