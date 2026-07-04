"""Stub Supabase audit log — BE-08."""

from __future__ import annotations

from domain.entities.audit_entry import AuditEntry


class SupabaseAuditLogRepository:
    """Stub — activar con AUDIT_LOG=supabase en producción."""

    async def append(self, entry: AuditEntry) -> None:
        raise NotImplementedError(
            "SupabaseAuditLogRepository.append — implementar al activar AUDIT_LOG=supabase",
        )

    async def get_by_id(self, entry_id: str) -> AuditEntry | None:
        raise NotImplementedError(
            "SupabaseAuditLogRepository.get_by_id — implementar al activar AUDIT_LOG=supabase",
        )

    async def list_entries(
        self,
        *,
        actor_user_id: str | None = None,
        action: str | None = None,
        target_type: str | None = None,
        limit: int = 50,
        cursor: str | None = None,
    ) -> tuple[list[AuditEntry], str | None]:
        raise NotImplementedError(
            "SupabaseAuditLogRepository.list_entries — implementar al activar AUDIT_LOG=supabase",
        )
