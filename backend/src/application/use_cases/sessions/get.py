"""Use case GetSession — BE-02/BE-03."""

from __future__ import annotations

from application.dto.session import SessionDetailOutput, SessionMetricsOutput
from application.services.session_access import resolve_session_for_user
from domain.entities.user import User
from domain.ports.repositories import ISessionEventRepository, ISessionRepository, IUserRepository


class GetSessionUseCase:
    """Devuelve detalle de sesión con métricas básicas."""

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

    async def execute(self, *, session_id: str, current_user: User) -> SessionDetailOutput:
        session = await resolve_session_for_user(
            sessions=self._sessions,
            users=self._users,
            session_id=session_id,
            current_user=current_user,
        )

        ended_at: str | None = None
        if session.ended_at is not None:
            ended_at = session.ended_at.isoformat().replace("+00:00", "Z")

        next_seq = await self._events.next_seq(session_id)

        return SessionDetailOutput(
            id=session.id,
            work_order_id=session.work_order_id,
            technician_id=session.technician_id,
            status=session.status.value,
            started_at=session.started_at.isoformat().replace("+00:00", "Z"),
            ended_at=ended_at,
            current_step_index=session.current_step_index,
            metrics=SessionMetricsOutput(),
            next_seq=next_seq,
        )
