"""
Agent registry — maps intent names to BaseAgent instances.

Usage:
    from rag.agents import get_agent
    agent = get_agent("market_data")
    result = agent.run(client, db, messages, model)
"""

from functools import cache

from rag.agents.base import BaseAgent


@cache
def get_agent(intent: str) -> BaseAgent:
    """Return a cached BaseAgent for the given intent name."""
    config = _build_config(intent)
    return BaseAgent(config)


def _build_config(intent: str):
    """Lazy-import and build the config for a given intent."""
    if intent == "market_data":
        from rag.agents.market_data import build_config
    elif intent == "document_qa":
        from rag.agents.document_qa import build_config
    elif intent == "technical_analysis":
        from rag.agents.technical_analysis import build_config
    elif intent == "comparison":
        from rag.agents.comparison import build_config
    elif intent == "loan_advisor":
        from rag.agents.loan_advisor import build_config
    elif intent == "crypto":
        from rag.agents.crypto import build_config
    elif intent == "cfa_finance":
        from rag.agents.cfa_finance import build_config
    elif intent == "portfolio_advisor":
        from rag.agents.portfolio_advisor import build_config
    elif intent == "financial_modeling":
        from rag.agents.financial_modeling import build_config
    elif intent == "financial_analysis":
        from rag.agents.financial_analysis import build_config
    elif intent == "options":
        from rag.agents.options_advisor import build_config
    elif intent == "news":
        from rag.agents.news import build_config
    else:
        from rag.agents.general import build_config
    return build_config()
