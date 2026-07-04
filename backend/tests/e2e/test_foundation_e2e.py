"""E2E foundation — health, ready, error envelope — BE-00."""

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


async def test_health_endpoint_returns_200_with_shape(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0", "deps": {}}


async def test_ready_endpoint_returns_200(client: AsyncClient) -> None:
    response = await client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


async def test_unknown_route_returns_404_envelope(client: AsyncClient) -> None:
    response = await client.get("/v1/does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert "error" in body
    assert body["error"]["code"] == "NOT_FOUND"
    assert "message" in body["error"]
    assert "trace_id" in body["error"]


async def test_correlation_id_in_error_envelope(client: AsyncClient) -> None:
    response = await client.get(
        "/v1/does-not-exist",
        headers={"X-Correlation-Id": "trace-e2e-1"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["trace_id"] == "trace-e2e-1"
