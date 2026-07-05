"""Repositorio in-memory de chunks con BM25 + cosine — BE-05."""

from __future__ import annotations

import asyncio

from domain.entities.manual_chunk import ManualChunk
from infrastructure.persistence.chunk_hybrid_search import hybrid_search_chunks


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
        return hybrid_search_chunks(
            chunks,
            question=question,
            query_embedding=query_embedding,
            top_k=top_k,
        )

    async def reset(self) -> None:
        async with self._lock:
            self._chunks.clear()
