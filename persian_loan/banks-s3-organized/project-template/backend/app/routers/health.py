"""
Health Check Router
"""

from fastapi import APIRouter
from app.database import get_database

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        db = get_database()
        await db.command("ping")
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }
