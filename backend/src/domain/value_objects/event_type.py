"""Tipos de evento de sesión — BE-03."""

from __future__ import annotations

from enum import StrEnum


class EventType(StrEnum):
    """Tipos persistidos y emitidos por WebSocket."""

    # Entrada REST / comandos
    COMMAND = "command"
    MEASUREMENT = "measurement"
    FINDING = "finding"
    STEP_ADVANCE = "step_advance"
    STEP_SKIP = "step_skip"
    PHOTO = "photo"

    # Ciclo de sesión
    SESSION_STARTED = "session.started"
    SESSION_PAUSED = "session.paused"
    SESSION_RESUMED = "session.resumed"
    SESSION_CLOSED = "session.closed"

    # Pasos
    STEP_ENTERED = "step.entered"
    STEP_COMPLETED = "step.completed"
    STEP_SKIPPED = "step.skipped"
    STEP_PAUSED = "step.paused"

    # Control WS
    EVENT_APPENDED = "event.appended"
    REPLAY_BATCH = "replay.batch"
    PING = "ping"
    PONG = "pong"
    ERROR = "error"


# Tipos aceptados en POST /v1/sessions/{id}/events
REST_EVENT_TYPES = frozenset({
    EventType.COMMAND.value,
    EventType.MEASUREMENT.value,
    EventType.FINDING.value,
    EventType.STEP_ADVANCE.value,
    EventType.STEP_SKIP.value,
})

# Tipos cuyo broadcast WS se envuelve en event.appended
WS_APPENDED_TYPES = frozenset({
    EventType.MEASUREMENT.value,
    EventType.FINDING.value,
    EventType.COMMAND.value,
    "utterance",
    "observation",
})
