"""Verify all agent configs include web_search tool."""
import pytest

AGENTS = [
    "market_data",
    "document_qa",
    "technical_analysis",
    "comparison",
    "loan_advisor",
    "crypto",
    "general",
]


@pytest.mark.parametrize("intent", AGENTS)
def test_agent_has_web_search_tool(intent):
    from rag.agents import get_agent

    get_agent.cache_clear()
    agent = get_agent(intent)
    tool_names = [d["function"]["name"] for d in agent.config.tool_definitions]
    assert "web_search" in tool_names, f"{intent} agent missing web_search tool"


@pytest.mark.parametrize("intent", AGENTS)
def test_agent_has_web_search_dispatch(intent):
    from rag.agents import get_agent

    get_agent.cache_clear()
    agent = get_agent(intent)
    assert "web_search" in agent.config.tool_dispatch, f"{intent} agent missing web_search dispatch"
