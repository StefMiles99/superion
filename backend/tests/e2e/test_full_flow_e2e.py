"""E2E flujo completo con audit — BE-08."""

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"
PDF_BYTES = b"%PDF-1.4\nminimal test content for manual upload"


@pytest.fixture
def app():
    return create_app(
        Settings(
            JWT_SECRET=TEST_SECRET,
            PASSWORD_BCRYPT_ROUNDS=4,
            CLOCK_MODE="memory",
            RATE_LIMIT_ENABLED=False,
        ),
    )


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_full_flow_with_audit_entries(client: AsyncClient) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    work_orders = await client.get("/v1/work-orders?status=pending", headers=headers)
    assert work_orders.status_code == 200
    work_order_id = work_orders.json()["items"][0]["id"]

    start = await client.post(f"/v1/work-orders/{work_order_id}/start", headers=headers)
    assert start.status_code == 201
    session_id = start.json()["session_id"]

    photo = await client.post(
        f"/v1/sessions/{session_id}/photos",
        headers=headers,
        files={"file": ("photo.jpg", b"Aimagen-ok", "image/jpeg")},
        data={"step_index": "0", "event_id": "evt-photo-1", "criteria": "sensor"},
    )
    assert photo.status_code == 202

    finalize = await client.post(f"/v1/sessions/{session_id}/finalize", headers=headers)
    assert finalize.status_code == 200
    assert "report_id" in finalize.json()

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
    actions = {entry["action"] for entry in audit.json()["items"]}
    assert "login" in actions
    assert "start_session" in actions
    assert "finalize_session" in actions

    openapi = await client.get("/openapi.json")
    assert openapi.status_code == 200

    metrics = await client.get("/metrics")
    assert metrics.status_code == 200
    assert "# TYPE" in metrics.text

    ready = await client.get("/ready")
    assert ready.status_code == 200
