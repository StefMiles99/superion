"""Embedding mock determinista — BE-05."""

from __future__ import annotations

import hashlib
import math


class MockEmbeddingService:
    """Vector 384-dim normalizado derivado de SHA-384 del texto."""

    def __init__(self, *, dimensions: int = 384) -> None:
        self._dimensions = dimensions

    @property
    def dimensions(self) -> int:
        return self._dimensions

    def embed(self, text: str) -> tuple[float, ...]:
        return self._vector_for(text)

    def embed_batch(self, texts: list[str]) -> list[tuple[float, ...]]:
        return [self._vector_for(text) for text in texts]

    def _vector_for(self, text: str) -> tuple[float, ...]:
        digest = hashlib.sha384(text.encode()).digest()
        raw = [digest[index % len(digest)] / 255.0 for index in range(self._dimensions)]
        norm = math.sqrt(sum(value * value for value in raw))
        if norm == 0:
            return tuple(raw)
        return tuple(value / norm for value in raw)
