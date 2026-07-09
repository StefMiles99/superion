"""Use case GetReportPdf — descarga PDF con SHA256 — BE-07."""

from __future__ import annotations

from dataclasses import dataclass

from application.services.session_access import resolve_session_for_user
from domain.entities.user import User
from domain.exceptions import ConflictError, NotFoundError
from domain.ports.repositories import IReportRepository, ISessionRepository, IWorkOrderRepository, IUserRepository
from domain.ports.storage import IObjectStorage
from domain.value_objects.report_status import ReportStatus


@dataclass(frozen=True, slots=True)
class ReportPdfResult:
    """Bytes PDF + metadatos para la respuesta HTTP."""

    pdf_bytes: bytes
    sha256: str
    filename: str


class GetReportPdfUseCase:
    """Devuelve bytes PDF y hash para header X-Document-SHA256."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        reports: IReportRepository,
        work_orders: IWorkOrderRepository,
        storage: IObjectStorage,
        users: IUserRepository,
    ) -> None:
        self._sessions = sessions
        self._reports = reports
        self._work_orders = work_orders
        self._storage = storage
        self._users = users

    async def execute(
        self,
        *,
        session_id: str,
        current_user: User,
    ) -> ReportPdfResult:
        session = await resolve_session_for_user(
            sessions=self._sessions,
            users=self._users,
            session_id=session_id,
            current_user=current_user,
        )

        report = await self._reports.get_by_session_id(session_id)
        if report is None:
            raise NotFoundError(
                code="REPORT_NOT_FOUND",
                message="Reporte no encontrado.",
                details={"session_id": session_id},
            )

        if report.status != ReportStatus.FINALIZED or report.pdf_storage_path is None:
            raise ConflictError(
                code="SESSION_NOT_FINALIZED",
                message="La sesión no está finalizada.",
                details={"session_id": session_id},
            )

        pdf_bytes = await self._storage.get(report.pdf_storage_path)
        if pdf_bytes is None:
            raise NotFoundError(
                code="REPORT_NOT_FOUND",
                message="PDF no encontrado en storage.",
                details={"session_id": session_id},
            )

        order = await self._work_orders.get_by_id_for_technician(
            session.work_order_id,
            technician_id=session.technician_id,
        )
        ot_code = order.code if order is not None else "OT-UNKNOWN"
        filename = f"{ot_code}-reporte.pdf"
        sha256 = report.sha256 or ""

        return ReportPdfResult(
            pdf_bytes=pdf_bytes,
            sha256=sha256,
            filename=filename,
        )
