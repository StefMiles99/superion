"""DTOs de eventos — BE-03."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AppendEventInput(BaseModel):
    """Request POST /v1/sessions/{id}/events."""

    model_config = ConfigDict(extra="forbid")

    event_id: str
    type: str
    step_index: int = Field(ge=0)
    payload: dict[str, Any] = Field(default_factory=dict)


class AppendEventOutput(BaseModel):
    """Response 202 POST /v1/sessions/{id}/events."""

    model_config = ConfigDict(extra="forbid")

    seq: int
    accepted: bool = True


class SessionEventOutput(BaseModel):
    """Item de evento en listados."""

    model_config = ConfigDict(extra="forbid")

    seq: int
    type: str
    session_id: str
    step_index: int
    payload: dict[str, object]
    created_at: str


class ListEventsOutput(BaseModel):
    """Response GET /v1/sessions/{id}/events."""

    model_config = ConfigDict(extra="forbid")

    items: list[SessionEventOutput]
    next_cursor: str | None = None


class FinalizeSessionOutput(BaseModel):
    """Response stub POST /v1/sessions/{id}/finalize — BE-07 completa PDF."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    report_id: str
    pdf_url: str
    pdf_expires_at: str
