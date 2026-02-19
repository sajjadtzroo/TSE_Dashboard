"""Abstract base class for voice provider adapters."""

import abc
from typing import Any, AsyncIterator


class VoiceProviderAdapter(abc.ABC):
    """
    Normalizes different provider protocols into a uniform interface.

    Lifecycle: connect() → configure_session() → send_audio()/receive() loop → disconnect()
    """

    @abc.abstractmethod
    async def connect(self) -> None:
        """Establish WebSocket connection to the provider."""

    @abc.abstractmethod
    async def disconnect(self) -> None:
        """Gracefully close the provider connection."""

    @abc.abstractmethod
    async def send_audio(self, audio_b64: str) -> None:
        """Send a base64-encoded PCM audio chunk to the provider."""

    @abc.abstractmethod
    async def send_tool_result(self, call_id: str, result: str) -> None:
        """Send a tool execution result back to the provider."""

    @abc.abstractmethod
    async def configure_session(
        self,
        tools: list[dict],
        voice: str | None = None,
        language: str | None = None,
        system_prompt: str | None = None,
    ) -> None:
        """Configure the session with tools, voice, and language preferences."""

    @abc.abstractmethod
    def receive(self) -> AsyncIterator[dict[str, Any]]:
        """
        Async iterator yielding normalized events from the provider.

        Event types:
            {"type": "audio", "data": "<base64 PCM>"}
            {"type": "transcript", "role": "assistant"|"user", "text": "..."}
            {"type": "tool_call", "call_id": "...", "name": "...", "arguments": {...}}
            {"type": "status", "status": "ready"|"thinking"|"speaking"}
            {"type": "error", "message": "..."}
        """
