"""Repositorio in-memory de audit log — BE-08."""

from __future__ import annotations

import asyncio

from domain.entities.audit_entry import AuditEntry


class InMemoryAuditLogRepository:
    """Audit log append-only con fixtures vacías."""

    _instance: InMemoryAuditLogRepository | None = None

    def __init__(self) -> None:
        self._entries: dict[str, AuditEntry] = {}
        self._order: list[str] = []
        self._lock = asyncio.Lock()

    @classmethod
    def shared(cls) -> InMemoryAuditLogRepository:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    async def append(self, entry: AuditEntry) -> None:
        async with self._lock:
            if entry.id in self._entries:
                return
            self._entries[entry.id] = entry
            self._order.append(entry.id)

    async def get_by_id(self, entry_id: str) -> AuditEntry | None:
        async with self._lock:
            return self._entries.get(entry_id)

    async def list_entries(
        self,
        *,
        actor_user_id: str | None = None,
        action: str | None = None,
        target_type: str | None = None,
        limit: int = 50,
        cursor: str | None = None,
    ) -> tuple[list[AuditEntry], str | None]:
        async with self._lock:
            items = [self._entries[eid] for eid in self._order if eid in self._entries]

            if actor_user_id is not None:
                items = [e for e in items if e.actor_user_id == actor_user_id]
            if action is not None:
                items = [e for e in items if e.action.value == action]
            if target_type is not None:
                items = [e for e in items if e.target_type == target_type]

            start = 0
            if cursor is not None:
                for idx, entry in enumerate(items):
                    if entry.id == cursor:
                        start = idx + 1
                        break

            page = items[start : start + limit]
            next_cursor = page[-1].id if len(page) == limit and start + limit < len(items) else None
            return page, next_cursor

    async def reset(self) -> None:
        async with self._lock:
            self._entries.clear()
            self._order.clear()
