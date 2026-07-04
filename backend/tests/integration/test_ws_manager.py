"""Tests ConnectionManager — BE-03."""

from unittest.mock import AsyncMock

import pytest
from starlette.websockets import WebSocketState

from interface.ws.manager import ConnectionManager


@pytest.fixture
async def manager() -> ConnectionManager:
    instance = ConnectionManager.shared()
    await instance.reset()
    return instance


def _mock_ws() -> AsyncMock:
    ws = AsyncMock()
    ws.client_state = WebSocketState.CONNECTED
    ws.send_json = AsyncMock()
    ws.accept = AsyncMock()
    return ws


async def test_broadcast_sends_to_all_connected(manager: ConnectionManager) -> None:
    ws1 = _mock_ws()
    ws2 = _mock_ws()
    await manager.connect("sess-1", ws1)
    await manager.connect("sess-1", ws2)

    await manager.broadcast("sess-1", {"type": "session.paused", "seq": 1})

    ws1.send_json.assert_awaited_once()
    ws2.send_json.assert_awaited_once()


async def test_disconnect_removes_connection(manager: ConnectionManager) -> None:
    ws = _mock_ws()
    await manager.connect("sess-1", ws)
    await manager.disconnect("sess-1", ws)

    ws.send_json.reset_mock()
    await manager.broadcast("sess-1", {"type": "ping"})
    ws.send_json.assert_not_awaited()
