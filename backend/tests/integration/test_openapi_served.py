"""Tests de OpenAPI servido — BE-08."""

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app

EXPECTED_PATHS = {
    "/v1/auth/login",
    "/v1/work-orders",
    "/v1/sessions/{session_id}",
    "/v1/manuals",
    "/health",
    "/ready",
    "/metrics",
    "/v1/audit",
}


@pytest.fixture
def app():
    return create_app(Settings())


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_openapi_json_returns_200(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    body = response.json()
    assert "paths" in body
    assert "openapi" in body


async def test_openapi_contains_core_routes(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")
    paths = set(response.json()["paths"].keys())

    for expected in EXPECTED_PATHS:
        assert expected in paths, f"Missing path: {expected}"
