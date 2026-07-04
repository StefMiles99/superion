"""Use case PauseSession — BE-03."""

from __future__ import annotations

from application.use_cases.events.append import AppendEventUseCase
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import ISessionRepository
from domain.value_objects.event_type import EventType


class PauseSessionUseCase:
    """Pausa sesión y emite session.paused + step.paused."""

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
        current_user: User,
        reason: str = "user",
        event_id: str | None = None,
    ) -> int:
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

        updated = session.pause()
        await self._sessions.save(updated)

        paused = await self._append.emit_system_event(
            session_id=session_id,
            event_type=EventType.SESSION_PAUSED.value,
            step_index=updated.current_step_index,
            payload={"reason": reason},
            event_id=event_id,
        )
        await self._append.emit_system_event(
            session_id=session_id,
            event_type=EventType.STEP_PAUSED.value,
            step_index=updated.current_step_index,
            payload={"index": updated.current_step_index, "reason": reason},
        )
        return int(paused.seq)
