"""Entidad MaintenanceReport — BE-07."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime

from domain.exceptions import ConflictError
from domain.value_objects.report_status import ReportStatus


@dataclass(frozen=True, slots=True)
class MaintenanceReport:
    """Reporte JSON incremental con PDF opcional al finalizar."""

    id: str
    session_id: str
    status: ReportStatus
    content_json: dict[str, object]
    version: int
    updated_at: datetime
    pdf_storage_path: str | None = None
    sha256: str | None = None
    generated_at: datetime | None = None
    finalized_at: datetime | None = None

    def __post_init__(self) -> None:
        if self.version < 1:
            raise ValueError("version debe ser >= 1")

    def with_content(
        self,
        *,
        content_json: dict[str, object],
        updated_at: datetime,
    ) -> MaintenanceReport:
        """Incrementa version de forma monotónica al actualizar contenido."""
        return replace(
            self,
            content_json=content_json,
            version=self.version + 1,
            updated_at=updated_at,
        )

    def mark_finalized(
        self,
        *,
        pdf_storage_path: str,
        sha256: str,
        generated_at: datetime,
        finalized_at: datetime,
        content_json: dict[str, object],
        updated_at: datetime,
    ) -> MaintenanceReport:
        """Transiciona draft → finalized con metadatos del PDF."""
        if self.status == ReportStatus.FINALIZED:
            raise ConflictError(
                code="SESSION_ALREADY_FINALIZED",
                message="El reporte ya está finalizado.",
            )
        return replace(
            self,
            status=ReportStatus.FINALIZED,
            content_json=content_json,
            version=self.version + 1,
            pdf_storage_path=pdf_storage_path,
            sha256=sha256,
            generated_at=generated_at,
            finalized_at=finalized_at,
            updated_at=updated_at,
        )
