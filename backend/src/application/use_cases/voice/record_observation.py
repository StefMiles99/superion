"""Use case RecordObservation — persiste narración de seguimiento — BE-06."""

from __future__ import annotations

from application.use_cases.events.append import AppendEventUseCase
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import ISessionRepository


class RecordObservationUseCase:
    """Registra observación narrada por el técnico sobre el estado del procedimiento."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        append_events: AppendEventUseCase,
    ) -> None:
        self._sessions = sessions
        self._append = append_events

    async def execute(
        self,
        *,
        session_id: str,
        text: str,
        current_user: User,
        source: str = "voice",
    ) -> None:
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

        await self._append.emit_system_event(
            session_id=session_id,
            event_type="observation",
            step_index=session.current_step_index,
            payload={"text": text, "source": source},
        )
