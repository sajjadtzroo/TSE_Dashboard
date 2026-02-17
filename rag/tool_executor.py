"""
Multi-turn chat orchestration with tool calling via OpenRouter.
"""
import json
import logging

from openai import OpenAI
from sqlalchemy.orm import Session

from config.settings import OPENROUTER_API_KEY, RAG_CHAT_MODEL, RAG_TOP_K
from rag.tools import TOOL_DEFINITIONS, TOOL_DISPATCH

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 5

SYSTEM_PROMPT = """You are an expert financial analyst assistant for the Tehran Stock Exchange (TSE/TSETMC) and Iranian capital market.

You have access to tools that can:
- Search financial reports and Codal documents (search_documents)
- Get latest stock prices, P/E, EPS, market cap (get_stock_price)
- Get historical OHLCV data (get_stock_history)
- Get 5-level order book bid/ask (get_order_book)
- Get market indices like TEDPIX (get_market_indices)
- List stocks in a sector (get_sector_stocks)
- Get gold, currency, crypto prices (get_market_prices)
- Get ETF NAV and premium data (get_etf_nav)

Rules:
- Use tools to retrieve real data before answering. Do NOT guess prices or financial figures.
- Answer in the same language as the user (Persian or English).
- Cite sources and data dates when presenting numbers.
- Be concise, precise, and professional.
- For stock symbols, use the Persian symbol (e.g. فولاد, خودرو, فملی).
- If a tool returns an error, explain it to the user and suggest alternatives.
- You can call multiple tools in one turn if needed."""

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


def _execute_tool(db: Session, name: str, arguments: dict, top_k: int = 5) -> str:
    """Execute a tool by name with the given arguments."""
    func = TOOL_DISPATCH.get(name)
    if not func:
        return json.dumps({"error": f"Unknown tool: {name}"})

    try:
        if name == "search_documents":
            return func(db, top_k=top_k, **arguments)
        elif name in ("get_market_indices",):
            return func(db)
        else:
            return func(db, **arguments)
    except Exception as e:
        logger.error(f"Tool execution error ({name}): {e}")
        return json.dumps({"error": f"Tool error: {str(e)}"})


def run_chat_with_tools(
    db: Session,
    messages: list[dict],
    model: str = None,
    symbol: str = None,
    top_k: int = 5,
) -> dict:
    """
    Multi-turn chat with tool calling.

    Args:
        db: Database session
        messages: Full conversation history [{"role": "user"|"assistant", "content": "..."}]
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
    tools_used = []
    sources = []

    # Build message list with system prompt
    api_messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add conversation history (only role + content)
    for msg in messages:
        api_messages.append({
            "role": msg["role"],
            "content": msg.get("content", ""),
        })

    for round_num in range(MAX_TOOL_ROUNDS):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=api_messages,
                tools=TOOL_DEFINITIONS,
                max_tokens=3000,
                temperature=0.3,
            )
        except Exception as e:
            logger.error(f"OpenRouter API error: {e}")
            return {
                "answer": f"Error calling LLM: {e}",
                "sources": [],
                "tools_used": tools_used,
                "model": model,
            }

        choice = resp.choices[0]
        assistant_msg = choice.message

        # If the model wants to call tools
        if assistant_msg.tool_calls:
            # Append the assistant message with tool_calls
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

            # Execute each tool call and append results
            for tc in assistant_msg.tool_calls:
                tool_name = tc.function.name
                try:
                    tool_args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    tool_args = {}

                logger.info(f"Tool call [{round_num+1}]: {tool_name}({tool_args})")
                tools_used.append(tool_name)

                # Inject symbol context for search_documents if not provided
                if tool_name == "search_documents" and symbol and "symbol" not in tool_args:
                    tool_args["symbol"] = symbol

                result = _execute_tool(db, tool_name, tool_args, top_k=top_k)

                # Collect sources from search_documents results
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

            # Continue loop to let LLM process tool results
            continue

        # No tool calls — we have the final answer
        answer = assistant_msg.content or ""
        return {
            "answer": answer,
            "sources": sources,
            "tools_used": list(dict.fromkeys(tools_used)),  # dedupe, preserve order
            "model": model,
        }

    # Exhausted max rounds — return whatever we have
    return {
        "answer": "I was unable to complete the response within the allowed number of tool-calling rounds. Please try a simpler question.",
        "sources": sources,
        "tools_used": list(dict.fromkeys(tools_used)),
        "model": model,
    }
