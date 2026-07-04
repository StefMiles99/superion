"""Use case GetWorkOrder — BE-02."""

from __future__ import annotations

from application.dto.work_order import (
    AssetDetailOutput,
    AssignedUserOutput,
    WorkOrderDetailOutput,
)
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import (
    IAssetRepository,
    IProcedureTemplateRepository,
    IUserRepository,
    IWorkOrderRepository,
)


class GetWorkOrderUseCase:
    """Detalle de OT con activo y plantilla resumida."""

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

    async def execute(self, *, work_order_id: str, current_user: User) -> WorkOrderDetailOutput:
        order = await self._work_orders.get_by_id_for_technician(
            work_order_id,
            technician_id=current_user.id,
        )
        if order is None:
            raise NotFoundError(
                code="WORK_ORDER_NOT_FOUND",
                message="Orden de trabajo no encontrada.",
                details={"id": work_order_id},
            )

        asset = await self._assets.get_by_id(order.asset_id)
        if asset is None:
            raise NotFoundError(
                code="WORK_ORDER_NOT_FOUND",
                message="Orden de trabajo no encontrada.",
                details={"id": work_order_id},
            )

        template = await self._templates.get_by_id(order.procedure_template_id)
        if template is None:
            raise NotFoundError(
                code="WORK_ORDER_NOT_FOUND",
                message="Orden de trabajo no encontrada.",
                details={"id": work_order_id},
            )

        assigned: AssignedUserOutput | None = None
        if order.assigned_to is not None:
            user = await self._users.get_by_id(order.assigned_to)
            if user is not None:
                assigned = AssignedUserOutput(id=user.id, full_name=user.full_name)

        return WorkOrderDetailOutput(
            id=order.id,
            code=order.code,
            type=order.type,
            priority=order.priority,
            status=order.status.value,
            asset=AssetDetailOutput(
                id=asset.id,
                tag=asset.tag,
                name=asset.name,
                model=asset.model,
                manufacturer=asset.manufacturer,
                current_manual_id=asset.current_manual_id,
            ),
            assigned_to=assigned,
            planned_start=order.planned_start.isoformat().replace("+00:00", "Z"),
            planned_end=order.planned_end.isoformat().replace("+00:00", "Z"),
            procedure_template_id=order.procedure_template_id,
            procedure_name=template.name,
            estimated_minutes=template.estimated_minutes,
            description=order.description,
            notes=order.notes,
            linked_wo_ids=list(order.linked_wo_ids),
        )
