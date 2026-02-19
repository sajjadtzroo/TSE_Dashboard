"""Web search tool using Tavily API."""

import json
import logging

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Module-level imports so patch("rag.tools.web.TavilyClient") and
# patch("rag.tools.web.settings") resolve correctly in tests.
try:
    from tavily import TavilyClient
except ImportError:  # tavily not installed in all environments
    TavilyClient = None  # type: ignore[assignment,misc]

import config.settings as settings  # noqa: E402  (module acts as settings object)

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
    if not settings.TAVILY_API_KEY:
        return json.dumps({"error": "Web search not configured (TAVILY_API_KEY missing)"})

    try:
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)
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
        logger.error(f"web_search error: {e}")
        return json.dumps({"error": f"Search failed: {str(e)[:100]}"})


TOOL_DISPATCH = {"web_search": web_search}
