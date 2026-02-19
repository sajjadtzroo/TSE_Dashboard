"""Tests for web_search tool."""
import json
from unittest.mock import MagicMock, patch


def _make_db():
    return MagicMock()


def test_web_search_returns_json_string():
    from rag.tools.web import web_search

    mock_response = {
        "results": [
            {"title": "Test Title", "url": "https://example.com", "content": "Test content", "score": 0.9},
        ]
    }

    with patch("rag.tools.web.TavilyClient") as MockClient, \
         patch("rag.tools.web.TAVILY_API_KEY", "fake-key"):
        MockClient.return_value.search.return_value = mock_response
        result = web_search(_make_db(), query="test query")

    parsed = json.loads(result)
    assert "results" in parsed
    assert len(parsed["results"]) == 1
    assert parsed["results"][0]["title"] == "Test Title"
    assert parsed["results"][0]["url"] == "https://example.com"


def test_web_search_missing_api_key():
    from rag.tools.web import web_search

    with patch("rag.tools.web.TAVILY_API_KEY", ""):
        result = web_search(_make_db(), query="test")

    parsed = json.loads(result)
    assert "error" in parsed
    assert "TAVILY_API_KEY" in parsed["error"]


def test_web_search_missing_package():
    from rag.tools.web import web_search

    with patch("rag.tools.web.TavilyClient", None), \
         patch("rag.tools.web.TAVILY_API_KEY", "fake-key"):
        result = web_search(_make_db(), query="test")

    parsed = json.loads(result)
    assert "error" in parsed
    assert "not available" in parsed["error"]


def test_web_search_caps_max_results():
    from rag.tools.web import web_search

    with patch("rag.tools.web.TavilyClient") as MockClient, \
         patch("rag.tools.web.TAVILY_API_KEY", "fake-key"):
        MockClient.return_value.search.return_value = {"results": []}
        web_search(_make_db(), query="test", max_results=99)
        call_kwargs = MockClient.return_value.search.call_args
        assert call_kwargs.kwargs["max_results"] == 5


def test_web_search_trims_content():
    from rag.tools.web import web_search

    long_content = "x" * 1000
    mock_response = {
        "results": [
            {"title": "T", "url": "https://example.com", "content": long_content, "score": 0.5},
        ]
    }

    with patch("rag.tools.web.TavilyClient") as MockClient, \
         patch("rag.tools.web.TAVILY_API_KEY", "fake-key"):
        MockClient.return_value.search.return_value = mock_response
        result = web_search(_make_db(), query="test")

    parsed = json.loads(result)
    assert len(parsed["results"][0]["content"]) <= 500


def test_web_search_handles_exception():
    from rag.tools.web import web_search

    with patch("rag.tools.web.TavilyClient") as MockClient, \
         patch("rag.tools.web.TAVILY_API_KEY", "fake-key"):
        MockClient.return_value.search.side_effect = RuntimeError("network error")
        result = web_search(_make_db(), query="test")

    parsed = json.loads(result)
    assert "error" in parsed


def test_web_search_sanitizes_key_in_error():
    from rag.tools.web import web_search

    with patch("rag.tools.web.TavilyClient") as MockClient, \
         patch("rag.tools.web.TAVILY_API_KEY", "tvly-dev-secret123"):
        MockClient.return_value.search.side_effect = RuntimeError("auth failed: tvly-dev-secret123")
        result = web_search(_make_db(), query="test")

    parsed = json.loads(result)
    assert "tvly-dev-secret123" not in parsed["error"]
    assert "[REDACTED]" in parsed["error"]


def test_tool_definitions_schema():
    from rag.tools.web import TOOL_DEFINITIONS

    assert len(TOOL_DEFINITIONS) == 1
    defn = TOOL_DEFINITIONS[0]
    assert defn["type"] == "function"
    assert defn["function"]["name"] == "web_search"
    assert "query" in defn["function"]["parameters"]["properties"]
    assert "query" in defn["function"]["parameters"]["required"]


def test_tool_dispatch_has_web_search():
    from rag.tools.web import TOOL_DISPATCH

    assert "web_search" in TOOL_DISPATCH
    assert callable(TOOL_DISPATCH["web_search"])


def test_web_search_in_all_tool_exports():
    from rag.tools import ALL_TOOL_DEFINITIONS, ALL_TOOL_DISPATCH

    names = [d["function"]["name"] for d in ALL_TOOL_DEFINITIONS]
    assert "web_search" in names
    assert "web_search" in ALL_TOOL_DISPATCH


def test_base_agent_extracts_web_sources():
    import json
    from rag.agents.base import _extract_web_sources

    result_str = json.dumps({
        "results": [
            {"title": "News Title", "url": "https://example.com/news", "content": "Some content", "score": 0.88},
        ]
    })
    sources = _extract_web_sources(result_str)
    assert len(sources) == 1
    assert sources[0]["type"] == "web"
    assert sources[0]["title"] == "News Title"
    assert sources[0]["source_url"] == "https://example.com/news"
    assert sources[0]["similarity"] == 0.88
    assert sources[0]["content_preview"] == "Some content"


def test_base_agent_collects_web_sources_on_web_search():
    import json
    from rag.agents.base import BaseAgent, AgentConfig

    config = AgentConfig(
        name="test",
        system_prompt="test",
        tool_definitions=[],
        tool_dispatch={},
    )
    agent = BaseAgent(config)
    sources = []
    result_str = json.dumps({
        "results": [{"title": "T", "url": "https://x.com", "content": "C", "score": 0.7}]
    })
    agent._collect_tool_result("web_search", result_str, sources)
    assert len(sources) == 1
    assert sources[0]["type"] == "web"


def test_base_agent_still_collects_document_sources():
    import json
    from rag.agents.base import BaseAgent, AgentConfig

    config = AgentConfig(
        name="test",
        system_prompt="test",
        tool_definitions=[],
        tool_dispatch={},
    )
    agent = BaseAgent(config)
    sources = []
    result_str = json.dumps({
        "results": [{"title": "Doc", "symbol": "فولاد", "page_numbers": "1-2", "similarity": 0.9, "content": "text"}]
    })
    agent._collect_tool_result("search_documents", result_str, sources)
    assert len(sources) == 1
