"""
Gemini Live API adapter.

Protocol: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
Audio Input: 16kHz 16-bit PCM (resample from 24kHz)
Audio Output: 24kHz 16-bit PCM
Tool calling: Gemini FunctionDeclaration format
"""

import base64
import json
import logging
from typing import Any, AsyncIterator

import websockets

from api.voice.adapters.base import VoiceProviderAdapter
from api.voice.audio import resample_pcm

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.0-flash-exp"
GEMINI_WS_BASE = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"


class GeminiLiveAdapter(VoiceProviderAdapter):
    """Adapter for Gemini Live bidirectional streaming API."""

    def __init__(self):
        self._ws = None
        self._tools_config = None

    def _get_api_key(self) -> str:
        from config.settings import GEMINI_API_KEY
        return GEMINI_API_KEY

    async def connect(self) -> None:
        api_key = self._get_api_key()
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")

        url = f"{GEMINI_WS_BASE}?key={api_key}"
        self._ws = await websockets.connect(
            url,
            max_size=10 * 1024 * 1024,
        )
        logger.info("Connected to Gemini Live endpoint")

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
        setup = {
            "setup": {
                "model": f"models/{GEMINI_MODEL}",
                "generation_config": {
                    "response_modalities": ["AUDIO"],
                    "speech_config": {
                        "voice_config": {
                            "prebuilt_voice_config": {
                                "voice_name": voice or "Aoede",
                            }
                        }
                    },
                },
            }
        }

        if system_prompt:
            setup["setup"]["system_instruction"] = {
                "parts": [{"text": system_prompt}]
            }

        if tools:
            setup["setup"]["tools"] = [{"function_declarations": tools}]

        await self._ws.send(json.dumps(setup))

        # Wait for setup completion
        raw = await self._ws.recv()
        resp = json.loads(raw)
        if "setupComplete" not in resp:
            logger.warning(f"Unexpected Gemini setup response: {resp}")

    async def send_audio(self, audio_b64: str) -> None:
        # Resample 24kHz → 16kHz for Gemini input
        pcm_24k = base64.b64decode(audio_b64)
        pcm_16k = resample_pcm(pcm_24k, 24000, 16000)

        msg = {
            "realtime_input": {
                "media_chunks": [
                    {
                        "data": base64.b64encode(pcm_16k).decode("ascii"),
                        "mime_type": "audio/pcm",
                    }
                ]
            }
        }
        await self._ws.send(json.dumps(msg))

    async def send_tool_result(self, call_id: str, result: str) -> None:
        msg = {
            "tool_response": {
                "function_responses": [
                    {
                        "id": call_id,
                        "name": call_id,  # Gemini uses name as ID
                        "response": {"result": result},
                    }
                ]
            }
        }
        await self._ws.send(json.dumps(msg))

    async def receive(self) -> AsyncIterator[dict[str, Any]]:
        async for raw in self._ws:
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                continue

            server_content = event.get("serverContent")
            tool_call = event.get("toolCall")

            if server_content:
                parts = server_content.get("modelTurn", {}).get("parts", [])
                for part in parts:
                    if "inlineData" in part:
                        inline = part["inlineData"]
                        mime = inline.get("mimeType", "")
                        if "audio" in mime:
                            yield {"type": "audio", "data": inline.get("data", "")}

                    if "text" in part:
                        yield {
                            "type": "transcript",
                            "role": "assistant",
                            "text": part["text"],
                            "final": server_content.get("turnComplete", False),
                        }

                if server_content.get("turnComplete"):
                    yield {"type": "status", "status": "idle"}

            elif tool_call:
                func_calls = tool_call.get("functionCalls", [])
                for fc in func_calls:
                    yield {
                        "type": "tool_call",
                        "call_id": fc.get("id", fc.get("name", "")),
                        "name": fc.get("name", ""),
                        "arguments": fc.get("args", {}),
                    }

            elif "setupComplete" in event:
                yield {"type": "status", "status": "ready"}
