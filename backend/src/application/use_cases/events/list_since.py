"""Use case ListEventsSince — BE-03."""

from __future__ import annotations

from application.dto.event import ListEventsOutput, SessionEventOutput
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import ISessionEventRepository, ISessionRepository


class ListEventsSinceUseCase:
    """Devuelve eventos desde since_seq para catch-up WS."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        events: ISessionEventRepository,
    ) -> None:
        self._sessions = sessions
        self._events = events

    async def execute(
        self,
        *,
        session_id: str,
        since_seq: int,
        limit: int,
        current_user: User,
    ) -> ListEventsOutput:
        session = await self._sessions.get_by_id_for_technician(
            session_id,
            technician_id=current_user.id,
        )
        if session is None:
            raise NotFoundError(
                code="SESSION_NOT_FOUND",
                message="Sesión no encontrada.",
                details={"id": session_id},
            )

        items = await self._events.list_since(
            session_id,
            since_seq=since_seq,
            limit=limit,
        )
        return ListEventsOutput(
            items=[
                SessionEventOutput(
                    seq=event.seq,
                    type=event.type,
                    session_id=event.session_id,
                    step_index=event.step_index,
                    payload=event.payload,
                    created_at=event.created_at.isoformat().replace("+00:00", "Z"),
                )
                for event in items
            ],
            next_cursor=None,
        )
