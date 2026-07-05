"""DTOs de reportes — BE-07."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ReportDiffOutput(BaseModel):
    """Diff publicado por WS report.updated."""

    model_config = ConfigDict(extra="forbid")

    summary_changed: bool
    step_index: int | None = None
    added_event_seq: int
    fields_changed: list[str] = Field(default_factory=list)


class ReportOutput(BaseModel):
    """Response GET /v1/sessions/{id}/report."""

    model_config = ConfigDict(extra="forbid")

    id: str
    session_id: str
    status: str
    content: dict[str, Any]
    version: int
    updated_at: str


class FinalizeReportOutput(BaseModel):
    """Response POST /v1/sessions/{id}/finalize."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    report_id: str
    pdf_url: str
    pdf_expires_at: str
