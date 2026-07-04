"""Repositorio in-memory de chunks con BM25 + cosine — BE-05."""

from __future__ import annotations

import asyncio
import re

import numpy as np

from domain.entities.manual_chunk import ManualChunk


class InMemoryManualChunkRepository:
    """Chunks por manual_id con búsqueda híbrida simulada."""

    _instance: InMemoryManualChunkRepository | None = None

    def __init__(self) -> None:
        self._chunks: dict[str, list[ManualChunk]] = {}
        self._lock = asyncio.Lock()

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> InMemoryManualChunkRepository:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def save_batch(self, chunks: list[ManualChunk]) -> None:
        if not chunks:
            return
        manual_id = chunks[0].manual_id
        async with self._lock:
            existing = self._chunks.setdefault(manual_id, [])
            existing.extend(chunks)

    async def delete_by_manual_id(self, manual_id: str) -> None:
        async with self._lock:
            self._chunks.pop(manual_id, None)

    async def count_by_manual_id(self, manual_id: str) -> int:
        async with self._lock:
            return len(self._chunks.get(manual_id, []))

    async def hybrid_search(
        self,
        *,
        manual_id: str,
        question: str,
        query_embedding: tuple[float, ...],
        top_k: int,
    ) -> list[tuple[ManualChunk, float]]:
        async with self._lock:
            chunks = list(self._chunks.get(manual_id, []))
        if not chunks:
            return []

        query_vec = np.array(query_embedding, dtype=np.float64)
        query_terms = _tokenize(question)

        vector_scores: list[float] = []
        bm25_scores: list[float] = []
        for chunk in chunks:
            chunk_vec = np.array(chunk.embedding, dtype=np.float64)
            denom = np.linalg.norm(query_vec) * np.linalg.norm(chunk_vec)
            cosine = float(np.dot(query_vec, chunk_vec) / denom) if denom > 0 else 0.0
            vector_scores.append(max(cosine, 0.0))
            bm25_scores.append(_bm25_score(query_terms, chunk.content))

        norm_vector = _normalize(vector_scores)
        norm_bm25 = _normalize(bm25_scores)

        combined: list[tuple[ManualChunk, float]] = []
        for index, chunk in enumerate(chunks):
            score = 0.5 * norm_vector[index] + 0.5 * norm_bm25[index]
            combined.append((chunk, score))

        combined.sort(key=lambda item: item[1], reverse=True)
        return combined[:top_k]

    async def reset(self) -> None:
        async with self._lock:
            self._chunks.clear()


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _bm25_score(query_terms: list[str], content: str) -> float:
    if not query_terms:
        return 0.0
    tokens = _tokenize(content)
    if not tokens:
        return 0.0
    tf: dict[str, int] = {}
    for token in tokens:
        tf[token] = tf.get(token, 0) + 1
    return float(sum(tf.get(term, 0) for term in query_terms))


def _normalize(scores: list[float]) -> list[float]:
    if not scores:
        return []
    minimum = min(scores)
    maximum = max(scores)
    if maximum == minimum:
        return [1.0 if maximum > 0 else 0.0 for _ in scores]
    return [(score - minimum) / (maximum - minimum) for score in scores]
