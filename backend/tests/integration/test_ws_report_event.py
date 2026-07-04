"""Tests WS report.updated — BE-07."""

import json
import time
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from starlette.testclient import TestClient

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
        API_BASE_URL="http://test",
    )
    return create_app(settings)


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app, lifespan="on")
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _auth_token(client: AsyncClient) -> str:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    return login.json()["access_token"]


def test_ws_report_updated_emitted_with_diff(app) -> None:
    with TestClient(app) as sync_client:
        login = sync_client.post(
            "/v1/auth/login",
            json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
        )
        token = login.json()["access_token"]
        start = sync_client.post(
            "/v1/work-orders/wo-003/start",
            headers={"Authorization": f"Bearer {token}"},
        )
        session_id = start.json()["session_id"]

        with sync_client.websocket_connect(
            f"/v1/ws/sessions/{session_id}?token={token}&last_seq=0"
        ) as ws:
            ws.send_json({"type": "subscribe", "last_seq": 0})

            event_id = str(uuid4())
            post = sync_client.post(
                f"/v1/sessions/{session_id}/events",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "event_id": event_id,
                    "type": "measurement",
                    "step_index": 0,
                    "payload": {"name": "temp", "value": 42, "unit": "C"},
                },
            )
            assert post.status_code == 202

            deadline = time.time() + 3
            report_msg = None
            while time.time() < deadline:
                raw = ws.receive_text()
                msg = json.loads(raw)
                if msg.get("type") == "report.updated":
                    report_msg = msg
                    break

            assert report_msg is not None
            payload = report_msg["payload"]
            assert "report_id" in payload
            assert payload["version"] >= 2
            diff = payload["diff"]
            assert "summary_changed" in diff
            assert "added_event_seq" in diff
