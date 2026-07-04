"""Tests de middleware de correlation ID — BE-00."""

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app


@pytest.fixture
def app():
    return create_app(Settings())


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_correlation_id_propagated_from_request(client: AsyncClient) -> None:
    response = await client.get("/health", headers={"X-Correlation-Id": "test-123"})
    assert response.status_code == 200
    assert response.headers.get("X-Correlation-Id") == "test-123"


async def test_correlation_id_generated_when_missing(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    correlation_id = response.headers.get("X-Correlation-Id")
    assert correlation_id is not None
    assert len(correlation_id) > 0
