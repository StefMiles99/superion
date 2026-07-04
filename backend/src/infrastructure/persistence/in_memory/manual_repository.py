"""Repositorio in-memory de manuales — BE-05."""

from __future__ import annotations

import asyncio

from domain.entities.manual import Manual
from domain.value_objects.manual_status import ManualStatus


class InMemoryManualRepository:
    """Manuales en dict con versionado por asset_model."""

    _instance: InMemoryManualRepository | None = None

    def __init__(self) -> None:
        self._manuals: dict[str, Manual] = {}
        self._lock = asyncio.Lock()

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> InMemoryManualRepository:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def save(self, manual: Manual) -> None:
        async with self._lock:
            self._manuals[manual.id] = manual

    async def get_by_id(self, manual_id: str) -> Manual | None:
        async with self._lock:
            return self._manuals.get(manual_id)

    async def list_all(self) -> list[Manual]:
        async with self._lock:
            return sorted(
                self._manuals.values(),
                key=lambda manual: manual.uploaded_at,
                reverse=True,
            )

    async def get_active_by_asset_model(self, asset_model: str) -> Manual | None:
        async with self._lock:
            candidates = [
                manual
                for manual in self._manuals.values()
                if manual.asset_model == asset_model and manual.status == ManualStatus.ACTIVE
            ]
            if not candidates:
                return None
            return max(candidates, key=lambda manual: manual.version)

    async def next_version_for_asset_model(self, asset_model: str) -> int:
        async with self._lock:
            versions = [
                manual.version
                for manual in self._manuals.values()
                if manual.asset_model == asset_model
            ]
            if not versions:
                return 1
            return max(versions) + 1

    async def reset(self) -> None:
        async with self._lock:
            self._manuals.clear()
