"""Conversión SessionEvent → mensaje WebSocket — BE-03."""

from __future__ import annotations

from domain.entities.session_event import SessionEvent
from domain.value_objects.event_type import WS_APPENDED_TYPES


def event_to_ws_message(event: SessionEvent) -> dict[str, object]:
    """Convierte evento persistido al formato WS del contrato."""
    created_at = event.created_at.isoformat().replace("+00:00", "Z")

    if event.type in WS_APPENDED_TYPES:
        return {
            "seq": event.seq,
            "type": "event.appended",
            "session_id": event.session_id,
            "created_at": created_at,
            "payload": {
                "type": event.type,
                "event_id": event.id,
                "step_index": event.step_index,
                **event.payload,
            },
        }

    return {
        "seq": event.seq,
        "type": event.type,
        "session_id": event.session_id,
        "created_at": created_at,
        "payload": event.payload,
    }
