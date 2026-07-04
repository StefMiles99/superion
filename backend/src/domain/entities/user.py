"""Entidad User — BE-01."""

from __future__ import annotations

from dataclasses import dataclass

from domain.value_objects.role import Role


@dataclass(frozen=True, slots=True)
class User:
    """Usuario autenticable del sistema."""

    id: str
    email: str
    password_hash: str
    full_name: str
    role: Role
    plant_id: str
    is_blocked: bool = False

    def __post_init__(self) -> None:
        if not self.email:
            raise ValueError("email no puede estar vacío")
