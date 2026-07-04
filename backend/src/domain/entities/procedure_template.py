"""Entidad ProcedureTemplate — BE-02."""

from __future__ import annotations

from dataclasses import dataclass

from domain.value_objects.step import Step


@dataclass(frozen=True, slots=True)
class ProcedureTemplate:
    """Plantilla de procedimiento de mantenimiento."""

    id: str
    name: str
    version: str
    manual_id: str
    steps: tuple[Step, ...]
    critical_step_indices: tuple[int, ...]
    photo_required_step_indices: tuple[int, ...]
    estimated_minutes: int

    def __post_init__(self) -> None:
        if not self.steps:
            raise ValueError("steps no puede estar vacío")
        indices = [step.index for step in self.steps]
        expected = list(range(len(self.steps)))
        if indices != expected:
            raise ValueError("steps deben tener índices contiguos desde 0")
        max_index = len(self.steps) - 1
        for idx in self.critical_step_indices:
            if idx < 0 or idx > max_index:
                raise ValueError(f"critical_step_indices fuera de rango: {idx}")
        for idx in self.photo_required_step_indices:
            if idx < 0 or idx > max_index:
                raise ValueError(f"photo_required_step_indices fuera de rango: {idx}")
