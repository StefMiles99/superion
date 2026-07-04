"""DTOs tool calls ElevenLabs — BE-06."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ToolCallInput(BaseModel):
    """Request de tool call desde ElevenLabs."""

    model_config = ConfigDict(extra="forbid")

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
