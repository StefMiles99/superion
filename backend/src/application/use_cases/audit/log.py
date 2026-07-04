"""Use case LogAuditEntry — BE-08."""

from __future__ import annotations

from uuid import uuid4

from domain.entities.audit_entry import AuditEntry
from domain.ports.repositories import IAuditLogRepository
from domain.ports.services import IClock
from domain.value_objects.action import AuditAction


class LogAuditEntryUseCase:
    """Append idempotente de entrada de auditoría."""

    def __init__(
        self,
        *,
        audit_log: IAuditLogRepository,
        clock: IClock,
    ) -> None:
        self._audit_log = audit_log
        self._clock = clock

    async def execute(
        self,
        *,
        entry_id: str | None = None,
        actor_user_id: str,
        action: AuditAction,
        target_type: str,
        target_id: str,
        payload: dict[str, object] | None = None,
    ) -> AuditEntry:
        existing_id = entry_id or str(uuid4())
        existing = await self._audit_log.get_by_id(existing_id)
        if existing is not None:
            return existing

        entry = AuditEntry(
            id=existing_id,
            actor_user_id=actor_user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            payload=payload or {},
            created_at=self._clock.now(),
        )
        await self._audit_log.append(entry)
        return entry
