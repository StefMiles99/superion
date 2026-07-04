"""Entidad MaintenanceSession — BE-02."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

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
