"""
Health check endpoints
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from api.deps import get_db
from api.helpers import get_latest_date
from database.models import DailyOHLCV

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """Basic health check - returns 200 OK if service is running"""
    return {"status": "healthy", "version": "3.0.0"}


@router.get("/health/deep")
def deep_health_check(db: Session = Depends(get_db)):
    """
    Deep health check - verifies database, Redis, scheduler, data freshness.
    """
    from scheduler.scheduler import get_scheduler
    from api.cache import cache_manager

    components = {}
    overall_status = "healthy"

    # Check database connectivity
    try:
        db.execute(text("SELECT 1"))
        components["database"] = {
            "status": "healthy",
            "message": "Database connection successful",
        }
    except Exception as e:
        components["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {e}",
        }
        overall_status = "unhealthy"

    # Check Redis
    try:
        if cache_manager.available:
            stats = cache_manager.get_stats()
            components["redis"] = {
                "status": "healthy",
                "hit_rate": f"{stats.get('hit_rate', 0)}%",
                "used_memory": stats.get("used_memory_human", "N/A"),
                "keys": stats.get("keys", 0),
            }
        else:
            components["redis"] = {
                "status": "degraded",
                "message": "Redis unavailable (falling back to no-cache)",
            }
            if overall_status == "healthy":
                overall_status = "degraded"
    except Exception as e:
        components["redis"] = {
            "status": "unhealthy",
            "message": f"Redis check failed: {e}",
        }

    # Check scheduler status
    try:
        sched = get_scheduler()
        if sched and sched.scheduler.running:
            status = sched.get_status()
            components["scheduler"] = {
                "status": "healthy",
                "running": True,
                "job_count": status.get("job_count", 0),
            }
        else:
            components["scheduler"] = {
                "status": "degraded",
                "running": False,
                "message": "Scheduler is not running",
            }
            if overall_status == "healthy":
                overall_status = "degraded"
    except Exception as e:
        components["scheduler"] = {
            "status": "unhealthy",
            "message": f"Scheduler check failed: {e}",
        }
        overall_status = "unhealthy"

    # Check data freshness (latest OHLCV data)
    try:
        latest_date = get_latest_date(db, DailyOHLCV)
        if latest_date:
            age_days = (datetime.now().date() - latest_date).days
            if age_days == 0:
                data_status = "fresh"
            elif age_days <= 3:
                data_status = "acceptable"
            else:
                data_status = "stale"
                if overall_status == "healthy":
                    overall_status = "degraded"
            components["data_freshness"] = {
                "status": "healthy" if data_status == "fresh" else "degraded",
                "latest_date": str(latest_date),
                "age_days": age_days,
                "assessment": data_status,
            }
        else:
            components["data_freshness"] = {
                "status": "unhealthy",
                "message": "No data found in database",
            }
            overall_status = "unhealthy"
    except Exception as e:
        components["data_freshness"] = {
            "status": "unhealthy",
            "message": f"Data freshness check failed: {e}",
        }
        overall_status = "unhealthy"

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
