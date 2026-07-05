"""Adapter Supabase ReportRepository — BE-07."""

from __future__ import annotations

import json

from domain.entities.maintenance_report import MaintenanceReport
from infrastructure.persistence.supabase.base import SupabaseRepository
from infrastructure.persistence.supabase.mappers import ensure_utc, report_from_row


class SupabaseReportRepository(SupabaseRepository):
    async def save(self, report: MaintenanceReport) -> None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO maintenance_report (
                    id, session_id, status, content_json, version, updated_at,
                    pdf_storage_path, sha256, generated_at, finalized_at
                ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (id) DO UPDATE SET
                    session_id = EXCLUDED.session_id,
                    status = EXCLUDED.status,
                    content_json = EXCLUDED.content_json,
                    version = EXCLUDED.version,
                    updated_at = EXCLUDED.updated_at,
                    pdf_storage_path = EXCLUDED.pdf_storage_path,
                    sha256 = EXCLUDED.sha256,
                    generated_at = EXCLUDED.generated_at,
                    finalized_at = EXCLUDED.finalized_at
                """,
                report.id,
                report.session_id,
                report.status.value,
                json.dumps(report.content_json),
                report.version,
                ensure_utc(report.updated_at),
                report.pdf_storage_path,
                report.sha256,
                ensure_utc(report.generated_at) if report.generated_at else None,
                ensure_utc(report.finalized_at) if report.finalized_at else None,
            )

    async def get_by_session_id(self, session_id: str) -> MaintenanceReport | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM maintenance_report WHERE session_id = $1",
                session_id,
            )
            return report_from_row(row) if row else None

    async def get_by_id(self, report_id: str) -> MaintenanceReport | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM maintenance_report WHERE id = $1",
                report_id,
            )
            return report_from_row(row) if row else None
