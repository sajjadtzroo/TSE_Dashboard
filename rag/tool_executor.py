"""
Multi-turn chat orchestration with Router → Specialized Agent dispatch.

The public API (run_chat_with_tools, run_chat_with_tools_stream) is unchanged.
Internally, each query is classified by a lightweight router model and dispatched
to the best-fit specialized agent (or the general fallback).
"""
import json
import logging

from openai import OpenAI
from sqlalchemy.orm import Session

from config.settings import OPENROUTER_API_KEY, RAG_CHAT_MODEL, RAG_TOP_K, ROUTER_MODEL
from rag.agents import get_agent
from rag.agents.router import classify_intent
from rag.agents.base import _sanitize_error

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
) -> dict:
    """
    Multi-turn chat with router-based agent dispatch.

    Args:
        db: Database session
        messages: Full conversation history
        model: OpenRouter model ID (defaults to RAG_CHAT_MODEL)
        symbol: Optional symbol context for document search
        top_k: Number of RAG results to retrieve

    Returns:
        {"answer": str, "sources": list, "tools_used": list, "model": str}
    """
    if not model:
        model = RAG_CHAT_MODEL
    if not top_k:
        top_k = RAG_TOP_K

    client = _get_client()

    # Route to the best agent
    last_user_msg = _extract_last_user_message(messages)
    intent, confidence = classify_intent(client, last_user_msg, model=ROUTER_MODEL)
    logger.info(f"Router dispatch: intent={intent}, confidence={confidence}")

    agent = get_agent(intent)
    return agent.run(client, db, messages, model, symbol, top_k)


# ── Sync streaming ────────────────────────────────────────────────────────────


def run_chat_with_tools_stream(
    db: Session,
    messages: list[dict],
    model: str = None,
    symbol: str = None,
    top_k: int = 5,
):
    """
    Streaming version of run_chat_with_tools.
    Yields SSE-formatted strings.

    Events:
      - tool_start: {"tool": "tool_name", "args": {...}}
      - token: {"content": "partial text"}
      - done: {"sources": [...], "tools_used": [...], "model": "..."}
    """
    if not model:
        model = RAG_CHAT_MODEL
    if not top_k:
        top_k = RAG_TOP_K

    client = _get_client()

    # Route to the best agent
    last_user_msg = _extract_last_user_message(messages)
    intent, confidence = classify_intent(client, last_user_msg, model=ROUTER_MODEL)
    logger.info(f"Router dispatch (stream): intent={intent}, confidence={confidence}")

    agent = get_agent(intent)
    config = agent.config
    tools_used = []
    sources = []

    api_messages = [{"role": "system", "content": config.system_prompt}]
    for msg in messages:
        api_messages.append({"role": msg["role"], "content": msg.get("content", "")})

    for round_num in range(config.max_tool_rounds):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=api_messages,
                tools=config.tool_definitions if config.tool_definitions else None,
                max_tokens=config.max_tokens,
                temperature=config.temperature,
            )
        except Exception as e:
            logger.error(f"OpenRouter API error: {e}")
            yield f"event: token\ndata: {json.dumps({'content': f'Error calling LLM: {_sanitize_error(e)}'})}\n\n"
            yield f"event: done\ndata: {json.dumps({'sources': [], 'tools_used': tools_used, 'model': model})}\n\n"
            return

        choice = resp.choices[0]
        assistant_msg = choice.message

        if assistant_msg.tool_calls:
            api_messages.append({
                "role": "assistant",
                "content": assistant_msg.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in assistant_msg.tool_calls
                ],
            })

            for tc in assistant_msg.tool_calls:
                tool_name = tc.function.name
                try:
                    tool_args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    tool_args = {}

                tools_used.append(tool_name)
                yield f"event: tool_start\ndata: {json.dumps({'tool': tool_name, 'args': tool_args})}\n\n"

                if tool_name == "search_documents" and symbol and "symbol" not in tool_args:
                    tool_args["symbol"] = symbol

                result = agent._execute_tool(db, tool_name, tool_args, top_k=top_k)

                if tool_name == "search_documents":
                    try:
                        parsed = json.loads(result)
                        for r in parsed.get("results", []):
                            sources.append({
                                "title": r.get("title", ""),
                                "symbol": r.get("symbol", ""),
                                "page_numbers": r.get("page_numbers", ""),
                                "similarity": r.get("similarity", 0),
                                "source_url": "",
                                "content_preview": r.get("content", "")[:200],
                            })
                    except json.JSONDecodeError:
                        pass

                api_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })
            continue

        # No tool calls — stream the final answer
        try:
            stream = client.chat.completions.create(
                model=model,
                messages=api_messages,
                max_tokens=config.max_tokens,
                temperature=config.temperature,
                stream=True,
            )
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    yield f"event: token\ndata: {json.dumps({'content': token})}\n\n"
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"event: token\ndata: {json.dumps({'content': f'Error during streaming: {_sanitize_error(e)}'})}\n\n"

        yield f"event: done\ndata: {json.dumps({'sources': sources, 'tools_used': list(dict.fromkeys(tools_used)), 'model': model})}\n\n"
        return

    # Exhausted rounds
    yield f"event: token\ndata: {json.dumps({'content': 'I was unable to complete the response within the allowed number of tool-calling rounds.'})}\n\n"
    yield f"event: done\ndata: {json.dumps({'sources': sources, 'tools_used': list(dict.fromkeys(tools_used)), 'model': model})}\n\n"
