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
from dataclasses import dataclass, field

from openai import AsyncOpenAI, OpenAI
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Patterns to strip from error messages
_SANITIZE_PATTERNS = [
    (re.compile(r'postgresql://[^\s]+'), '[DB_URL]'),
    (re.compile(r'redis://[^\s]+'), '[REDIS_URL]'),
    (re.compile(r'https?://[^\s]*api[_-]?key[^\s]*', re.IGNORECASE), '[API_URL]'),
    (re.compile(r'/[\w/.-]+\.py(?::\d+)?'), '[FILE]'),
    (re.compile(r'File "[^"]+",\s+line \d+'), '[TRACEBACK]'),
    (re.compile(r'(?:password|secret|token|key)\s*[=:]\s*\S+', re.IGNORECASE), '[REDACTED]'),
]


def _sanitize_error(exc: Exception) -> str:
    msg = str(exc)
    for pattern, replacement in _SANITIZE_PATTERNS:
        msg = pattern.sub(replacement, msg)
    if len(msg) > 200:
        msg = msg[:200] + '...'
    return msg


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

    def _execute_tool(self, db: Session, name: str, arguments: dict, top_k: int = 5) -> str:
        func = self.config.tool_dispatch.get(name)
        if not func:
            return json.dumps({"error": f"Unknown tool: {name}"})
        try:
            sig = inspect.signature(func)
            params = sig.parameters
            kwargs = {}
            for pname, param in params.items():
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

        api_messages = [{"role": "system", "content": self.config.system_prompt}]
        for msg in messages:
            api_messages.append({"role": msg["role"], "content": msg.get("content", "")})

        for round_num in range(self.config.max_tool_rounds):
            try:
                resp = client.chat.completions.create(
                    model=model,
                    messages=api_messages,
                    tools=self.config.tool_definitions if self.config.tool_definitions else None,
                    max_tokens=self.config.max_tokens,
                    temperature=self.config.temperature,
                )
            except Exception as e:
                logger.error(f"OpenRouter API error: {e}")
                return {
                    "answer": f"Error calling LLM: {_sanitize_error(e)}",
                    "sources": [],
                    "tools_used": tools_used,
                    "model": model,
                }

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

                    logger.info(f"[{self.config.name}] Tool call [{round_num+1}]: {tool_name}({tool_args})")
                    tools_used.append(tool_name)

                    if tool_name == "search_documents" and symbol and "symbol" not in tool_args:
                        tool_args["symbol"] = symbol

                    result = self._execute_tool(db, tool_name, tool_args, top_k=top_k)

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

        Args:
            progress_callback: Optional async callable(stage, data_dict) for SSE progress.
        """
        tools_used = []
        sources = []

        async def _emit(stage: str, **kwargs):
            if progress_callback:
                await progress_callback(stage, kwargs)

        api_messages = [{"role": "system", "content": self.config.system_prompt}]
        for msg in messages:
            api_messages.append({"role": msg["role"], "content": msg.get("content", "")})

        for round_num in range(self.config.max_tool_rounds):
            try:
                resp = await client.chat.completions.create(
                    model=model,
                    messages=api_messages,
                    tools=self.config.tool_definitions if self.config.tool_definitions else None,
                    max_tokens=self.config.max_tokens,
                    temperature=self.config.temperature,
                )
            except Exception as e:
                logger.error(f"OpenRouter API error: {e}")
                return {
                    "answer": f"Error calling LLM: {_sanitize_error(e)}",
                    "sources": [],
                    "tools_used": tools_used,
                    "model": model,
                }

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

                    logger.info(f"[{self.config.name}] Tool call [{round_num+1}]: {tool_name}({tool_args})")
                    tools_used.append(tool_name)

                    await _emit("tool_call", tool=tool_name)

                    if tool_name == "search_documents" and symbol and "symbol" not in tool_args:
                        tool_args["symbol"] = symbol

                    # Run sync tool execution in thread to avoid blocking event loop
                    result = await asyncio.to_thread(
                        self._execute_tool, db, tool_name, tool_args, top_k
                    )

                    await _emit("tool_result", tool=tool_name)

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

            await _emit("generating")

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
