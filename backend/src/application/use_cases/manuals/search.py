"""Use case SearchManual — BE-05 debug."""

from __future__ import annotations

from application.dto.manual import SearchChunkItemDto, SearchManualOutput
from domain.exceptions import NotFoundError
from domain.ports.repositories import IManualChunkRepository, IManualRepository
from domain.ports.services import IEmbeddingService


class SearchManualUseCase:
    """Búsqueda híbrida debug sobre un manual."""

    def __init__(
        self,
        *,
        manuals: IManualRepository,
        chunks: IManualChunkRepository,
        embeddings: IEmbeddingService,
        top_k: int,
    ) -> None:
        self._manuals = manuals
        self._chunks = chunks
        self._embeddings = embeddings
        self._top_k = top_k

    async def execute(self, *, manual_id: str, query: str) -> SearchManualOutput:
        manual = await self._manuals.get_by_id(manual_id)
        if manual is None:
            raise NotFoundError(
                code="MANUAL_NOT_FOUND",
                message="Manual no encontrado.",
                details={"id": manual_id},
            )

        query_embedding = self._embeddings.embed(query)
        results = await self._chunks.hybrid_search(
            manual_id=manual_id,
            question=query,
            query_embedding=query_embedding,
            top_k=self._top_k,
        )
        items = [
            SearchChunkItemDto(
                chunk_id=chunk.id,
                page=chunk.page,
                section_path=chunk.section_path,
                content=chunk.content,
                score=round(score, 4),
            )
            for chunk, score in results
        ]
        return SearchManualOutput(items=items)
