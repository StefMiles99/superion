"""DTOs ElevenLabs provision — BE-09."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class VoiceConnectOutput(BaseModel):
    """Response de POST /v1/sessions/{id}/voice/connect."""

    model_config = ConfigDict(extra="forbid")

    agent_id: str
    connect_mode: str
    signed_url: str
    expires_at: str
    dynamic_variables: dict[str, str] = Field(default_factory=dict)


class AgentStatusOutput(BaseModel):
    """Response de GET /v1/admin/elevenlabs/agent/status."""

    model_config = ConfigDict(extra="forbid")

    provisioner: str
    agent_id: str
    branch_id: str
    deployed_at: str | None
    environment: str
    tools_synced: int
    status: str
