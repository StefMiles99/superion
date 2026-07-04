"""Stub Supabase ProcedureTemplateRepository — BE-02."""

from __future__ import annotations

from domain.entities.procedure_template import ProcedureTemplate

_MSG = "implementar al activar PERSISTENCE=supabase"


class SupabaseProcedureTemplateRepository:
    """Implementación real pendiente de activar."""

    async def get_by_id(self, template_id: str) -> ProcedureTemplate | None:
        raise NotImplementedError(f"SupabaseProcedureTemplateRepository.get_by_id — {_MSG}")
