"""Reranker mock — BE-05."""

from __future__ import annotations


class MockReranker:
    """Devuelve candidatos en el mismo orden (no-op)."""

    def rerank(
        self,
        _question: str,
        candidates: list[tuple[object, float]],
    ) -> list[tuple[object, float]]:
        return list(candidates)
