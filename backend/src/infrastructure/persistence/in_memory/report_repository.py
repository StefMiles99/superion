"""Repositorio in-memory de reportes — BE-07."""

from __future__ import annotations

import asyncio

from domain.entities.maintenance_report import MaintenanceReport


class InMemoryReportRepository:
    """Reportes indexados por id y session_id."""

    _instance: InMemoryReportRepository | None = None

    def __init__(self) -> None:
        self._reports: dict[str, MaintenanceReport] = {}
        self._session_index: dict[str, str] = {}
        self._lock = asyncio.Lock()

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> InMemoryReportRepository:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def save(self, report: MaintenanceReport) -> None:
        async with self._lock:
            self._reports[report.id] = report
            self._session_index[report.session_id] = report.id

    async def get_by_session_id(self, session_id: str) -> MaintenanceReport | None:
        async with self._lock:
            report_id = self._session_index.get(session_id)
            if report_id is None:
                return None
            return self._reports.get(report_id)

    async def get_by_id(self, report_id: str) -> MaintenanceReport | None:
        async with self._lock:
            return self._reports.get(report_id)

    async def reset(self) -> None:
        async with self._lock:
            self._reports.clear()
            self._session_index.clear()
