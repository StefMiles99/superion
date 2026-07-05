"""Adapter Supabase AuditLogRepository — BE-08."""

from __future__ import annotations

import json

from domain.entities.audit_entry import AuditEntry
from infrastructure.persistence.supabase.base import SupabaseRepository
from infrastructure.persistence.supabase.mappers import audit_from_row, ensure_utc


class SupabaseAuditLogRepository(SupabaseRepository):
    async def append(self, entry: AuditEntry) -> None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO audit_log (
                    id, actor_user_id, action, target_type, target_id, payload, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
                ON CONFLICT (id) DO NOTHING
                """,
                entry.id,
                entry.actor_user_id,
                entry.action.value,
                entry.target_type,
                entry.target_id,
                json.dumps(entry.payload),
                ensure_utc(entry.created_at),
            )

    async def get_by_id(self, entry_id: str) -> AuditEntry | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM audit_log WHERE id = $1",
                entry_id,
            )
            return audit_from_row(row) if row else None

    async def list_entries(
        self,
        *,
        actor_user_id: str | None = None,
        action: str | None = None,
        target_type: str | None = None,
        limit: int = 50,
        cursor: str | None = None,
    ) -> tuple[list[AuditEntry], str | None]:
        pool = await self._pool()
        conditions: list[str] = []
        params: list[object] = []
        idx = 1

        if actor_user_id is not None:
            conditions.append(f"actor_user_id = ${idx}")
            params.append(actor_user_id)
            idx += 1
        if action is not None:
            conditions.append(f"action = ${idx}")
            params.append(action)
            idx += 1
        if target_type is not None:
            conditions.append(f"target_type = ${idx}")
            params.append(target_type)
            idx += 1
        if cursor is not None:
            conditions.append(f"(created_at, id) > (SELECT created_at, id FROM audit_log WHERE id = ${idx})")
            params.append(cursor)
            idx += 1

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        query = f"""
            SELECT * FROM audit_log
            {where}
            ORDER BY created_at ASC, id ASC
            LIMIT ${idx}
        """
        params.append(limit + 1)

        async with pool.acquire() as conn:
            rows = await conn.fetch(query, *params)

        entries = [audit_from_row(row) for row in rows[:limit]]
        next_cursor = entries[-1].id if len(rows) > limit else None
        return entries, next_cursor
