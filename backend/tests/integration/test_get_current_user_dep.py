"""Tests de dependency get_current_user — BE-01."""

from datetime import UTC, datetime

import pytest
from fastapi import Depends
from httpx import ASGITransport, AsyncClient

from domain.entities.user import User
from domain.value_objects.role import Role
from infrastructure.config import Settings
from infrastructure.persistence.in_memory.clock import InMemoryClock
from interface.http.deps.auth import get_current_user, require_role
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
        CLOCK_MODE="memory",
    )


@pytest.fixture
def app(auth_settings: Settings):
    base = create_app(auth_settings)

    @base.get("/test/protected")
    async def protected(user: User = Depends(get_current_user)) -> dict[str, str]:
        return {"user_id": user.id}

    @base.get("/test/supervisor-only")
    async def supervisor_only(
        user: User = Depends(require_role(Role.SUPERVISOR)),
    ) -> dict[str, str]:
        return {"user_id": user.id}

    return base


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_get_current_user_extracts_user_from_valid_jwt(client: AsyncClient) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    token = login.json()["access_token"]
    response = await client.get(
        "/test/protected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["user_id"] == "tech-1"


async def test_get_current_user_rejects_missing_token(client: AsyncClient) -> None:
    response = await client.get("/test/protected")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


async def test_get_current_user_rejects_expired_token(auth_settings: Settings) -> None:
    clock = InMemoryClock.shared()
    clock.reset()
    app = create_app(auth_settings)

    @app.get("/test/protected")
    async def protected(user: User = Depends(get_current_user)) -> dict[str, str]:
        return {"user_id": user.id}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/v1/auth/login",
            json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
        )
        token = login.json()["access_token"]
        clock.set(datetime(2025, 2, 1, tzinfo=UTC))
        response = await client.get(
            "/test/protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "TOKEN_EXPIRED"


async def test_require_role_rejects_wrong_role(client: AsyncClient) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    token = login.json()["access_token"]
    response = await client.get(
        "/test/supervisor-only",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
