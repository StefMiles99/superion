"""Adapter Supabase SessionRepository — BE-02."""

from __future__ import annotations

import json

from domain.entities.maintenance_session import MaintenanceSession
from infrastructure.persistence.supabase.base import SupabaseRepository
from infrastructure.persistence.supabase.mappers import ensure_utc, session_from_row


class SupabaseSessionRepository(SupabaseRepository):
    async def save(self, session: MaintenanceSession) -> None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO maintenance_session (
                    id, work_order_id, technician_id, status, started_at,
                    ended_at, current_step_index, langgraph_thread_id, metrics
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
                ON CONFLICT (id) DO UPDATE SET
                    work_order_id = EXCLUDED.work_order_id,
                    technician_id = EXCLUDED.technician_id,
                    status = EXCLUDED.status,
                    started_at = EXCLUDED.started_at,
                    ended_at = EXCLUDED.ended_at,
                    current_step_index = EXCLUDED.current_step_index,
                    langgraph_thread_id = EXCLUDED.langgraph_thread_id,
                    metrics = EXCLUDED.metrics
                """,
                session.id,
                session.work_order_id,
                session.technician_id,
                session.status.value,
                ensure_utc(session.started_at),
                ensure_utc(session.ended_at) if session.ended_at else None,
                session.current_step_index,
                session.langgraph_thread_id,
                json.dumps({}),
            )

    async def get_by_id_for_technician(
        self,
        session_id: str,
        *,
        technician_id: str,
    ) -> MaintenanceSession | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM maintenance_session
                WHERE id = $1 AND technician_id = $2
                """,
                session_id,
                technician_id,
            )
            return session_from_row(row) if row else None

    async def get_by_id(self, session_id: str) -> MaintenanceSession | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM maintenance_session WHERE id = $1",
                session_id,
            )
            return session_from_row(row) if row else None

    async def get_active_for_work_order(
        self,
        work_order_id: str,
    ) -> MaintenanceSession | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM maintenance_session
                WHERE work_order_id = $1 AND status IN ('active', 'paused')
                ORDER BY started_at DESC
                LIMIT 1
                """,
                work_order_id,
            )
            return session_from_row(row) if row else None

    async def list_for_plant(
        self,
        *,
        plant_id: str,
        limit: int = 50,
    ) -> list[MaintenanceSession]:
        pool = await self._pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT ms.* FROM maintenance_session ms
                INNER JOIN "user" u ON u.id = ms.technician_id
                WHERE u.plant_id = $1
                ORDER BY ms.started_at DESC
                LIMIT $2
                """,
                plant_id,
                limit,
            )
            return [session_from_row(row) for row in rows]
