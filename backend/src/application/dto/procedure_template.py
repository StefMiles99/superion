"""DTOs de procedimiento — BE-02."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class StepOutput(BaseModel):
    """Paso de procedimiento en respuesta API."""

    model_config = ConfigDict(extra="forbid")

    index: int
    title: str
    description: str
    estimated_minutes: int
    critical: bool
    requires_photo: bool
    photo_criteria: str | None


class ProcedureTemplateOutput(BaseModel):
    """Plantilla completa para start_session."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    manual_id: str
    steps: list[StepOutput]
    critical_step_indices: list[int]
    photo_required_step_indices: list[int]
    estimated_minutes: int


class ProcedureTemplateSummaryOutput(BaseModel):
    """Resumen de plantilla en listado/detalle de OT."""

    model_config = ConfigDict(extra="forbid")

    procedure_template_id: str
    procedure_name: str
    estimated_minutes: int
