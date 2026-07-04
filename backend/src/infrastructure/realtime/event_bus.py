"""Bus de eventos in-memory — BE-03."""

from __future__ import annotations

import asyncio
from collections import defaultdict

from domain.ports.event_bus import EventHandler


class InMemoryEventBus:
    """Pub/sub en proceso — dispatch síncrono por handler."""

    _instance: InMemoryEventBus | None = None

    def __init__(self) -> None:
        self._subscribers: dict[str, set[EventHandler]] = defaultdict(set)
        self._lock = asyncio.Lock()

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> InMemoryEventBus:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def publish(self, session_id: str, message: dict[str, object]) -> None:
        async with self._lock:
            handlers = list(self._subscribers.get(session_id, set()))
        for handler in handlers:
            await handler(message)

    async def subscribe(self, session_id: str, handler: EventHandler) -> None:
        async with self._lock:
            self._subscribers[session_id].add(handler)

    async def unsubscribe(self, session_id: str, handler: EventHandler) -> None:
        async with self._lock:
            self._subscribers[session_id].discard(handler)

    async def reset(self) -> None:
        async with self._lock:
            self._subscribers.clear()
