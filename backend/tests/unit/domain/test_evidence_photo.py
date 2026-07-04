"""Tests EvidencePhoto — BE-04."""

from datetime import UTC, datetime

import pytest

from domain.entities.evidence_photo import EvidencePhoto
from domain.value_objects.photo_status import PhotoStatus


def _photo(*, status: PhotoStatus = PhotoStatus.PENDING) -> EvidencePhoto:
    return EvidencePhoto(
        id="photo-1",
        session_id="sess-1",
        step_index=3,
        storage_path="sess-1/photo-1.jpg",
        captured_at=datetime(2026, 1, 1, tzinfo=UTC),
        validation_status=status,
    )


def test_mark_accepted_from_pending() -> None:
    updated = _photo().mark_accepted(feedback="Foto aceptada", model_version="mock-vlm-v1")
    assert updated.validation_status == PhotoStatus.ACCEPTED
    assert updated.validation_feedback == "Foto aceptada"
    assert updated.retries == 0


def test_mark_rejected_increments_retries() -> None:
    updated = _photo().mark_rejected(
        feedback="No se ve el sensor, acércate más",
        retries=2,
        model_version="mock-vlm-v1",
    )
    assert updated.validation_status == PhotoStatus.REJECTED
    assert updated.retries == 2


def test_mark_escalated_from_pending() -> None:
    updated = _photo().mark_escalated(
        feedback="Escalado a supervisor",
        retries=4,
        model_version="mock-vlm-v1",
    )
    assert updated.validation_status == PhotoStatus.ESCALATED
    assert updated.retries == 4


def test_invalid_transition_from_accepted_raises() -> None:
    photo = _photo(status=PhotoStatus.ACCEPTED)
    with pytest.raises(ValueError, match="solo pending"):
        photo.mark_rejected(feedback="x", retries=1, model_version="mock")


def test_negative_retries_raises() -> None:
    with pytest.raises(ValueError, match="retries"):
        EvidencePhoto(
            id="p1",
            session_id="s1",
            step_index=0,
            storage_path="k",
            captured_at=datetime(2026, 1, 1, tzinfo=UTC),
            validation_status=PhotoStatus.PENDING,
            retries=-1,
        )
