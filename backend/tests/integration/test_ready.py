"""Tests de readiness — BE-08."""

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app


@pytest.fixture
async def client_memory():
    app = create_app(Settings())
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def client_missing_supabase():
    app = create_app(Settings(AUTH="supabase_auth", SUPABASE_URL=""))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_ready_200_when_memory_mode(client_memory: AsyncClient) -> None:
    response = await client_memory.get("/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"


async def test_ready_503_when_supabase_auth_without_url(
    client_missing_supabase: AsyncClient,
) -> None:
    response = await client_missing_supabase.get("/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "not_ready"
    assert "auth" in body["checks"]


@pytest.fixture
async def client_missing_database_url():
    app = create_app(Settings(PERSISTENCE="supabase", DATABASE_URL=""))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_ready_503_when_supabase_persistence_without_database_url(
    client_missing_database_url: AsyncClient,
) -> None:
    response = await client_missing_database_url.get("/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "not_ready"
    assert body["checks"]["persistence"] == "missing DATABASE_URL"
