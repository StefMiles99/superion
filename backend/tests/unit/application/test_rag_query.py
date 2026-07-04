"""Tests RagQueryUseCase — BE-05."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from application.use_cases.rag.query import RagQueryUseCase
from domain.entities.manual import Manual
from domain.entities.manual_chunk import ManualChunk
from domain.value_objects.manual_status import IndexStatus, ManualStatus
from infrastructure.persistence.in_memory.asset_repository import InMemoryAssetRepository
from infrastructure.persistence.in_memory.manual_chunk_repository import (
    InMemoryManualChunkRepository,
)
from infrastructure.persistence.in_memory.manual_repository import InMemoryManualRepository
from infrastructure.services.embedding_service import MockEmbeddingService
from infrastructure.services.reranker import MockReranker


@pytest.fixture
def manuals_repo() -> InMemoryManualRepository:
    return InMemoryManualRepository()


@pytest.fixture
def chunks_repo() -> InMemoryManualChunkRepository:
    return InMemoryManualChunkRepository()


@pytest.fixture
def use_case(
    manuals_repo: InMemoryManualRepository,
    chunks_repo: InMemoryManualChunkRepository,
) -> RagQueryUseCase:
    return RagQueryUseCase(
        manuals=manuals_repo,
        chunks=chunks_repo,
        assets=InMemoryAssetRepository.with_fixtures(),
        embeddings=MockEmbeddingService(dimensions=384),
        reranker=MockReranker(),
        top_k=8,
        top_n=3,
        abstain_threshold=0.3,
    )


async def _seed_manual_with_chunks(
    manuals_repo: InMemoryManualRepository,
    chunks_repo: InMemoryManualChunkRepository,
    *,
    content: str,
) -> Manual:
    manual = Manual(
        id=str(uuid4()),
        title="Manual test",
        asset_model="Atlas Copco GA-37",
        version=1,
        status=ManualStatus.ACTIVE,
        index_status=IndexStatus.INDEXED,
        storage_path="plant-1/manual/1.pdf",
        chunk_count=1,
        uploaded_at=datetime(2026, 1, 1, tzinfo=UTC),
        uploaded_by_id="admin-1",
        plant_id="plant-1",
    )
    await manuals_repo.save(manual)
    embeddings = MockEmbeddingService(dimensions=384)
    chunk = ManualChunk(
        id=str(uuid4()),
        manual_id=manual.id,
        page=1,
        section_path="page_1",
        content=content,
        embedding=embeddings.embed(content),
        token_count=5,
    )
    await chunks_repo.save_batch([chunk])
    return manual


async def test_rag_query_returns_citations_for_matching_content(
    use_case: RagQueryUseCase,
    manuals_repo: InMemoryManualRepository,
    chunks_repo: InMemoryManualChunkRepository,
) -> None:
    await _seed_manual_with_chunks(
        manuals_repo,
        chunks_repo,
        content="Pagina 1: torque 85 Nm",
    )
    result = await use_case.execute(
        question="¿cuál es el torque?",
        asset_model="Atlas Copco GA-37",
    )
    assert result.abstained is False
    assert result.citations
    assert result.citations[0].page == 1
    assert "torque" in result.answer.lower()


async def test_rag_query_abstains_when_no_relevant_chunks(
    use_case: RagQueryUseCase,
    manuals_repo: InMemoryManualRepository,
    chunks_repo: InMemoryManualChunkRepository,
) -> None:
    await _seed_manual_with_chunks(
        manuals_repo,
        chunks_repo,
        content="Información sobre lubricante del compresor",
    )
    result = await use_case.execute(
        question="xyznonexistentterm123",
        asset_model="Atlas Copco GA-37",
    )
    assert result.abstained is True
    assert result.citations == []
