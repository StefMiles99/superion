"""Entidad Manual — BE-05."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime

from domain.value_objects.manual_status import IndexStatus, ManualStatus


@dataclass(frozen=True, slots=True)
class Manual:
    """Manual técnico versionado por modelo de activo."""

    id: str
    title: str
    asset_model: str
    version: int
    status: ManualStatus
    index_status: IndexStatus
    storage_path: str
    chunk_count: int
    uploaded_at: datetime
    uploaded_by_id: str
    plant_id: str

    def __post_init__(self) -> None:
        if self.version < 1:
            raise ValueError("version debe ser >= 1")
        if self.chunk_count < 0:
            raise ValueError("chunk_count debe ser >= 0")

    def mark_indexed(self, *, chunk_count: int) -> Manual:
        """Transición indexing/pending → indexed + active."""
        if self.index_status not in (IndexStatus.PENDING, IndexStatus.FAILED):
            raise ValueError("solo pending/failed puede pasar a indexed")
        return replace(
            self,
            status=ManualStatus.ACTIVE,
            index_status=IndexStatus.INDEXED,
            chunk_count=chunk_count,
        )

    def mark_index_failed(self) -> Manual:
        """Marca fallo de indexación."""
        return replace(
            self,
            status=ManualStatus.ERROR,
            index_status=IndexStatus.FAILED,
        )

    def mark_reindex_pending(self) -> Manual:
        """Reinicia indexación sobre manual existente."""
        if self.status == ManualStatus.ARCHIVED:
            raise ValueError("no se puede reindexar un manual archivado")
        return replace(
            self,
            status=ManualStatus.INDEXING,
            index_status=IndexStatus.PENDING,
            chunk_count=0,
        )

    def archive(self) -> Manual:
        """Soft delete — archiva manual."""
        if self.status == ManualStatus.ARCHIVED:
            raise ValueError("manual ya archivado")
        return replace(self, status=ManualStatus.ARCHIVED)
