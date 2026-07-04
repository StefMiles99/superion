"""Entidad AuditEntry — BE-08."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from domain.value_objects.action import AuditAction


@dataclass(frozen=True, slots=True)
class AuditEntry:
    """Entrada append-only del audit log."""

    id: str
    actor_user_id: str
    action: AuditAction
    target_type: str
    target_id: str
    payload: dict[str, object]
    created_at: datetime

    def __post_init__(self) -> None:
        if not self.actor_user_id:
            raise ValueError("actor_user_id no puede estar vacío")
        if not self.target_type:
            raise ValueError("target_type no puede estar vacío")
        if not self.target_id:
            raise ValueError("target_id no puede estar vacío")
