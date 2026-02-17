"""
Agent registry — maps intent names to BaseAgent instances.

Usage:
    from rag.agents import get_agent
    agent = get_agent("market_data")
    result = agent.run(client, db, messages, model)
"""
from rag.agents.base import BaseAgent

# Lazy-build cache
_AGENT_CACHE: dict[str, BaseAgent] = {}


def get_agent(intent: str) -> BaseAgent:
    """Return a cached BaseAgent for the given intent name."""
    if intent not in _AGENT_CACHE:
        config = _build_config(intent)
        _AGENT_CACHE[intent] = BaseAgent(config)
    return _AGENT_CACHE[intent]


def _build_config(intent: str):
    """Import and build the config for a given intent."""
    builders = {
        "market_data": lambda: __import__("rag.agents.market_data", fromlist=["build_config"]).build_config(),
        "document_qa": lambda: __import__("rag.agents.document_qa", fromlist=["build_config"]).build_config(),
        "technical_analysis": lambda: __import__("rag.agents.technical_analysis", fromlist=["build_config"]).build_config(),
        "comparison": lambda: __import__("rag.agents.comparison", fromlist=["build_config"]).build_config(),
        "loan_advisor": lambda: __import__("rag.agents.loan_advisor", fromlist=["build_config"]).build_config(),
        "general": lambda: __import__("rag.agents.general", fromlist=["build_config"]).build_config(),
    }
    builder = builders.get(intent)
    if builder is None:
        # Fallback to general
        builder = builders["general"]
    return builder()
