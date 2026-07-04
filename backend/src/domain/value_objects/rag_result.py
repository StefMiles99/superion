"""Value object RagResult — BE-05."""

from __future__ import annotations

from dataclasses import dataclass

from domain.value_objects.citation import Citation


@dataclass(frozen=True, slots=True)
class RagResult:
    """Resultado de consulta RAG con citas obligatorias."""

    answer: str
    citations: tuple[Citation, ...]
    confidence: float
    abstained: bool

    def __post_init__(self) -> None:
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("confidence debe estar entre 0 y 1")
        if self.abstained and self.citations:
            raise ValueError("abstained no puede incluir citations")
        if not self.abstained and not self.answer:
            raise ValueError("answer requerido cuando no hay abstención")
