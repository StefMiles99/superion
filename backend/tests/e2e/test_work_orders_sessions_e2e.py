"""E2E work orders + sessions — BE-02."""

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


async def test_work_orders_sessions_flow(client: AsyncClient) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    list_response = await client.get("/v1/work-orders?status=pending", headers=headers)
    assert list_response.status_code == 200
    pending = list_response.json()["items"]
    assert len(pending) == 3

    work_order_id = pending[0]["id"]
    detail = await client.get(f"/v1/work-orders/{work_order_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["id"] == work_order_id

    start = await client.post(f"/v1/work-orders/{work_order_id}/start", headers=headers)
    assert start.status_code == 201
    start_body = start.json()
    assert len(start_body["procedure_template"]["steps"]) == 12
    session_id = start_body["session_id"]

    session = await client.get(f"/v1/sessions/{session_id}", headers=headers)
    assert session.status_code == 200
    session_body = session.json()
    assert session_body["status"] == "active"
    assert session_body["current_step_index"] == 0

    duplicate = await client.post(f"/v1/work-orders/{work_order_id}/start", headers=headers)
    assert duplicate.status_code == 201
    assert duplicate.json()["session_id"] == session_id

    foreign = await client.get("/v1/work-orders/wo-maria-1", headers=headers)
    assert foreign.status_code == 404
