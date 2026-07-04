"""E2E WebSocket — BE-03."""

import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"


def _receive_json_skip_control(ws, *, max_messages: int = 5) -> dict:
    for _ in range(max_messages):
        msg = json.loads(ws.receive_text())
        if msg.get("type") not in ("ping", "pong"):
            return msg
        if msg.get("type") == "ping":
            ws.send_json({"type": "pong"})
    raise AssertionError("No se recibió evento de negocio en WebSocket")


@pytest.fixture
def settings() -> Settings:
    return Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        CLOCK_MODE="memory",
        WS_HEARTBEAT_INTERVAL=3600,
        WS_PONG_TIMEOUT=7200,
    )


@pytest.fixture
def app(settings: Settings):
    return create_app(settings)


@pytest.fixture
async def http_client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def test_websocket_full_flow(app, settings: Settings) -> None:
    """login → start session → WS → post event → broadcast → reconnect catch-up."""
    sync_client = TestClient(app)

    login = sync_client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    start = sync_client.post("/v1/work-orders/wo-003/start", headers=headers)
    session_id = start.json()["session_id"]

    with sync_client.websocket_connect(
        f"/v1/ws/sessions/{session_id}?token={token}&last_seq=0"
    ) as ws:
        ws.send_json({"type": "subscribe", "channels": [f"session:{session_id}"], "last_seq": 0})

        sync_client.post(
            f"/v1/sessions/{session_id}/events",
            json={
                "event_id": str(uuid4()),
                "type": "command",
                "step_index": 0,
                "payload": {"command": "pause"},
            },
            headers=headers,
        )

        msg = _receive_json_skip_control(ws)
        assert msg["type"] == "session.paused"
        assert msg["seq"] == 1

    with sync_client.websocket_connect(
        f"/v1/ws/sessions/{session_id}?token={token}&last_seq=0"
    ) as ws2:
        ws2.send_json({"type": "subscribe", "last_seq": 0})
        replay = _receive_json_skip_control(ws2)
        assert replay["type"] in ("replay.batch", "session.paused")

        sync_client.post(
            f"/v1/sessions/{session_id}/events",
            json={
                "event_id": str(uuid4()),
                "type": "measurement",
                "step_index": 0,
                "payload": {"name": "presion", "value": 85.2, "unit": "psi"},
            },
            headers=headers,
        )

        evt2 = _receive_json_skip_control(ws2)
        assert evt2["type"] == "event.appended"
        assert evt2["payload"]["type"] == "measurement"
