"""Contract tests WebSocket — BE-08."""

from __future__ import annotations

from application.services.event_broadcast import event_to_ws_message
from domain.entities.session_event import SessionEvent
from domain.value_objects.event_type import EventType

REQUIRED_WS_FIELDS = frozenset({"seq", "type", "session_id", "created_at", "payload"})


def _make_event(event_type: str, payload: dict[str, object]) -> SessionEvent:
    from datetime import UTC, datetime

    return SessionEvent(
        id="evt-1",
        session_id="sess-1",
        seq=1,
        type=event_type,
        step_index=0,
        payload=payload,
        created_at=datetime(2025, 1, 1, tzinfo=UTC),
    )


def test_session_started_shape() -> None:
    event = _make_event(
        EventType.SESSION_STARTED.value,
        {"started_at": "2025-01-01T00:00:00Z", "work_order_id": "wo-1"},
    )
    message = event_to_ws_message(event)
    assert REQUIRED_WS_FIELDS.issubset(message.keys())
    assert message["type"] == "session.started"


def test_step_entered_shape() -> None:
    event = _make_event(
        EventType.STEP_ENTERED.value,
        {"index": 0, "title": "Paso 1", "critical": True, "requires_photo": False},
    )
    message = event_to_ws_message(event)
    assert REQUIRED_WS_FIELDS.issubset(message.keys())
    assert message["type"] == "step.entered"
    assert "index" in message["payload"]


def test_photo_validated_shape() -> None:
    event = _make_event(
        "photo.validated",
        {"photo_id": "photo-1", "step_index": 0, "feedback": "ok"},
    )
    message = event_to_ws_message(event)
    assert REQUIRED_WS_FIELDS.issubset(message.keys())
    assert message["type"] == "photo.validated"


def test_event_appended_wraps_rest_types() -> None:
    event = _make_event(
        EventType.MEASUREMENT.value,
        {"value": 42, "unit": "bar"},
    )
    message = event_to_ws_message(event)
    assert message["type"] == "event.appended"
    assert message["payload"]["type"] == EventType.MEASUREMENT.value
