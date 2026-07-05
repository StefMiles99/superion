"""Repositorio in-memory de activos — BE-02."""

from __future__ import annotations

import asyncio

from domain.entities.asset import Asset


class InMemoryAssetRepository:
    """Activos sembrados para desarrollo y tests."""

    _instance: InMemoryAssetRepository | None = None

    def __init__(self, assets: list[Asset]) -> None:
        self._assets = {asset.id: asset for asset in assets}
        self._lock = asyncio.Lock()

    @classmethod
    def with_fixtures(cls) -> InMemoryAssetRepository:
        assets = [
            Asset(
                id="asset-1",
                plant_id="plant-1",
                tag="COMP-C3",
                name="Compresor C-3",
                model="Atlas Copco GA-37",
                manufacturer="Atlas Copco",
                current_manual_id="manual-comp-1",
            ),
            Asset(
                id="asset-2",
                plant_id="plant-1",
                tag="COMP-C4",
                name="Compresor C-4",
                model="Atlas Copco GA-45",
                manufacturer="Atlas Copco",
                current_manual_id="manual-comp-1",
            ),
            Asset(
                id="asset-3",
                plant_id="plant-1",
                tag="BOMB-B2",
                name="Bomba B-2",
                model="Grundfos CR 32",
                manufacturer="Grundfos",
                current_manual_id="manual-bomb-1",
            ),
            Asset(
                id="asset-4",
                plant_id="plant-1",
                tag="BOMB-B3",
                name="Bomba B-3",
                model="Grundfos CR 45",
                manufacturer="Grundfos",
                current_manual_id="manual-bomb-1",
            ),
            Asset(
                id="asset-5",
                plant_id="plant-1",
                tag="COMP-C5",
                name="Compresor C-5",
                model="Atlas Copco GA-55",
                manufacturer="Atlas Copco",
                current_manual_id="manual-comp-1",
            ),
            Asset(
                id="asset-6",
                plant_id="plant-1",
                tag="VALV-V1",
                name="Válvula V-1",
                model="Fisher EZ",
                manufacturer="Emerson",
                current_manual_id="manual-valv-1",
            ),
            Asset(
                id="asset-7",
                plant_id="plant-1",
                tag="VALV-EH",
                name="Electro válvula hidráulica",
                model="electro valvula hidraulica",
                manufacturer="Vickers",
                current_manual_id=None,
            ),
        ]
        return cls(assets)

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> InMemoryAssetRepository:
        if cls._instance is None:
            cls._instance = cls.with_fixtures()
        return cls._instance

    async def get_by_id(self, asset_id: str) -> Asset | None:
        async with self._lock:
            return self._assets.get(asset_id)

    async def reset(self) -> None:
        async with self._lock:
            fresh = self.with_fixtures()
            self._assets = fresh._assets
