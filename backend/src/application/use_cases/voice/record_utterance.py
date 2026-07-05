"""Use case RecordUtterance — persiste turno de conversación — BE-06."""

from __future__ import annotations

from application.use_cases.events.append import AppendEventUseCase
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import ISessionRepository


class RecordUtteranceUseCase:
    """Persiste utterance del técnico o del agente como event.appended."""

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
        speaker: str = "technician",
        intent: str | None = None,
        audio_ref: str | None = None,
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

        payload: dict[str, object] = {
            "text": text,
            "speaker": speaker,
        }
        if intent is not None:
            payload["intent"] = intent
        if audio_ref is not None:
            payload["audio_ref"] = audio_ref

        await self._append.emit_system_event(
            session_id=session_id,
            event_type="utterance",
            step_index=session.current_step_index,
            payload=payload,
        )
