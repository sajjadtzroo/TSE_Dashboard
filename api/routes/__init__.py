"""
API route modules
"""
from api.routes.health import router as health_router
from api.routes.market import router as market_router
from api.routes.stocks import router as stocks_router
from api.routes.options import router as options_router
from api.routes.ime import router as ime_router
from api.routes.tools import router as tools_router
from api.routes.scraper import router as scraper_router
from api.routes.rag import router as rag_router

all_routers = [
    health_router,
    market_router,
    stocks_router,
    options_router,
    ime_router,
    tools_router,
    scraper_router,
    rag_router,
]
