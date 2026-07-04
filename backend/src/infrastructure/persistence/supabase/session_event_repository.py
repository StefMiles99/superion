"""Stub Supabase session events — BE-03."""

from __future__ import annotations

from domain.entities.session_event import SessionEvent


class SupabaseSessionEventRepository:
    """Stub — activar en BE-08."""

    async def append(self, event: SessionEvent) -> SessionEvent:
        raise NotImplementedError(
            "SupabaseSessionEventRepository.append — implementar al activar BE-08"
        )

    async def get_by_event_id(self, session_id: str, event_id: str) -> SessionEvent | None:
        raise NotImplementedError(
            "SupabaseSessionEventRepository.get_by_event_id — implementar al activar BE-08"
        )

    async def list_since(
        self,
        session_id: str,
        *,
        since_seq: int = 0,
        limit: int = 100,
    ) -> list[SessionEvent]:
        raise NotImplementedError(
            "SupabaseSessionEventRepository.list_since — implementar al activar BE-08"
        )

    async def next_seq(self, session_id: str) -> int:
        raise NotImplementedError(
            "SupabaseSessionEventRepository.next_seq — implementar al activar BE-08"
        )

    async def has_accepted_photo(self, session_id: str, step_index: int) -> bool:
        raise NotImplementedError(
            "SupabaseSessionEventRepository.has_accepted_photo — implementar al activar BE-08"
        )
