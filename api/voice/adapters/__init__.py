"""Voice provider adapter registry."""

from api.voice.adapters.base import VoiceProviderAdapter


def get_adapter(model_id: str) -> VoiceProviderAdapter:
    """Return the appropriate adapter instance for a model ID."""
    if model_id == "gpt-realtime":
        from api.voice.adapters.openai_rt import OpenAIRealtimeAdapter

        return OpenAIRealtimeAdapter(model_id="gpt-realtime")
    elif model_id == "grok-voice":
        from api.voice.adapters.openai_rt import GrokVoiceAdapter

        return GrokVoiceAdapter()
    elif model_id == "gemini-live":
        from api.voice.adapters.gemini import GeminiLiveAdapter

        return GeminiLiveAdapter()
    else:
        raise ValueError(f"Unknown voice model: {model_id}")
