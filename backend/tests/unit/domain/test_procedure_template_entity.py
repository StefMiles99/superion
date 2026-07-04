"""Tests de entidad ProcedureTemplate — BE-02."""

import pytest

from domain.entities.procedure_template import ProcedureTemplate
from domain.value_objects.step import Step


def _step(index: int) -> Step:
    return Step(
        index=index,
        title=f"Paso {index}",
        description="desc",
        estimated_minutes=5,
        critical=False,
        requires_photo=False,
        photo_criteria=None,
    )


def test_procedure_template_requires_contiguous_steps() -> None:
    template = ProcedureTemplate(
        id="tmpl-1",
        name="Test",
        version="1",
        manual_id="manual-1",
        steps=(_step(0), _step(1), _step(2)),
        critical_step_indices=(1,),
        photo_required_step_indices=(2,),
        estimated_minutes=15,
    )
    assert len(template.steps) == 3


def test_procedure_template_rejects_non_contiguous_indices() -> None:
    with pytest.raises(ValueError, match="contiguos"):
        ProcedureTemplate(
            id="tmpl-1",
            name="Test",
            version="1",
            manual_id="manual-1",
            steps=(_step(0), _step(2)),
            critical_step_indices=(),
            photo_required_step_indices=(),
            estimated_minutes=10,
        )


def test_procedure_template_rejects_critical_out_of_range() -> None:
    with pytest.raises(ValueError, match="critical"):
        ProcedureTemplate(
            id="tmpl-1",
            name="Test",
            version="1",
            manual_id="manual-1",
            steps=(_step(0), _step(1)),
            critical_step_indices=(5,),
            photo_required_step_indices=(),
            estimated_minutes=10,
        )
