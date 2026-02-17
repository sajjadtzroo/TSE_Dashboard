"""
WebSocket and Server-Sent Events for live market data push.
After market_watch spider completes, data is published via Redis pub/sub,
and connected clients receive real-time updates.
"""
import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from starlette.responses import StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["realtime"])

REDIS_CHANNEL = "tse:live:market"


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        """Broadcast message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.active_connections.remove(conn)


manager = ConnectionManager()


@router.websocket("/ws/market")
async def websocket_market(websocket: WebSocket):
    """
    WebSocket endpoint for live market data.
    Subscribes to Redis pub/sub channel and forwards messages to client.
    """
    await manager.connect(websocket)
    try:
        # Start Redis subscriber in background
        subscriber_task = asyncio.create_task(_redis_subscriber())

        # Keep connection alive, handle incoming messages (ping/pong)
        while True:
            try:
                data = await websocket.receive_text()
                # Client can send "ping" for keep-alive
                if data == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break
    except Exception as e:
        logger.debug(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)
        if 'subscriber_task' in locals():
            subscriber_task.cancel()


async def _redis_subscriber():
    """Subscribe to Redis pub/sub and broadcast to WebSocket clients."""
    try:
        from api.cache import cache_manager
        if not cache_manager.available:
            return

        import redis.asyncio as aioredis
        from config.settings import REDIS_URL

        client = aioredis.from_url(REDIS_URL, decode_responses=True)
        pubsub = client.pubsub()
        await pubsub.subscribe(REDIS_CHANNEL)

        async for message in pubsub.listen():
            if message["type"] == "message":
                await manager.broadcast(message["data"])
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.warning(f"Redis subscriber error: {e}")


def publish_market_update(data: dict):
    """
    Publish market data update to Redis pub/sub (called after spider completes).
    This is a sync function called from the scheduler.
    """
    try:
        from api.cache import cache_manager
        if cache_manager.available:
            cache_manager._client.publish(REDIS_CHANNEL, json.dumps(data, default=str))
    except Exception as e:
        logger.debug(f"Redis publish error: {e}")


# ── Server-Sent Events (SSE fallback) ────────────────────────────────────────

@router.get("/api/events/market")
async def sse_market():
    """
    Server-Sent Events endpoint for live market data.
    Falls back to this when WebSocket is not supported.
    """
    from sse_starlette.sse import EventSourceResponse

    async def event_generator():
        try:
            from api.cache import cache_manager
            if not cache_manager.available:
                yield {"event": "error", "data": "Redis unavailable"}
                return

            import redis.asyncio as aioredis
            from config.settings import REDIS_URL

            client = aioredis.from_url(REDIS_URL, decode_responses=True)
            pubsub = client.pubsub()
            await pubsub.subscribe(REDIS_CHANNEL)

            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield {"event": "market_update", "data": message["data"]}
        except asyncio.CancelledError:
            pass
        except Exception as e:
            yield {"event": "error", "data": str(e)}

    return EventSourceResponse(event_generator())
