"""Stub Supabase WorkOrderRepository — BE-02."""

from __future__ import annotations

from domain.entities.work_order import WorkOrder

_MSG = "implementar al activar PERSISTENCE=supabase"


class SupabaseWorkOrderRepository:
    """Implementación real pendiente de activar."""

    async def list_for_technician(
        self,
        **kwargs: object,
    ) -> tuple[list[WorkOrder], str | None]:
        raise NotImplementedError(f"SupabaseWorkOrderRepository.list_for_technician — {_MSG}")

    async def get_by_id_for_technician(
        self,
        work_order_id: str,
        **kwargs: object,
    ) -> WorkOrder | None:
        raise NotImplementedError(
            f"SupabaseWorkOrderRepository.get_by_id_for_technician — {_MSG}"
        )

    async def save(self, work_order: WorkOrder) -> None:
        raise NotImplementedError(f"SupabaseWorkOrderRepository.save — {_MSG}")
