"""Entidad ManualChunk — BE-05."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ManualChunk:
    """Fragmento indexado de un manual con embedding."""

    id: str
    manual_id: str
    page: int
    section_path: str
    content: str
    embedding: tuple[float, ...]
    token_count: int

    def __post_init__(self) -> None:
        if self.page < 1:
            raise ValueError("page debe ser >= 1")
        if self.token_count < 0:
            raise ValueError("token_count debe ser >= 0")
        if not self.content:
            raise ValueError("content no puede estar vacío")
