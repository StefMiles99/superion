"""Entidad Asset — BE-02."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Asset:
    """Equipo físico asociado a una OT."""

    id: str
    plant_id: str
    tag: str
    name: str
    model: str
    manufacturer: str
    current_manual_id: str

    def __post_init__(self) -> None:
        if not self.tag:
            raise ValueError("tag no puede estar vacío")
