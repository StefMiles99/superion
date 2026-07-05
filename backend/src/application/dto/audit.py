"""DTOs de audit log — BE-08."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class AuditEntryOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    actor_user_id: str
    action: str
    target_type: str
    target_id: str
    payload: dict[str, object] = Field(default_factory=dict)
    created_at: str


class ListAuditOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[AuditEntryOutput]
    next_cursor: str | None = None
