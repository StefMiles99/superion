"""Stub Supabase manual repository — BE-05."""

from __future__ import annotations

from domain.entities.manual import Manual


class SupabaseManualRepository:
    """Stub — implementar al activar BE-08."""

    async def save(self, manual: Manual) -> None:
        raise NotImplementedError("SupabaseManualRepository.save — implementar al activar BE-08")

    async def get_by_id(self, manual_id: str) -> Manual | None:
        raise NotImplementedError(
            "SupabaseManualRepository.get_by_id — implementar al activar BE-08"
        )

    async def list_all(self) -> list[Manual]:
        raise NotImplementedError(
            "SupabaseManualRepository.list_all — implementar al activar BE-08"
        )

    async def get_active_by_asset_model(self, asset_model: str) -> Manual | None:
        raise NotImplementedError(
            "SupabaseManualRepository.get_active_by_asset_model — implementar al activar BE-08"
        )

    async def next_version_for_asset_model(self, asset_model: str) -> int:
        raise NotImplementedError(
            "SupabaseManualRepository.next_version_for_asset_model — implementar al activar BE-08"
        )
