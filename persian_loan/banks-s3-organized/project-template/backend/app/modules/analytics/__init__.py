"""
Analytics Module
"""

from app.modules.analytics.router import router
from app.modules.analytics.service import AnalyticsService

__all__ = ["router", "AnalyticsService"]
