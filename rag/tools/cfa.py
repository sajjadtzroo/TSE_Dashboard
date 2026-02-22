"""CFA document tools — 1 tool for searching CFA curriculum PDFs."""

import json
import logging

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ── Tool definitions ─────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_cfa_documents",
            "description": (
                "Search CFA curriculum PDFs and study materials using semantic similarity. "
                "Use this for questions about CFA concepts, investment theory, valuation models "
                "(DCF, CAPM, DDM), portfolio theory, efficient frontier, Sharpe ratio, fixed income, "
                "derivatives pricing, Black-Scholes, ethics, GIPS, asset allocation, risk management."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query about CFA topics in Persian or English",
                    },
                },
                "required": ["query"],
            },
        },
    },
]


# ── Tool implementations ─────────────────────────────────────────────────────


def search_cfa_documents(
    db: Session, query: str, top_k: int = 5
) -> str:
    """Semantic search over CFA curriculum PDFs — delegates to rag.pipeline.search() with doc_category='cfa'."""
    from rag.pipeline import search

    results = search(db, query=query, top_k=top_k, doc_category="cfa")
    if not results:
        return json.dumps(
            {"results": [], "message": "No relevant CFA documents found."},
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


# ── Dispatch map ──────────────────────────────────────────────────────────────

TOOL_DISPATCH = {
    "search_cfa_documents": search_cfa_documents,
}
