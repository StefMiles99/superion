"""Tests de actualización live del reporte — BE-07."""

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


async def _auth_headers(client: AsyncClient) -> dict[str, str]:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_post_event_updates_report_json(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    start = await client.post("/v1/work-orders/wo-003/start", headers=headers)
    session_id = start.json()["session_id"]

    before = await client.get(f"/v1/sessions/{session_id}/report", headers=headers)
    version_before = before.json()["version"]

    event = await client.post(
        f"/v1/sessions/{session_id}/events",
        headers=headers,
        json={
            "event_id": str(uuid4()),
            "type": "finding",
            "step_index": 0,
            "payload": {"text": "Hallazgo de prueba", "severity": "med"},
        },
    )
    assert event.status_code == 202

    after = await client.get(f"/v1/sessions/{session_id}/report", headers=headers)
    body = after.json()
    assert body["version"] > version_before
    assert len(body["content"]["findings"]) == 1
    assert body["content"]["findings"][0]["text"] == "Hallazgo de prueba"
