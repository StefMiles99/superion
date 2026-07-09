"""Tests parser tool call ElevenLabs — BE-06."""

import pytest

from application.dto.elevenlabs_tool_call import parse_tool_call_body
from domain.exceptions import ValidationError


def test_parse_internal_contract_format() -> None:
    parsed = parse_tool_call_body(
        {
            "call_id": "call-1",
            "session_id": "sess-1",
            "arguments": {"step_index": 0},
        }
    )
    assert parsed.call_id == "call-1"
    assert parsed.session_id == "sess-1"
    assert parsed.arguments == {"step_index": 0}


def test_parse_elevenlabs_native_format() -> None:
    parsed = parse_tool_call_body(
        {
            "tool_call_id": "call-abc",
            "tool_name": "get_current_step",
            "parameters": {"session_id": "sess-99"},
            "conversation_id": "conv-1",
        }
    )
    assert parsed.call_id == "call-abc"
    assert parsed.session_id == "sess-99"
    assert parsed.arguments == {}
    assert parsed.tool_name == "get_current_step"


def test_parse_elevenlabs_missing_session_raises() -> None:
    with pytest.raises(ValidationError) as exc:
        parse_tool_call_body(
            {
                "tool_call_id": "call-abc",
                "parameters": {},
            }
        )
    assert "session_id" in exc.value.message.lower()


def test_parse_flat_body_with_session_id_only() -> None:
    parsed = parse_tool_call_body({"session_id": "sess-flat"})
    assert parsed.session_id == "sess-flat"
    assert parsed.arguments == {}
