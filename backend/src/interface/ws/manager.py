"""ConnectionManager WebSocket — BE-03."""

from __future__ import annotations

import asyncio
from collections import defaultdict

from fastapi import WebSocket
from starlette.websockets import WebSocketState


class ConnectionManager:
    """Gestiona conexiones WS por session_id."""

    _instance: ConnectionManager | None = None

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> ConnectionManager:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[session_id].add(websocket)

    async def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            conns = self._connections.get(session_id)
            if conns is not None:
                conns.discard(websocket)
                if not conns:
                    del self._connections[session_id]

    async def broadcast(self, session_id: str, message: dict[str, object]) -> None:
        async with self._lock:
            targets = list(self._connections.get(session_id, set()))

        dead: list[WebSocket] = []
        for websocket in targets:
            if websocket.client_state != WebSocketState.CONNECTED:
                dead.append(websocket)
                continue
            try:
                await websocket.send_json(message)
            except RuntimeError:
                dead.append(websocket)

        for websocket in dead:
            await self.disconnect(session_id, websocket)

    async def reset(self) -> None:
        async with self._lock:
            self._connections.clear()
