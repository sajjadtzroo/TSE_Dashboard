"""
OpenAI Realtime API adapter (also used by Grok Voice via subclass).

Protocol: wss://api.openai.com/v1/realtime
Audio: 24kHz 16-bit PCM, base64 encoded
Tool calling: OpenAI function calling format
"""

import json
import logging
from typing import Any, AsyncIterator

import websockets

from api.voice.adapters.base import VoiceProviderAdapter

logger = logging.getLogger(__name__)

# Default models per provider
OPENAI_RT_MODEL = "gpt-4o-realtime-preview"
GROK_RT_MODEL = "grok-2-realtime"


class OpenAIRealtimeAdapter(VoiceProviderAdapter):
    """Adapter for OpenAI Realtime API and OpenAI-compatible endpoints."""

    WS_URL = "wss://api.openai.com/v1/realtime"

    def __init__(self, model_id: str = "gpt-realtime"):
        self._model_id = model_id
        self._ws = None
        self._rt_model = OPENAI_RT_MODEL

    def _get_api_key(self) -> str:
        from config.settings import OPENAI_API_KEY
        return OPENAI_API_KEY

    def _get_ws_url(self) -> str:
        return f"{self.WS_URL}?model={self._rt_model}"

    async def connect(self) -> None:
        api_key = self._get_api_key()
        if not api_key:
            raise ValueError(f"API key not configured for {self._model_id}")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "OpenAI-Beta": "realtime=v1",
        }
        self._ws = await websockets.connect(
            self._get_ws_url(),
            additional_headers=headers,
            max_size=10 * 1024 * 1024,  # 10MB for audio chunks
        )
        logger.info(f"Connected to {self._model_id} realtime endpoint")

    async def disconnect(self) -> None:
        if self._ws:
            await self._ws.close()
            self._ws = None

    async def configure_session(
        self,
        tools: list[dict],
        voice: str | None = None,
        language: str | None = None,
        system_prompt: str | None = None,
    ) -> None:
        config = {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 500,
                },
            },
        }

        if voice:
            config["session"]["voice"] = voice
        if tools:
            config["session"]["tools"] = tools
            config["session"]["tool_choice"] = "auto"
        if system_prompt:
            config["session"]["instructions"] = system_prompt

        await self._ws.send(json.dumps(config))

    async def send_audio(self, audio_b64: str) -> None:
        msg = {
            "type": "input_audio_buffer.append",
            "audio": audio_b64,
        }
        await self._ws.send(json.dumps(msg))

    async def send_tool_result(self, call_id: str, result: str) -> None:
        msg = {
            "type": "conversation.item.create",
            "item": {
                "type": "function_call_output",
                "call_id": call_id,
                "output": result,
            },
        }
        await self._ws.send(json.dumps(msg))
        # Trigger response generation after tool result
        await self._ws.send(json.dumps({"type": "response.create"}))

    async def receive(self) -> AsyncIterator[dict[str, Any]]:
        async for raw in self._ws:
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event_type = event.get("type", "")

            if event_type == "response.audio.delta":
                yield {"type": "audio", "data": event.get("delta", "")}

            elif event_type == "response.audio_transcript.delta":
                yield {
                    "type": "transcript",
                    "role": "assistant",
                    "text": event.get("delta", ""),
                    "final": False,
                }

            elif event_type == "response.audio_transcript.done":
                yield {
                    "type": "transcript",
                    "role": "assistant",
                    "text": event.get("transcript", ""),
                    "final": True,
                }

            elif event_type == "conversation.item.input_audio_transcription.completed":
                yield {
                    "type": "transcript",
                    "role": "user",
                    "text": event.get("transcript", ""),
                    "final": True,
                }

            elif event_type == "response.function_call_arguments.done":
                try:
                    args = json.loads(event.get("arguments", "{}"))
                except json.JSONDecodeError:
                    args = {}
                yield {
                    "type": "tool_call",
                    "call_id": event.get("call_id", ""),
                    "name": event.get("name", ""),
                    "arguments": args,
                }

            elif event_type == "session.created":
                yield {"type": "status", "status": "ready"}

            elif event_type == "response.created":
                yield {"type": "status", "status": "thinking"}

            elif event_type == "response.done":
                yield {"type": "status", "status": "idle"}

            elif event_type == "error":
                err = event.get("error", {})
                yield {
                    "type": "error",
                    "message": err.get("message", "Unknown error"),
                }


class GrokVoiceAdapter(OpenAIRealtimeAdapter):
    """Grok Voice — OpenAI-compatible Realtime API on x.ai."""

    WS_URL = "wss://api.x.ai/v1/realtime"

    def __init__(self):
        super().__init__(model_id="grok-voice")
        self._rt_model = GROK_RT_MODEL

    def _get_api_key(self) -> str:
        from config.settings import XAI_API_KEY
        return XAI_API_KEY
