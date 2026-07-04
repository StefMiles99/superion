"""Use case ListWorkOrders — BE-02."""

from __future__ import annotations

from application.dto.work_order import (
    AssetSummaryOutput,
    AssignedUserOutput,
    WorkOrderListItemOutput,
    WorkOrderListOutput,
)
from domain.entities.asset import Asset
from domain.entities.procedure_template import ProcedureTemplate
from domain.entities.user import User
from domain.entities.work_order import WorkOrder
from domain.ports.repositories import (
    IAssetRepository,
    IProcedureTemplateRepository,
    IUserRepository,
    IWorkOrderRepository,
)


class ListWorkOrdersUseCase:
    """Lista OTs asignadas al técnico autenticado."""

    def __init__(
        self,
        *,
        work_orders: IWorkOrderRepository,
        assets: IAssetRepository,
        templates: IProcedureTemplateRepository,
        users: IUserRepository,
    ) -> None:
        self._work_orders = work_orders
        self._assets = assets
        self._templates = templates
        self._users = users

    async def execute(
        self,
        *,
        current_user: User,
        assigned_to: str | None = None,
        statuses: list[str] | None = None,
        priority: str | None = None,
        asset_id: str | None = None,
        cursor: str | None = None,
        limit: int = 20,
    ) -> WorkOrderListOutput:
        technician_id = assigned_to or current_user.id
        if technician_id != current_user.id and current_user.role.value != "supervisor":
            technician_id = current_user.id

        orders, next_cursor = await self._work_orders.list_for_technician(
            technician_id=technician_id,
            statuses=statuses,
            priority=priority,
            asset_id=asset_id,
            cursor=cursor,
            limit=limit,
        )

        items: list[WorkOrderListItemOutput] = []
        for order in orders:
            item = await self._to_list_item(order)
            items.append(item)

        return WorkOrderListOutput(items=items, next_cursor=next_cursor)

    async def _to_list_item(self, order: WorkOrder) -> WorkOrderListItemOutput:
        asset = await self._require_asset(order.asset_id)
        template = await self._require_template(order.procedure_template_id)
        assigned = await self._assigned_user(order.assigned_to)
        return WorkOrderListItemOutput(
            id=order.id,
            code=order.code,
            type=order.type,
            priority=order.priority,
            status=order.status.value,
            asset=AssetSummaryOutput(
                id=asset.id,
                tag=asset.tag,
                name=asset.name,
                model=asset.model,
            ),
            assigned_to=assigned,
            planned_start=order.planned_start.isoformat().replace("+00:00", "Z"),
            planned_end=order.planned_end.isoformat().replace("+00:00", "Z"),
            procedure_template_id=order.procedure_template_id,
            procedure_name=template.name,
            estimated_minutes=template.estimated_minutes,
        )

    async def _require_asset(self, asset_id: str) -> Asset:
        asset = await self._assets.get_by_id(asset_id)
        if asset is None:
            raise RuntimeError(f"asset {asset_id} no encontrado en fixtures")
        return asset

    async def _require_template(self, template_id: str) -> ProcedureTemplate:
        template = await self._templates.get_by_id(template_id)
        if template is None:
            raise RuntimeError(f"template {template_id} no encontrado en fixtures")
        return template

    async def _assigned_user(self, user_id: str | None) -> AssignedUserOutput | None:
        if user_id is None:
            return None
        user = await self._users.get_by_id(user_id)
        if user is None:
            return None
        return AssignedUserOutput(id=user.id, full_name=user.full_name)
