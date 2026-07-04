"""Entidad MaintenanceSession — BE-02/BE-03."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime

from domain.exceptions import ConflictError
from domain.value_objects.status import SessionStatus


@dataclass(frozen=True, slots=True)
class MaintenanceSession:
    """Sesión activa de mantenimiento sobre una OT."""

    id: str
    work_order_id: str
    technician_id: str
    status: SessionStatus
    started_at: datetime
    current_step_index: int
    langgraph_thread_id: str
    ended_at: datetime | None = None

    def __post_init__(self) -> None:
        if self.current_step_index < 0:
            raise ValueError("current_step_index debe ser >= 0")

    @property
    def is_active(self) -> bool:
        """Sesión activa o pausada cuenta como activa para unicidad por OT."""
        return self.status in (SessionStatus.ACTIVE, SessionStatus.PAUSED)

    def pause(self) -> MaintenanceSession:
        """Transiciona active → paused."""
        if self.status == SessionStatus.FINALIZED:
            raise ConflictError(
                code="SESSION_ALREADY_FINALIZED",
                message="La sesión ya está finalizada.",
            )
        if self.status != SessionStatus.ACTIVE:
            raise ConflictError(
                code="VALIDATION_ERROR",
                message="Solo se puede pausar una sesión activa.",
                details={"status": self.status.value},
            )
        return replace(self, status=SessionStatus.PAUSED)

    def resume(self) -> MaintenanceSession:
        """Transiciona paused → active."""
        if self.status == SessionStatus.FINALIZED:
            raise ConflictError(
                code="SESSION_ALREADY_FINALIZED",
                message="La sesión ya está finalizada.",
            )
        if self.status != SessionStatus.PAUSED:
            raise ConflictError(
                code="VALIDATION_ERROR",
                message="Solo se puede reanudar una sesión pausada.",
                details={"status": self.status.value},
            )
        return replace(self, status=SessionStatus.ACTIVE)

    def finalize(self, *, ended_at: datetime) -> MaintenanceSession:
        """Cierra la sesión (stub BE-03 — sin PDF)."""
        if self.status == SessionStatus.FINALIZED:
            raise ConflictError(
                code="SESSION_ALREADY_FINALIZED",
                message="La sesión ya está finalizada.",
            )
        return replace(self, status=SessionStatus.FINALIZED, ended_at=ended_at)
