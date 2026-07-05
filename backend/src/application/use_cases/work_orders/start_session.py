"""Use case StartSession — BE-02."""

from __future__ import annotations

from uuid import uuid4

from application.decorators.audit import audit
from application.dto.mappers import procedure_template_to_output
from application.dto.session import StartSessionOutput
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.user import User
from domain.entities.work_order import WorkOrder
from domain.exceptions import ConflictError, ForbiddenError, NotFoundError
from domain.ports.repositories import (
    IProcedureTemplateRepository,
    ISessionRepository,
    IWorkOrderRepository,
)
from domain.ports.services import IClock
from domain.value_objects.action import AuditAction
from domain.value_objects.status import SessionStatus, WorkOrderStatus


class StartSessionUseCase:
    """Inicia sesión de mantenimiento para una OT pending."""

    def __init__(
        self,
        *,
        work_orders: IWorkOrderRepository,
        sessions: ISessionRepository,
        templates: IProcedureTemplateRepository,
        clock: IClock,
    ) -> None:
        self._work_orders = work_orders
        self._sessions = sessions
        self._templates = templates
        self._clock = clock

    @audit(AuditAction.START_SESSION, target_type="session")
    async def execute(self, *, work_order_id: str, current_user: User) -> StartSessionOutput:
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

        if order.status == WorkOrderStatus.COMPLETED:
            raise ConflictError(
                code="WORK_ORDER_ALREADY_COMPLETED",
                message="La OT ya está completada.",
            )

        active = await self._sessions.get_active_for_work_order(work_order_id)
        if active is not None:
            if active.technician_id != current_user.id:
                raise ForbiddenError(
                    code="FORBIDDEN",
                    message="Otro técnico tiene la sesión activa de esta OT.",
                )
            return await self._resume_existing(order=order, session=active)

        if order.status == WorkOrderStatus.IN_PROGRESS:
            raise ConflictError(
                code="WORK_ORDER_ALREADY_STARTED",
                message="La OT ya está en progreso sin sesión activa.",
            )

        template = await self._templates.get_by_id(order.procedure_template_id)
        if template is None:
            raise NotFoundError(
                code="WORK_ORDER_NOT_FOUND",
                message="Orden de trabajo no encontrada.",
                details={"id": work_order_id},
            )

        started_at = self._clock.now()
        session_id = str(uuid4())
        thread_id = str(uuid4())

        session = MaintenanceSession(
            id=session_id,
            work_order_id=work_order_id,
            technician_id=current_user.id,
            status=SessionStatus.ACTIVE,
            started_at=started_at,
            current_step_index=0,
            langgraph_thread_id=thread_id,
        )

        updated_order = order.start()
        await self._sessions.save(session)
        await self._work_orders.save(updated_order)

        started_at_str = started_at.isoformat().replace("+00:00", "Z")
        return StartSessionOutput(
            session_id=session_id,
            work_order_id=work_order_id,
            procedure_template=procedure_template_to_output(template),
            langgraph_thread_id=thread_id,
            websocket_url=f"wss://placeholder/sessions/{session_id}",
            started_at=started_at_str,
        )

    async def _resume_existing(
        self,
        *,
        order: WorkOrder,
        session: MaintenanceSession,
    ) -> StartSessionOutput:
        """Reanuda sesión activa del mismo técnico (idempotente)."""
        template = await self._templates.get_by_id(order.procedure_template_id)
        if template is None:
            raise NotFoundError(
                code="WORK_ORDER_NOT_FOUND",
                message="Orden de trabajo no encontrada.",
                details={"id": order.id},
            )

        if order.status == WorkOrderStatus.PENDING:
            await self._work_orders.save(order.start())

        started_at_str = session.started_at.isoformat().replace("+00:00", "Z")
        return StartSessionOutput(
            session_id=session.id,
            work_order_id=order.id,
            procedure_template=procedure_template_to_output(template),
            langgraph_thread_id=session.langgraph_thread_id,
            websocket_url=f"wss://placeholder/sessions/{session.id}",
            started_at=started_at_str,
        )
