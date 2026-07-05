"""Adapter Supabase ManualChunkRepository — BE-05."""

from __future__ import annotations

from domain.entities.manual_chunk import ManualChunk
from infrastructure.persistence.chunk_hybrid_search import hybrid_search_chunks
from infrastructure.persistence.supabase.base import SupabaseRepository
from infrastructure.persistence.supabase.mappers import chunk_from_row


class SupabaseManualChunkRepository(SupabaseRepository):
    async def save_batch(self, chunks: list[ManualChunk]) -> None:
        if not chunks:
            return
        pool = await self._pool()
        async with pool.acquire() as conn:
            await conn.executemany(
                """
                INSERT INTO manual_chunk (
                    id, manual_id, page, section_path, content, embedding, token_count
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    content = EXCLUDED.content,
                    embedding = EXCLUDED.embedding,
                    token_count = EXCLUDED.token_count
                """,
                [
                    (
                        chunk.id,
                        chunk.manual_id,
                        chunk.page,
                        chunk.section_path,
                        chunk.content,
                        list(chunk.embedding),
                        chunk.token_count,
                    )
                    for chunk in chunks
                ],
            )

    async def delete_by_manual_id(self, manual_id: str) -> None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM manual_chunk WHERE manual_id = $1", manual_id)

    async def count_by_manual_id(self, manual_id: str) -> int:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT COUNT(*) AS cnt FROM manual_chunk WHERE manual_id = $1",
                manual_id,
            )
            assert row is not None
            return int(row["cnt"])

    async def hybrid_search(
        self,
        *,
        manual_id: str,
        question: str,
        query_embedding: tuple[float, ...],
        top_k: int,
    ) -> list[tuple[ManualChunk, float]]:
        pool = await self._pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM manual_chunk WHERE manual_id = $1",
                manual_id,
            )
        chunks = [chunk_from_row(row) for row in rows]
        return hybrid_search_chunks(
            chunks,
            question=question,
            query_embedding=query_embedding,
            top_k=top_k,
        )
