"""DTOs de sesión — BE-02."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from application.dto.procedure_template import ProcedureTemplateOutput


class SessionMetricsOutput(BaseModel):
    """Métricas básicas de sesión (placeholder BE-02)."""

    model_config = ConfigDict(extra="forbid")

    total_active_seconds: int = 0
    voice_seconds: int = 0
    photos_count: int = 0
    avg_step_seconds: int = 0


class StartSessionOutput(BaseModel):
    """Respuesta POST /v1/work-orders/{id}/start."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    work_order_id: str
    procedure_template: ProcedureTemplateOutput
    langgraph_thread_id: str
    websocket_url: str
    started_at: str


class SessionDetailOutput(BaseModel):
    """Respuesta GET /v1/sessions/{id}."""

    model_config = ConfigDict(extra="forbid")

    id: str
    work_order_id: str
    technician_id: str
    status: str
    started_at: str
    ended_at: str | None
    current_step_index: int
    metrics: SessionMetricsOutput
    next_seq: int
