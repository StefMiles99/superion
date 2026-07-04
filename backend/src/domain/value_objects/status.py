"""Estados de OT y sesión — BE-02."""

from __future__ import annotations

from enum import StrEnum


class WorkOrderStatus(StrEnum):
    """Estado operativo de una orden de trabajo."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SessionStatus(StrEnum):
    """Estado de una sesión de mantenimiento."""

    ACTIVE = "active"
    PAUSED = "paused"
    FINALIZED = "finalized"
    ABORTED = "aborted"
