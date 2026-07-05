"""Tests mappers Supabase — session_event."""

from datetime import UTC, datetime

from domain.entities.session_event import SessionEvent
from infrastructure.persistence.supabase.mappers import (
    payload_from_row,
    session_event_from_row,
    session_event_to_row,
)


def test_payload_from_row_dict() -> None:
    assert payload_from_row({"text": "hola"}) == {"text": "hola"}


def test_row_to_session_event() -> None:
    row = {
        "id": "evt-1",
        "session_id": "sess-1",
        "seq": 2,
        "type": "utterance",
        "payload": {"text": "hola", "speaker": "technician"},
        "step_index": 1,
        "created_at": datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
    }
    event = session_event_from_row(row)
    assert event.id == "evt-1"
    assert event.seq == 2
    assert event.payload["text"] == "hola"


def test_session_event_to_row_serializes_payload() -> None:
    event = SessionEvent(
        id="evt-1",
        session_id="sess-1",
        seq=1,
        type="utterance",
        payload={"text": "hola"},
        step_index=0,
        created_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
    )
    row = session_event_to_row(event)
    assert row[0] == "evt-1"
    assert row[4] == '{"text": "hola"}'
