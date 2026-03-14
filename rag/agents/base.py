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
import time
from dataclasses import dataclass

from openai import AsyncOpenAI, OpenAI
from sqlalchemy.orm import Session

from config.settings import CONVERSATION_SUMMARY_ENABLED
from rag.metrics import rag_metrics

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
_sync_tool_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=min(__import__('os').cpu_count() or 8, 16)
)

# ── Tool result caching ──────────────────────────────────────────────────────
# Cache frequent, low-churn tool results in Redis to reduce DB round-trips.
# Keys are prefixed with "tse:tool:" and include the tool name + sorted args.

# Tools eligible for caching and their TTLs (seconds).
# Only stateless, read-only tools with predictable outputs should be listed.
_TOOL_CACHE_TTLS: dict[str, int] = {
    "get_market_indices": 120,       # changes only during trading hours
    "get_market_prices": 120,        # same
    "get_etf_nav": 120,              # same
    "get_stock_price": 60,           # per-symbol, moderate churn
    "get_stock_history": 120,        # historical data, stable
    "get_ohlcv_data": 120,           # historical OHLCV, stable
    "get_order_book": 30,            # intraday, fast churn
    "get_client_type": 120,          # daily aggregates
    "list_banks": 300,               # very stable data
    "get_sector_stocks": 300,        # very stable data
    "get_loan_products": 300,        # very stable data
    "compare_bank_loans": 300,       # very stable data
    "get_crypto_market_overview": 60, # moderate churn
    "get_crypto_prices": 60,         # moderate churn
}


def _tool_cache_key(name: str, arguments: dict) -> str:
    """Build a deterministic Redis key for a tool call."""
    import hashlib
    # Sort arguments for deterministic key
    arg_str = json.dumps(arguments, sort_keys=True, default=str)
    arg_hash = hashlib.md5(arg_str.encode()).hexdigest()
    return f"tse:tool:{name}:{arg_hash}"


def _get_cached_tool_result(name: str, arguments: dict) -> str | None:
    """Try to fetch a cached tool result from Redis."""
    if name not in _TOOL_CACHE_TTLS:
        return None
    try:
        from api.cache import cache_manager
        if not cache_manager or not cache_manager._client:
            return None
        key = _tool_cache_key(name, arguments)
        result = cache_manager._client.get(key)
        if result:
            logger.debug(f"Tool cache HIT: {name}")
            rag_metrics.tool_cache.labels(tool_name=name, result="hit").inc()
            return result.decode() if isinstance(result, bytes) else result
        rag_metrics.tool_cache.labels(tool_name=name, result="miss").inc()
    except Exception:
        pass
    return None


def _set_cached_tool_result(name: str, arguments: dict, result: str) -> None:
    """Cache a tool result in Redis."""
    if name not in _TOOL_CACHE_TTLS:
        return
    try:
        from api.cache import cache_manager
        if not cache_manager or not cache_manager._client:
            return
        key = _tool_cache_key(name, arguments)
        ttl = _TOOL_CACHE_TTLS[name]
        cache_manager._client.setex(key, ttl, result)
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


def _summarize_dropped_messages(dropped: list[dict]) -> dict | None:
    """Call an LLM to summarize dropped conversation messages.

    Returns a system message dict with the summary, or None on failure.
    """
    try:
        from openai import OpenAI
        from config.settings import OPENROUTER_API_KEY, ROUTER_MODEL

        # Build a text representation of the dropped messages
        lines = []
        for msg in dropped:
            role = msg.get("role", "unknown")
            content = msg.get("content", "") or ""
            if content:
                lines.append(f"{role}: {content[:300]}")
        if not lines:
            return None

        context_text = "\n".join(lines)
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
            timeout=10,
        )
        resp = client.chat.completions.create(
            model=ROUTER_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Summarize the following conversation excerpt in 2-3 sentences, "
                        "preserving key financial entities (stock symbols, companies, figures). "
                        "Write only the summary."
                    ),
                },
                {"role": "user", "content": context_text},
            ],
            max_tokens=200,
            temperature=0.1,
        )
        summary_text = resp.choices[0].message.content or ""
        if not summary_text.strip():
            return None

        logger.debug(f"Conversation summary injected: {len(summary_text)} chars")
        return {
            "role": "system",
            "content": f"[Earlier conversation summary]: {summary_text.strip()}",
        }
    except Exception as e:
        logger.warning(f"Conversation summarization failed: {e}")
        return None


