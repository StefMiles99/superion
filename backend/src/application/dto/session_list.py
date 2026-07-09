"""DTOs de listado de sesiones — supervisor/desktop."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class SessionListItemOutput(BaseModel):
    """Item de GET /v1/sessions."""

    model_config = ConfigDict(extra="forbid")

    id: str
    work_order_id: str
    work_order_code: str
    asset_name: str
    technician_name: str
    status: str
    started_at: str
    ended_at: str | None = None


class SessionListOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[SessionListItemOutput] = Field(default_factory=list)
