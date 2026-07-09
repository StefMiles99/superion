"""Use case TransitionStep — BE-03."""

from __future__ import annotations

from dataclasses import replace

from application.use_cases.events.append import AppendEventUseCase
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.procedure_template import ProcedureTemplate
from domain.entities.user import User
from domain.value_objects.step import Step
from domain.exceptions import ConflictError, NotFoundError
from domain.ports.repositories import (
    IProcedureTemplateRepository,
    ISessionEventRepository,
    ISessionRepository,
    IWorkOrderRepository,
)
from domain.value_objects.event_type import EventType


class TransitionStepUseCase:
    """Marca paso completo o lo salta según reglas de procedimiento."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        work_orders: IWorkOrderRepository,
        templates: IProcedureTemplateRepository,
        events: ISessionEventRepository,
        append_events: AppendEventUseCase,
    ) -> None:
        self._sessions = sessions
        self._work_orders = work_orders
        self._templates = templates
        self._events = events
        self._append = append_events

    async def _load_session_context(
        self,
        session_id: str,
        current_user: User,
    ) -> tuple[MaintenanceSession, ProcedureTemplate]:
        session = await self._sessions.get_by_id_for_technician(
            session_id,
            technician_id=current_user.id,
        )
        if session is None:
            raise NotFoundError(
                code="SESSION_NOT_FOUND",
                message="Sesión no encontrada.",
                details={"id": session_id},
            )
        if session.status.value == "finalized":
            raise ConflictError(
                code="SESSION_ALREADY_FINALIZED",
                message="La sesión ya está finalizada.",
            )

        order = await self._work_orders.get_by_id_for_technician(
            session.work_order_id,
            technician_id=current_user.id,
        )
        if order is None:
            raise NotFoundError(
                code="WORK_ORDER_NOT_FOUND",
                message="Orden de trabajo no encontrada.",
                details={"id": session.work_order_id},
            )

        template = await self._templates.get_by_id(order.procedure_template_id)
        if template is None:
            raise NotFoundError(
                code="WORK_ORDER_NOT_FOUND",
                message="Plantilla no encontrada.",
            )

        return session, template

    @staticmethod
    def _step_to_result(step: Step, *, extra: dict[str, object]) -> dict[str, object]:
        return {
            "index": step.index,
            "title": step.title,
            "description": step.description,
            "estimated_minutes": step.estimated_minutes,
            "critical": step.critical,
            "requires_photo": step.requires_photo,
            "photo_criteria": step.photo_criteria,
            **extra,
        }

    async def get_current_step(
        self,
        *,
        session_id: str,
        current_user: User,
    ) -> dict[str, object]:
        """Devuelve el paso activo de la sesión según current_step_index."""
        session, template = await self._load_session_context(session_id, current_user)
        total_steps = len(template.steps)
        step_index = session.current_step_index

        if total_steps == 0:
            return {
                "index": 0,
                "title": "",
                "description": "",
                "estimated_minutes": 0,
                "critical": False,
                "requires_photo": False,
                "photo_criteria": None,
                "current_step_index": step_index,
                "total_steps": 0,
                "all_steps_completed": True,
            }

        if step_index >= total_steps:
            last = template.steps[-1]
            return self._step_to_result(
                last,
                extra={
                    "current_step_index": step_index,
                    "total_steps": total_steps,
                    "all_steps_completed": True,
                },
            )

        current = template.steps[step_index]
        return self._step_to_result(
            current,
            extra={
                "current_step_index": step_index,
                "total_steps": total_steps,
                "all_steps_completed": False,
                "summary": (
                    f"Paso {step_index + 1} de {total_steps}: {current.title}. "
                    f"{current.description}"
                ),
            },
        )

    async def mark_step_complete(
        self,
        *,
        session_id: str,
        step_index: int,
        current_user: User,
        completed_by: str = "command",
        event_id: str | None = None,
    ) -> int:
        session, template = await self._load_session_context(session_id, current_user)

        if step_index in template.photo_required_step_indices:
            has_photo = await self._events.has_accepted_photo(session_id, step_index)
            if not has_photo:
                raise ConflictError(
                    code="STEP_REQUIRES_PHOTO",
                    message="El paso requiere foto aceptada antes de completar.",
                    details={"step_index": step_index},
                )

        completed = await self._append.emit_system_event(
            session_id=session_id,
            event_type=EventType.STEP_COMPLETED.value,
            step_index=step_index,
            payload={
                "index": step_index,
                "duration_seconds": 0,
                "completed_by": completed_by,
            },
            event_id=event_id,
        )

        next_index = step_index + 1
        if next_index < len(template.steps):
            updated = replace(session, current_step_index=next_index)
            await self._sessions.save(updated)
            step = template.steps[next_index]
            await self._append.emit_system_event(
                session_id=session_id,
                event_type=EventType.STEP_ENTERED.value,
                step_index=next_index,
                payload={
                    "index": step.index,
                    "title": step.title,
                    "description": step.description,
                    "estimated_minutes": step.estimated_minutes,
                    "critical": step.critical,
                    "requires_photo": step.requires_photo,
                    "photo_criteria": step.photo_criteria,
                },
            )

        return int(completed.seq)

    async def skip_step(
        self,
        *,
        session_id: str,
        step_index: int,
        reason: str,
        current_user: User,
        event_id: str | None = None,
    ) -> int:
        session, template = await self._load_session_context(session_id, current_user)

        if step_index in template.critical_step_indices:
            raise ConflictError(
                code="STEP_CRITICAL_CANNOT_SKIP",
                message="No se puede saltar un paso crítico.",
                details={"step_index": step_index},
            )

        skipped = await self._append.emit_system_event(
            session_id=session_id,
            event_type=EventType.STEP_SKIPPED.value,
            step_index=step_index,
            payload={"index": step_index, "reason": reason},
            event_id=event_id,
        )

        next_index = step_index + 1
        if next_index < len(template.steps):
            updated = replace(session, current_step_index=next_index)
            await self._sessions.save(updated)

        return int(skipped.seq)
