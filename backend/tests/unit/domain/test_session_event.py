"""Tests de entidad SessionEvent — BE-03."""

from datetime import UTC, datetime

import pytest

from domain.entities.session_event import SessionEvent, validate_rest_event_payload
from domain.exceptions import ValidationError


def _event(*, seq: int = 1, event_type: str = "measurement") -> SessionEvent:
    return SessionEvent(
        id="evt-1",
        session_id="sess-1",
        seq=seq,
        type=event_type,
        payload={"name": "presion", "value": 85.2, "unit": "psi"},
        step_index=0,
        created_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
    )


def test_session_event_seq_must_be_positive() -> None:
    with pytest.raises(ValueError, match="seq"):
        _event(seq=0)


def test_session_event_step_index_must_be_non_negative() -> None:
    with pytest.raises(ValueError, match="step_index"):
        SessionEvent(
            id="evt-1",
            session_id="sess-1",
            seq=1,
            type="measurement",
            payload={"name": "p", "value": 1.0, "unit": "psi"},
            step_index=-1,
            created_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
        )


def test_validate_measurement_payload() -> None:
    validate_rest_event_payload(
        "measurement",
        {"name": "presion", "value": 85.2, "unit": "psi"},
    )


def test_validate_measurement_rejects_missing_unit() -> None:
    with pytest.raises(ValidationError, match="unit"):
        validate_rest_event_payload("measurement", {"name": "p", "value": 1.0})


def test_validate_command_pause() -> None:
    validate_rest_event_payload("command", {"command": "pause"})
