"""Repositorio Supabase de reportes — stub BE-07."""

from __future__ import annotations

from domain.entities.maintenance_report import MaintenanceReport


class SupabaseReportRepository:
    """Stub — activar en BE-08."""

    async def save(self, report: MaintenanceReport) -> None:
        raise NotImplementedError("SupabaseReportRepository.save — implementar al activar BE-08")

    async def get_by_session_id(self, session_id: str) -> MaintenanceReport | None:
        raise NotImplementedError(
            "SupabaseReportRepository.get_by_session_id — implementar al activar BE-08"
        )

    async def get_by_id(self, report_id: str) -> MaintenanceReport | None:
        raise NotImplementedError(
            "SupabaseReportRepository.get_by_id — implementar al activar BE-08"
        )
