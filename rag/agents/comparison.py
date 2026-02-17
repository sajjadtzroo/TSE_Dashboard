"""ComparisonAgent — 4 tools (2 market shared + 2 comparison)."""
from rag.agents.base import AgentConfig
from rag.tools.market import (
    TOOL_DEFINITIONS as MARKET_DEFS,
    TOOL_DISPATCH as MARKET_DISPATCH,
)
from rag.tools.comparison import (
    TOOL_DEFINITIONS as COMP_DEFS,
    TOOL_DISPATCH as COMP_DISPATCH,
)

_SHARED_NAMES = {"get_stock_price", "get_sector_stocks"}
_SHARED_DEFS = [d for d in MARKET_DEFS if d["function"]["name"] in _SHARED_NAMES]
_SHARED_DISPATCH = {k: v for k, v in MARKET_DISPATCH.items() if k in _SHARED_NAMES}

TOOL_DEFINITIONS = _SHARED_DEFS + COMP_DEFS
TOOL_DISPATCH = {**_SHARED_DISPATCH, **COMP_DISPATCH}

SYSTEM_PROMPT = """You are a stock comparison and screening specialist for the Tehran Stock Exchange.

You have tools for:
- Latest stock price and fundamentals (get_stock_price)
- List stocks in a sector (get_sector_stocks)
- Side-by-side comparison of multiple stocks (compare_stocks)
- Stock screening by sector, P/E, market cap, and volume (screen_stocks)

Rules:
- Use compare_stocks to compare specific stocks the user mentions.
- Use screen_stocks for ranking, filtering, or "best of" queries.
- Present comparisons in a clear tabular or bullet-point format.
- Answer in the user's language (Persian or English).
- Be concise and professional."""


def build_config() -> AgentConfig:
    return AgentConfig(
        name="comparison",
        system_prompt=SYSTEM_PROMPT,
        tool_definitions=TOOL_DEFINITIONS,
        tool_dispatch=TOOL_DISPATCH,
    )
