"""Use case ToolMarkStepComplete — BE-06."""

from __future__ import annotations

from uuid import uuid4

from application.use_cases.events.append import AppendEventUseCase
from application.use_cases.sessions.transition_step import TransitionStepUseCase
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import ISessionRepository


class ToolMarkStepCompleteUseCase:
    """Marca paso completo vía voz y emite tool.called."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        transition_step: TransitionStepUseCase,
        append_events: AppendEventUseCase,
    ) -> None:
        self._sessions = sessions
        self._transition = transition_step
        self._append = append_events

    async def execute(
        self,
        *,
        session_id: str,
        step_index: int | None,
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

        resolved_step = step_index if step_index is not None else session.current_step_index
        tool_call_id = call_id or str(uuid4())

        await self._append.emit_system_event(
            session_id=session_id,
            event_type="tool.called",
            step_index=resolved_step,
            payload={
                "tool_name": "mark_step_complete",
                "arguments": {"step_index": resolved_step},
                "call_id": tool_call_id,
            },
        )

        await self._transition.mark_step_complete(
            session_id=session_id,
            step_index=resolved_step,
            current_user=current_user,
            completed_by="voice",
        )

        return {"ok": True}
