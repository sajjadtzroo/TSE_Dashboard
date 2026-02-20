"""
Voice calling API routes.

GET  /api/voice/models  — List available voice models (based on configured API keys)
WS   /ws/voice          — Bidirectional voice WebSocket (auth required)
"""

import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from api.auth import authenticate_ws

logger = logging.getLogger(__name__)

router = APIRouter(tags=["voice"])

# Available voice models with their configurations
VOICE_MODELS = [
    {
        "id": "gemini-live",
        "name": "Gemini Live",
        "provider": "Google",
        "voices": ["Aoede", "Charon", "Fenrir", "Kore", "Puck"],
        "default_voice": "Aoede",
        "description_fa": "مدل زنده جمینای گوگل",
        "key_env": "GEMINI_API_KEY",
    },
    {
        "id": "gpt-realtime",
        "name": "GPT Realtime",
        "provider": "OpenAI",
        "voices": ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
        "default_voice": "alloy",
        "description_fa": "مدل بلادرنگ OpenAI",
        "key_env": "OPENAI_API_KEY",
    },
    {
        "id": "grok-voice",
        "name": "Grok Voice",
        "provider": "xAI",
        "voices": ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
        "default_voice": "alloy",
        "description_fa": "مدل صوتی Grok",
        "key_env": "XAI_API_KEY",
    },
]


def _get_available_models() -> list[dict]:
    """Return only models whose API keys are configured."""
    import os
    available = []
    for model in VOICE_MODELS:
        key = os.getenv(model["key_env"], "")
        if key:
            # Don't expose key_env to client
            m = {k: v for k, v in model.items() if k != "key_env"}
            available.append(m)
    return available


@router.get("/api/voice/models")
async def get_voice_models():
    """Return available voice models (only those with configured API keys)."""
    return {"models": _get_available_models()}


@router.websocket("/ws/voice")
async def websocket_voice(
    websocket: WebSocket,
    token: str = Query(default=""),
    model: str = Query(default="gemini-live"),
    voice: str = Query(default=""),
):
    """
    Bidirectional voice WebSocket endpoint.

    Auth via JWT token query parameter (same pattern as /ws/market).
    Creates a VoiceSession that relays between browser and provider.
    """
    # Authenticate
    payload = await authenticate_ws(websocket, token)
    if payload is None:
        return

    user_id = payload.get("user_id")
    username = payload.get("sub", "unknown")

    # Validate model
    available = _get_available_models()
    model_ids = [m["id"] for m in available]
    if model not in model_ids:
        await websocket.close(code=4002, reason=f"Model '{model}' not available")
        return

    # Get default voice if not specified
    if not voice:
        for m in available:
            if m["id"] == model:
                voice = m.get("default_voice", "")
                break

    await websocket.accept()
    logger.info(f"Voice call started: user={username}, model={model}, voice={voice}")

    try:
        from api.deps import get_db
        from api.voice.adapters import get_adapter
        from api.voice.session import VoiceSession
        from config.settings import VOICE_MAX_DURATION_SECONDS

        adapter = get_adapter(model)

        # Get a DB session
        db_gen = get_db()
        db = next(db_gen)

        try:
            session = VoiceSession(
                client_ws=websocket,
                adapter=adapter,
                db=db,
                user_id=user_id or 0,
                model_id=model,
                max_duration=VOICE_MAX_DURATION_SECONDS,
            )

            log_data = await session.run(voice=voice)

            # Write call log
            _save_call_log(db, log_data)

        finally:
            try:
                next(db_gen, None)
            except StopIteration:
                pass

    except WebSocketDisconnect:
        logger.info(f"Voice call disconnected: user={username}")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal error")
        except Exception:
            pass


def _save_call_log(db, log_data: dict):
    """Persist the call log entry."""
    try:
        from database.models import VoiceCallLog

        entry = VoiceCallLog(**log_data)
        db.add(entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to save voice call log: {e}")
        db.rollback()
