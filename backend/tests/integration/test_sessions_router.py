"""Tests de router sessions — BE-02."""

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"


@pytest.fixture
def app():
    settings = Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        CLOCK_MODE="memory",
    )
    return create_app(settings)


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _auth_headers(client: AsyncClient) -> dict[str, str]:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_get_session_returns_200(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    start = await client.post("/v1/work-orders/wo-003/start", headers=headers)
    session_id = start.json()["session_id"]

    response = await client.get(f"/v1/sessions/{session_id}", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == session_id
    assert body["status"] == "active"
    assert body["current_step_index"] == 0
    assert body["metrics"]["photos_count"] == 0


async def test_get_session_not_found_returns_404(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    response = await client.get("/v1/sessions/nonexistent-session", headers=headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SESSION_NOT_FOUND"
