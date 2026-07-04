"""Use case GetReport — devuelve JSON del reporte — BE-07."""

from __future__ import annotations

from application.dto.report import ReportOutput
from application.use_cases.reports.build_live import BuildLiveReportUseCase
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import IReportRepository, ISessionRepository


class GetReportUseCase:
    """Devuelve reporte JSON (crea draft si no existe)."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        reports: IReportRepository,
        build_live: BuildLiveReportUseCase,
    ) -> None:
        self._sessions = sessions
        self._reports = reports
        self._build_live = build_live

    async def execute(
        self,
        *,
        session_id: str,
        current_user: User,
    ) -> ReportOutput:
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

        report = await self._reports.get_by_session_id(session_id)
        if report is None:
            report = await self._build_live.ensure_report(session_id)

        return ReportOutput(
            id=report.id,
            session_id=report.session_id,
            status=report.status.value,
            content=report.content_json,
            version=report.version,
            updated_at=report.updated_at.isoformat().replace("+00:00", "Z"),
        )
