"""Use case ToolAddFinding — BE-06."""

from __future__ import annotations

from uuid import uuid4

from application.use_cases.events.append import AppendEventUseCase
from domain.entities.user import User
from domain.exceptions import NotFoundError, ValidationError
from domain.ports.repositories import ISessionRepository


class ToolAddFindingUseCase:
    """Registra hallazgo narrado por voz."""

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
        severity: str,
        current_user: User,
        call_id: str | None = None,
    ) -> dict[str, object]:
        if severity not in ("low", "med", "high"):
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="Severity inválida.",
                details={"severity": severity},
            )

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

        finding_id = str(uuid4())
        tool_call_id = call_id or str(uuid4())

        await self._append.emit_system_event(
            session_id=session_id,
            event_type="tool.called",
            step_index=session.current_step_index,
            payload={
                "tool_name": "add_finding",
                "arguments": {"text": text, "severity": severity},
                "call_id": tool_call_id,
            },
        )

        await self._append.emit_system_event(
            session_id=session_id,
            event_type="finding",
            step_index=session.current_step_index,
            payload={"text": text, "severity": severity, "finding_id": finding_id},
        )

        return {"finding_id": finding_id}
