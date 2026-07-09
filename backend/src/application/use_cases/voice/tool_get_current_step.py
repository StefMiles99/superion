"""Use case ToolGetCurrentStep — BE-06."""

from __future__ import annotations

from uuid import uuid4

from application.use_cases.events.append import AppendEventUseCase
from application.use_cases.sessions.transition_step import TransitionStepUseCase
from domain.entities.user import User


class ToolGetCurrentStepUseCase:
    """Devuelve paso actual de la sesión vía tool ElevenLabs."""

    def __init__(
        self,
        *,
        transition_step: TransitionStepUseCase,
        append_events: AppendEventUseCase,
    ) -> None:
        self._transition = transition_step
        self._append = append_events

    async def execute(
        self,
        *,
        session_id: str,
        current_user: User,
        call_id: str | None = None,
    ) -> dict[str, object]:
        result = await self._transition.get_current_step(
            session_id=session_id,
            current_user=current_user,
        )
        step_index = int(result["current_step_index"])
        tool_call_id = call_id or str(uuid4())

        await self._append.emit_system_event(
            session_id=session_id,
            event_type="tool.called",
            step_index=step_index,
            payload={
                "tool_name": "get_current_step",
                "arguments": {},
                "call_id": tool_call_id,
            },
        )

        return result
