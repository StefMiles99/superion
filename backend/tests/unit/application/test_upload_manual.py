"""Tests UploadManualUseCase — BE-05."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from application.use_cases.manuals.index import IndexManualUseCase
from application.use_cases.manuals.upload import UploadManualUseCase, validate_pdf_bytes
from domain.entities.manual import Manual
from domain.entities.user import User
from domain.exceptions import NotFoundError, ValidationError
from domain.value_objects.manual_status import IndexStatus, ManualStatus
from domain.value_objects.role import Role
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.persistence.in_memory.manual_chunk_repository import (
    InMemoryManualChunkRepository,
)
from infrastructure.persistence.in_memory.manual_repository import InMemoryManualRepository
from infrastructure.services.chunker import HierarchicalChunker
from infrastructure.services.embedding_service import MockEmbeddingService
from infrastructure.services.pdf_extractor import MockPdfExtractor
from infrastructure.storage.in_memory import InMemoryObjectStorage


def dummy_pdf(*pages: str) -> bytes:
    return b"%PDF-1.4\n" + "\f".join(pages).encode("latin-1")


@pytest.fixture
def manuals_repo() -> InMemoryManualRepository:
    return InMemoryManualRepository()


@pytest.fixture
def storage() -> InMemoryObjectStorage:
    return InMemoryObjectStorage(base_url="http://test")


@pytest.fixture
def index_use_case(
    manuals_repo: InMemoryManualRepository,
    storage: InMemoryObjectStorage,
) -> IndexManualUseCase:
    return IndexManualUseCase(
        manuals=manuals_repo,
        chunks=InMemoryManualChunkRepository(),
        storage=storage,
        pdf_extractor=MockPdfExtractor(),
        chunker=HierarchicalChunker(chunk_size=512, overlap=64),
        embeddings=MockEmbeddingService(dimensions=384),
        index_delay_ms=0,
    )


@pytest.fixture
def upload_use_case(
    manuals_repo: InMemoryManualRepository,
    storage: InMemoryObjectStorage,
    index_use_case: IndexManualUseCase,
) -> UploadManualUseCase:
    return UploadManualUseCase(
        manuals=manuals_repo,
        storage=storage,
        clock=InMemoryClock.shared(),
        index_manual=index_use_case,
        max_size_bytes=50 * 1024 * 1024,
        estimated_seconds=90,
    )


@pytest.fixture
def admin_user() -> User:
    return User(
        id="admin-1",
        email="admin@planta.com",
        password_hash="x",
        full_name="Admin RAG",
        role=Role.RAG_ADMIN,
        plant_id="plant-1",
    )


async def test_upload_happy_path(
    upload_use_case: UploadManualUseCase,
    admin_user: User,
) -> None:
    pdf = dummy_pdf("Pagina 1: torque 85 Nm", "Pagina 2: valvula V-12")
    result = await upload_use_case.execute(
        title="Atlas Copco GA-37",
        asset_model="Atlas Copco GA-37",
        file_bytes=pdf,
        content_type="application/pdf",
        replaces_manual_id=None,
        current_user=admin_user,
    )
    assert result.index_status == "pending"
    assert result.estimated_seconds == 90


def test_invalid_pdf_raises() -> None:
    with pytest.raises(ValidationError) as exc:
        validate_pdf_bytes(b"not-a-pdf")
    assert exc.value.code == "MANUAL_INVALID_PDF"


async def test_replaces_manual_id_archives_previous(
    upload_use_case: UploadManualUseCase,
    manuals_repo: InMemoryManualRepository,
    admin_user: User,
) -> None:
    previous_id = str(uuid4())
    previous = Manual(
        id=previous_id,
        title="Old",
        asset_model="Atlas Copco GA-37",
        version=1,
        status=ManualStatus.ACTIVE,
        index_status=IndexStatus.INDEXED,
        storage_path="plant-1/old/1.pdf",
        chunk_count=1,
        uploaded_at=datetime(2026, 1, 1, tzinfo=UTC),
        uploaded_by_id="admin-1",
        plant_id="plant-1",
    )
    await manuals_repo.save(previous)

    pdf = dummy_pdf("Pagina 1: nuevo contenido")
    await upload_use_case.execute(
        title="Nuevo manual",
        asset_model="Atlas Copco GA-37",
        file_bytes=pdf,
        content_type="application/pdf",
        replaces_manual_id=previous_id,
        current_user=admin_user,
    )

    archived = await manuals_repo.get_by_id(previous_id)
    assert archived is not None
    assert archived.status == ManualStatus.ARCHIVED


async def test_replaces_unknown_manual_raises(
    upload_use_case: UploadManualUseCase,
    admin_user: User,
) -> None:
    pdf = dummy_pdf("Pagina 1")
    with pytest.raises(NotFoundError) as exc:
        await upload_use_case.execute(
            title="T",
            asset_model="Atlas Copco GA-37",
            file_bytes=pdf,
            content_type="application/pdf",
            replaces_manual_id=str(uuid4()),
            current_user=admin_user,
        )
    assert exc.value.code == "MANUAL_NOT_FOUND"
