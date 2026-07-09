"""Parser de tool calls ElevenLabs — BE-06."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, ValidationError as PydanticValidationError

from domain.exceptions import ValidationError


class ToolCallInput(BaseModel):
    """Request de tool call (contrato interno / tests)."""

    model_config = ConfigDict(extra="ignore")

    call_id: str
    session_id: str
    agent_id: str | None = None
    tool_name: str | None = None
    arguments: dict[str, object] = Field(default_factory=dict)
    timestamp: str | None = None


class ToolCallOutput(BaseModel):
    """Response de tool call hacia ElevenLabs."""

    model_config = ConfigDict(extra="forbid")

    call_id: str
    result: dict[str, object]


class NormalizedToolCall(BaseModel):
    """Tool call normalizado desde ElevenLabs o contrato interno."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    call_id: str
    session_id: str
    arguments: dict[str, object]
    tool_name: str | None = None


def parse_tool_call_body(raw: dict[str, object]) -> NormalizedToolCall:
    """Acepta payload ElevenLabs (`tool_call_id`, `parameters`) o contrato interno."""
    if "tool_call_id" in raw:
        call_id = str(raw["tool_call_id"])
        parameters = raw.get("parameters")
        args: dict[str, object] = dict(parameters) if isinstance(parameters, dict) else {}
        session_id = args.pop("session_id", None) or raw.get("session_id")
        if session_id is None:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="session_id ausente en tool call ElevenLabs.",
                details={"keys": sorted(raw.keys())},
            )
        return NormalizedToolCall(
            call_id=call_id,
            session_id=str(session_id),
            arguments=args,
            tool_name=str(raw["tool_name"]) if raw.get("tool_name") else None,
        )

    if "session_id" in raw and "call_id" not in raw:
        from uuid import uuid4

        skip = frozenset({"session_id", "tool_name", "conversation_id", "agent_id", "timestamp"})
        args = {k: v for k, v in raw.items() if k not in skip}
        return NormalizedToolCall(
            call_id=str(raw.get("tool_call_id") or uuid4()),
            session_id=str(raw["session_id"]),
            arguments=args,
            tool_name=str(raw["tool_name"]) if raw.get("tool_name") else None,
        )

    try:
        payload = ToolCallInput.model_validate(raw)
    except PydanticValidationError as exc:
        raise ValidationError(
            code="VALIDATION_ERROR",
            message="Payload de tool call inválido.",
            details={"errors": exc.errors(include_url=False)},
        ) from exc

    return NormalizedToolCall(
        call_id=payload.call_id,
        session_id=payload.session_id,
        arguments=dict(payload.arguments),
        tool_name=payload.tool_name,
    )
