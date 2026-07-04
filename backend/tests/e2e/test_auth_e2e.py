"""E2E auth — login → me → logout → 401 — BE-01."""

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
        JWT_ALGORITHM="HS256",
        ACCESS_TOKEN_TTL_SECONDS=3600,
        REFRESH_TOKEN_TTL_SECONDS=2592000,
        PASSWORD_BCRYPT_ROUNDS=4,
    )
    return create_app(settings)


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_auth_flow_login_me_logout_unauthorized(client: AsyncClient) -> None:
    login_response = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    assert login_response.status_code == 200
    tokens = login_response.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    me_response = await client.get(
        "/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_response.status_code == 200
    me_body = me_response.json()
    assert me_body["email"] == "juan@planta.com"
    assert me_body["full_name"] == "Juan Pérez"

    logout_response = await client.post(
        "/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert logout_response.status_code == 204

    me_after_logout = await client.get(
        "/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_after_logout.status_code == 401

    refresh_response = await client.post(
        "/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_response.status_code == 401
