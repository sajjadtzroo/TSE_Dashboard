"""
Multi-turn chat orchestration with Router → Specialized Agent dispatch.

The public API is run_chat_with_tools().
Internally, each query is classified by a lightweight router model and dispatched
to the best-fit specialized agent (or the general fallback).
"""

import logging

from openai import AsyncOpenAI, OpenAI
from sqlalchemy.orm import Session

from config.settings import OPENROUTER_API_KEY, RAG_CHAT_MODEL, RAG_TOP_K, ROUTER_MODEL
from rag.agents import get_agent
from rag.agents.router import async_classify_intent, classify_intent

logger = logging.getLogger(__name__)

_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not set. Add it to .env file.")
        _client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
    return _client


def _extract_last_user_message(messages: list[dict]) -> str:
    """Get the content of the last user message."""
    for msg in reversed(messages):
        if msg.get("role") == "user" and msg.get("content"):
            return msg["content"]
    return ""


# ── Sync non-streaming ────────────────────────────────────────────────────────


def run_chat_with_tools(
    db: Session,
    messages: list[dict],
    model: str = None,
    symbol: str = None,
    top_k: int = 5,
    user_id: int | None = None,
) -> dict:
    """
    Multi-turn chat with router-based agent dispatch.

    Args:
        db: Database session
        messages: Full conversation history
        model: OpenRouter model ID (defaults to RAG_CHAT_MODEL)
        symbol: Optional symbol context for document search
        top_k: Number of RAG results to retrieve
        user_id: Authenticated user ID for personalized tools

    Returns:
        {"answer": str, "sources": list, "tools_used": list, "model": str}
    """
    if not model:
        model = RAG_CHAT_MODEL
    if not top_k:
        top_k = RAG_TOP_K

    client = _get_client()

    # Route to the best agent (with multi-turn context)
    last_user_msg = _extract_last_user_message(messages)
    intent, confidence = classify_intent(
        client, last_user_msg, model=ROUTER_MODEL, messages=messages
    )
    logger.info(f"Router dispatch: intent={intent}, confidence={confidence}")

    agent = get_agent(intent)
    result = agent.run(client, db, messages, model, symbol, top_k, user_id=user_id)
    result["intent"] = intent
    result["confidence"] = confidence
    return result


# ── Async non-streaming ─────────────────────────────────────────────────────

_async_client: AsyncOpenAI | None = None


def _get_async_client() -> AsyncOpenAI:
    global _async_client
    if _async_client is None:
        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not set. Add it to .env file.")
        _async_client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
    return _async_client


async def async_run_chat_with_tools(
    db: Session,
    messages: list[dict],
    model: str = None,
    symbol: str = None,
    top_k: int = 5,
    progress_callback=None,
    user_id: int | None = None,
) -> dict:
    """Async variant of run_chat_with_tools — non-blocking LLM calls.

    Args:
        progress_callback: Optional async callable(stage, data_dict) for SSE progress.
        user_id: Authenticated user ID for personalized tools.
    """
    if not model:
        model = RAG_CHAT_MODEL
    if not top_k:
        top_k = RAG_TOP_K

    client = _get_async_client()

    if progress_callback:
        await progress_callback("routing", {})

    last_user_msg = _extract_last_user_message(messages)
    intent, confidence = await async_classify_intent(
        client, last_user_msg, model=ROUTER_MODEL, messages=messages
    )
    logger.info(f"Async router dispatch: intent={intent}, confidence={confidence}")

    agent = get_agent(intent)
    result = await agent.arun(
        client, db, messages, model, symbol, top_k,
        progress_callback=progress_callback, user_id=user_id,
    )
    result["intent"] = intent
    result["confidence"] = confidence
    return result
