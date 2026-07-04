"""E2E photos — BE-04."""

import asyncio
import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"


def _receive_json_skip_control(ws, *, max_messages: int = 10) -> dict:
    for _ in range(max_messages):
        msg = json.loads(ws.receive_text())
        if msg.get("type") not in ("ping", "pong"):
            return msg
        if msg.get("type") == "ping":
            ws.send_json({"type": "pong"})
    raise AssertionError("No se recibió evento de negocio en WebSocket")


def _receive_until_type(ws, expected_type: str, *, max_messages: int = 10) -> dict:
    for _ in range(max_messages):
        msg = _receive_json_skip_control(ws)
        if msg.get("type") == expected_type:
            return msg
    raise AssertionError(f"No se recibió evento {expected_type}")


@pytest.fixture
def settings() -> Settings:
    return Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        CLOCK_MODE="memory",
        API_BASE_URL="http://test",
        WS_HEARTBEAT_INTERVAL=3600,
        WS_PONG_TIMEOUT=7200,
    )


@pytest.fixture
def app(settings: Settings):
    return create_app(settings)


def test_photos_e2e_accepted_then_step_advance(app, settings: Settings) -> None:
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

        upload = sync_client.post(
            f"/v1/sessions/{session_id}/photos",
            headers=headers,
            data={
                "step_index": "3",
                "event_id": str(uuid4()),
                "criteria": "Mostrar sensor",
            },
            files={"file": ("photo-ok.jpg", b"Acontenido-de-imagen", "image/jpeg")},
        )
        assert upload.status_code == 202

        captured = _receive_until_type(ws, "photo.captured")
        assert captured["payload"]["photo_id"] == upload.json()["photo_id"]

        validated = _receive_until_type(ws, "photo.validated")
        assert validated["payload"]["photo_id"] == upload.json()["photo_id"]

    advance = sync_client.post(
        f"/v1/sessions/{session_id}/events",
        headers=headers,
        json={
            "event_id": str(uuid4()),
            "type": "step_advance",
            "step_index": 3,
            "payload": {},
        },
    )
    assert advance.status_code == 202


@pytest.mark.asyncio
async def test_photos_e2e_rejected_emits_feedback(app) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/v1/auth/login",
            json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
        )
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        start = await client.post("/v1/work-orders/wo-003/start", headers=headers)
        session_id = start.json()["session_id"]

        from infrastructure.realtime.event_bus import InMemoryEventBus

        bus = InMemoryEventBus.shared()
        rejected_msgs: list[dict[str, object]] = []

        async def handler(message: dict[str, object]) -> None:
            if message.get("type") == "photo.rejected":
                rejected_msgs.append(message)

        await bus.subscribe(session_id, handler)

        response = await client.post(
            f"/v1/sessions/{session_id}/photos",
            headers=headers,
            data={"step_index": "3", "event_id": str(uuid4())},
            files={"file": ("bad.jpg", b"Rmal", "image/jpeg")},
        )
        assert response.status_code == 202
        await asyncio.sleep(0.15)

        assert len(rejected_msgs) == 1
        assert "No se ve el sensor" in str(rejected_msgs[0]["payload"]["feedback"])
