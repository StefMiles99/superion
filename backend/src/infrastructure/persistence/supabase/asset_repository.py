"""Adapter Supabase AssetRepository — BE-02."""

from __future__ import annotations

from domain.entities.asset import Asset
from infrastructure.persistence.supabase.base import SupabaseRepository
from infrastructure.persistence.supabase.mappers import asset_from_row


class SupabaseAssetRepository(SupabaseRepository):
    async def get_by_id(self, asset_id: str) -> Asset | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM asset WHERE id = $1", asset_id)
            return asset_from_row(row) if row else None
