"""Entidad SessionEvent — BE-03."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from domain.exceptions import ValidationError
from domain.value_objects.event_type import REST_EVENT_TYPES


def validate_rest_event_payload(event_type: str, payload: dict[str, object]) -> None:
    """Valida shape mínima del payload para eventos POST /events."""
    if event_type not in REST_EVENT_TYPES:
        raise ValidationError(
            code="VALIDATION_ERROR",
            message=f"Tipo de evento no soportado: {event_type}.",
            details={"type": event_type},
        )

    if event_type == "command":
        command = payload.get("command")
        if command not in ("pause", "resume", "repeat_step", "go_back"):
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="Comando inválido.",
                details={"command": command},
            )
        return

    if event_type == "measurement":
        for field in ("name", "value", "unit"):
            if field not in payload:
                raise ValidationError(
                    code="VALIDATION_ERROR",
                    message=f"Campo requerido: {field}.",
                    details={"field": field},
                )
        return

    if event_type == "finding":
        if "text" not in payload:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="Campo requerido: text.",
            )
        severity = payload.get("severity")
        if severity is not None and severity not in ("low", "med", "high"):
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="severity inválida.",
                details={"severity": severity},
            )
        return


@dataclass(frozen=True, slots=True)
class SessionEvent:
    """Evento append-only de una sesión con seq monotónico."""

    id: str
    session_id: str
    seq: int
    type: str
    payload: dict[str, object]
    step_index: int
    created_at: datetime

    def __post_init__(self) -> None:
        if self.seq < 1:
            raise ValueError("seq debe ser >= 1")
        if self.step_index < 0:
            raise ValueError("step_index debe ser >= 0")
