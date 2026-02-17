"""
Iranian Banks Loan Dashboard - FastAPI Backend
Modular Architecture
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.common.exceptions import AppException, app_exception_handler
from app.common.middleware import CorrelationIdMiddleware, LoggingMiddleware
from app.common.middleware.rate_limit import limiter, setup_rate_limiting, RATE_LIMIT_READ
from app.core.cache import cache_manager
from app.core.config import settings
from app.core.database import database
from app.core.logger import get_logger
from app.modules.analytics import router as analytics_router
from app.modules.auth import router as auth_router
from app.modules.banks import router as banks_router
from app.modules.import_data import router as import_router
from app.modules.loans import router as loans_router
from app.modules.reminders import router as reminders_router
from app.modules.reminders.scheduler import init_scheduler, shutdown_scheduler

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    await database.connect()

    # Initialize database indexes
    try:
        from app.modules.auth.repository import AuthRepository
        from app.modules.banks.repository import BankRepository

        db = database.get_db()

        # Create authentication indexes
        auth_repo = AuthRepository(db)
        await auth_repo.ensure_indexes()

        # Create banks collection indexes
        banks_repo = BankRepository(db)
        await banks_repo.ensure_indexes()

        logger.info("Database indexes initialized")
    except Exception as e:
        logger.warning(f"Failed to create indexes (non-critical): {e}")

    # Initialize Redis cache
    try:
        await cache_manager.connect()
    except Exception as e:
        logger.warning(f"Failed to connect to Redis (non-critical): {e}")

    # Initialize payment reminder scheduler
    try:
        await init_scheduler(database.get_db())
        logger.info("Payment reminder scheduler initialized")
    except Exception as e:
        logger.warning(f"Failed to start scheduler (non-critical): {e}")

    logger.success("Application started successfully")
    yield
    # Shutdown
    logger.info("Shutting down application...")
    shutdown_scheduler()
    await cache_manager.disconnect()
    await database.disconnect()
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    """Create FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        description="API for Iranian banking loan products analytics",
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Exception handlers
    app.add_exception_handler(AppException, app_exception_handler)

    # Middleware - order matters: outermost first
    # 1. CORS (outermost - must run before anything else)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_origin_regex=r"https://.*\.(app\.github\.dev|github\.dev)",
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Content-Type", "Authorization", "X-Correlation-ID"],
        expose_headers=["X-Correlation-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    )

    # 2. Correlation ID (generates/propagates request IDs)
    app.add_middleware(CorrelationIdMiddleware)

    # 3. Logging (logs with correlation ID context)
    app.add_middleware(LoggingMiddleware)

    # 4. Rate limiting (SlowAPI)
    setup_rate_limiting(app)

    # Include routers
    app.include_router(
        auth_router,
        prefix=f"{settings.api_prefix}/auth",
        tags=["Authentication"],
    )
    app.include_router(
        banks_router,
        prefix=f"{settings.api_prefix}/banks",
        tags=["Banks"],
    )
    app.include_router(
        loans_router,
        prefix=f"{settings.api_prefix}/loans",
        tags=["Loans"],
    )
    app.include_router(
        analytics_router,
        prefix=f"{settings.api_prefix}/analytics",
        tags=["Analytics"],
    )
    app.include_router(
        import_router,
        prefix=f"{settings.api_prefix}/import",
        tags=["Import"],
    )
    app.include_router(
        reminders_router,
        prefix=f"{settings.api_prefix}/reminders",
        tags=["Reminders"],
    )

    return app


app = create_app()


@app.get("/")
@limiter.limit(RATE_LIMIT_READ)
async def root(request: Request):
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "api": settings.api_prefix,
    }


@app.get("/health")
@limiter.limit(RATE_LIMIT_READ)
async def health_check(request: Request):
    """Enhanced health check endpoint.

    Returns component-level health status for:
    - Database (MongoDB) connectivity
    - Cache (Redis) connectivity
    - Overall application status
    """
    components = {}

    # --- Database connectivity ---
    try:
        db = database.get_db()
        await db.command("ping")
        components["database"] = {
            "status": "connected",
            "type": "mongodb",
        }
    except Exception as e:
        logger.error(f"Health check - DB failed: {e}")
        components["database"] = {
            "status": "disconnected",
            "type": "mongodb",
            "error": str(e),
        }

    # --- Redis cache connectivity ---
    try:
        if cache_manager.is_available:
            stats = await cache_manager.get_stats()
            components["cache"] = {
                "status": "connected",
                "type": "redis",
                "keys": stats.get("key_count", 0),
                "memory": stats.get("used_memory", "N/A"),
            }
        else:
            components["cache"] = {
                "status": "unavailable",
                "type": "redis",
                "message": "Redis not connected; caching disabled",
            }
    except Exception as e:
        components["cache"] = {
            "status": "error",
            "type": "redis",
            "error": str(e),
        }

    # --- Rate limiter ---
    components["rate_limiter"] = {
        "status": "active",
        "type": "slowapi",
    }

    # Overall status: healthy only if database is connected
    db_ok = components["database"]["status"] == "connected"
    overall = "healthy" if db_ok else "degraded"

    return {
        "status": overall,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.app_version,
        "components": components,
    }
