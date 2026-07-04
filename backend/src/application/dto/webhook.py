"""DTOs webhook ElevenLabs — BE-06."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class WebhookEventInput(BaseModel):
    """Payload genérico de webhook ElevenLabs."""

    model_config = ConfigDict(extra="allow")

    event: str = Field(description="Tipo de evento: conversation.started, utterance.final, etc.")
    session_id: str | None = None
    text: str | None = None
    audio_url: str | None = None
    timestamp: str | None = None
    tool_name: str | None = None
    arguments: dict[str, object] | None = None
    call_id: str | None = None
    reason: str | None = None
    duration_seconds: int | None = None


class WebhookEventOutput(BaseModel):
    """Respuesta mínima del webhook."""

    model_config = ConfigDict(extra="forbid")

    accepted: bool = True
    event: str
