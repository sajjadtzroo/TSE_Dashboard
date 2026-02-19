"""Tests for web_search tool."""
import json
from unittest.mock import MagicMock, patch


def _make_db():
    return MagicMock()


def test_web_search_returns_json_string():
    from rag.tools.web import web_search
    db = _make_db()

    mock_response = {
        "results": [
            {"title": "Test Title", "url": "https://example.com", "content": "Test content", "score": 0.9},
        ]
    }

    with patch("rag.tools.web.TavilyClient") as MockClient:
        MockClient.return_value.search.return_value = mock_response
        with patch("rag.tools.web.settings") as mock_settings:
            mock_settings.TAVILY_API_KEY = "fake-key"
            result = web_search(db, query="test query")

    parsed = json.loads(result)
    assert "results" in parsed
    assert len(parsed["results"]) == 1
    assert parsed["results"][0]["title"] == "Test Title"
    assert parsed["results"][0]["url"] == "https://example.com"


def test_web_search_missing_api_key():
    from rag.tools.web import web_search
    db = _make_db()

    with patch("rag.tools.web.settings") as mock_settings:
        mock_settings.TAVILY_API_KEY = ""
        result = web_search(db, query="test")

    parsed = json.loads(result)
    assert "error" in parsed
    assert "TAVILY_API_KEY" in parsed["error"]


def test_web_search_caps_max_results():
    from rag.tools.web import web_search
    db = _make_db()

    with patch("rag.tools.web.TavilyClient") as MockClient:
        MockClient.return_value.search.return_value = {"results": []}
        with patch("rag.tools.web.settings") as mock_settings:
            mock_settings.TAVILY_API_KEY = "fake-key"
            web_search(db, query="test", max_results=99)

        call_kwargs = MockClient.return_value.search.call_args
        assert call_kwargs[1]["max_results"] == 5


def test_web_search_trims_content():
    from rag.tools.web import web_search
    db = _make_db()

    long_content = "x" * 1000
    mock_response = {
        "results": [
            {"title": "T", "url": "https://example.com", "content": long_content, "score": 0.5},
        ]
    }

    with patch("rag.tools.web.TavilyClient") as MockClient:
        MockClient.return_value.search.return_value = mock_response
        with patch("rag.tools.web.settings") as mock_settings:
            mock_settings.TAVILY_API_KEY = "fake-key"
            result = web_search(db, query="test")

    parsed = json.loads(result)
    assert len(parsed["results"][0]["content"]) <= 500


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
