"""Use case BuildLiveReport — actualiza reporte en vivo — BE-07."""

from __future__ import annotations

from uuid import uuid4

from application.use_cases.reports.builder import ReportBuilder, compute_report_diff
from domain.entities.maintenance_report import MaintenanceReport
from domain.ports.event_bus import IEventBus
from domain.ports.repositories import (
    IAssetRepository,
    IPhotoRepository,
    IProcedureTemplateRepository,
    IReportRepository,
    ISessionEventRepository,
    ISessionRepository,
    IUserRepository,
    IWorkOrderRepository,
)
from domain.ports.services import IClock
from domain.value_objects.event_type import EventType
from domain.value_objects.report_status import ReportStatus

_RELEVANT_WS_TYPES = frozenset({
    EventType.STEP_COMPLETED.value,
    EventType.PHOTO.value,
    "photo.validated",
    "event.appended",
})


class BuildLiveReportUseCase:
    """Escucha eventos del bus y actualiza content_json con diff WS."""

    def __init__(
        self,
        *,
        reports: IReportRepository,
        sessions: ISessionRepository,
        work_orders: IWorkOrderRepository,
        templates: IProcedureTemplateRepository,
        assets: IAssetRepository,
        users: IUserRepository,
        events: ISessionEventRepository,
        photos: IPhotoRepository,
        bus: IEventBus,
        clock: IClock,
        builder: ReportBuilder | None = None,
    ) -> None:
        self._reports = reports
        self._sessions = sessions
        self._work_orders = work_orders
        self._templates = templates
        self._assets = assets
        self._users = users
        self._events = events
        self._photos = photos
        self._bus = bus
        self._clock = clock
        self._builder = builder or ReportBuilder()
        self._started = False

    async def start(self) -> None:
        """Registra handler global en el bus (idempotente)."""
        if self._started:
            return
        await self._bus.subscribe_all(self._on_bus_message)
        self._started = True

    async def _on_bus_message(self, message: dict[str, object]) -> None:
        event_type = str(message.get("type", ""))
        if event_type not in _RELEVANT_WS_TYPES:
            return

        session_id = str(message.get("session_id", ""))
        if not session_id:
            return

        step_index: int | None = None
        inner_type = event_type

        if event_type == "event.appended":
            payload = message.get("payload", {})
            if not isinstance(payload, dict):
                return
            inner_type = str(payload.get("type", ""))
            if inner_type not in (
                EventType.FINDING.value,
                EventType.MEASUREMENT.value,
                "utterance",
                "observation",
            ):
                return
            step_index = int(payload.get("step_index", 0))
        elif event_type == EventType.PHOTO.value:
            payload = message.get("payload", {})
            if not isinstance(payload, dict) or payload.get("status") != "accepted":
                return
            step_index = int(payload.get("step_index", message.get("step_index", 0)))
        elif event_type == "photo.validated":
            payload = message.get("payload", {})
            if isinstance(payload, dict):
                step_index = int(payload.get("step_index", 0))
            inner_type = EventType.PHOTO.value
        elif event_type == EventType.STEP_COMPLETED.value:
            payload = message.get("payload", {})
            if isinstance(payload, dict):
                step_index = int(payload.get("index", message.get("step_index", 0)))
        else:
            return

        seq = int(message.get("seq", 0))
        await self._rebuild(
            session_id=session_id,
            added_event_seq=seq,
            step_index=step_index,
        )

    async def ensure_report(self, session_id: str) -> MaintenanceReport:
        """Crea reporte draft si no existe."""
        existing = await self._reports.get_by_session_id(session_id)
        if existing is not None:
            return existing

        session = await self._sessions.get_by_id(session_id)
        if session is None:
            raise ValueError(f"Sesión no encontrada: {session_id}")

        now = self._clock.now()
        content = await self._build_content(session_id=session_id)
        report = MaintenanceReport(
            id=str(uuid4()),
            session_id=session_id,
            status=ReportStatus.DRAFT,
            content_json=content,
            version=1,
            updated_at=now,
        )
        await self._reports.save(report)
        return report

    async def _rebuild(
        self,
        *,
        session_id: str,
        added_event_seq: int,
        step_index: int | None,
    ) -> None:
        session = await self._sessions.get_by_id(session_id)
        if session is None or session.status.value == "finalized":
            return

        report = await self._reports.get_by_session_id(session_id)
        if report is None:
            report = await self.ensure_report(session_id)

        if report.status == ReportStatus.FINALIZED:
            return

        old_content = report.content_json
        new_content = await self._build_content(session_id=session_id)
        diff = compute_report_diff(
            old_content=old_content,
            new_content=new_content,
            added_event_seq=added_event_seq,
            step_index=step_index,
        )

        now = self._clock.now()
        updated = report.with_content(content_json=new_content, updated_at=now)
        await self._reports.save(updated)

        ws_seq = await self._events.next_seq(session_id)
        created_at = now.isoformat().replace("+00:00", "Z")
        await self._bus.publish(
            session_id,
            {
                "seq": ws_seq,
                "type": "report.updated",
                "session_id": session_id,
                "created_at": created_at,
                "payload": {
                    "report_id": updated.id,
                    "version": updated.version,
                    "diff": {
                        "summary_changed": diff.summary_changed,
                        "step_index": diff.step_index,
                        "added_event_seq": diff.added_event_seq,
                        "fields_changed": list(diff.fields_changed),
                    },
                },
            },
        )

    async def build_content(self, *, session_id: str) -> dict[str, object]:
        """Construye content_json actual desde eventos y contexto."""
        return await self._build_content(session_id=session_id)

    async def _build_content(self, *, session_id: str) -> dict[str, object]:
        session = await self._sessions.get_by_id(session_id)
        if session is None:
            raise ValueError(f"Sesión no encontrada: {session_id}")

        order = await self._work_orders.get_by_id_for_technician(
            session.work_order_id,
            technician_id=session.technician_id,
        )
        if order is None:
            raise ValueError(f"OT no encontrada para sesión {session_id}")

        template = await self._templates.get_by_id(order.procedure_template_id)
        if template is None:
            raise ValueError(f"Plantilla no encontrada para sesión {session_id}")

        asset = await self._assets.get_by_id(order.asset_id)
        if asset is None:
            raise ValueError(f"Activo no encontrado para sesión {session_id}")

        technician = await self._users.get_by_id(session.technician_id)
        if technician is None:
            raise ValueError(f"Técnico no encontrado para sesión {session_id}")

        event_list = await self._events.list_since(session_id, since_seq=0, limit=500)
        photo_list = await self._photos.list_by_session(session_id)

        return self._builder.build(
            session=session,
            work_order=order,
            asset=asset,
            technician=technician,
            template=template,
            events=event_list,
            photos=photo_list,
        )
