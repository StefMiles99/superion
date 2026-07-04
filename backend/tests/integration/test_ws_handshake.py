"""Tests WS handshake — BE-03."""

import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from infrastructure.config import Settings
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"


def _receive_json_skip_control(ws, *, max_messages: int = 5) -> dict:
    """Recibe mensajes WS ignorando ping hasta obtener evento de negocio."""
    for _ in range(max_messages):
        msg = json.loads(ws.receive_text())
        if msg.get("type") not in ("ping", "pong"):
            return msg
        if msg.get("type") == "ping":
            ws.send_json({"type": "pong"})
    raise AssertionError("No se recibió evento de negocio en WebSocket")


@pytest.fixture
def client() -> TestClient:
    settings = Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        CLOCK_MODE="memory",
        WS_HEARTBEAT_INTERVAL=3600,
        WS_PONG_TIMEOUT=7200,
    )
    return TestClient(create_app(settings))


def _login_token(client: TestClient) -> str:
    response = client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    return response.json()["access_token"]


def _start_session(client: TestClient, token: str) -> str:
    response = client.post(
        "/v1/work-orders/wo-003/start",
        headers={"Authorization": f"Bearer {token}"},
    )
    return response.json()["session_id"]


def test_ws_auth_ok_and_receives_event(client: TestClient) -> None:
    token = _login_token(client)
    session_id = _start_session(client, token)

    with client.websocket_connect(
        f"/v1/ws/sessions/{session_id}?token={token}&last_seq=0"
    ) as ws:
        ws.send_json({"type": "subscribe", "channels": [f"session:{session_id}"], "last_seq": 0})

        client.post(
            f"/v1/sessions/{session_id}/events",
            json={
                "event_id": str(uuid4()),
                "type": "command",
                "step_index": 0,
                "payload": {"command": "pause"},
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        msg = _receive_json_skip_control(ws)
        assert msg["type"] == "session.paused"
        assert msg["seq"] == 1


def test_ws_replay_after_reconnect(client: TestClient) -> None:
    token = _login_token(client)
    session_id = _start_session(client, token)

    client.post(
        f"/v1/sessions/{session_id}/events",
        json={
            "event_id": str(uuid4()),
            "type": "command",
            "step_index": 0,
            "payload": {"command": "pause"},
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    with client.websocket_connect(
        f"/v1/ws/sessions/{session_id}?token={token}&last_seq=0"
    ) as ws:
        ws.send_json({"type": "subscribe", "last_seq": 0})
        replay = _receive_json_skip_control(ws)
        assert replay["type"] in ("replay.batch", "session.paused")


def test_ws_rejects_invalid_token(client: TestClient) -> None:
    token = _login_token(client)
    session_id = _start_session(client, token)

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(
            f"/v1/ws/sessions/{session_id}?token=invalid&last_seq=0"
        ) as ws:
            ws.send_json({"type": "subscribe", "last_seq": 0})


def test_ws_client_ping_gets_pong(client: TestClient) -> None:
    token = _login_token(client)
    session_id = _start_session(client, token)

    with client.websocket_connect(
        f"/v1/ws/sessions/{session_id}?token={token}&last_seq=0"
    ) as ws:
        ws.send_json({"type": "subscribe", "last_seq": 0})
        ws.send_json({"type": "ping"})
        msg = json.loads(ws.receive_text())
        while msg.get("type") != "pong":
            msg = json.loads(ws.receive_text())
        assert msg["type"] == "pong"
