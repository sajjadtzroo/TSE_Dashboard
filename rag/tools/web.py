"""Web search tool using Tavily API."""

import json
import logging
import re

from sqlalchemy.orm import Session

from config.settings import TAVILY_API_KEY

logger = logging.getLogger(__name__)

# Module-level import so patch("rag.tools.web.TavilyClient") resolves correctly in tests.
try:
    from tavily import TavilyClient
except ImportError:
    TavilyClient = None  # type: ignore[assignment,misc]

# Redact API keys from error messages before logging
_KEY_PATTERN = re.compile(r"tvly-[A-Za-z0-9_-]+", re.IGNORECASE)


def _sanitize_err(exc: Exception) -> str:
    msg = _KEY_PATTERN.sub("[REDACTED]", str(exc))
    return msg[:150]


TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search the internet for current news, recent events, or information "
                "not available in the database. Use when the user asks about recent "
                "developments, news, or topics outside TSE market data."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query in the most relevant language (Persian or English)",
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Number of results to return (1-5, default 5)",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    }
]


def web_search(db: Session, query: str, max_results: int = 5) -> str:
    """Search the web using Tavily API. Returns JSON string with results list."""
    if not TAVILY_API_KEY:
        return json.dumps({"error": "Web search not configured (TAVILY_API_KEY missing)"})
    if TavilyClient is None:
        return json.dumps({"error": "Web search not available (tavily package not installed)"})

    try:
        client = TavilyClient(api_key=TAVILY_API_KEY)
        max_results = max(1, min(int(max_results), 5))
        response = client.search(query, max_results=max_results)
        results = [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("content", "")[:500],
                "score": round(float(r.get("score", 0.0)), 3),
            }
            for r in response.get("results", [])
        ]
        logger.info(f"web_search: '{query}' returned {len(results)} results")
        return json.dumps({"results": results}, ensure_ascii=False)
    except Exception as e:
        logger.error(f"web_search error: {_sanitize_err(e)}")
        return json.dumps({"error": f"Search failed: {_sanitize_err(e)}"})


TOOL_DISPATCH = {"web_search": web_search}
