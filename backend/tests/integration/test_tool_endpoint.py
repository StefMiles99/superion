"""Tests endpoint tools ElevenLabs — BE-06."""

import asyncio
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"
WEBHOOK_SECRET = "test-webhook-secret"


def dummy_pdf(*pages: str) -> bytes:
    return b"%PDF-1.4\n" + "\f".join(pages).encode("latin-1")


@pytest.fixture
def app():
    settings = Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        CLOCK_MODE="memory",
        ELEVENLABS_WEBHOOK_SECRET=WEBHOOK_SECRET,
        API_BASE_URL="http://test",
    )
    return create_app(settings)


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _tech_headers(client: AsyncClient) -> dict[str, str]:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def _admin_headers(client: AsyncClient) -> dict[str, str]:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "admin@planta.com", "password": FIXTURE_PASSWORD},
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def _start_session(client: AsyncClient, headers: dict[str, str]) -> str:
    start = await client.post("/v1/work-orders/wo-003/start", headers=headers)
    return start.json()["session_id"]


async def _upload_manual(client: AsyncClient, headers: dict[str, str]) -> None:
    pdf = dummy_pdf("Pagina 1: torque 85 Nm valvula", "Pagina 2: presion nominal")
    upload = await client.post(
        "/v1/manuals",
        headers=headers,
        data={"title": "Grundfos CR 32", "asset_model": "Grundfos CR 32"},
        files={"file": ("manual.pdf", pdf, "application/pdf")},
    )
    manual_id = upload.json()["manual_id"]
    for _ in range(20):
        await asyncio.sleep(0.05)
        detail = await client.get(f"/v1/manuals/{manual_id}", headers=headers)
        if detail.json()["index_status"] == "indexed":
            return
    raise AssertionError("Manual no indexado")


async def test_get_current_step_tool_returns_active_step(client: AsyncClient) -> None:
    tech = await _tech_headers(client)
    session_id = await _start_session(client, tech)

    response = await client.post(
        "/v1/elevenlabs/tools/get_current_step",
        headers=tech,
        json={
            "call_id": str(uuid4()),
            "session_id": session_id,
            "arguments": {},
        },
    )
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["index"] == 0
    assert result["current_step_index"] == 0
    assert result["total_steps"] >= 1
    assert result["title"]
    assert result["all_steps_completed"] is False


async def test_get_current_step_elevenlabs_format_with_tool_secret(
    client: AsyncClient,
) -> None:
    """ElevenLabs: session_id en query + auth header."""
    tech = await _tech_headers(client)
    session_id = await _start_session(client, tech)

    response = await client.post(
        "/v1/elevenlabs/tools/get_current_step",
        headers={"X-Superion-Tool-Auth": WEBHOOK_SECRET},
        params={"session_id": session_id, "tool_auth": WEBHOOK_SECRET},
        json={},
    )
    assert response.status_code == 200
    body = response.json()
    assert "result" in body
    result = body["result"]
    if isinstance(result, dict):
        assert result.get("title") or result.get("summary")
    else:
        assert "Paso" in str(result)


async def test_get_current_step_elevenlabs_query_auth_only(client: AsyncClient) -> None:
    tech = await _tech_headers(client)
    session_id = await _start_session(client, tech)

    response = await client.post(
        f"/v1/elevenlabs/tools/get_current_step?session_id={session_id}&tool_auth={WEBHOOK_SECRET}",
        json={},
    )
    assert response.status_code == 200
    assert "result" in response.json()


async def test_query_manual_tool_with_auth(client: AsyncClient) -> None:
    tech = await _tech_headers(client)
    admin = await _admin_headers(client)
    await _upload_manual(client, admin)
    session_id = await _start_session(client, tech)

    response = await client.post(
        "/v1/elevenlabs/tools/query_manual",
        headers=tech,
        json={
            "call_id": str(uuid4()),
            "session_id": session_id,
            "arguments": {
                "question": "¿cuál es el torque de la válvula?",
                "asset_id": "asset-3",
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["call_id"]
    assert "answer" in body["result"]
    assert body["result"]["citations"]


async def test_query_manual_infers_asset_from_session(client: AsyncClient) -> None:
    """asset_id opcional: se resuelve desde la OT de la sesión."""
    tech = await _tech_headers(client)
    admin = await _admin_headers(client)
    await _upload_manual(client, admin)
    session_id = await _start_session(client, tech)

    response = await client.post(
        "/v1/elevenlabs/tools/query_manual",
        headers=tech,
        json={
            "call_id": str(uuid4()),
            "session_id": session_id,
            "arguments": {"question": "¿cuál es el torque de la válvula?"},
        },
    )
    assert response.status_code == 200
    assert "answer" in response.json()["result"]


async def test_tool_rejects_foreign_session(client: AsyncClient) -> None:
    tech = await _tech_headers(client)
    session_id = await _start_session(client, tech)

    other_login = await client.post(
        "/v1/auth/login",
        json={"email": "maria@planta.com", "password": FIXTURE_PASSWORD},
    )
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    response = await client.post(
        "/v1/elevenlabs/tools/query_manual",
        headers=other_headers,
        json={
            "call_id": str(uuid4()),
            "session_id": session_id,
            "arguments": {"question": "test", "asset_id": "asset-3"},
        },
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "SESSION_NOT_FOUND"


async def test_request_photo_emits_event(client: AsyncClient) -> None:
    tech = await _tech_headers(client)
    session_id = await _start_session(client, tech)

    response = await client.post(
        "/v1/elevenlabs/tools/request_evidence_photo",
        headers=tech,
        json={
            "call_id": str(uuid4()),
            "session_id": session_id,
            "arguments": {"step_index": 0, "criteria": "manómetro legible"},
        },
    )
    assert response.status_code == 200
    assert response.json()["result"]["accepted"] is True

    events = await client.get(
        f"/v1/sessions/{session_id}/events",
        headers=tech,
        params={"since_seq": 0},
    )
    types = [event["type"] for event in events.json()["items"]]
    assert "photo.requested" in types
