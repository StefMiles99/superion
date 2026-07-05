"""Tests SupabaseObjectStorage — mock HTTP."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from infrastructure.storage.supabase import SupabaseObjectStorage


@pytest.fixture
def storage() -> SupabaseObjectStorage:
    return SupabaseObjectStorage(
        supabase_url="https://example.supabase.co",
        service_role_key="service-key",
        bucket="superion",
    )


async def test_put_uploads_object(storage: SupabaseObjectStorage) -> None:
    mock_response = httpx.Response(200, request=httpx.Request("POST", "http://test"))
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    with patch("httpx.AsyncClient", return_value=mock_client):
        key = await storage.put("photos/s1/p1.jpg", b"data", content_type="image/jpeg")
    assert key == "photos/s1/p1.jpg"
    mock_client.post.assert_awaited_once()


async def test_get_returns_none_on_404(storage: SupabaseObjectStorage) -> None:
    mock_response = httpx.Response(404, request=httpx.Request("GET", "http://test"))
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    with patch("httpx.AsyncClient", return_value=mock_client):
        result = await storage.get("missing/key")
    assert result is None


async def test_get_signed_url_returns_absolute(storage: SupabaseObjectStorage) -> None:
    mock_response = httpx.Response(
        200,
        json={"signedURL": "/storage/v1/object/sign/superion/photos/x?token=abc"},
        request=httpx.Request("POST", "http://test"),
    )
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    with patch("httpx.AsyncClient", return_value=mock_client):
        url = await storage.get_signed_url("photos/x", ttl_seconds=600)
    assert url.startswith("https://example.supabase.co/storage/v1/")
