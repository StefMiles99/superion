"""Adapter Supabase WorkOrderRepository — BE-02."""

from __future__ import annotations

import base64
from datetime import datetime

from domain.entities.work_order import WorkOrder
from infrastructure.persistence.supabase.base import SupabaseRepository
from infrastructure.persistence.supabase.mappers import ensure_utc, work_order_from_row


def _encode_cursor(work_order_id: str, created_at: datetime) -> str:
    raw = f"{work_order_id}:{created_at.isoformat()}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _decode_cursor(cursor: str) -> tuple[str, datetime]:
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    work_order_id, created_at_str = raw.split(":", 1)
    return work_order_id, datetime.fromisoformat(created_at_str)


class SupabaseWorkOrderRepository(SupabaseRepository):
    async def list_for_technician(
        self,
        *,
        technician_id: str,
        statuses: list[str] | None = None,
        priority: str | None = None,
        asset_id: str | None = None,
        cursor: str | None = None,
        limit: int = 20,
    ) -> tuple[list[WorkOrder], str | None]:
        pool = await self._pool()
        conditions = ["assigned_to = $1"]
        params: list[object] = [technician_id]
        param_idx = 2

        if statuses:
            conditions.append(f"status = ANY(${param_idx}::text[])")
            params.append(statuses)
            param_idx += 1
        if priority is not None:
            conditions.append(f"priority = ${param_idx}")
            params.append(priority)
            param_idx += 1
        if asset_id is not None:
            conditions.append(f"asset_id = ${param_idx}")
            params.append(asset_id)
            param_idx += 1

        if cursor is not None:
            cursor_id, cursor_created = _decode_cursor(cursor)
            conditions.append(
                f"(created_at, id) > (${param_idx}, ${param_idx + 1})"
            )
            params.extend([cursor_created, cursor_id])
            param_idx += 2

        where = " AND ".join(conditions)
        query = f"""
            SELECT * FROM work_order
            WHERE {where}
            ORDER BY created_at ASC, id ASC
            LIMIT ${param_idx}
        """
        params.append(limit + 1)

        async with pool.acquire() as conn:
            rows = await conn.fetch(query, *params)

        orders = [work_order_from_row(row) for row in rows[:limit]]
        next_cursor: str | None = None
        if len(rows) > limit:
            last = orders[-1]
            next_cursor = _encode_cursor(last.id, last.created_at)
        return orders, next_cursor

    async def get_by_id_for_technician(
        self,
        work_order_id: str,
        *,
        technician_id: str,
    ) -> WorkOrder | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM work_order
                WHERE id = $1 AND assigned_to = $2
                """,
                work_order_id,
                technician_id,
            )
            return work_order_from_row(row) if row else None

    async def save(self, work_order: WorkOrder) -> None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO work_order (
                    id, code, asset_id, type, priority, status, assigned_to,
                    planned_start, planned_end, procedure_template_id, created_at,
                    description, notes, linked_wo_ids
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7,
                    $8, $9, $10, $11,
                    $12, $13, $14
                )
                ON CONFLICT (id) DO UPDATE SET
                    code = EXCLUDED.code,
                    asset_id = EXCLUDED.asset_id,
                    type = EXCLUDED.type,
                    priority = EXCLUDED.priority,
                    status = EXCLUDED.status,
                    assigned_to = EXCLUDED.assigned_to,
                    planned_start = EXCLUDED.planned_start,
                    planned_end = EXCLUDED.planned_end,
                    procedure_template_id = EXCLUDED.procedure_template_id,
                    description = EXCLUDED.description,
                    notes = EXCLUDED.notes,
                    linked_wo_ids = EXCLUDED.linked_wo_ids
                """,
                work_order.id,
                work_order.code,
                work_order.asset_id,
                work_order.type,
                work_order.priority,
                work_order.status.value,
                work_order.assigned_to,
                ensure_utc(work_order.planned_start),
                ensure_utc(work_order.planned_end),
                work_order.procedure_template_id,
                ensure_utc(work_order.created_at),
                work_order.description,
                work_order.notes,
                list(work_order.linked_wo_ids),
            )
