"""Tests MockPhotoValidator — BE-04."""

import pytest

from domain.services.photo_validator import MockPhotoValidator


@pytest.fixture
def validator() -> MockPhotoValidator:
    return MockPhotoValidator()


async def test_accepts_image_starting_with_a(validator: MockPhotoValidator) -> None:
    result = await validator.validate(b"Acontenido", "sensor visible")
    assert result.ok is True
    assert result.feedback == "Foto aceptada"
    assert result.confidence >= 0.9


async def test_rejects_image_starting_with_r(validator: MockPhotoValidator) -> None:
    result = await validator.validate(b"Rmal", "sensor visible")
    assert result.ok is False
    assert result.feedback == "No se ve el sensor, acércate más"


async def test_rejects_unrecognized_bytes(validator: MockPhotoValidator) -> None:
    result = await validator.validate(b"Xdata", "sensor visible")
    assert result.ok is False
    assert result.feedback == "Imagen borrosa, repite"


async def test_rejects_empty_bytes(validator: MockPhotoValidator) -> None:
    result = await validator.validate(b"", "sensor visible")
    assert result.ok is False
    assert result.feedback == "Imagen borrosa, repite"
