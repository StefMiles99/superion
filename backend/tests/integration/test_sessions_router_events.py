"""Tests router sessions events — BE-03."""

from uuid import uuid4

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


async def _start_session(client: AsyncClient, headers: dict[str, str]) -> str:
    start = await client.post("/v1/work-orders/wo-003/start", headers=headers)
    return start.json()["session_id"]


async def test_post_measurement_event_returns_202(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    session_id = await _start_session(client, headers)

    response = await client.post(
        f"/v1/sessions/{session_id}/events",
        json={
            "event_id": str(uuid4()),
            "type": "measurement",
            "step_index": 0,
            "payload": {"name": "presion", "value": 85.2, "unit": "psi"},
        },
        headers=headers,
    )
    assert response.status_code == 202
    assert response.json()["seq"] == 1


async def test_post_pause_via_command(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    session_id = await _start_session(client, headers)

    response = await client.post(
        f"/v1/sessions/{session_id}/events",
        json={
            "event_id": str(uuid4()),
            "type": "command",
            "step_index": 0,
            "payload": {"command": "pause"},
        },
        headers=headers,
    )
    assert response.status_code == 202

    session = await client.get(f"/v1/sessions/{session_id}", headers=headers)
    assert session.json()["status"] == "paused"


async def test_pause_endpoint_returns_204(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    session_id = await _start_session(client, headers)

    response = await client.post(f"/v1/sessions/{session_id}/pause", headers=headers)
    assert response.status_code == 204


async def test_resume_endpoint_returns_204(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    session_id = await _start_session(client, headers)
    await client.post(f"/v1/sessions/{session_id}/pause", headers=headers)

    response = await client.post(f"/v1/sessions/{session_id}/resume", headers=headers)
    assert response.status_code == 204


async def test_get_events_since_seq(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    session_id = await _start_session(client, headers)
    eid = str(uuid4())
    await client.post(
        f"/v1/sessions/{session_id}/events",
        json={
            "event_id": eid,
            "type": "measurement",
            "step_index": 0,
            "payload": {"name": "presion", "value": 85.2, "unit": "psi"},
        },
        headers=headers,
    )

    response = await client.get(
        f"/v1/sessions/{session_id}/events?since_seq=0",
        headers=headers,
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["seq"] == 1


async def test_idempotency_duplicate_event_id(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    session_id = await _start_session(client, headers)
    eid = str(uuid4())

    r1 = await client.post(
        f"/v1/sessions/{session_id}/events",
        json={
            "event_id": eid,
            "type": "measurement",
            "step_index": 0,
            "payload": {"name": "presion", "value": 85.2, "unit": "psi"},
        },
        headers=headers,
    )
    r2 = await client.post(
        f"/v1/sessions/{session_id}/events",
        json={
            "event_id": eid,
            "type": "measurement",
            "step_index": 0,
            "payload": {"name": "presion", "value": 99.0, "unit": "psi"},
        },
        headers=headers,
    )
    assert r1.json()["seq"] == r2.json()["seq"]

    events = await client.get(
        f"/v1/sessions/{session_id}/events?since_seq=0",
        headers=headers,
    )
    assert len(events.json()["items"]) == 1
