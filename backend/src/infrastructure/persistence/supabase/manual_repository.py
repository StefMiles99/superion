"""Adapter Supabase ManualRepository — BE-05."""

from __future__ import annotations

from domain.entities.manual import Manual
from infrastructure.persistence.supabase.base import SupabaseRepository
from infrastructure.persistence.supabase.mappers import ensure_utc, manual_from_row


class SupabaseManualRepository(SupabaseRepository):
    async def save(self, manual: Manual) -> None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO manual (
                    id, title, asset_model, version, status, index_status,
                    storage_path, chunk_count, uploaded_at, uploaded_by_id, plant_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    asset_model = EXCLUDED.asset_model,
                    version = EXCLUDED.version,
                    status = EXCLUDED.status,
                    index_status = EXCLUDED.index_status,
                    storage_path = EXCLUDED.storage_path,
                    chunk_count = EXCLUDED.chunk_count,
                    uploaded_at = EXCLUDED.uploaded_at,
                    uploaded_by_id = EXCLUDED.uploaded_by_id,
                    plant_id = EXCLUDED.plant_id
                """,
                manual.id,
                manual.title,
                manual.asset_model,
                manual.version,
                manual.status.value,
                manual.index_status.value,
                manual.storage_path,
                manual.chunk_count,
                ensure_utc(manual.uploaded_at),
                manual.uploaded_by_id,
                manual.plant_id,
            )

    async def get_by_id(self, manual_id: str) -> Manual | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM manual WHERE id = $1", manual_id)
            return manual_from_row(row) if row else None

    async def list_all(self) -> list[Manual]:
        pool = await self._pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM manual ORDER BY uploaded_at DESC")
            return [manual_from_row(row) for row in rows]

    async def get_active_by_asset_model(self, asset_model: str) -> Manual | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM manual
                WHERE asset_model = $1 AND status = 'active'
                ORDER BY version DESC
                LIMIT 1
                """,
                asset_model,
            )
            return manual_from_row(row) if row else None

    async def next_version_for_asset_model(self, asset_model: str) -> int:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT COALESCE(MAX(version), 0) AS max_v FROM manual WHERE asset_model = $1",
                asset_model,
            )
            assert row is not None
            return int(row["max_v"]) + 1
