"""
FastAPI main application
Provides REST API for TSETMC stock market data (PostgreSQL backend)
"""

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api.utils import build_error_response

# Add parent directory to path to import database modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import (
    CORS_ORIGINS_LIST,
    ENABLE_CRYPTO,
    ENABLE_LOANS,
    ENABLE_VOICE,
    REDIS_ENABLED,
    SCHEDULER_ENABLED,
    SERVE_STATIC,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup/shutdown lifecycle for all services."""
    # ── Startup ──
    from config.settings import DATABASE_URL
    from database.connection import get_db_manager

    get_db_manager(DATABASE_URL).create_tables()

    # Check Alembic migration head
    try:
        from alembic.config import Config as AlembicConfig
        from alembic.runtime.migration import MigrationContext
        from alembic.script import ScriptDirectory

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

    # MinIO — ensure bucket exists (non-fatal if service unavailable)
    try:
        from api.services_storage import storage as _minio_storage
        _minio_storage.ensure_bucket()
    except Exception as _exc:
        logger.warning(f"MinIO startup check failed (non-fatal): {_exc}")

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
        from sqlalchemy import func

        from api.cache import cache_manager
        from config.settings import DATABASE_URL
        from database.connection import get_db_manager
        from database.models import DailyOHLCV

        mgr = get_db_manager(DATABASE_URL)
        with mgr.get_session() as db:
            # Warm latest_date for DailyOHLCV
            result = db.query(func.max(DailyOHLCV.date)).scalar()
            if result:
                cache_manager.set_meta("latest_date:daily_ohlcv", str(result), ttl=120)
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
    return getattr(request.state, "request_id", None) or request.headers.get(
        "x-request-id", ""
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return build_error_response(exc.status_code, exc.detail, _get_request_id(request))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return build_error_response(422, "Validation error", _get_request_id(request), details=exc.errors())


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return build_error_response(500, "Internal server error", _get_request_id(request))


# ── Monitoring ────────────────────────────────────────────────────────────────
from api.monitoring import (
    RequestIDMiddleware,
    setup_prometheus,
    setup_structured_logging,
)

setup_structured_logging()
setup_prometheus(app)
app.add_middleware(RequestIDMiddleware)


# ── GZip middleware ───────────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)


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
    # X-Frame-Options omitted — CSP frame-ancestors in nginx supersedes it
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ── Register routers ─────────────────────────────────────────────────────────
from api.routes import all_routers

for router in all_routers:
    app.include_router(router)

# ── Loan module (feature-flagged) ────────────────────────────────────────────
if ENABLE_LOANS:
    from api.routes.import_loans import router as import_loans_router
    from api.routes.loans import router as loans_router

    app.include_router(loans_router)
    app.include_router(import_loans_router)
    logger.info("Loan module enabled")

# ── Crypto module (feature-flagged) ──────────────────────────────────────────
if ENABLE_CRYPTO:
    from api.routes.crypto import router as crypto_router

    app.include_router(crypto_router)
    logger.info("Crypto module enabled")

# ── Voice module (feature-flagged) ──────────────────────────────────────────
if ENABLE_VOICE:
    from api.routes.voice import router as voice_router

    app.include_router(voice_router)
    logger.info("Voice calling module enabled")


# ── Serve loan images as static files ────────────────────────────────────────
_loan_images_dir = Path(__file__).parent.parent / "persian_loan" / "banks-s3-organized"
if _loan_images_dir.is_dir():
    app.mount(
        "/api/loan-images",
        StaticFiles(directory=_loan_images_dir),
        name="loan-images",
    )
    logger.info("Loan images static mount enabled")

# ── Serve frontend static files (must be after all /api routes) ──────────────
_frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if SERVE_STATIC and _frontend_dist.is_dir():
    app.mount(
        "/assets", StaticFiles(directory=_frontend_dist / "assets"), name="static"
    )

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA for all non-API routes (path-traversal safe)"""
        file_path = (_frontend_dist / full_path).resolve()
        # Prevent path traversal: resolved path must stay within dist directory
        if file_path.is_file() and str(file_path).startswith(
            str(_frontend_dist.resolve())
        ):
            return FileResponse(file_path)
        return FileResponse(_frontend_dist / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
