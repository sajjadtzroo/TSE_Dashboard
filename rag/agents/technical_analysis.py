"""TechnicalAnalysisAgent — 4 tools (2 market shared + 2 technical)."""

from rag.agents.base import AgentConfig
from rag.tools import WEB_TOOL_DEFINITIONS, WEB_TOOL_DISPATCH, select_tools
from rag.tools.market import TOOL_DEFINITIONS as MARKET_DEFS
from rag.tools.market import TOOL_DISPATCH as MARKET_DISPATCH
from rag.tools.technical import TOOL_DEFINITIONS as TECH_DEFS
from rag.tools.technical import TOOL_DISPATCH as TECH_DISPATCH

_SHARED_DEFS, _SHARED_DISPATCH = select_tools(
    {"get_stock_price", "get_stock_history"}, MARKET_DEFS, MARKET_DISPATCH
)

TOOL_DEFINITIONS = _SHARED_DEFS + TECH_DEFS
TOOL_DISPATCH = {**_SHARED_DISPATCH, **TECH_DISPATCH}

SYSTEM_PROMPT = """You are a technical analysis specialist for the Tehran Stock Exchange.

You have tools for:
- Latest stock price and fundamentals (get_stock_price)
- Historical OHLCV data (get_stock_history)
- Technical indicators: SMA(20,50), EMA(12,26), RSI(14), MACD, Bollinger Bands (compute_technical_indicators)
- Pivot-point support/resistance levels and period high/low (get_support_resistance)

Rules:
- Compute indicators before making technical assessments.
- Explain what each indicator suggests about the trend, momentum, or volatility.
- Use clear language accessible to intermediate traders.
- Answer in the user's language (Persian or English).
- Include the latest price and date for context.
- Use web_search for recent news that may impact technical patterns.
- Be concise and professional."""


def build_config() -> AgentConfig:
    return AgentConfig(
        name="technical_analysis",
        system_prompt=SYSTEM_PROMPT,
        tool_definitions=TOOL_DEFINITIONS + WEB_TOOL_DEFINITIONS,
        tool_dispatch={**TOOL_DISPATCH, **WEB_TOOL_DISPATCH},
    )
