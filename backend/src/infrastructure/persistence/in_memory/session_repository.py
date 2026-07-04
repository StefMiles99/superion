"""Repositorio in-memory de sesiones — BE-02."""

from __future__ import annotations

import asyncio

from domain.entities.maintenance_session import MaintenanceSession


class InMemorySessionRepository:
    """Sesiones en memoria — arranca vacío."""

    _instance: InMemorySessionRepository | None = None

    def __init__(self) -> None:
        self._sessions: dict[str, MaintenanceSession] = {}
        self._lock = asyncio.Lock()

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> InMemorySessionRepository:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def save(self, session: MaintenanceSession) -> None:
        async with self._lock:
            self._sessions[session.id] = session

    async def get_by_id_for_technician(
        self,
        session_id: str,
        *,
        technician_id: str,
    ) -> MaintenanceSession | None:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None or session.technician_id != technician_id:
                return None
            return session

    async def get_by_id(self, session_id: str) -> MaintenanceSession | None:
        async with self._lock:
            return self._sessions.get(session_id)

    async def get_active_for_work_order(self, work_order_id: str) -> MaintenanceSession | None:
        async with self._lock:
            for session in self._sessions.values():
                if session.work_order_id == work_order_id and session.is_active:
                    return session
            return None

    async def reset(self) -> None:
        async with self._lock:
            self._sessions.clear()
