"""DTOs de work order — BE-02."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class AssetSummaryOutput(BaseModel):
    """Activo embebido en listado de OTs."""

    model_config = ConfigDict(extra="forbid")

    id: str
    tag: str
    name: str
    model: str


class AssignedUserOutput(BaseModel):
    """Usuario asignado embebido."""

    model_config = ConfigDict(extra="forbid")

    id: str
    full_name: str


class WorkOrderListItemOutput(BaseModel):
    """Ítem de listado GET /v1/work-orders."""

    model_config = ConfigDict(extra="forbid")

    id: str
    code: str
    type: str
    priority: str
    status: str
    asset: AssetSummaryOutput
    assigned_to: AssignedUserOutput | None
    planned_start: str
    planned_end: str
    procedure_template_id: str
    procedure_name: str
    estimated_minutes: int


class WorkOrderListOutput(BaseModel):
    """Respuesta paginada de OTs."""

    model_config = ConfigDict(extra="forbid")

    items: list[WorkOrderListItemOutput]
    next_cursor: str | None


class AssetDetailOutput(BaseModel):
    """Activo completo en detalle de OT."""

    model_config = ConfigDict(extra="forbid")

    id: str
    tag: str
    name: str
    model: str
    manufacturer: str
    current_manual_id: str


class WorkOrderDetailOutput(BaseModel):
    """Detalle GET /v1/work-orders/{id}."""

    model_config = ConfigDict(extra="forbid")

    id: str
    code: str
    type: str
    priority: str
    status: str
    asset: AssetDetailOutput
    assigned_to: AssignedUserOutput | None
    planned_start: str
    planned_end: str
    procedure_template_id: str
    procedure_name: str
    estimated_minutes: int
    description: str
    notes: str
    linked_wo_ids: list[str]
