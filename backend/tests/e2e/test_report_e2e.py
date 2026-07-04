"""E2E flujo de reporte + PDF — BE-07."""

import asyncio
import hashlib
import json
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from starlette.testclient import TestClient

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


async def test_report_e2e_flow(client: AsyncClient, app) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    start = await client.post("/v1/work-orders/wo-003/start", headers=headers)
    assert start.status_code == 201
    start_body = start.json()
    session_id = start_body["session_id"]
    photo_required = start_body["procedure_template"]["photo_required_step_indices"]

    report_versions: list[int] = []

    with TestClient(app) as sync_client:
        with sync_client.websocket_connect(
            f"/v1/ws/sessions/{session_id}?token={token}&last_seq=0"
        ) as ws:
            ws.send_json({"type": "subscribe", "last_seq": 0})

            finding = await client.post(
                f"/v1/sessions/{session_id}/events",
                headers=headers,
                json={
                    "event_id": str(uuid4()),
                    "type": "finding",
                    "step_index": 0,
                    "payload": {"text": "Desgaste leve", "severity": "low"},
                },
            )
            assert finding.status_code == 202

            photo = await client.post(
                f"/v1/sessions/{session_id}/photos",
                headers=headers,
                data={"step_index": "3", "event_id": str(uuid4()), "criteria": "sensor visible"},
                files={"file": ("ok.jpg", b"Aok-image", "image/jpeg")},
            )
            assert photo.status_code == 202
            await asyncio.sleep(0.15)

            for _ in range(5):
                raw = ws.receive_text()
                msg = json.loads(raw)
                if msg.get("type") == "report.updated":
                    report_versions.append(int(msg["payload"]["version"]))

            await _complete_all_steps(
                client,
                headers,
                session_id,
                photo_required=photo_required,
            )

    assert len(report_versions) >= 1

    finalize = await client.post(f"/v1/sessions/{session_id}/finalize", headers=headers)
    assert finalize.status_code == 200
    fin_body = finalize.json()
    assert fin_body["report_id"]
    assert fin_body["pdf_url"]
    assert fin_body["pdf_expires_at"].endswith("Z")

    report = await client.get(f"/v1/sessions/{session_id}/report", headers=headers)
    assert report.status_code == 200
    report_body = report.json()
    assert report_body["status"] == "finalized"
    assert report_body["version"] >= 1

    pdf = await client.get(f"/v1/sessions/{session_id}/report/pdf", headers=headers)
    assert pdf.status_code == 200
    assert pdf.content.startswith(b"%PDF-1.4")
    assert pdf.headers["X-Document-SHA256"] == hashlib.sha256(pdf.content).hexdigest()
