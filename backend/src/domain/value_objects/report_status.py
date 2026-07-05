"""Estado del reporte de mantenimiento — BE-07."""

from __future__ import annotations

from enum import StrEnum


class ReportStatus(StrEnum):
    """Estado del reporte en construcción o cerrado."""

    DRAFT = "draft"
    FINALIZED = "finalized"
