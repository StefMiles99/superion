"""Use case HandleWebhook — BE-06."""

from __future__ import annotations

import json
import logging

from application.dto.webhook import WebhookEventInput, WebhookEventOutput
from application.use_cases.sessions.pause import PauseSessionUseCase
from application.use_cases.voice.classify_and_route import ClassifyAndRouteUseCase
from application.use_cases.voice.record_utterance import RecordUtteranceUseCase
from domain.entities.user import User
from domain.exceptions import NotFoundError, UnauthorizedError, ValidationError
from domain.ports.repositories import ISessionRepository, IUserRepository
from domain.ports.services import ILangGraphClient, ISignatureValidator

logger = logging.getLogger(__name__)

KNOWN_EVENTS = frozenset({
    "conversation.started",
    "utterance.final",
    "tool.called",
    "tool.responded",
    "turn.speaker_changed",
    "conversation.ended",
    "error",
})

_AGENT_SPEAKERS = frozenset({"agent", "assistant"})


class HandleWebhookUseCase:
    """Orquesta webhook ElevenLabs: firma, dispatch por tipo."""

    def __init__(
        self,
        *,
        signature_validator: ISignatureValidator,
        sessions: ISessionRepository,
        users: IUserRepository,
        classify_and_route: ClassifyAndRouteUseCase,
        record_utterance: RecordUtteranceUseCase,
        pause_session: PauseSessionUseCase,
        langgraph: ILangGraphClient,
    ) -> None:
        self._signature = signature_validator
        self._sessions = sessions
        self._users = users
        self._classify = classify_and_route
        self._record_utterance = record_utterance
        self._pause = pause_session
        self._langgraph = langgraph

    async def execute(
        self,
        *,
        raw_body: bytes,
        signature_header: str | None,
        current_user: User | None = None,
    ) -> WebhookEventOutput:
        self._signature.validate(payload=raw_body, signature_header=signature_header)

        try:
            data = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="JSON inválido en webhook.",
            ) from exc

        event_input = WebhookEventInput.model_validate(data)
        event_type = event_input.event

        if event_type not in KNOWN_EVENTS:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message=f"Evento desconocido: {event_type}.",
                details={"event": event_type},
            )

        user = await self._resolve_user(event_input.session_id, current_user)

        if event_type == "conversation.started":
            await self._handle_conversation_started(event_input, user)
        elif event_type == "utterance.final":
            await self._handle_utterance_final(event_input, user)
        elif event_type == "tool.called":
            await self._handle_tool_called(event_input)
        elif event_type == "conversation.ended":
            await self._handle_conversation_ended(event_input, user)

        return WebhookEventOutput(accepted=True, event=event_type)

    async def _resolve_user(
        self,
        session_id: str | None,
        current_user: User | None,
    ) -> User:
        if current_user is not None:
            if session_id:
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
            return current_user

        if session_id is None:
            raise UnauthorizedError(
                code="UNAUTHORIZED",
                message="Autenticación requerida.",
            )

        session = await self._sessions.get_by_id(session_id)
        if session is None:
            raise NotFoundError(
                code="SESSION_NOT_FOUND",
                message="Sesión no encontrada.",
                details={"id": session_id},
            )

        user = await self._users.get_by_id(session.technician_id)
        if user is None:
            raise UnauthorizedError(
                code="UNAUTHORIZED",
                message="Técnico de sesión no encontrado.",
            )
        return user

    async def _handle_conversation_started(
        self,
        event: WebhookEventInput,
        user: User,
    ) -> None:
        if event.session_id is None:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="session_id requerido.",
            )
        session = await self._sessions.get_by_id(event.session_id)
        if session is None:
            raise NotFoundError(
                code="SESSION_NOT_FOUND",
                message="Sesión no encontrada.",
                details={"id": event.session_id},
            )
        await self._langgraph.ensure_session(
            event.session_id,
            current_step_index=session.current_step_index,
        )

    async def _handle_utterance_final(
        self,
        event: WebhookEventInput,
        user: User,
    ) -> None:
        if event.session_id is None or event.text is None:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="session_id y text requeridos.",
            )

        speaker = (event.speaker or "user").lower()
        if speaker in _AGENT_SPEAKERS:
            await self._record_utterance.execute(
                session_id=event.session_id,
                text=event.text,
                current_user=user,
                speaker="agent",
                audio_ref=event.audio_url,
            )
            return

        await self._classify.execute(
            session_id=event.session_id,
            text=event.text,
            current_user=user,
            audio_ref=event.audio_url,
        )

    async def _handle_tool_called(self, event: WebhookEventInput) -> None:
        logger.info(
            "tool.called webhook",
            extra={
                "tool_name": event.tool_name,
                "call_id": event.call_id,
                "session_id": event.session_id,
            },
        )

    async def _handle_conversation_ended(
        self,
        event: WebhookEventInput,
        user: User,
    ) -> None:
        if event.session_id is None:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="session_id requerido.",
            )
        await self._pause.execute(
            session_id=event.session_id,
            current_user=user,
            reason=event.reason or "conversation_ended",
        )
