"""
BaseAgent: Reusable tool-calling loop extracted from the original tool_executor.
Each specialized agent provides an AgentConfig; BaseAgent.run() drives the LLM.
Async variant (arun) uses AsyncOpenAI for non-blocking LLM calls.
"""

import asyncio
import inspect
import json
import logging
import re
from dataclasses import dataclass

from openai import AsyncOpenAI, OpenAI
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Patterns to strip from error messages
_SANITIZE_PATTERNS = [
    (re.compile(r"postgresql://[^\s]+"), "[DB_URL]"),
    (re.compile(r"redis://[^\s]+"), "[REDIS_URL]"),
    (re.compile(r"https?://[^\s]*api[_-]?key[^\s]*", re.IGNORECASE), "[API_URL]"),
    (re.compile(r"https?://[^:]+:[^@]+@[^\s]+"), "[REDACTED_AUTH_URL]"),
    (re.compile(r"Bearer\s+[A-Za-z0-9._-]+"), "[REDACTED_TOKEN]"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "[REDACTED_KEY]"),
    (re.compile(r"/[\w/.-]+\.py(?::\d+)?"), "[FILE]"),
    (re.compile(r'File "[^"]+",\s+line \d+'), "[TRACEBACK]"),
    (
        re.compile(r"(?:password|secret|token|key)\s*[=:]\s*\S+", re.IGNORECASE),
        "[REDACTED]",
    ),
]

_TOOL_TIMEOUT = 30  # seconds


def _sanitize_error(exc: Exception) -> str:
    msg = str(exc)
    for pattern, replacement in _SANITIZE_PATTERNS:
        msg = pattern.sub(replacement, msg)
    if len(msg) > 200:
        msg = msg[:200] + "..."
    return msg


def _prune_messages(messages: list[dict], max_tokens: int = 12000) -> list[dict]:
    """Keep system + recent messages within token budget.

    Uses a rough 1 token ~ 4 chars heuristic to avoid a tiktoken dependency.
    Always keeps the system prompt (index 0) and at least the last 2 exchanges.
    """
    if not messages:
        return messages

    def _estimate_tokens(msg: dict) -> int:
        content = msg.get("content", "") or ""
        # tool_calls and tool results can be large
        if msg.get("tool_calls"):
            content += json.dumps(msg["tool_calls"])
        return len(content) // 4

    # Always keep system prompt (first message)
    system = [messages[0]] if messages[0].get("role") == "system" else []
    rest = messages[len(system):]

    total = sum(_estimate_tokens(m) for m in system + rest)
    if total <= max_tokens:
        return messages

    # Keep at least the last 4 messages (2 exchanges)
    min_keep = 4
    while len(rest) > min_keep and total > max_tokens:
        total -= _estimate_tokens(rest[0])
        rest = rest[1:]

    return system + rest


def _build_api_messages(config_prompt: str, messages: list[dict]) -> list[dict]:
    """Build the initial API messages list from the system prompt and conversation history."""
    api_messages = [{"role": "system", "content": config_prompt}]
    for msg in messages:
        api_messages.append({"role": msg["role"], "content": msg.get("content", "")})
    return _prune_messages(api_messages)


def _build_tool_calls_message(assistant_msg) -> dict:
    """Build the assistant message dict containing tool_calls for appending to conversation."""
    return {
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
    }


def _extract_sources_from_search(result_str: str) -> list[dict]:
    """Extract document sources from a search_documents tool result string."""
    sources = []
    try:
        parsed = json.loads(result_str)
        for r in parsed.get("results", []):
            sources.append(
                {
                    "title": r.get("title", ""),
                    "symbol": r.get("symbol", ""),
                    "page_numbers": r.get("page_numbers", ""),
                    "similarity": r.get("similarity", 0),
                    "source_url": "",
                    "content_preview": r.get("content", "")[:200],
                }
            )
    except json.JSONDecodeError:
        pass
    return sources


