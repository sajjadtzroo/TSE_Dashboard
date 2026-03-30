"""
API route modules
"""

from api.routes.auth import router as auth_router
from api.routes.health import router as health_router
from api.routes.ime import router as ime_router
from api.routes.market import router as market_router
from api.routes.options import router as options_router
from api.routes.rag import router as rag_router
from api.routes.scraper import router as scraper_router
from api.routes.stocks import router as stocks_router
from api.routes.ticks import router as ticks_router
from api.routes.tools import router as tools_router
# Disabled pending frontend implementation:
# from api.routes.financial_modeling import router as financial_modeling_router
# from api.routes.risk_profile import router as risk_profile_router
# from api.routes.subscriptions import router as subscriptions_router
from api.routes.portfolios import router as portfolio_router
from api.routes.ws import router as ws_router

all_routers = [
    health_router,
    auth_router,
    market_router,
    stocks_router,
    options_router,
    # crypto_router is registered conditionally in main.py via ENABLE_CRYPTO
    # news_router is registered conditionally in main.py via ENABLE_NEWS
    ime_router,
    tools_router,
    scraper_router,
    rag_router,
    ticks_router,
    # Disabled pending frontend implementation:
    # risk_profile_router,
    # subscriptions_router,
    # financial_modeling_router,
    ws_router,
    portfolio_router,
]
