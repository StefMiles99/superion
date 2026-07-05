"""Tests de router reports — BE-07."""

import asyncio
import hashlib
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


async def _start_session(client: AsyncClient, headers: dict[str, str]) -> tuple[str, list[int]]:
    start = await client.post("/v1/work-orders/wo-003/start", headers=headers)
    assert start.status_code == 201
    body = start.json()
    return body["session_id"], body["procedure_template"]["photo_required_step_indices"]


async def _finalize_ready_session(
    client: AsyncClient,
    headers: dict[str, str],
    session_id: str,
    *,
    photo_required: list[int],
) -> None:
    """Avanza hasta último paso completado."""
    for _ in range(12):
        session_resp = await client.get(f"/v1/sessions/{session_id}", headers=headers)
        current = session_resp.json()["current_step_index"]

        if current in photo_required:
            photo_resp = await client.post(
                f"/v1/sessions/{session_id}/photos",
                headers=headers,
                data={
                    "step_index": str(current),
                    "event_id": str(uuid4()),
                    "criteria": "sensor visible",
                },
                files={"file": ("ok.jpg", b"Aok-image", "image/jpeg")},
            )
            assert photo_resp.status_code == 202
            await asyncio.sleep(0.15)

        event_resp = await client.post(
            f"/v1/sessions/{session_id}/events",
            headers=headers,
            json={
                "event_id": str(uuid4()),
                "type": "step_advance",
                "step_index": current,
                "payload": {"completed_by": "command"},
            },
        )
        assert event_resp.status_code == 202, event_resp.text


async def test_get_report_json_returns_draft(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    session_id, _ = await _start_session(client, headers)

    response = await client.get(f"/v1/sessions/{session_id}/report", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == session_id
    assert body["status"] == "draft"
    assert body["version"] >= 1
    assert "header" in body["content"]
    assert "summary" in body["content"]


async def test_get_report_pdf_after_finalize(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    session_id, photo_required = await _start_session(client, headers)
    await _finalize_ready_session(
        client,
        headers,
        session_id,
        photo_required=photo_required,
    )

    finalize = await client.post(f"/v1/sessions/{session_id}/finalize", headers=headers)
    assert finalize.status_code == 200

    pdf_resp = await client.get(f"/v1/sessions/{session_id}/report/pdf", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert "X-Document-SHA256" in pdf_resp.headers
    assert pdf_resp.content.startswith(b"%PDF-1.4")
    assert pdf_resp.headers["X-Document-SHA256"] == hashlib.sha256(pdf_resp.content).hexdigest()
    assert "OT-1003-reporte.pdf" in pdf_resp.headers["content-disposition"]
