"""Use case ToolRequestPhoto — BE-06."""

from __future__ import annotations

from uuid import uuid4

from application.use_cases.events.append import AppendEventUseCase
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import ISessionRepository


class ToolRequestPhotoUseCase:
    """Solicita foto de evidencia y emite photo.requested."""

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
        step_index: int,
        criteria: str,
        current_user: User,
        call_id: str | None = None,
    ) -> dict[str, object]:
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

        photo_id = str(uuid4())
        tool_call_id = call_id or str(uuid4())

        await self._append.emit_system_event(
            session_id=session_id,
            event_type="tool.called",
            step_index=step_index,
            payload={
                "tool_name": "request_evidence_photo",
                "arguments": {"step_index": step_index, "criteria": criteria},
                "call_id": tool_call_id,
            },
        )

        await self._append.emit_system_event(
            session_id=session_id,
            event_type="photo.requested",
            step_index=step_index,
            payload={
                "photo_id": photo_id,
                "step_index": step_index,
                "criteria": criteria,
            },
        )

        return {"accepted": True, "photo_id": photo_id}
