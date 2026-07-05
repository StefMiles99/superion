"""Tests de rate limit middleware — BE-08."""

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"


@pytest.fixture
def app():
    return create_app(
        Settings(
            JWT_SECRET=TEST_SECRET,
            PASSWORD_BCRYPT_ROUNDS=4,
            RATE_LIMIT_ENABLED=True,
            RATE_LIMIT_PER_MIN=5,
            CLOCK_MODE="memory",
        ),
    )


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_returns_429_after_limit_exceeded(client: AsyncClient) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    statuses: list[int] = []
    for _ in range(7):
        response = await client.get("/v1/auth/me", headers=headers)
        statuses.append(response.status_code)

    assert statuses.count(200) == 5
    assert statuses.count(429) == 2

    last_429 = await client.get("/v1/auth/me", headers=headers)
    assert last_429.status_code == 429
    assert last_429.json()["error"]["code"] == "RATE_LIMITED"
