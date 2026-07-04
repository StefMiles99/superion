"""MockPhotoValidator determinista — BE-04."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class MockValidationResult:
    """Resultado concreto del mock VLM."""

    ok: bool
    feedback: str
    confidence: float
    model_version: str = "mock-vlm-v1"


class MockPhotoValidator:
    """Validador determinista por magic bytes del primer byte."""

    async def validate(self, image_bytes: bytes, criteria: str) -> MockValidationResult:
        """Valida imagen según primer byte: A=aceptar, R=rechazar, otro=borrosa."""
        _ = criteria
        if not image_bytes:
            return MockValidationResult(
                ok=False,
                feedback="Imagen borrosa, repite",
                confidence=0.0,
            )

        first = image_bytes[0:1]
        if first == b"A":
            return MockValidationResult(
                ok=True,
                feedback="Foto aceptada",
                confidence=0.95,
            )
        if first == b"R":
            return MockValidationResult(
                ok=False,
                feedback="No se ve el sensor, acércate más",
                confidence=0.2,
            )
        return MockValidationResult(
            ok=False,
            feedback="Imagen borrosa, repite",
            confidence=0.1,
        )
