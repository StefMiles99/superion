"""Use case FinalizeReport — genera PDF y cierra sesión — BE-07."""

from __future__ import annotations

from datetime import timedelta

from application.decorators.audit import audit
from application.dto.report import FinalizeReportOutput
from application.use_cases.events.append import AppendEventUseCase
from application.use_cases.reports.build_live import BuildLiveReportUseCase
from domain.entities.user import User
from domain.exceptions import ConflictError, NotFoundError
from domain.ports.repositories import (
    IProcedureTemplateRepository,
    IReportRepository,
    ISessionEventRepository,
    ISessionRepository,
    IWorkOrderRepository,
)
from domain.ports.services import IClock, IReportRenderer
from domain.ports.storage import IObjectStorage
from domain.value_objects.action import AuditAction
from domain.value_objects.event_type import EventType
from domain.value_objects.report_status import ReportStatus


class FinalizeReportUseCase:
    """Valida último paso, genera PDF mock, sube a storage y finaliza."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        work_orders: IWorkOrderRepository,
        templates: IProcedureTemplateRepository,
        events: ISessionEventRepository,
        reports: IReportRepository,
        storage: IObjectStorage,
        renderer: IReportRenderer,
        build_live: BuildLiveReportUseCase,
        append_events: AppendEventUseCase,
        clock: IClock,
        signed_url_ttl: int,
    ) -> None:
        self._sessions = sessions
        self._work_orders = work_orders
        self._templates = templates
        self._events = events
        self._reports = reports
        self._storage = storage
        self._renderer = renderer
        self._build_live = build_live
        self._append = append_events
        self._clock = clock
        self._signed_url_ttl = signed_url_ttl

    @audit(AuditAction.FINALIZE_SESSION, target_type="session")
    async def execute(
        self,
        *,
        session_id: str,
        current_user: User,
    ) -> FinalizeReportOutput:
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

        last_index = len(template.steps) - 1
        if session.current_step_index != last_index:
            raise ConflictError(
                code="STEP_REQUIRES_PHOTO",
                message="Debe completar todos los pasos antes de finalizar.",
                details={
                    "current_step_index": session.current_step_index,
                    "required_step_index": last_index,
                },
            )

        event_list = await self._events.list_since(session_id, since_seq=0, limit=500)
        last_completed = any(
            event.type == EventType.STEP_COMPLETED.value
            and int(event.payload.get("index", event.step_index)) == last_index
            for event in event_list
        )
        if not last_completed:
            raise ConflictError(
                code="STEP_REQUIRES_PHOTO",
                message="El último paso no está completado.",
                details={"step_index": last_index},
            )

        report = await self._reports.get_by_session_id(session_id)
        if report is None:
            report = await self._build_live.ensure_report(session_id)

        if report.status == ReportStatus.FINALIZED:
            raise ConflictError(
                code="SESSION_ALREADY_FINALIZED",
                message="El reporte ya está finalizado.",
            )

        ended_at = self._clock.now()
        updated_session = session.finalize(ended_at=ended_at)
        await self._sessions.save(updated_session)

        content = await self._build_live.build_content(session_id=session_id)
        pdf_bytes, sha256 = self._renderer.render(content)
        storage_key = f"reports/{session_id}/report.pdf"
        await self._storage.put(storage_key, pdf_bytes, content_type="application/pdf")

        finalized_report = report.mark_finalized(
            pdf_storage_path=storage_key,
            sha256=sha256,
            generated_at=ended_at,
            finalized_at=ended_at,
            content_json=content,
            updated_at=ended_at,
        )
        await self._reports.save(finalized_report)

        pdf_url = await self._storage.get_signed_url(
            storage_key,
            ttl_seconds=self._signed_url_ttl,
        )
        pdf_expires = ended_at + timedelta(seconds=self._signed_url_ttl)

        await self._append.emit_system_event(
            session_id=session_id,
            event_type=EventType.SESSION_CLOSED.value,
            step_index=updated_session.current_step_index,
            payload={
                "report_id": finalized_report.id,
                "pdf_url": pdf_url,
            },
        )

        return FinalizeReportOutput(
            session_id=session_id,
            report_id=finalized_report.id,
            pdf_url=pdf_url,
            pdf_expires_at=pdf_expires.isoformat().replace("+00:00", "Z"),
        )
