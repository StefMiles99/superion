"""Tests MockEmbeddingService — BE-05."""

from infrastructure.services.embedding_service import MockEmbeddingService


def test_embedding_is_deterministic() -> None:
    service = MockEmbeddingService(dimensions=384)
    first = service.embed("torque 85 Nm")
    second = service.embed("torque 85 Nm")
    assert first == second
    assert len(first) == 384


def test_different_texts_produce_different_vectors() -> None:
    service = MockEmbeddingService(dimensions=384)
    assert service.embed("alpha") != service.embed("beta")
