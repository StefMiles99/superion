"""Use case ListAuditEntries — BE-08."""

from __future__ import annotations

from application.dto.audit import AuditEntryOutput, ListAuditOutput
from domain.ports.repositories import IAuditLogRepository


class ListAuditEntriesUseCase:
    """Lista entradas de auditoría con filtros (admin)."""

    def __init__(self, *, audit_log: IAuditLogRepository) -> None:
        self._audit_log = audit_log

    async def execute(
        self,
        *,
        actor_user_id: str | None = None,
        action: str | None = None,
        target_type: str | None = None,
        limit: int = 50,
        cursor: str | None = None,
    ) -> ListAuditOutput:
        entries, next_cursor = await self._audit_log.list_entries(
            actor_user_id=actor_user_id,
            action=action,
            target_type=target_type,
            limit=limit,
            cursor=cursor,
        )
        return ListAuditOutput(
            items=[
                AuditEntryOutput(
                    id=e.id,
                    actor_user_id=e.actor_user_id,
                    action=e.action.value,
                    target_type=e.target_type,
                    target_id=e.target_id,
                    payload=e.payload,
                    created_at=e.created_at.isoformat().replace("+00:00", "Z"),
                )
                for e in entries
            ],
            next_cursor=next_cursor,
        )
