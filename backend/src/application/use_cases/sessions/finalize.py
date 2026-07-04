"""Use case FinalizeSession — BE-03 stub (PDF en BE-07)."""

from __future__ import annotations

from datetime import timedelta
from uuid import uuid4

from application.dto.event import FinalizeSessionOutput
from application.use_cases.events.append import AppendEventUseCase
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import ISessionRepository
from domain.ports.services import IClock
from domain.value_objects.event_type import EventType


class FinalizeSessionUseCase:
    """Cierra sesión sin generar PDF real."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        append_events: AppendEventUseCase,
        clock: IClock,
    ) -> None:
        self._sessions = sessions
        self._append = append_events
        self._clock = clock

    async def execute(
        self,
        *,
        session_id: str,
        current_user: User,
    ) -> FinalizeSessionOutput:
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

        ended_at = self._clock.now()
        updated = session.finalize(ended_at=ended_at)
        await self._sessions.save(updated)

        report_id = str(uuid4())
        pdf_expires = ended_at + timedelta(hours=1)
        pdf_url = f"https://placeholder/reports/{report_id}.pdf"

        await self._append.emit_system_event(
            session_id=session_id,
            event_type=EventType.SESSION_CLOSED.value,
            step_index=updated.current_step_index,
            payload={"report_id": report_id, "pdf_url": pdf_url},
        )

        return FinalizeSessionOutput(
            session_id=session_id,
            report_id=report_id,
            pdf_url=pdf_url,
            pdf_expires_at=pdf_expires.isoformat().replace("+00:00", "Z"),
        )
