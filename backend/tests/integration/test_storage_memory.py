"""Tests storage in-memory — BE-04."""

import pytest

from infrastructure.storage.in_memory import InMemoryObjectStorage


@pytest.fixture
async def storage() -> InMemoryObjectStorage:
    instance = InMemoryObjectStorage.shared(base_url="http://test")
    await instance.reset()
    return instance


async def test_put_and_get_roundtrip(storage: InMemoryObjectStorage) -> None:
    await storage.put("sess-1/photo.jpg", b"Abytes", content_type="image/jpeg")
    data = await storage.get("sess-1/photo.jpg")
    assert data == b"Abytes"


async def test_signed_url_and_validation(storage: InMemoryObjectStorage) -> None:
    await storage.put("key.jpg", b"Adata", content_type="image/jpeg")
    url = await storage.get_signed_url("key.jpg", ttl_seconds=900)
    assert url.startswith("http://test/v1/mock-storage/")
    assert "expires=" in url
    expires = int(url.split("expires=")[1])
    assert await storage.is_url_valid("key.jpg", expires) is True
    assert await storage.is_url_valid("key.jpg", expires + 999999) is False
