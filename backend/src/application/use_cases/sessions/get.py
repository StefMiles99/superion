"""Use case GetSession — BE-02."""

from __future__ import annotations

from application.dto.session import SessionDetailOutput, SessionMetricsOutput
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import ISessionRepository


class GetSessionUseCase:
    """Devuelve detalle de sesión con métricas básicas."""

    def __init__(self, *, sessions: ISessionRepository) -> None:
        self._sessions = sessions

    async def execute(self, *, session_id: str, current_user: User) -> SessionDetailOutput:
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

        ended_at: str | None = None
        if session.ended_at is not None:
            ended_at = session.ended_at.isoformat().replace("+00:00", "Z")

        return SessionDetailOutput(
            id=session.id,
            work_order_id=session.work_order_id,
            technician_id=session.technician_id,
            status=session.status.value,
            started_at=session.started_at.isoformat().replace("+00:00", "Z"),
            ended_at=ended_at,
            current_step_index=session.current_step_index,
            metrics=SessionMetricsOutput(),
            next_seq=1,
        )
