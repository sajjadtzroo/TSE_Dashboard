"""
RAG Chat — retrieve context + generate LLM answer via OpenRouter.
"""

import logging

from openai import AsyncOpenAI, OpenAI
from sqlalchemy.orm import Session

from config.settings import OPENROUTER_API_KEY, RAG_CHAT_MODEL, RAG_TOP_K
from rag.pipeline import search

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a financial analyst assistant specialized in Tehran Stock Exchange (TSE/TSETMC)
and Iranian capital market. You answer questions based ONLY on the provided document context.

Rules:
- Answer in the same language as the user's question (Persian or English).
- If the context doesn't contain enough information to answer, say so clearly.
- Cite the source document and page numbers when referencing specific data.
- Be concise and precise with financial figures.
- Do not make up information that is not in the context."""

_chat_client = None


def _get_chat_client() -> OpenAI:
    global _chat_client
    if _chat_client is None:
        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not set. Add it to .env file.")
        _chat_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
    return _chat_client


def _build_context(chunks: list[dict]) -> str:
    """Build context string from search results."""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        source = f"[Source {i}: {chunk.get('title', 'Unknown')} - {chunk.get('symbol', '')} | Page {chunk.get('page_numbers', '?')}]"
        parts.append(f"{source}\n{chunk['content']}")
    return "\n\n---\n\n".join(parts)


def chat(session: Session, message: str, symbol: str = None, top_k: int = None) -> dict:
    """
    RAG chat: retrieve relevant context then generate answer.

    Returns {answer, sources}.
    """
    if top_k is None:
        top_k = RAG_TOP_K

    # 1. Retrieve relevant chunks
    chunks = search(session, query=message, top_k=top_k, symbol=symbol)

    if not chunks:
        return {
            "answer": "No relevant documents found. The RAG pipeline may need to process more documents first.",
            "sources": [],
        }

    # 2. Build context
    context = _build_context(chunks)

    # 3. Generate answer via LLM
    client = _get_chat_client()

    user_prompt = f"""Context from financial reports:

{context}

---

User question: {message}"""

    try:
        resp = client.chat.completions.create(
            model=RAG_CHAT_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=2000,
            temperature=0.3,
        )
        answer = resp.choices[0].message.content
    except Exception as e:
        logger.error(f"LLM chat error: {e}")
        answer = f"Error generating response: {e}"

    # 4. Format sources
    sources = [
        {
            "title": c.get("title", ""),
            "symbol": c.get("symbol", ""),
            "page_numbers": c.get("page_numbers", ""),
            "similarity": round(c.get("similarity", 0), 4),
            "source_url": c.get("source_url", ""),
            "content_preview": (
                c["content"][:200] + "..." if len(c["content"]) > 200 else c["content"]
            ),
        }
        for c in chunks
    ]

    return {
        "answer": answer,
        "sources": sources,
    }


# ── Async variant ────────────────────────────────────────────────────────────

_async_chat_client: AsyncOpenAI | None = None


def _get_async_chat_client() -> AsyncOpenAI:
    global _async_chat_client
    if _async_chat_client is None:
        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not set. Add it to .env file.")
        _async_chat_client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
    return _async_chat_client


async def async_chat(
    session: Session, message: str, symbol: str = None, top_k: int = None
) -> dict:
    """Async RAG chat — non-blocking LLM call."""
    import asyncio

    if top_k is None:
        top_k = RAG_TOP_K

    # 1. Retrieve (sync DB call in thread)
    chunks = await asyncio.to_thread(
        search, session, query=message, top_k=top_k, symbol=symbol
    )

    if not chunks:
        return {
            "answer": "No relevant documents found. The RAG pipeline may need to process more documents first.",
            "sources": [],
        }

    # 2. Build context
    context = _build_context(chunks)

    # 3. Generate answer via async LLM
    client = _get_async_chat_client()

    user_prompt = f"""Context from financial reports:

{context}

---

User question: {message}"""

    try:
        resp = await client.chat.completions.create(
            model=RAG_CHAT_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=2000,
            temperature=0.3,
        )
        answer = resp.choices[0].message.content
    except Exception as e:
        logger.error(f"Async LLM chat error: {e}")
        answer = f"Error generating response: {e}"

    # 4. Format sources
    sources = [
        {
            "title": c.get("title", ""),
            "symbol": c.get("symbol", ""),
            "page_numbers": c.get("page_numbers", ""),
            "similarity": round(c.get("similarity", 0), 4),
            "source_url": c.get("source_url", ""),
            "content_preview": (
                c["content"][:200] + "..." if len(c["content"]) > 200 else c["content"]
            ),
        }
        for c in chunks
    ]

    return {
        "answer": answer,
        "sources": sources,
    }
