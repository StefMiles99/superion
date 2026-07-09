"""Use case GetReport — devuelve JSON del reporte — BE-07."""

from __future__ import annotations

from application.dto.report import ReportOutput
from application.services.session_access import resolve_session_for_user
from application.use_cases.reports.build_live import BuildLiveReportUseCase
from domain.entities.user import User
from domain.ports.repositories import IReportRepository, ISessionRepository, IUserRepository


class GetReportUseCase:
    """Devuelve reporte JSON (crea draft si no existe)."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        reports: IReportRepository,
        build_live: BuildLiveReportUseCase,
        users: IUserRepository,
    ) -> None:
        self._sessions = sessions
        self._reports = reports
        self._build_live = build_live
        self._users = users

    async def execute(
        self,
        *,
        session_id: str,
        current_user: User,
    ) -> ReportOutput:
        await resolve_session_for_user(
            sessions=self._sessions,
            users=self._users,
            session_id=session_id,
            current_user=current_user,
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
