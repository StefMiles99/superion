"""Mappers compartidos de DTO — BE-02."""

from __future__ import annotations

from application.dto.procedure_template import ProcedureTemplateOutput, StepOutput
from domain.entities.procedure_template import ProcedureTemplate


def procedure_template_to_output(template: ProcedureTemplate) -> ProcedureTemplateOutput:
    """Convierte entidad de dominio a DTO de API."""
    return ProcedureTemplateOutput(
        id=template.id,
        name=template.name,
        manual_id=template.manual_id,
        steps=[
            StepOutput(
                index=step.index,
                title=step.title,
                description=step.description,
                estimated_minutes=step.estimated_minutes,
                critical=step.critical,
                requires_photo=step.requires_photo,
                photo_criteria=step.photo_criteria,
            )
            for step in template.steps
        ],
        critical_step_indices=list(template.critical_step_indices),
        photo_required_step_indices=list(template.photo_required_step_indices),
        estimated_minutes=template.estimated_minutes,
    )
