"""Repositorio in-memory de eventos de sesión — BE-03."""

from __future__ import annotations

import asyncio

from domain.entities.session_event import SessionEvent


class InMemorySessionEventRepository:
    """Eventos append-only con seq monotónico por sesión."""

    _instance: InMemorySessionEventRepository | None = None

    def __init__(self) -> None:
        self._events: dict[str, list[SessionEvent]] = {}
        self._seq_counters: dict[str, int] = {}
        self._event_id_index: dict[tuple[str, str], SessionEvent] = {}
        self._global_lock = asyncio.Lock()
        self._session_locks: dict[str, asyncio.Lock] = {}

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> InMemorySessionEventRepository:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _lock_for(self, session_id: str) -> asyncio.Lock:
        if session_id not in self._session_locks:
            self._session_locks[session_id] = asyncio.Lock()
        return self._session_locks[session_id]

    async def next_seq(self, session_id: str) -> int:
        async with self._lock_for(session_id):
            current = self._seq_counters.get(session_id, 0)
            return current + 1

    async def append(self, event: SessionEvent) -> SessionEvent:
        async with self._lock_for(session_id := event.session_id):
            expected = self._seq_counters.get(session_id, 0) + 1
            if event.seq != expected:
                msg = f"seq esperado {expected}, recibido {event.seq}"
                raise ValueError(msg)

            self._seq_counters[session_id] = event.seq
            self._events.setdefault(session_id, []).append(event)
            self._event_id_index[(session_id, event.id)] = event
            return event

    async def get_by_event_id(self, session_id: str, event_id: str) -> SessionEvent | None:
        async with self._global_lock:
            return self._event_id_index.get((session_id, event_id))

    async def list_since(
        self,
        session_id: str,
        *,
        since_seq: int = 0,
        limit: int = 100,
    ) -> list[SessionEvent]:
        async with self._lock_for(session_id):
            events = self._events.get(session_id, [])
            filtered = [event for event in events if event.seq > since_seq]
            return filtered[:limit]

    async def has_accepted_photo(self, session_id: str, step_index: int) -> bool:
        async with self._lock_for(session_id):
            for event in self._events.get(session_id, []):
                if event.type != "photo":
                    continue
                if event.step_index != step_index:
                    continue
                if event.payload.get("status") == "accepted":
                    return True
            return False

    async def reset(self) -> None:
        async with self._global_lock:
            self._events.clear()
            self._seq_counters.clear()
            self._event_id_index.clear()
            self._session_locks.clear()
