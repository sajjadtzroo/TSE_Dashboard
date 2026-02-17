"""
FastAPI main application
Provides REST API for TSETMC stock market data (PostgreSQL backend)
"""
import os
import sys
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Add parent directory to path to import database modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import CORS_ORIGINS_LIST
from api.routes import all_routers

app = FastAPI(
    title="TSETMC Stock Market API",
    description="Real-time and historical data for Tehran Stock Exchange",
    version="3.0.0",
)


# ── Scheduler lifecycle ──────────────────────────────────────────────────────
_tsetmc_scheduler = None


@app.on_event("startup")
def startup_scheduler():
    from database.connection import get_db_manager
    from config.settings import DATABASE_URL

    get_db_manager(DATABASE_URL).create_tables()

    global _tsetmc_scheduler
    from scheduler.scheduler import TSETMCScheduler
    _tsetmc_scheduler = TSETMCScheduler()
    _tsetmc_scheduler.setup_jobs()
    _tsetmc_scheduler.start()


@app.on_event("shutdown")
def shutdown_scheduler():
    if _tsetmc_scheduler:
        _tsetmc_scheduler.shutdown()


# ── CORS middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
for router in all_routers:
    app.include_router(router)


# ── Serve frontend static files (must be after all /api routes) ──────────────
_frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
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