def _prune_messages(messages: list[dict], max_tokens: int = 12000) -> list[dict]:
    """Keep system + recent messages within token budget.

    Uses a rough 1 token ~ 4 chars heuristic to avoid a tiktoken dependency.
    Always keeps the system prompt (index 0) and at least the last 2 exchanges.
    When CONVERSATION_SUMMARY_ENABLED is true and messages are dropped, generates
    a brief summary of the dropped turns and injects it as a system message.
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
    dropped = []
    while len(rest) > min_keep and total > max_tokens:
        total -= _estimate_tokens(rest[0])
        dropped.append(rest[0])
        rest = rest[1:]

    if dropped and CONVERSATION_SUMMARY_ENABLED:
        summary_msg = _summarize_dropped_messages(dropped)
        if summary_msg:
            return system + [summary_msg] + rest

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


def _extract_sources_from_search(result_str: str, start_index: int = 1) -> list[dict]:
    """Extract document sources from a search_documents tool result string."""
    sources = []
    try:
        parsed = json.loads(result_str)
        for i, r in enumerate(parsed.get("results", []), start=start_index):
            sources.append(
                {
                    "title": r.get("title", ""),
                    "symbol": r.get("symbol", ""),
                    "page_numbers": r.get("page_numbers", ""),
                    "similarity": r.get("similarity", 0),
                    "source_url": "",
                    "content_preview": r.get("content", "")[:200],
                    "citation_index": i,
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

        _MAX_RETRIES = 2
        _BACKOFF_DELAYS = [0.5, 1.0]
        t0 = time.monotonic()
        last_exc: Exception | None = None

        for attempt in range(_MAX_RETRIES + 1):
            try:
                result = func(db, **kwargs)
                rag_metrics.tool_latency.labels(tool_name=name).observe(time.monotonic() - t0)
                _set_cached_tool_result(name, arguments, result)
                return result
            except Exception as e:
                last_exc = e
                if attempt < _MAX_RETRIES:
                    delay = _BACKOFF_DELAYS[attempt]
                    logger.warning(
                        f"Tool '{name}' attempt {attempt + 1} failed: {_sanitize_error(e)}. "
                        f"Retrying in {delay}s..."
                    )
                    time.sleep(delay)
                else:
                    rag_metrics.tool_latency.labels(tool_name=name).observe(time.monotonic() - t0)
                    rag_metrics.tool_errors.labels(tool_name=name).inc()
                    logger.error(f"Tool execution error ({name}) after {_MAX_RETRIES + 1} attempts: {last_exc}")
                    return json.dumps({"error": f"Tool error: {_sanitize_error(last_exc)}"})

        # Should never reach here
        return json.dumps({"error": f"Tool error: unexpected retry loop exit"})

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
        tool_name: str, result: str, sources: list[dict],
        download_urls: list[str] | None = None,
    ) -> None:
        """Extract sources and download URLs from tool results."""
        if tool_name in ("search_documents", "search_cfa_documents"):
            sources.extend(_extract_sources_from_search(result))
        elif tool_name == "web_search":
            sources.extend(_extract_web_sources(result))

        # Capture download_url from financial modeling tool results
        if download_urls is not None:
            try:
                parsed = json.loads(result)
                url = parsed.get("download_url")
                if url:
                    download_urls.append(url)
            except (json.JSONDecodeError, AttributeError):
                pass

    @staticmethod
    def _build_result(
        answer: str, sources: list[dict], tools_used: list[str], model: str,
        download_urls: list[str] | None = None,
    ) -> dict:
        result = {
            "answer": answer,
            "sources": sources,
            "tools_used": list(dict.fromkeys(tools_used)),
            "model": model,
        }
        if download_urls:
            result["download_urls"] = download_urls
        return result

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
        download_urls: list[str] = []

        api_messages = _build_api_messages(self.config.system_prompt, messages)
        llm_kwargs = self._make_llm_kwargs()

        for round_num in range(self.config.max_tool_rounds):
            t_llm = time.monotonic()
            try:
                resp = client.chat.completions.create(
                    model=model, messages=api_messages, **llm_kwargs
                )
                rag_metrics.llm_latency.labels(agent=self.config.name).observe(
                    time.monotonic() - t_llm
                )
            except Exception as e:
                rag_metrics.llm_latency.labels(agent=self.config.name).observe(
                    time.monotonic() - t_llm
                )
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

                # Submit all tools in parallel, then collect results
                future_to_tc: dict[concurrent.futures.Future, tuple] = {}
                for tc, tool_name, tool_args in parsed:
                    future = _sync_tool_executor.submit(
                        self._execute_tool, db, tool_name, tool_args, top_k,
                        user_id,
                    )
                    future_to_tc[future] = (tc, tool_name)

                # Collect results as they complete (with timeout)
                tool_results: dict[str, tuple[str, str]] = {}  # tc.id -> (tool_name, result)
                done, not_done = concurrent.futures.wait(
                    future_to_tc.keys(), timeout=_TOOL_TIMEOUT
                )
                for future in done:
                    tc, tool_name = future_to_tc[future]
                    try:
                        tool_results[tc.id] = (tool_name, future.result())
                    except Exception as e:
                        logger.error(f"Tool '{tool_name}' raised: {e}")
                        tool_results[tc.id] = (
                            tool_name,
                            json.dumps({"error": f"Tool error: {_sanitize_error(e)}"}),
                        )
                for future in not_done:
                    tc, tool_name = future_to_tc[future]
                    future.cancel()
                    logger.warning(f"Tool '{tool_name}' timed out after {_TOOL_TIMEOUT}s")
                    tool_results[tc.id] = (
                        tool_name,
                        json.dumps({"error": f"Tool '{tool_name}' timed out after {_TOOL_TIMEOUT}s"}),
                    )

                # Append results in original tool_call order
                for tc, tool_name, tool_args in parsed:
                    name, result = tool_results[tc.id]
                    self._collect_tool_result(name, result, sources, download_urls)
                    api_messages.append(
                        {"role": "tool", "tool_call_id": tc.id, "content": result}
                    )
                continue

            rag_metrics.llm_rounds.labels(agent=self.config.name).observe(round_num + 1)
            return self._build_result(
                assistant_msg.content or "", sources, tools_used, model, download_urls
            )

        rag_metrics.llm_rounds.labels(agent=self.config.name).observe(
            self.config.max_tool_rounds
        )
        return self._build_result(self._EXHAUSTED_MSG, sources, tools_used, model, download_urls)

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
        download_urls: list[str] = []

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
            t_llm = time.monotonic()
            try:
                resp = await _llm_call(
                    model=model, messages=api_messages, **llm_kwargs
                )
                rag_metrics.llm_latency.labels(agent=self.config.name).observe(
                    time.monotonic() - t_llm
                )
            except Exception as e:
                rag_metrics.llm_latency.labels(agent=self.config.name).observe(
                    time.monotonic() - t_llm
                )
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
                    self._collect_tool_result(tool_name, result, sources, download_urls)
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

            rag_metrics.llm_rounds.labels(agent=self.config.name).observe(round_num + 1)
            return self._build_result(answer, sources, tools_used, model, download_urls)

        rag_metrics.llm_rounds.labels(agent=self.config.name).observe(
            self.config.max_tool_rounds
        )
        return self._build_result(self._EXHAUSTED_MSG, sources, tools_used, model, download_urls)
