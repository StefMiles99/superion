"""Use case ListEventsSince — BE-03."""

from __future__ import annotations

from application.dto.event import ListEventsOutput, SessionEventOutput
from application.services.session_access import resolve_session_for_user
from domain.entities.user import User
from domain.ports.repositories import ISessionEventRepository, ISessionRepository, IUserRepository


class ListEventsSinceUseCase:
    """Devuelve eventos desde since_seq para catch-up WS."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        events: ISessionEventRepository,
        users: IUserRepository,
    ) -> None:
        self._sessions = sessions
        self._events = events
        self._users = users

    async def execute(
        self,
        *,
        session_id: str,
        since_seq: int,
        limit: int,
        current_user: User,
    ) -> ListEventsOutput:
        await resolve_session_for_user(
            sessions=self._sessions,
            users=self._users,
            session_id=session_id,
            current_user=current_user,
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
