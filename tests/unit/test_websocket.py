"""
Tests for Issue 4: WebSocket authentication and ConnectionManager.
Verifies token auth, shared subscriber lifecycle, ping/pong, broadcast.
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from api.routes.ws import ConnectionManager


class TestConnectionManager:
    """Unit tests for ConnectionManager lifecycle."""

    @pytest.fixture
    def manager(self):
        return ConnectionManager()

    @pytest.mark.asyncio
    async def test_connect_adds_to_active(self, manager):
        ws = AsyncMock()
        with patch.object(manager, "_redis_subscriber", new_callable=AsyncMock):
            await manager.connect(ws)
        assert ws in manager.active_connections
        assert len(manager.active_connections) == 1

    def test_disconnect_removes_from_active(self, manager):
        ws = MagicMock()
        manager.active_connections.append(ws)
        manager.disconnect(ws)
        assert ws not in manager.active_connections

    def test_disconnect_safe_for_unknown_ws(self, manager):
        """Disconnecting a WebSocket not in the list should not raise."""
        ws = MagicMock()
        manager.disconnect(ws)  # should not raise

    @pytest.mark.asyncio
    async def test_subscriber_starts_on_first_connect(self, manager):
        ws = AsyncMock()
        with patch.object(manager, "_redis_subscriber", new_callable=AsyncMock):
            await manager.connect(ws)
        assert manager._subscriber_task is not None

    def test_subscriber_stops_on_last_disconnect(self, manager):
        """Subscriber task should be cancelled when last client disconnects."""
        ws = MagicMock()
        manager.active_connections.append(ws)
        mock_task = MagicMock()
        mock_task.done.return_value = False
        manager._subscriber_task = mock_task

        manager.disconnect(ws)

        mock_task.cancel.assert_called_once()
        assert manager._subscriber_task is None

    @pytest.mark.asyncio
    async def test_broadcast_to_all(self, manager):
        """Broadcast should send message to all connected clients."""
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        manager.active_connections = [ws1, ws2]

        await manager.broadcast('{"data": "test"}')

        ws1.send_text.assert_awaited_once_with('{"data": "test"}')
        ws2.send_text.assert_awaited_once_with('{"data": "test"}')

    @pytest.mark.asyncio
    async def test_broadcast_removes_dead_connections(self, manager):
        """Failed send should clean up dead connections."""
        ws_alive = AsyncMock()
        ws_dead = AsyncMock()
        ws_dead.send_text.side_effect = Exception("Connection closed")
        manager.active_connections = [ws_alive, ws_dead]

        await manager.broadcast("test")

        assert ws_dead not in manager.active_connections
        assert ws_alive in manager.active_connections


class TestWebSocketAuth:
    """Test WebSocket endpoint authentication via query param token."""

    def test_ws_rejects_no_token(self):
        """Connect without token should close with 4001."""
        from fastapi.testclient import TestClient
        from api.main import app

        app.dependency_overrides.clear()
        client = TestClient(app)
        try:
            with pytest.raises(Exception):
                with client.websocket_connect("/ws/market"):
                    pass
        finally:
            app.dependency_overrides.clear()

    def test_ws_rejects_invalid_token(self):
        """Bad JWT should close with 4001."""
        from fastapi.testclient import TestClient
        from api.main import app

        app.dependency_overrides.clear()
        client = TestClient(app)
        try:
            with pytest.raises(Exception):
                with client.websocket_connect("/ws/market?token=invalid_jwt_token"):
                    pass
        finally:
            app.dependency_overrides.clear()

    def test_ws_accepts_valid_token(self):
        """Valid JWT should allow connection."""
        from fastapi.testclient import TestClient
        from api.main import app

        with patch("api.routes.ws.decode_token", return_value={"sub": "testuser"}):
            client = TestClient(app)
            try:
                with client.websocket_connect("/ws/market?token=valid_token") as ws:
                    ws.send_text("ping")
                    resp = ws.receive_text()
                    assert resp == "pong"
            finally:
                app.dependency_overrides.clear()

    def test_ping_pong(self):
        """Send 'ping' should receive 'pong'."""
        from fastapi.testclient import TestClient
        from api.main import app

        with patch("api.routes.ws.decode_token", return_value={"sub": "testuser"}):
            client = TestClient(app)
            try:
                with client.websocket_connect("/ws/market?token=valid") as ws:
                    ws.send_text("ping")
                    assert ws.receive_text() == "pong"
            finally:
                app.dependency_overrides.clear()
