"""Tests de router auth — BE-01."""

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"


@pytest.fixture
def auth_settings() -> Settings:
    return Settings(
        JWT_SECRET=TEST_SECRET,
        JWT_ALGORITHM="HS256",
        ACCESS_TOKEN_TTL_SECONDS=3600,
        REFRESH_TOKEN_TTL_SECONDS=2592000,
        PASSWORD_BCRYPT_ROUNDS=4,
    )


@pytest.fixture
def app(auth_settings: Settings):
    return create_app(auth_settings)


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_login_returns_200_with_tokens(client: AsyncClient) -> None:
    response = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["expires_in"] == 3600
    assert body["user"]["role"] == "technician"
    assert body["user"]["plant_id"] == "plant-1"


async def test_login_invalid_credentials_returns_401(client: AsyncClient) -> None:
    response = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": "WRONG"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


async def test_me_without_token_returns_401(client: AsyncClient) -> None:
    response = await client.get("/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


async def test_me_with_valid_token_returns_200(client: AsyncClient) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    token = login.json()["access_token"]
    response = await client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "juan@planta.com"
    assert body["role"] == "technician"


async def test_refresh_returns_new_access_token(client: AsyncClient) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    refresh_token = login.json()["refresh_token"]
    response = await client.post("/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert "access_token" in response.json()


async def test_logout_returns_204(client: AsyncClient) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    body = login.json()
    response = await client.post(
        "/v1/auth/logout",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert response.status_code == 204


async def test_refresh_after_logout_returns_401(client: AsyncClient) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    body = login.json()
    await client.post(
        "/v1/auth/logout",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    response = await client.post(
        "/v1/auth/refresh",
        json={"refresh_token": body["refresh_token"]},
    )
    assert response.status_code == 401
