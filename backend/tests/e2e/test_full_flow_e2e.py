"""E2E flujo completo con audit — BE-08."""

import asyncio
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from infrastructure.factories import ensure_build_live_started
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"


@pytest.fixture
def app():
    settings = Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        CLOCK_MODE="memory",
        RATE_LIMIT_ENABLED=False,
        API_BASE_URL="http://test",
    )
    application = create_app(settings)
    asyncio.run(ensure_build_live_started())
    return application


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _complete_all_steps(
    client: AsyncClient,
    headers: dict[str, str],
    session_id: str,
    *,
    photo_required: list[int],
) -> None:
    for _ in range(12):
        session_resp = await client.get(f"/v1/sessions/{session_id}", headers=headers)
        current = session_resp.json()["current_step_index"]

        if current in photo_required:
            photo = await client.post(
                f"/v1/sessions/{session_id}/photos",
                headers=headers,
                data={
                    "step_index": str(current),
                    "event_id": str(uuid4()),
                    "criteria": "sensor visible",
                },
                files={"file": ("ok.jpg", b"Aok-image", "image/jpeg")},
            )
            assert photo.status_code == 202
            await asyncio.sleep(0.15)

        resp = await client.post(
            f"/v1/sessions/{session_id}/events",
            headers=headers,
            json={
                "event_id": str(uuid4()),
                "type": "step_advance",
                "step_index": current,
                "payload": {"completed_by": "command"},
            },
        )
        assert resp.status_code == 202, resp.text


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
    photo_required = start.json()["procedure_template"]["photo_required_step_indices"]

    await _complete_all_steps(
        client,
        headers,
        session_id,
        photo_required=photo_required,
    )

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