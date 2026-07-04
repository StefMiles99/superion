"""Entidad WorkOrder — BE-02."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime

from domain.entities.user import User
from domain.exceptions import ConflictError, ValidationError
from domain.value_objects.status import WorkOrderStatus


@dataclass(frozen=True, slots=True)
class WorkOrder:
    """Orden de trabajo asignada a un técnico."""

    id: str
    code: str
    asset_id: str
    type: str
    priority: str
    status: WorkOrderStatus
    assigned_to: str | None
    planned_start: datetime
    planned_end: datetime
    procedure_template_id: str
    created_at: datetime
    description: str = ""
    notes: str = ""
    linked_wo_ids: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.code:
            raise ValueError("code no puede estar vacío")
        if self.type not in ("preventive", "corrective"):
            raise ValueError(f"type inválido: {self.type}")
        if self.priority not in ("low", "med", "high"):
            raise ValueError(f"priority inválida: {self.priority}")

    def assign_to(self, user: User, *, asset_plant_id: str) -> WorkOrder:
        """Asigna OT a usuario validando planta del activo."""
        if user.plant_id != asset_plant_id:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="El técnico no pertenece a la planta del activo.",
                details={"user_plant_id": user.plant_id, "asset_plant_id": asset_plant_id},
            )
        return replace(self, assigned_to=user.id)

    def start(self) -> WorkOrder:
        """Transiciona pending → in_progress."""
        if self.status == WorkOrderStatus.COMPLETED:
            raise ConflictError(
                code="WORK_ORDER_ALREADY_COMPLETED",
                message="La OT ya está completada.",
            )
        if self.status == WorkOrderStatus.IN_PROGRESS:
            raise ConflictError(
                code="WORK_ORDER_ALREADY_STARTED",
                message="La OT ya está en progreso.",
            )
        if self.status != WorkOrderStatus.PENDING:
            raise ConflictError(
                code="WORK_ORDER_ALREADY_STARTED",
                message=f"No se puede iniciar OT en estado {self.status.value}.",
            )
        return replace(self, status=WorkOrderStatus.IN_PROGRESS)

    def can_start(self) -> bool:
        """Indica si la OT puede iniciar sesión."""
        return bool(self.status == WorkOrderStatus.PENDING)
