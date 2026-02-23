"""
BaseAgent: Reusable tool-calling loop extracted from the original tool_executor.
Each specialized agent provides an AgentConfig; BaseAgent.run() drives the LLM.
Async variant (arun) uses AsyncOpenAI for non-blocking LLM calls.
"""

import asyncio
import concurrent.futures
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
_sync_tool_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

# ── Tool result caching ──────────────────────────────────────────────────────
# Cache frequent, low-churn tool results in Redis to reduce DB round-trips.
# Keys are prefixed with "tse:tool:" and include the tool name + sorted args.

# Tools eligible for caching and their TTLs (seconds).
# Only stateless, read-only tools with predictable outputs should be listed.
_TOOL_CACHE_TTLS: dict[str, int] = {
    "get_market_indices": 120,       # changes only during trading hours
    "get_market_prices": 120,        # same
    "get_etf_nav": 120,              # same
    "list_banks": 300,               # very stable data
    "get_sector_stocks": 300,        # very stable data
    "get_crypto_market_overview": 60, # moderate churn
}


def _tool_cache_key(name: str, arguments: dict) -> str:
    """Build a deterministic Redis key for a tool call."""
    import hashlib
    # Sort arguments for deterministic key
    arg_str = json.dumps(arguments, sort_keys=True, default=str)
    arg_hash = hashlib.md5(arg_str.encode()).hexdigest()[:12]
    return f"tse:tool:{name}:{arg_hash}"


def _get_cached_tool_result(name: str, arguments: dict) -> str | None:
    """Try to fetch a cached tool result from Redis."""
    if name not in _TOOL_CACHE_TTLS:
        return None
    try:
        from api.cache import cache_manager
        if not cache_manager or not cache_manager.redis:
            return None
        key = _tool_cache_key(name, arguments)
        result = cache_manager.redis.get(key)
        if result:
            logger.debug(f"Tool cache HIT: {name}")
            return result.decode() if isinstance(result, bytes) else result
    except Exception:
        pass
    return None


def _set_cached_tool_result(name: str, arguments: dict, result: str) -> None:
    """Cache a tool result in Redis."""
    if name not in _TOOL_CACHE_TTLS:
        return
    try:
        from api.cache import cache_manager
        if not cache_manager or not cache_manager.redis:
            return
        key = _tool_cache_key(name, arguments)
        ttl = _TOOL_CACHE_TTLS[name]
        cache_manager.redis.setex(key, ttl, result)
        logger.debug(f"Tool cache SET: {name} (ttl={ttl}s)")
    except Exception:
        pass


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


