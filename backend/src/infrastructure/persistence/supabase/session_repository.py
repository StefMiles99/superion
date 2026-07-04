"""Stub Supabase SessionRepository — BE-02."""

from __future__ import annotations

from domain.entities.maintenance_session import MaintenanceSession

_MSG = "implementar al activar PERSISTENCE=supabase"


class SupabaseSessionRepository:
    """Implementación real pendiente de activar."""

    async def save(self, session: MaintenanceSession) -> None:
        raise NotImplementedError(f"SupabaseSessionRepository.save — {_MSG}")

    async def get_by_id_for_technician(
        self,
        session_id: str,
        **kwargs: object,
    ) -> MaintenanceSession | None:
        raise NotImplementedError(
            f"SupabaseSessionRepository.get_by_id_for_technician — {_MSG}"
        )

    async def get_by_id(self, session_id: str) -> MaintenanceSession | None:
        raise NotImplementedError(f"SupabaseSessionRepository.get_by_id — {_MSG}")

    async def get_active_for_work_order(
        self,
        work_order_id: str,
    ) -> MaintenanceSession | None:
        raise NotImplementedError(
            f"SupabaseSessionRepository.get_active_for_work_order — {_MSG}"
        )
