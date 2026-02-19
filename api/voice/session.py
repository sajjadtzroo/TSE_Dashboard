"""
VoiceSession: manages the bidirectional relay between a browser WebSocket
and a voice provider WebSocket, with tool call interception.
"""

import asyncio
import json
import logging
from datetime import UTC, datetime

from fastapi import WebSocket
from sqlalchemy.orm import Session

from api.voice.adapters.base import VoiceProviderAdapter
from api.voice.tool_bridge import execute_voice_tool, get_voice_tool_definitions

logger = logging.getLogger(__name__)

# System prompt for voice agents (Persian financial assistant)
VOICE_SYSTEM_PROMPT = (
    "You are a helpful Persian-speaking financial assistant for the Tehran Stock Exchange dashboard. "
    "You can look up stock prices, market indices, crypto prices, loan products, and more using your tools. "
    "Answer questions naturally in Persian (Farsi). Keep responses concise for voice conversation. "
    "When using tools, briefly tell the user what you're looking up."
)


class VoiceSession:
    """Manages a single voice call lifecycle."""

    def __init__(
        self,
        client_ws: WebSocket,
        adapter: VoiceProviderAdapter,
        db: Session,
        user_id: int,
        model_id: str,
        max_duration: int = 600,
    ):
        self._client_ws = client_ws
        self._adapter = adapter
        self._db = db
        self._user_id = user_id
        self._model_id = model_id
        self._max_duration = max_duration

        self._started_at = None
        self._tools_used: list[str] = []
        self._tool_calls_count = 0
        self._end_reason = "user_hangup"
        self._voice = None

    async def run(self, voice: str | None = None) -> dict:
        """Run the voice session until disconnection or timeout."""
        self._started_at = datetime.now(UTC)
        self._voice = voice

        try:
            # Connect to provider
            await self._adapter.connect()

            # Configure session with tools
            fmt = "gemini" if self._model_id == "gemini-live" else "openai"
            tools = get_voice_tool_definitions(fmt)
            await self._adapter.configure_session(
                tools=tools,
                voice=voice,
                system_prompt=VOICE_SYSTEM_PROMPT,
            )

            # Notify client we're ready
            await self._send_to_client({"type": "status", "status": "connected"})

            # Run two relay tasks concurrently with a timeout
            await asyncio.wait_for(
                asyncio.gather(
                    self._client_to_provider(),
                    self._provider_to_client(),
                ),
                timeout=self._max_duration,
            )

        except asyncio.TimeoutError:
            self._end_reason = "timeout"
            await self._send_to_client({
                "type": "status",
                "status": "ended",
                "reason": "timeout",
            })
        except Exception as e:
            self._end_reason = "error"
            logger.error(f"Voice session error: {e}")
            try:
                await self._send_to_client({
                    "type": "error",
                    "message": "Voice session encountered an error",
                })
            except Exception:
                pass
        finally:
            await self._adapter.disconnect()

        return self._build_log()

    async def _client_to_provider(self):
        """Relay audio and control messages from browser to provider."""
        try:
            while True:
                raw = await self._client_ws.receive_text()
                msg = json.loads(raw)
                msg_type = msg.get("type")

                if msg_type == "audio":
                    await self._adapter.send_audio(msg.get("data", ""))

                elif msg_type == "config":
                    # Runtime config changes (voice, language)
                    pass

                elif msg_type == "control":
                    action = msg.get("action")
                    if action == "end":
                        return  # End session
                    elif action == "mute":
                        pass  # Client-side mute, no server action needed

        except Exception as e:
            logger.debug(f"Client→Provider relay ended: {e}")

    async def _provider_to_client(self):
        """Relay events from provider to browser, intercepting tool calls."""
        try:
            async for event in self._adapter.receive():
                event_type = event.get("type")

                if event_type == "tool_call":
                    await self._handle_tool_call(event)
                else:
                    await self._send_to_client(event)

        except Exception as e:
            logger.debug(f"Provider→Client relay ended: {e}")

    async def _handle_tool_call(self, event: dict):
        """Execute a tool call and send result back to the provider."""
        call_id = event["call_id"]
        name = event["name"]
        arguments = event.get("arguments", {})

        self._tool_calls_count += 1
        if name not in self._tools_used:
            self._tools_used.append(name)

        # Notify client about tool call
        await self._send_to_client({
            "type": "tool_call",
            "name": name,
            "arguments": arguments,
        })

        # Execute tool in a thread (DB calls are sync)
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(execute_voice_tool, self._db, name, arguments),
                timeout=30,
            )
        except asyncio.TimeoutError:
            result = json.dumps({"error": f"Tool '{name}' timed out"})

        # Notify client about result
        await self._send_to_client({
            "type": "tool_result",
            "name": name,
            "success": "error" not in result,
        })

        # Send result to provider
        await self._adapter.send_tool_result(call_id, result)

    async def _send_to_client(self, data: dict):
        """Send a JSON message to the browser WebSocket."""
        try:
            await self._client_ws.send_json(data)
        except Exception:
            pass  # Client may have disconnected

    def _build_log(self) -> dict:
        """Build the call log entry data."""
        ended_at = datetime.now(UTC)
        duration = int((ended_at - self._started_at).total_seconds()) if self._started_at else 0

        return {
            "user_id": self._user_id,
            "model_id": self._model_id,
            "voice": self._voice,
            "started_at": self._started_at,
            "ended_at": ended_at,
            "duration_seconds": duration,
            "tool_calls_count": self._tool_calls_count,
            "tools_used": self._tools_used,
            "end_reason": self._end_reason,
        }
