"""Tests webhook ElevenLabs — BE-06."""

import hashlib
import hmac
import json

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from infrastructure.persistence.in_memory.clock import InMemoryClock
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"
WEBHOOK_SECRET = "test-webhook-secret"


def _sign_payload(payload: str, secret: str = WEBHOOK_SECRET) -> dict[str, str]:
    ts = str(int(InMemoryClock.shared().now().timestamp()))
    sig = hmac.new(
        secret.encode(),
        f"{ts}.{payload}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return {
        "Content-Type": "application/json",
        "X-ElevenLabs-Signature": f"t={ts},v1={sig}",
    }


@pytest.fixture
def app():
    settings = Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        CLOCK_MODE="memory",
        ELEVENLABS_WEBHOOK_SECRET=WEBHOOK_SECRET,
        WS_HEARTBEAT_INTERVAL=3600,
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
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def _start_session(client: AsyncClient, headers: dict[str, str]) -> str:
    start = await client.post("/v1/work-orders/wo-003/start", headers=headers)
    assert start.status_code == 201
    return start.json()["session_id"]


async def test_webhook_rejects_missing_signature(client: AsyncClient) -> None:
    auth = await _auth_headers(client)
    session_id = await _start_session(client, auth)

    response = await client.post(
        "/v1/elevenlabs/webhooks/conversation",
        headers={"Content-Type": "application/json"},
        content=json.dumps({"event": "conversation.started", "session_id": session_id}),
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_SIGNATURE"


async def test_webhook_accepts_signed_conversation_started(client: AsyncClient) -> None:
    auth = await _auth_headers(client)
    session_id = await _start_session(client, auth)

    payload = json.dumps({"event": "conversation.started", "session_id": session_id})
    headers = _sign_payload(payload)

    response = await client.post(
        "/v1/elevenlabs/webhooks/conversation",
        headers=headers,
        content=payload,
    )
    assert response.status_code == 200
    assert response.json()["accepted"] is True
    assert response.json()["event"] == "conversation.started"


async def test_webhook_utterance_siguiente(client: AsyncClient) -> None:
    auth = await _auth_headers(client)
    session_id = await _start_session(client, auth)

    payload = json.dumps(
        {
            "event": "utterance.final",
            "session_id": session_id,
            "text": "siguiente",
        }
    )
    headers = _sign_payload(payload)

    response = await client.post(
        "/v1/elevenlabs/webhooks/conversation",
        headers=headers,
        content=payload,
    )
    assert response.status_code == 200

    events = await client.get(
        f"/v1/sessions/{session_id}/events",
        headers=auth,
        params={"since_seq": 0},
    )
    types = [event["type"] for event in events.json()["items"]]
    assert "tool.called" in types
    assert "step.completed" in types