@dataclass
class AgentConfig:
    name: str
    system_prompt: str
    tool_definitions: list[dict]
    tool_dispatch: dict[str, callable]
    max_tool_rounds: int = 5
    temperature: float = 0.3
    max_tokens: int = 3000


class BaseAgent:
    """Drives the multi-turn tool-calling loop for any agent configuration."""

    def __init__(self, config: AgentConfig):
        self.config = config

    def _execute_tool(
        self, db: Session, name: str, arguments: dict, top_k: int = 5
    ) -> str:
        func = self.config.tool_dispatch.get(name)
        if not func:
            return json.dumps({"error": f"Unknown tool: {name}"})
        try:
            sig = inspect.signature(func)
            params = sig.parameters
            kwargs = {}
            for pname, _param in params.items():
                if pname == "db":
                    continue
                if pname == "top_k":
                    kwargs["top_k"] = top_k
                elif pname in arguments:
                    kwargs[pname] = arguments[pname]
            return func(db, **kwargs)
        except Exception as e:
            logger.error(f"Tool execution error ({name}): {e}")
            return json.dumps({"error": f"Tool error: {_sanitize_error(e)}"})

    def _make_llm_kwargs(self) -> dict:
        """Build common kwargs for the LLM chat.completions.create call."""
        kwargs = {
            "max_tokens": self.config.max_tokens,
            "temperature": self.config.temperature,
        }
        if self.config.tool_definitions:
            kwargs["tools"] = self.config.tool_definitions
        return kwargs

    def run(
        self,
        client: OpenAI,
        db: Session,
        messages: list[dict],
        model: str,
        symbol: str | None = None,
        top_k: int = 5,
    ) -> dict:
        tools_used = []
        sources = []

        api_messages = _build_api_messages(self.config.system_prompt, messages)
        llm_kwargs = self._make_llm_kwargs()

        for round_num in range(self.config.max_tool_rounds):
            try:
                resp = client.chat.completions.create(
                    model=model, messages=api_messages, **llm_kwargs
                )
            except Exception as e:
                logger.error(f"OpenRouter API error: {e}")
                return {
                    "answer": f"Error calling LLM: {_sanitize_error(e)}",
                    "sources": [],
                    "tools_used": tools_used,
                    "model": model,
                }

            assistant_msg = resp.choices[0].message

            if assistant_msg.tool_calls:
                api_messages.append(_build_tool_calls_message(assistant_msg))

                for tc in assistant_msg.tool_calls:
                    tool_name = tc.function.name
                    try:
                        tool_args = json.loads(tc.function.arguments)
                    except json.JSONDecodeError:
                        tool_args = {}

                    logger.info(
                        f"[{self.config.name}] Tool call [{round_num+1}]: {tool_name}({tool_args})"
                    )
                    tools_used.append(tool_name)

                    if (
                        tool_name == "search_documents"
                        and symbol
                        and "symbol" not in tool_args
                    ):
                        tool_args["symbol"] = symbol

                    result = self._execute_tool(db, tool_name, tool_args, top_k=top_k)

                    if tool_name == "search_documents":
                        sources.extend(_extract_sources_from_search(result))

                    api_messages.append(
                        {"role": "tool", "tool_call_id": tc.id, "content": result}
                    )
                continue

            return {
                "answer": assistant_msg.content or "",
                "sources": sources,
                "tools_used": list(dict.fromkeys(tools_used)),
                "model": model,
            }

        return {
            "answer": "I was unable to complete the response within the allowed number of tool-calling rounds. Please try a simpler question.",
            "sources": sources,
            "tools_used": list(dict.fromkeys(tools_used)),
            "model": model,
        }

    async def arun(
        self,
        client: AsyncOpenAI,
        db: Session,
        messages: list[dict],
        model: str,
        symbol: str | None = None,
        top_k: int = 5,
        progress_callback=None,
    ) -> dict:
        """Async variant of run() — uses AsyncOpenAI for non-blocking LLM calls.

        Streams tokens incrementally on the final LLM call (after all tool rounds).
        Tool-calling rounds remain non-streaming so tool_calls can be parsed fully.

        Args:
            progress_callback: Optional async callable(stage, data_dict) for SSE progress.
        """
        tools_used = []
        sources = []

        async def _emit(stage: str, **kwargs):
            if progress_callback:
                await progress_callback(stage, kwargs)

        api_messages = _build_api_messages(self.config.system_prompt, messages)
        llm_kwargs = self._make_llm_kwargs()

        for round_num in range(self.config.max_tool_rounds):
            try:
                resp = await client.chat.completions.create(
                    model=model, messages=api_messages, **llm_kwargs
                )
            except Exception as e:
                logger.error(f"OpenRouter API error: {e}")
                return {
                    "answer": f"Error calling LLM: {_sanitize_error(e)}",
                    "sources": [],
                    "tools_used": tools_used,
                    "model": model,
                }

            assistant_msg = resp.choices[0].message

            if assistant_msg.tool_calls:
                api_messages.append(_build_tool_calls_message(assistant_msg))

                # Parse all tool calls first
                parsed_calls = []
                for tc in assistant_msg.tool_calls:
                    tool_name = tc.function.name
                    try:
                        tool_args = json.loads(tc.function.arguments)
                    except json.JSONDecodeError:
                        tool_args = {}
                    if (
                        tool_name == "search_documents"
                        and symbol
                        and "symbol" not in tool_args
                    ):
                        tool_args["symbol"] = symbol
                    parsed_calls.append((tc, tool_name, tool_args))
                    tools_used.append(tool_name)
                    logger.info(
                        f"[{self.config.name}] Tool call [{round_num+1}]: {tool_name}({tool_args})"
                    )

                # Execute all tool calls in parallel with timeout
                await _emit("tool_call", tools=[name for _, name, _ in parsed_calls])

                async def _run_tool_with_timeout(tc_tuple):
                    _tc, _name, _args = tc_tuple
                    try:
                        result = await asyncio.wait_for(
                            asyncio.to_thread(
                                self._execute_tool, db, _name, _args, top_k
                            ),
                            timeout=_TOOL_TIMEOUT,
                        )
                        return (_tc, _name, result)
                    except asyncio.TimeoutError:
                        logger.warning(f"Tool '{_name}' timed out after {_TOOL_TIMEOUT}s")
                        return (
                            _tc,
                            _name,
                            json.dumps({"error": f"Tool '{_name}' timed out after {_TOOL_TIMEOUT}s"}),
                        )

                tool_results = await asyncio.gather(
                    *[_run_tool_with_timeout(pc) for pc in parsed_calls]
                )

                for tc, tool_name, result in tool_results:
                    await _emit("tool_result", tool=tool_name)

                    if tool_name == "search_documents":
                        sources.extend(_extract_sources_from_search(result))

                    api_messages.append(
                        {"role": "tool", "tool_call_id": tc.id, "content": result}
                    )
                continue

            # Final response — stream tokens if callback is available
            if progress_callback:
                await _emit("generating")
                # Re-request with streaming enabled for incremental token delivery
                try:
                    stream = await client.chat.completions.create(
                        model=model,
                        messages=api_messages,
                        max_tokens=self.config.max_tokens,
                        temperature=self.config.temperature,
                        stream=True,
                    )
                    answer_parts = []
                    async for chunk in stream:
                        delta = chunk.choices[0].delta.content if chunk.choices else None
                        if delta:
                            answer_parts.append(delta)
                            await progress_callback("token", {"content": delta})
                    answer = "".join(answer_parts)
                except Exception as e:
                    logger.error(f"Streaming error, falling back: {e}")
                    # Fall back to the already-received non-streaming response
                    answer = assistant_msg.content or ""
            else:
                answer = assistant_msg.content or ""

            return {
                "answer": answer,
                "sources": sources,
                "tools_used": list(dict.fromkeys(tools_used)),
                "model": model,
            }

        return {
            "answer": "I was unable to complete the response within the allowed number of tool-calling rounds. Please try a simpler question.",
            "sources": sources,
            "tools_used": list(dict.fromkeys(tools_used)),
            "model": model,
        }
