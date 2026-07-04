"""Repositorio in-memory de órdenes de trabajo — BE-02."""

from __future__ import annotations

import asyncio
import base64
from datetime import UTC, datetime

from domain.entities.work_order import WorkOrder
from domain.value_objects.status import WorkOrderStatus


def _dt(year: int, month: int, day: int, hour: int = 8, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, 0, tzinfo=UTC)


def _encode_cursor(work_order_id: str, created_at: datetime) -> str:
    raw = f"{work_order_id}:{created_at.isoformat()}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _decode_cursor(cursor: str) -> tuple[str, datetime]:
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    work_order_id, created_at_str = raw.split(":", 1)
    return work_order_id, datetime.fromisoformat(created_at_str)


class InMemoryWorkOrderRepository:
    """OTs sembradas con RLS simulado por assigned_to."""

    _instance: InMemoryWorkOrderRepository | None = None

    def __init__(self, work_orders: list[WorkOrder]) -> None:
        self._orders = {order.id: order for order in work_orders}
        self._lock = asyncio.Lock()

    @classmethod
    def with_fixtures(cls) -> InMemoryWorkOrderRepository:
        orders = [
            WorkOrder(
                id="wo-001",
                code="OT-1001",
                asset_id="asset-1",
                type="preventive",
                priority="high",
                status=WorkOrderStatus.PENDING,
                assigned_to="tech-1",
                planned_start=_dt(2026, 7, 4, 14),
                planned_end=_dt(2026, 7, 4, 15, 30),
                procedure_template_id="tmpl-compresor",
                created_at=_dt(2026, 7, 1, 8),
                description="Mantenimiento preventivo compresor C-3.",
                notes="Revisar filtros antes de arrancar.",
                linked_wo_ids=(),
            ),
            WorkOrder(
                id="wo-002",
                code="OT-1002",
                asset_id="asset-2",
                type="preventive",
                priority="med",
                status=WorkOrderStatus.PENDING,
                assigned_to="tech-1",
                planned_start=_dt(2026, 7, 5, 9),
                planned_end=_dt(2026, 7, 5, 11),
                procedure_template_id="tmpl-compresor",
                created_at=_dt(2026, 7, 2, 8),
                description="Preventivo compresor C-4.",
                notes="",
                linked_wo_ids=("wo-001",),
            ),
            WorkOrder(
                id="wo-003",
                code="OT-1003",
                asset_id="asset-3",
                type="corrective",
                priority="high",
                status=WorkOrderStatus.PENDING,
                assigned_to="tech-1",
                planned_start=_dt(2026, 7, 6, 10),
                planned_end=_dt(2026, 7, 6, 12),
                procedure_template_id="tmpl-bomba",
                created_at=_dt(2026, 7, 3, 8),
                description="Correctivo bomba B-2 por fuga.",
                notes="Coordinar con producción.",
                linked_wo_ids=(),
            ),
            WorkOrder(
                id="wo-004",
                code="OT-1004",
                asset_id="asset-4",
                type="preventive",
                priority="low",
                status=WorkOrderStatus.IN_PROGRESS,
                assigned_to="tech-1",
                planned_start=_dt(2026, 7, 2, 8),
                planned_end=_dt(2026, 7, 2, 10),
                procedure_template_id="tmpl-bomba",
                created_at=_dt(2026, 6, 28, 8),
                description="Preventivo bomba B-3 en curso.",
                notes="",
                linked_wo_ids=(),
            ),
            WorkOrder(
                id="wo-005",
                code="OT-1005",
                asset_id="asset-5",
                type="preventive",
                priority="med",
                status=WorkOrderStatus.COMPLETED,
                assigned_to="tech-1",
                planned_start=_dt(2026, 6, 20, 8),
                planned_end=_dt(2026, 6, 20, 10),
                procedure_template_id="tmpl-compresor",
                created_at=_dt(2026, 6, 15, 8),
                description="Preventivo compresor C-5 completado.",
                notes="Sin incidencias.",
                linked_wo_ids=(),
            ),
            WorkOrder(
                id="wo-maria-1",
                code="OT-2001",
                asset_id="asset-6",
                type="preventive",
                priority="med",
                status=WorkOrderStatus.PENDING,
                assigned_to="tech-2",
                planned_start=_dt(2026, 7, 7, 9),
                planned_end=_dt(2026, 7, 7, 11),
                procedure_template_id="tmpl-compresor",
                created_at=_dt(2026, 7, 4, 8),
                description="OT de María — no visible para Juan.",
                notes="",
                linked_wo_ids=(),
            ),
        ]
        return cls(orders)

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> InMemoryWorkOrderRepository:
        if cls._instance is None:
            cls._instance = cls.with_fixtures()
        return cls._instance

    async def list_for_technician(
        self,
        *,
        technician_id: str,
        statuses: list[str] | None = None,
        priority: str | None = None,
        asset_id: str | None = None,
        cursor: str | None = None,
        limit: int = 20,
    ) -> tuple[list[WorkOrder], str | None]:
        async with self._lock:
            items = [
                order
                for order in self._orders.values()
                if order.assigned_to == technician_id
            ]

            if statuses:
                status_set = set(statuses)
                items = [order for order in items if order.status.value in status_set]
            if priority is not None:
                items = [order for order in items if order.priority == priority]
            if asset_id is not None:
                items = [order for order in items if order.asset_id == asset_id]

            items.sort(key=lambda order: (order.created_at, order.id))

            if cursor is not None:
                cursor_id, cursor_created = _decode_cursor(cursor)
                items = [
                    order
                    for order in items
                    if (order.created_at, order.id) > (cursor_created, cursor_id)
                ]

            page = items[:limit]
            next_cursor: str | None = None
            if len(items) > limit:
                last = page[-1]
                next_cursor = _encode_cursor(last.id, last.created_at)

            return page, next_cursor

    async def get_by_id_for_technician(
        self,
        work_order_id: str,
        *,
        technician_id: str,
    ) -> WorkOrder | None:
        async with self._lock:
            order = self._orders.get(work_order_id)
            if order is None or order.assigned_to != technician_id:
                return None
            return order

    async def save(self, work_order: WorkOrder) -> None:
        async with self._lock:
            self._orders[work_order.id] = work_order

    async def reset(self) -> None:
        async with self._lock:
            fresh = self.with_fixtures()
            self._orders = fresh._orders
