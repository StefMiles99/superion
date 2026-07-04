"""E2E flujo de voz — BE-06."""

import asyncio
import json

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from infrastructure.persistence.in_memory.clock import InMemoryClock
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"
WEBHOOK_SECRET = "test-webhook-secret"


def dummy_pdf(*pages: str) -> bytes:
    return b"%PDF-1.4\n" + "\f".join(pages).encode("latin-1")


def _sign_payload(payload: str, secret: str = WEBHOOK_SECRET) -> dict[str, str]:
    import hashlib
    import hmac

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
def settings() -> Settings:
    return Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        CLOCK_MODE="memory",
        ELEVENLABS_WEBHOOK_SECRET=WEBHOOK_SECRET,
        API_BASE_URL="http://test",
    )


@pytest.fixture
def app(settings: Settings):
    return create_app(settings)


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _upload_and_wait_indexed(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    asset_model: str,
) -> None:
    pdf = dummy_pdf("Pagina 1: torque 85 Nm valvula V-12", "Pagina 2: presion")
    upload = await client.post(
        "/v1/manuals",
        headers=headers,
        data={"title": asset_model, "asset_model": asset_model},
        files={"file": ("manual.pdf", pdf, "application/pdf")},
    )
    assert upload.status_code == 202
    manual_id = upload.json()["manual_id"]
    for _ in range(20):
        await asyncio.sleep(0.05)
        detail = await client.get(f"/v1/manuals/{manual_id}", headers=headers)
        if detail.json()["index_status"] == "indexed":
            return
    raise AssertionError("Manual no indexado a tiempo")


async def test_voice_flow_e2e(client: AsyncClient) -> None:
    """login → session → webhook utterances → eventos de sesión."""
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    admin_login = await client.post(
        "/v1/auth/login",
        json={"email": "admin@planta.com", "password": FIXTURE_PASSWORD},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    await _upload_and_wait_indexed(
        client,
        admin_headers,
        asset_model="Grundfos CR 32",
    )

    start = await client.post("/v1/work-orders/wo-003/start", headers=headers)
    assert start.status_code == 201
    session_id = start.json()["session_id"]

    started_payload = json.dumps({"event": "conversation.started", "session_id": session_id})
    started_resp = await client.post(
        "/v1/elevenlabs/webhooks/conversation",
        headers=_sign_payload(started_payload),
        content=started_payload,
    )
    assert started_resp.status_code == 200

    advance_payload = json.dumps(
        {"event": "utterance.final", "session_id": session_id, "text": "siguiente"}
    )
    advance_resp = await client.post(
        "/v1/elevenlabs/webhooks/conversation",
        headers=_sign_payload(advance_payload),
        content=advance_payload,
    )
    assert advance_resp.status_code == 200

    events_after_advance = await client.get(
        f"/v1/sessions/{session_id}/events",
        headers=headers,
        params={"since_seq": 0},
    )
    types_after_advance = [item["type"] for item in events_after_advance.json()["items"]]
    assert "step.completed" in types_after_advance
    assert "tool.called" in types_after_advance

    query_payload = json.dumps(
        {
            "event": "utterance.final",
            "session_id": session_id,
            "text": "¿cuál es el torque de la válvula?",
        }
    )
    query_resp = await client.post(
        "/v1/elevenlabs/webhooks/conversation",
        headers=_sign_payload(query_payload),
        content=query_payload,
    )
    assert query_resp.status_code == 200

    events = (
        await client.get(
            f"/v1/sessions/{session_id}/events",
            headers=headers,
            params={"since_seq": 0},
        )
    ).json()["items"]
    query_types = [event["type"] for event in events]
    assert "assistant.answering" in query_types
    assert "tool.called" in query_types
    answer = next(event for event in events if event["type"] == "assistant.answered")
    assert "torque" in answer["payload"]["answer_text"].lower()
    assert len(answer["payload"]["citations"]) > 0
