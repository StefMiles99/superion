"""Tests entidad ToolCall — BE-06."""

from datetime import UTC, datetime

from domain.entities.tool_call import ToolCall


def test_tool_call_shape() -> None:
    called_at = datetime(2026, 7, 4, 12, 0, tzinfo=UTC)
    tool_call = ToolCall(
        id="call-1",
        name="query_manual",
        arguments={"question": "¿torque?"},
        session_id="sess-1",
        called_at=called_at,
    )
    assert tool_call.id == "call-1"
    assert tool_call.name == "query_manual"
    assert tool_call.arguments["question"] == "¿torque?"
    assert tool_call.session_id == "sess-1"
    assert tool_call.called_at == called_at
