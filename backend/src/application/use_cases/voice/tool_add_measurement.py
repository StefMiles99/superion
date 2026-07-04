"""Use case ToolAddMeasurement — BE-06."""

from __future__ import annotations

import re
from uuid import uuid4

from application.use_cases.events.append import AppendEventUseCase
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import ISessionRepository

_MEASUREMENT_RE = re.compile(
    r"(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>psi|bar|n\.?m|kg)",
    re.IGNORECASE,
)


class ToolAddMeasurementUseCase:
    """Registra medición narrada por voz."""

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
        name: str,
        value: float,
        unit: str,
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

        measurement_id = str(uuid4())
        tool_call_id = call_id or str(uuid4())

        await self._append.emit_system_event(
            session_id=session_id,
            event_type="tool.called",
            step_index=session.current_step_index,
            payload={
                "tool_name": "add_measurement",
                "arguments": {"name": name, "value": value, "unit": unit},
                "call_id": tool_call_id,
            },
        )

        await self._append.emit_system_event(
            session_id=session_id,
            event_type="measurement",
            step_index=session.current_step_index,
            payload={
                "name": name,
                "value": value,
                "unit": unit,
                "measurement_id": measurement_id,
            },
        )

        return {"measurement_id": measurement_id}

    @staticmethod
    def parse_from_text(text: str) -> tuple[str, float, str] | None:
        """Extrae valor y unidad de un utterance de medición."""
        match = _MEASUREMENT_RE.search(text)
        if match is None:
            return None
        value = float(match.group("value"))
        unit = match.group("unit").lower().replace(".", "")
        return "medicion", value, unit
