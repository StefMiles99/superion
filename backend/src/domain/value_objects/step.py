"""Paso de procedimiento — BE-02."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Step:
    """Paso individual de un procedimiento de mantenimiento."""

    index: int
    title: str
    description: str
    estimated_minutes: int
    critical: bool
    requires_photo: bool
    photo_criteria: str | None

    def __post_init__(self) -> None:
        if self.index < 0:
            raise ValueError("index debe ser >= 0")
        if self.estimated_minutes < 0:
            raise ValueError("estimated_minutes debe ser >= 0")
