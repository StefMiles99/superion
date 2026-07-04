"""Use case PostSessionEvent — BE-03."""

from __future__ import annotations

from application.dto.event import AppendEventInput, AppendEventOutput
from application.use_cases.events.append import AppendEventUseCase
from application.use_cases.sessions.pause import PauseSessionUseCase
from application.use_cases.sessions.resume import ResumeSessionUseCase
from application.use_cases.sessions.transition_step import TransitionStepUseCase
from domain.entities.user import User
from domain.exceptions import ValidationError
from domain.value_objects.event_type import EventType


class PostSessionEventUseCase:
    """Orquesta POST /events según tipo de evento."""

    def __init__(
        self,
        *,
        append_events: AppendEventUseCase,
        pause_session: PauseSessionUseCase,
        resume_session: ResumeSessionUseCase,
        transition_step: TransitionStepUseCase,
    ) -> None:
        self._append = append_events
        self._pause = pause_session
        self._resume = resume_session
        self._transition = transition_step

    async def execute(
        self,
        *,
        session_id: str,
        body: AppendEventInput,
        current_user: User,
    ) -> AppendEventOutput:
        existing = await self._append.find_by_event_id(session_id, body.event_id)
        if existing is not None:
            return AppendEventOutput(seq=existing.seq, accepted=True)

        event_type = body.type

        if event_type == EventType.COMMAND.value:
            command = body.payload.get("command")
            if command == "pause":
                seq = await self._pause.execute(
                    session_id=session_id,
                    current_user=current_user,
                    event_id=body.event_id,
                )
                return AppendEventOutput(seq=seq, accepted=True)
            if command == "resume":
                seq = await self._resume.execute(
                    session_id=session_id,
                    current_user=current_user,
                    event_id=body.event_id,
                )
                return AppendEventOutput(seq=seq, accepted=True)
            raise ValidationError(
                code="VALIDATION_ERROR",
                message=f"Comando no soportado vía REST: {command}.",
            )

        if event_type == EventType.STEP_ADVANCE.value:
            seq = await self._transition.mark_step_complete(
                session_id=session_id,
                step_index=body.step_index,
                current_user=current_user,
                event_id=body.event_id,
            )
            return AppendEventOutput(seq=seq, accepted=True)

        if event_type == EventType.STEP_SKIP.value:
            reason = str(body.payload.get("reason", ""))
            seq = await self._transition.skip_step(
                session_id=session_id,
                step_index=body.step_index,
                reason=reason,
                current_user=current_user,
                event_id=body.event_id,
            )
            return AppendEventOutput(seq=seq, accepted=True)

        return await self._append.execute(
            session_id=session_id,
            event_id=body.event_id,
            event_type=event_type,
            step_index=body.step_index,
            payload=body.payload,
            current_user=current_user,
        )
