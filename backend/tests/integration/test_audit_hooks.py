"""Tests de audit hooks — BE-08."""

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
            RATE_LIMIT_ENABLED=False,
        ),
    )


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_login_emits_audit_entry(client: AsyncClient) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    assert login.status_code == 200
    admin_login = await client.post(
        "/v1/auth/login",
        json={"email": "admin@planta.com", "password": FIXTURE_PASSWORD},
    )
    admin_token = admin_login.json()["access_token"]

    audit = await client.get(
        "/v1/audit",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert audit.status_code == 200
    items = audit.json()["items"]
    login_entries = [i for i in items if i["action"] == "login"]
    assert len(login_entries) >= 1
    assert login_entries[0]["actor_user_id"] in {"tech-1", "admin-1"}
