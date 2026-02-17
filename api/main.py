"""
FastAPI main application
Provides REST API for TSETMC stock market data (PostgreSQL backend)
"""
import os
import sys
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

# Add parent directory to path to import database modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import CORS_ORIGINS_LIST, SCHEDULER_ENABLED, SERVE_STATIC, REDIS_ENABLED, ENABLE_LOANS

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup/shutdown lifecycle for all services."""
    # ── Startup ──
    from database.connection import get_db_manager
    from config.settings import DATABASE_URL
    get_db_manager(DATABASE_URL).create_tables()

    # Check Alembic migration head
    try:
        from alembic.config import Config as AlembicConfig
        from alembic.script import ScriptDirectory
        from alembic.runtime.migration import MigrationContext
        alembic_cfg = AlembicConfig(str(Path(__file__).parent.parent / "alembic.ini"))
        script = ScriptDirectory.from_config(alembic_cfg)
        head_rev = script.get_current_head()
        engine = get_db_manager(DATABASE_URL)._engine
        with engine.connect() as conn:
            migration_ctx = MigrationContext.configure(conn)
            current_rev = migration_ctx.get_current_revision()
        if current_rev != head_rev:
            logger.warning(
                f"Database migrations behind: current={current_rev}, head={head_rev}. "
                "Run 'alembic upgrade head' to apply pending migrations."
            )
    except Exception as e:
        logger.debug(f"Alembic migration check skipped: {e}")

    # Redis
    from api.cache import cache_manager
    cache_manager.connect()

    # Cache warming
    if cache_manager.available:
        _warm_caches()

    # Scheduler (only if enabled — disabled for multi-worker API instances)
    _tsetmc_scheduler = None
    if SCHEDULER_ENABLED:
        from scheduler.scheduler import TSETMCScheduler
        _tsetmc_scheduler = TSETMCScheduler()
        _tsetmc_scheduler.setup_jobs()
        _tsetmc_scheduler.start()

    yield

    # ── Shutdown ──
    if _tsetmc_scheduler:
        _tsetmc_scheduler.shutdown()
    cache_manager.disconnect()


def _warm_caches():
    """Pre-populate frequently requested caches on startup."""
    try:
        from api.cache import cache_manager
        from database.connection import get_db_manager
        from config.settings import DATABASE_URL
        from database.models import DailyOHLCV, Security
        from sqlalchemy import func

        mgr = get_db_manager(DATABASE_URL)
        with mgr.get_session() as db:
            # Warm latest_date for DailyOHLCV
            result = db.query(func.max(DailyOHLCV.date)).scalar()
            if result:
                cache_manager.set_meta(f"latest_date:daily_ohlcv", str(result), ttl=120)
            logger.info("Cache warming completed")
    except Exception as e:
        logger.warning(f"Cache warming failed (non-fatal): {e}")


app = FastAPI(
    title="TSETMC Stock Market API",
    description="Real-time and historical data for Tehran Stock Exchange",
    version="3.0.0",
    lifespan=lifespan,
)


# ── Global exception handlers ─────────────────────────────────────────────────
def _get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", None) or request.headers.get("x-request-id", "")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.status_code, "message": exc.detail, "request_id": _get_request_id(request)}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": {"code": 422, "message": "Validation error", "details": exc.errors(), "request_id": _get_request_id(request)}},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": 500, "message": "Internal server error", "request_id": _get_request_id(request)}},
    )


# ── Monitoring ────────────────────────────────────────────────────────────────
from api.monitoring import setup_prometheus, setup_structured_logging, RequestIDMiddleware
setup_structured_logging()
setup_prometheus(app)
app.add_middleware(RequestIDMiddleware)


# ── GZip middleware ───────────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=500)


# ── CORS middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Rate limiting middleware ─────────────────────────────────────────────────
if REDIS_ENABLED:
    from api.rate_limit import RateLimitMiddleware
    app.add_middleware(RateLimitMiddleware)


# ── Security headers middleware ──────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ── Register routers ─────────────────────────────────────────────────────────
from api.routes import all_routers
for router in all_routers:
    app.include_router(router)

# ── Loan module (feature-flagged) ────────────────────────────────────────────
if ENABLE_LOANS:
    from api.routes.loans import router as loans_router
    from api.routes.import_loans import router as import_loans_router
    from api.routes.reminders import router as reminders_router
    app.include_router(loans_router)
    app.include_router(import_loans_router)
    app.include_router(reminders_router)
    logger.info("Loan module enabled")


# ── Serve frontend static files (must be after all /api routes) ──────────────
_frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if SERVE_STATIC and _frontend_dist.is_dir():
    app.mount("/assets", StaticFiles(directory=_frontend_dist / "assets"), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA for all non-API routes (path-traversal safe)"""
        file_path = (_frontend_dist / full_path).resolve()
        # Prevent path traversal: resolved path must stay within dist directory
        if file_path.is_file() and str(file_path).startswith(str(_frontend_dist.resolve())):
            return FileResponse(file_path)
        return FileResponse(_frontend_dist / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
