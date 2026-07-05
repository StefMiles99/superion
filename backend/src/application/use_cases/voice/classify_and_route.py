"""Use case ClassifyAndRoute — BE-06."""

from __future__ import annotations

from uuid import uuid4

from application.use_cases.voice.execute_tool import ExecuteToolUseCase
from application.use_cases.voice.record_observation import RecordObservationUseCase
from application.use_cases.voice.record_utterance import RecordUtteranceUseCase
from application.use_cases.voice.tool_add_measurement import ToolAddMeasurementUseCase
from domain.entities.user import User
from domain.entities.voice_command import VoiceCommand
from domain.exceptions import NotFoundError, ValidationError
from domain.ports.repositories import ISessionRepository
from domain.ports.services import IIntentClassifier


class ClassifyAndRouteUseCase:
    """Clasifica utterance, lo persiste y enruta a tool o respuesta directa."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        classifier: IIntentClassifier,
        record_utterance: RecordUtteranceUseCase,
        record_observation: RecordObservationUseCase,
        execute_tool: ExecuteToolUseCase,
        add_measurement: ToolAddMeasurementUseCase,
    ) -> None:
        self._sessions = sessions
        self._classifier = classifier
        self._record_utterance = record_utterance
        self._record_observation = record_observation
        self._execute_tool = execute_tool
        self._add_measurement = add_measurement

    async def execute(
        self,
        *,
        session_id: str,
        text: str,
        current_user: User,
        audio_ref: str | None = None,
    ) -> VoiceCommand:
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

        intent, confidence = self._classifier.classify(text)
        command = VoiceCommand(
            session_id=session_id,
            text=text,
            intent=intent,
            confidence=confidence,
            audio_ref=audio_ref,
        )

        await self._record_utterance.execute(
            session_id=session_id,
            text=text,
            current_user=current_user,
            speaker="technician",
            intent=intent,
            audio_ref=audio_ref,
        )

        call_id = str(uuid4())

        if intent == "advance":
            await self._execute_tool.execute(
                tool_name="mark_step_complete",
                session_id=session_id,
                arguments={"step_index": session.current_step_index},
                current_user=current_user,
                call_id=call_id,
            )
            return command

        if intent == "skip":
            await self._execute_tool.execute(
                tool_name="skip_step",
                session_id=session_id,
                arguments={
                    "step_index": session.current_step_index,
                    "reason": "voice skip",
                },
                current_user=current_user,
                call_id=call_id,
            )
            return command

        if intent == "pause":
            await self._execute_tool.execute(
                tool_name="pause_session",
                session_id=session_id,
                arguments={},
                current_user=current_user,
                call_id=call_id,
            )
            return command

        if intent == "query":
            await self._execute_tool.execute(
                tool_name="query_manual",
                session_id=session_id,
                arguments={"question": text},
                current_user=current_user,
                call_id=call_id,
            )
            return command

        if intent == "measurement":
            parsed = self._add_measurement.parse_from_text(text)
            if parsed is None:
                raise ValidationError(
                    code="VALIDATION_ERROR",
                    message="No se pudo parsear la medición.",
                )
            name, value, unit = parsed
            await self._execute_tool.execute(
                tool_name="add_measurement",
                session_id=session_id,
                arguments={"name": name, "value": value, "unit": unit},
                current_user=current_user,
                call_id=call_id,
            )
            return command

        if intent == "finding":
            await self._execute_tool.execute(
                tool_name="add_finding",
                session_id=session_id,
                arguments={"text": text, "severity": "med"},
                current_user=current_user,
                call_id=call_id,
            )
            return command

        if intent == "narration":
            await self._record_observation.execute(
                session_id=session_id,
                text=text,
                current_user=current_user,
            )
            return command

        if intent == "repeat":
            return command

        return command
