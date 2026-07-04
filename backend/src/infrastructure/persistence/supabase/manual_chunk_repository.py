"""Stub Supabase manual chunk repository — BE-05."""

from __future__ import annotations

from domain.entities.manual_chunk import ManualChunk


class SupabaseManualChunkRepository:
    """Stub — implementar al activar BE-08."""

    async def save_batch(self, chunks: list[ManualChunk]) -> None:
        raise NotImplementedError(
            "SupabaseManualChunkRepository.save_batch — implementar al activar BE-08"
        )

    async def delete_by_manual_id(self, manual_id: str) -> None:
        raise NotImplementedError(
            "SupabaseManualChunkRepository.delete_by_manual_id — implementar al activar BE-08"
        )

    async def count_by_manual_id(self, manual_id: str) -> int:
        raise NotImplementedError(
            "SupabaseManualChunkRepository.count_by_manual_id — implementar al activar BE-08"
        )

    async def hybrid_search(
        self,
        *,
        manual_id: str,
        question: str,
        query_embedding: tuple[float, ...],
        top_k: int,
    ) -> list[tuple[ManualChunk, float]]:
        raise NotImplementedError(
            "SupabaseManualChunkRepository.hybrid_search — implementar al activar BE-08"
        )
