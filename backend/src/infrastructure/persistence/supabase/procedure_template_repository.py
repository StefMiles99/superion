"""Adapter Supabase ProcedureTemplateRepository — BE-02."""

from __future__ import annotations

from domain.entities.procedure_template import ProcedureTemplate
from infrastructure.persistence.supabase.base import SupabaseRepository
from infrastructure.persistence.supabase.mappers import (
    procedure_template_from_row,
    steps_to_json,
)


class SupabaseProcedureTemplateRepository(SupabaseRepository):
    async def get_by_id(self, template_id: str) -> ProcedureTemplate | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM procedure_template WHERE id = $1",
                template_id,
            )
            return procedure_template_from_row(row) if row else None

    async def save(self, template: ProcedureTemplate) -> None:
        """Upsert — usado por seed."""
        pool = await self._pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO procedure_template (
                    id, name, version, manual_id, steps,
                    critical_step_indices, photo_required_step_indices,
                    estimated_minutes
                ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    version = EXCLUDED.version,
                    manual_id = EXCLUDED.manual_id,
                    steps = EXCLUDED.steps,
                    critical_step_indices = EXCLUDED.critical_step_indices,
                    photo_required_step_indices = EXCLUDED.photo_required_step_indices,
                    estimated_minutes = EXCLUDED.estimated_minutes
                """,
                template.id,
                template.name,
                template.version,
                template.manual_id,
                steps_to_json(template.steps),
                list(template.critical_step_indices),
                list(template.photo_required_step_indices),
                template.estimated_minutes,
            )
