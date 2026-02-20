"""
WebSocket and Server-Sent Events for live market data push.
After market_watch spider completes, data is published via Redis pub/sub,
and connected clients receive real-time updates.
"""

import asyncio
import json
import logging

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

from api.auth import authenticate_ws, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["realtime"])

REDIS_CHANNEL = "tse:live:market"
CRYPTO_REDIS_CHANNEL = "tse:live:crypto"


class ConnectionManager:
    """Manages active WebSocket connections with a shared Redis subscriber."""

    def __init__(self, channel: str, log_prefix: str = "WebSocket"):
        self._channel = channel
        self._log_prefix = log_prefix
        self.active_connections: list[WebSocket] = []
        self._subscriber_task: asyncio.Task | None = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"{self._log_prefix} connected. Total: {len(self.active_connections)}")
        if self._subscriber_task is None or self._subscriber_task.done():
            self._subscriber_task = asyncio.create_task(self._redis_subscriber())

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"{self._log_prefix} disconnected. Total: {len(self.active_connections)}")
        if (
            not self.active_connections
            and self._subscriber_task
            and not self._subscriber_task.done()
        ):
            self._subscriber_task.cancel()
            self._subscriber_task = None

    async def broadcast(self, message: str):
        """Broadcast message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

    async def _redis_subscriber(self):
        """Shared subscriber: one task for all connections."""
        client = None
        pubsub = None
        try:
            from api.cache import cache_manager

            if not cache_manager.available:
                return

            import redis.asyncio as aioredis

            from config.settings import REDIS_URL

            client = aioredis.from_url(REDIS_URL, decode_responses=True)
            pubsub = client.pubsub()
            await pubsub.subscribe(self._channel)

            async for message in pubsub.listen():
                if message["type"] == "message":
                    await self.broadcast(message["data"])
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.warning(f"{self._log_prefix} Redis subscriber error: {e}")
        finally:
            if pubsub:
                await pubsub.unsubscribe(self._channel)
                await pubsub.close()
            if client:
                await client.close()


manager = ConnectionManager(REDIS_CHANNEL, "WebSocket")
crypto_manager = ConnectionManager(CRYPTO_REDIS_CHANNEL, "Crypto WS")


@router.websocket("/ws/crypto")
async def websocket_crypto(websocket: WebSocket, token: str = Query(default="")):
    """WebSocket endpoint for live crypto ticker data (24/7)."""
    if await authenticate_ws(websocket, token) is None:
        return

    await crypto_manager.connect(websocket)
    try:
        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break
    except Exception as e:
        logger.debug(f"Crypto WebSocket error: {e}")
    finally:
        crypto_manager.disconnect(websocket)


def publish_crypto_update(data: dict):
    """Publish crypto ticker update to Redis pub/sub (called from scheduler)."""
    try:
        from api.cache import cache_manager

        if cache_manager.available:
            cache_manager._client.publish(
                CRYPTO_REDIS_CHANNEL, json.dumps(data, default=str)
            )
    except Exception as e:
        logger.debug(f"Redis crypto publish error: {e}")


@router.websocket("/ws/market")
async def websocket_market(websocket: WebSocket, token: str = Query(default="")):
    """
    WebSocket endpoint for live market data.
    Requires a valid JWT token as query parameter.
    """
    if await authenticate_ws(websocket, token) is None:
        return

    await manager.connect(websocket)
    try:
        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break
    except Exception as e:
        logger.debug(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)


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
async def sse_market(_user=Depends(get_current_user)):
    """
    Server-Sent Events endpoint for live market data (authenticated).
    Falls back to this when WebSocket is not supported.
    """
    from sse_starlette.sse import EventSourceResponse

    async def event_generator():
        client = None
        pubsub = None
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
        finally:
            if pubsub:
                await pubsub.unsubscribe(REDIS_CHANNEL)
                await pubsub.close()
            if client:
                await client.close()

    return EventSourceResponse(event_generator())
