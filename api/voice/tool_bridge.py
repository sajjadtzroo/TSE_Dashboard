"""
Bridge between voice provider tool calls and existing RAG tools.
Reuses the same tool dispatch and signature inspection as BaseAgent._execute_tool.
"""

import inspect
import json
import logging
import re

from sqlalchemy.orm import Session

from rag.tools import ALL_TOOL_DEFINITIONS, ALL_TOOL_DISPATCH

logger = logging.getLogger(__name__)

# Error sanitization patterns (same as rag/agents/base.py)
_SANITIZE_PATTERNS = [
    (re.compile(r"postgresql://[^\s]+"), "[DB_URL]"),
    (re.compile(r"redis://[^\s]+"), "[REDIS_URL]"),
    (re.compile(r"https?://[^\s]*api[_-]?key[^\s]*", re.IGNORECASE), "[API_URL]"),
    (re.compile(r"https?://[^:]+:[^@]+@[^\s]+"), "[REDACTED_AUTH_URL]"),
    (re.compile(r"Bearer\s+[A-Za-z0-9._-]+"), "[REDACTED_TOKEN]"),
    (re.compile(r"/[\w/.-]+\.py(?::\d+)?"), "[FILE]"),
    (
        re.compile(r"(?:password|secret|token|key)\s*[=:]\s*\S+", re.IGNORECASE),
        "[REDACTED]",
    ),
]


def _sanitize_error(exc: Exception) -> str:
    msg = str(exc)
    for pattern, replacement in _SANITIZE_PATTERNS:
        msg = pattern.sub(replacement, msg)
    if len(msg) > 200:
        msg = msg[:200] + "..."
    return msg


def get_voice_tool_definitions(fmt: str = "openai") -> list[dict]:
    """
    Return tool definitions in the requested format.

    Args:
        fmt: "openai" for OpenAI/Grok format, "gemini" for Gemini FunctionDeclaration format
    """
    if fmt == "openai":
        return ALL_TOOL_DEFINITIONS

    if fmt == "gemini":
        gemini_tools = []
        for tool_def in ALL_TOOL_DEFINITIONS:
            func = tool_def["function"]
            params = func.get("parameters", {})
            # Strip 'additionalProperties' and other OpenAI-specific fields
            gemini_params = {
                "type": params.get("type", "object"),
                "properties": params.get("properties", {}),
            }
            if "required" in params:
                gemini_params["required"] = params["required"]
            gemini_tools.append({
                "name": func["name"],
                "description": func.get("description", ""),
                "parameters": gemini_params,
            })
        return gemini_tools

    return ALL_TOOL_DEFINITIONS


def execute_voice_tool(db: Session, name: str, arguments: dict) -> str:
    """
    Execute a RAG tool by name with the given arguments.
    Same dispatch logic as BaseAgent._execute_tool (rag/agents/base.py:150).
    """
    func = ALL_TOOL_DISPATCH.get(name)
    if not func:
        return json.dumps({"error": f"Unknown tool: {name}"})

    try:
        sig = inspect.signature(func)
        params = sig.parameters
        kwargs = {}
        for pname in params:
            if pname == "db":
                continue
            if pname == "top_k":
                kwargs["top_k"] = arguments.get("top_k", 5)
            elif pname in arguments:
                kwargs[pname] = arguments[pname]
        return func(db, **kwargs)
    except Exception as e:
        logger.error(f"Voice tool execution error ({name}): {e}")
        return json.dumps({"error": f"Tool error: {_sanitize_error(e)}"})
