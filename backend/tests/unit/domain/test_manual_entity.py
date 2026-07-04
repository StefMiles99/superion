"""Tests Manual entity — BE-05."""

from datetime import UTC, datetime

import pytest

from domain.entities.manual import Manual
from domain.value_objects.manual_status import IndexStatus, ManualStatus


def _manual(*, status: ManualStatus = ManualStatus.INDEXING) -> Manual:
    return Manual(
        id="manual-1",
        title="Atlas Copco GA-37",
        asset_model="Atlas Copco GA-37",
        version=1,
        status=status,
        index_status=IndexStatus.PENDING,
        storage_path="plant-1/manual-1/1.pdf",
        chunk_count=0,
        uploaded_at=datetime(2026, 1, 1, tzinfo=UTC),
        uploaded_by_id="admin-1",
        plant_id="plant-1",
    )


def test_mark_indexed_transitions_to_active() -> None:
    updated = _manual().mark_indexed(chunk_count=3)
    assert updated.status == ManualStatus.ACTIVE
    assert updated.index_status == IndexStatus.INDEXED
    assert updated.chunk_count == 3


def test_mark_index_failed_sets_error() -> None:
    updated = _manual().mark_index_failed()
    assert updated.status == ManualStatus.ERROR
    assert updated.index_status == IndexStatus.FAILED


def test_archive_from_active() -> None:
    manual = _manual(status=ManualStatus.ACTIVE)
    manual = manual.mark_indexed(chunk_count=1)
    archived = manual.archive()
    assert archived.status == ManualStatus.ARCHIVED


def test_version_must_be_positive() -> None:
    with pytest.raises(ValueError, match="version"):
        Manual(
            id="m1",
            title="t",
            asset_model="model",
            version=0,
            status=ManualStatus.INDEXING,
            index_status=IndexStatus.PENDING,
            storage_path="p",
            chunk_count=0,
            uploaded_at=datetime(2026, 1, 1, tzinfo=UTC),
            uploaded_by_id="u1",
            plant_id="plant-1",
        )


def test_cannot_reindex_archived() -> None:
    manual = _manual(status=ManualStatus.ARCHIVED)
    with pytest.raises(ValueError, match="archivado"):
        manual.mark_reindex_pending()
