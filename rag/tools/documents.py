"""Document tools — 2 tools (1 existing + 1 new)."""

import json
import logging

from sqlalchemy.orm import Session

from database.models import CodalAnnouncement
from rag.tools._helpers import _escape_like

logger = logging.getLogger(__name__)

# ── Tool definitions ─────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": "Search financial reports and Codal PDF documents using semantic similarity. Use this for questions about company financials, annual reports, board decisions, earnings, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query in Persian or English",
                    },
                    "symbol": {
                        "type": "string",
                        "description": "Optional stock symbol to filter (e.g. '\u0641\u0648\u0644\u0627\u062f')",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_codal_announcements",
            "description": "Search Codal announcements (letters, disclosures, assembly decisions) by symbol and/or title keyword. Returns title, category, date, and links.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol in Persian to filter",
                    },
                    "title_keyword": {
                        "type": "string",
                        "description": "Keyword to search in announcement titles",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max results (default 10, max 30)",
                    },
                },
            },
        },
    },
]


# ── Tool implementations ─────────────────────────────────────────────────────


def search_documents(
    db: Session, query: str, symbol: str = None, top_k: int = 5
) -> str:
    """Semantic search over Codal PDFs — delegates to rag.pipeline."""
    from config.settings import MULTI_QUERY_ENABLED
    from rag.pipeline import multi_query_search, search

    if MULTI_QUERY_ENABLED:
        results = multi_query_search(db, query=query, top_k=top_k, symbol=symbol)
    else:
        results = search(db, query=query, top_k=top_k, symbol=symbol)
    if not results:
        return json.dumps(
            {"results": [], "message": "No relevant documents found."},
            ensure_ascii=False,
        )
    output = []
    for r in results:
        output.append(
            {
                "title": r.get("title", ""),
                "symbol": r.get("symbol", ""),
                "page_numbers": r.get("page_numbers", ""),
                "similarity": round(r.get("similarity", 0), 3),
                "content": r["content"][:1500],
            }
        )
    return json.dumps({"results": output}, ensure_ascii=False)


def get_codal_announcements(
    db: Session,
    symbol: str = None,
    title_keyword: str = None,
    limit: int = 10,
) -> str:
    """Search Codal announcements by symbol and/or title keyword."""
    limit = min(max(limit, 1), 30)
    query = db.query(CodalAnnouncement)
    if symbol:
        query = query.filter(CodalAnnouncement.symbol == symbol)
    if title_keyword:
        query = query.filter(
            CodalAnnouncement.title.ilike(f"%{_escape_like(title_keyword)}%")
        )
    rows = query.order_by(CodalAnnouncement.id.desc()).limit(limit).all()
    if not rows:
        return json.dumps(
            {"results": [], "message": "No announcements found."}, ensure_ascii=False
        )
    data = [
        {
            "symbol": r.symbol,
            "company_name": r.company_name,
            "title": r.title,
            "category": r.category,
            "date_publish": r.date_publish,
            "time_publish": r.time_publish,
            "link": r.link,
            "link_pdf": r.link_pdf,
        }
        for r in rows
    ]
    return json.dumps({"count": len(data), "announcements": data}, ensure_ascii=False)


# ── Dispatch map ──────────────────────────────────────────────────────────────

TOOL_DISPATCH = {
    "search_documents": search_documents,
    "get_codal_announcements": get_codal_announcements,
}
