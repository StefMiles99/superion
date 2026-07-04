"""Stub Supabase AssetRepository — BE-02."""

from __future__ import annotations

from domain.entities.asset import Asset


class SupabaseAssetRepository:
    """Implementación real pendiente de activar."""

    async def get_by_id(self, asset_id: str) -> Asset | None:
        raise NotImplementedError(
            "SupabaseAssetRepository.get_by_id — implementar al activar PERSISTENCE=supabase"
        )
