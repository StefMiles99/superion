"""Use case IndexManual — BE-05."""

from __future__ import annotations

import asyncio
from uuid import uuid4

from domain.entities.manual_chunk import ManualChunk
from domain.exceptions import NotFoundError
from domain.ports.repositories import IManualChunkRepository, IManualRepository
from domain.ports.services import IChunkerService, IEmbeddingService, IPdfExtractor
from domain.ports.storage import IObjectStorage


class IndexManualUseCase:
    """Extrae, chunkea, embeddea e indexa un manual async."""

    def __init__(
        self,
        *,
        manuals: IManualRepository,
        chunks: IManualChunkRepository,
        storage: IObjectStorage,
        pdf_extractor: IPdfExtractor,
        chunker: IChunkerService,
        embeddings: IEmbeddingService,
        index_delay_ms: int = 50,
    ) -> None:
        self._manuals = manuals
        self._chunks = chunks
        self._storage = storage
        self._pdf_extractor = pdf_extractor
        self._chunker = chunker
        self._embeddings = embeddings
        self._index_delay_ms = index_delay_ms

    async def execute(self, *, manual_id: str) -> None:
        manual = await self._manuals.get_by_id(manual_id)
        if manual is None:
            raise NotFoundError(
                code="MANUAL_NOT_FOUND",
                message="Manual no encontrado.",
                details={"id": manual_id},
            )

        try:
            await asyncio.sleep(self._index_delay_ms / 1000)
            pdf_bytes = await self._storage.get(manual.storage_path)
            if pdf_bytes is None:
                raise ValueError("PDF no encontrado en storage")

            await self._chunks.delete_by_manual_id(manual_id)
            pages = self._pdf_extractor.extract_pages(pdf_bytes)
            text_chunks = self._chunker.chunk_pages(pages)
            texts = [chunk.content for chunk in text_chunks]
            vectors = self._embeddings.embed_batch(texts)

            manual_chunks: list[ManualChunk] = []
            for text_chunk, vector in zip(text_chunks, vectors, strict=True):
                manual_chunks.append(
                    ManualChunk(
                        id=str(uuid4()),
                        manual_id=manual_id,
                        page=text_chunk.page,
                        section_path=text_chunk.section_path,
                        content=text_chunk.content,
                        embedding=vector,
                        token_count=len(text_chunk.content.split()),
                    )
                )

            if manual_chunks:
                await self._chunks.save_batch(manual_chunks)

            updated = manual.mark_indexed(chunk_count=len(manual_chunks))
            await self._manuals.save(updated)
        except Exception:
            failed = manual.mark_index_failed()
            await self._manuals.save(failed)
            raise

    def schedule(self, *, manual_id: str) -> None:
        """Dispara indexación en background."""
        asyncio.create_task(self.execute(manual_id=manual_id))