def _extract_web_sources(result_str: str) -> list[dict]:
    """Extract web sources from a web_search tool result string."""
    sources = []
    try:
        parsed = json.loads(result_str)
        for r in parsed.get("results", []):
            sources.append(
                {
                    "type": "web",
                    "title": r.get("title", ""),
                    "source_url": r.get("url", ""),
                    "content_preview": r.get("content", "")[:200],
                    "symbol": "",
                    "page_numbers": "",
                    "similarity": float(r.get("score", 0.0)),
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

    _EXHAUSTED_MSG = (
        "I was unable to complete the response within the allowed number of "
        "tool-calling rounds. Please try a simpler question."
    )

    def __init__(self, config: AgentConfig):
        self.config = config

    def _execute_tool(
        self, db: Session, name: str, arguments: dict, top_k: int = 5,
        user_id: int | None = None,
    ) -> str:
        # Check cache first for eligible tools
        cached = _get_cached_tool_result(name, arguments)
        if cached is not None:
            return cached

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
                elif pname == "user_id" and user_id is not None:
                    kwargs["user_id"] = user_id
                elif pname in arguments:
                    kwargs[pname] = arguments[pname]
            result = func(db, **kwargs)

            # Cache result for eligible tools
            _set_cached_tool_result(name, arguments, result)

            return result
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

    def _parse_tool_calls(
        self,
        assistant_msg,
        symbol: str | None,
        round_num: int,
        tools_used: list[str],
    ) -> list[tuple]:
        """Parse tool_calls from an assistant message, returning (tc, name, args) tuples."""
        parsed = []
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
            parsed.append((tc, tool_name, tool_args))
            tools_used.append(tool_name)
            logger.info(
                f"[{self.config.name}] Tool call [{round_num + 1}]: {tool_name}({tool_args})"
            )
        return parsed

    @staticmethod
    def _collect_tool_result(
        tool_name: str, result: str, sources: list[dict]
    ) -> None:
        """If result is from a search tool, extract and append sources."""
        if tool_name in ("search_documents", "search_cfa_documents"):
            sources.extend(_extract_sources_from_search(result))
        elif tool_name == "web_search":
            sources.extend(_extract_web_sources(result))

    @staticmethod
    def _build_result(
        answer: str, sources: list[dict], tools_used: list[str], model: str
    ) -> dict:
        return {
            "answer": answer,
            "sources": sources,
            "tools_used": list(dict.fromkeys(tools_used)),
            "model": model,
        }

    def run(
        self,
        client: OpenAI,
        db: Session,
        messages: list[dict],
        model: str,
        symbol: str | None = None,
        top_k: int = 5,
        user_id: int | None = None,
    ) -> dict:
        tools_used: list[str] = []
        sources: list[dict] = []

        api_messages = _build_api_messages(self.config.system_prompt, messages)
        llm_kwargs = self._make_llm_kwargs()

        for round_num in range(self.config.max_tool_rounds):
            try:
                resp = client.chat.completions.create(
                    model=model, messages=api_messages, **llm_kwargs
                )
            except Exception as e:
                logger.error(f"OpenRouter API error: {e}")
                return self._build_result(
                    f"Error calling LLM: {_sanitize_error(e)}", [], tools_used, model
                )

            assistant_msg = resp.choices[0].message

            if assistant_msg.tool_calls:
                api_messages.append(_build_tool_calls_message(assistant_msg))
                parsed = self._parse_tool_calls(
                    assistant_msg, symbol, round_num, tools_used
                )

                for tc, tool_name, tool_args in parsed:
                    try:
                        future = _sync_tool_executor.submit(
                            self._execute_tool, db, tool_name, tool_args, top_k,
                            user_id,
                        )
                        result = future.result(timeout=_TOOL_TIMEOUT)
                    except concurrent.futures.TimeoutError:
                        logger.warning(f"Tool '{tool_name}' timed out after {_TOOL_TIMEOUT}s")
                        result = json.dumps({"error": f"Tool '{tool_name}' timed out after {_TOOL_TIMEOUT}s"})
                    self._collect_tool_result(tool_name, result, sources)
                    api_messages.append(
                        {"role": "tool", "tool_call_id": tc.id, "content": result}
                    )
                continue

            return self._build_result(
                assistant_msg.content or "", sources, tools_used, model
            )

        return self._build_result(self._EXHAUSTED_MSG, sources, tools_used, model)

    async def arun(
        self,
        client: AsyncOpenAI,
        db: Session,
        messages: list[dict],
        model: str,
        symbol: str | None = None,
        top_k: int = 5,
        progress_callback=None,
        user_id: int | None = None,
        llm_semaphore: asyncio.Semaphore | None = None,
    ) -> dict:
        """Async variant of run() — uses AsyncOpenAI for non-blocking LLM calls.

        Streams tokens incrementally on the final LLM call (after all tool rounds).
        Tool-calling rounds remain non-streaming so tool_calls can be parsed fully.

        Args:
            progress_callback: Optional async callable(stage, data_dict) for SSE progress.
            llm_semaphore: Optional semaphore to limit concurrent LLM API calls.
        """
        tools_used: list[str] = []
        sources: list[dict] = []

        async def _emit(stage: str, **kwargs):
            if progress_callback:
                await progress_callback(stage, kwargs)

        async def _llm_call(**kwargs):
            """LLM API call wrapped with optional semaphore."""
            if llm_semaphore:
                async with llm_semaphore:
                    return await client.chat.completions.create(**kwargs)
            return await client.chat.completions.create(**kwargs)

        api_messages = _build_api_messages(self.config.system_prompt, messages)
        llm_kwargs = self._make_llm_kwargs()

        for round_num in range(self.config.max_tool_rounds):
            try:
                resp = await _llm_call(
                    model=model, messages=api_messages, **llm_kwargs
                )
            except Exception as e:
                logger.error(f"OpenRouter API error: {e}")
                return self._build_result(
                    f"Error calling LLM: {_sanitize_error(e)}", [], tools_used, model
                )

            assistant_msg = resp.choices[0].message

            if assistant_msg.tool_calls:
                api_messages.append(_build_tool_calls_message(assistant_msg))
                parsed = self._parse_tool_calls(
                    assistant_msg, symbol, round_num, tools_used
                )

                await _emit(
                    "tool_call",
                    tools=[name for _, name, _ in parsed],
                    round=round_num + 1,
                )

                async def _run_tool_with_timeout(tc_tuple):
                    _tc, _name, _args = tc_tuple
                    try:
                        result = await asyncio.wait_for(
                            asyncio.to_thread(
                                self._execute_tool, db, _name, _args, top_k,
                                user_id,
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
                    *[_run_tool_with_timeout(pc) for pc in parsed]
                )

                for tc, tool_name, result in tool_results:
                    # Stream intermediate tool results to the client
                    result_preview = result[:200] if len(result) > 200 else result
                    await _emit(
                        "tool_result",
                        tool=tool_name,
                        preview=result_preview,
                        round=round_num + 1,
                    )
                    self._collect_tool_result(tool_name, result, sources)
                    api_messages.append(
                        {"role": "tool", "tool_call_id": tc.id, "content": result}
                    )
                continue

            # Final response — stream tokens if callback is available
            if progress_callback:
                await _emit("generating")
                try:
                    if llm_semaphore:
                        await llm_semaphore.acquire()
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
                    finally:
                        if llm_semaphore:
                            llm_semaphore.release()
                except Exception as e:
                    logger.error(f"Streaming error, falling back: {e}")
                    answer = assistant_msg.content or ""
            else:
                answer = assistant_msg.content or ""

            return self._build_result(answer, sources, tools_used, model)

        return self._build_result(self._EXHAUSTED_MSG, sources, tools_used, model)
