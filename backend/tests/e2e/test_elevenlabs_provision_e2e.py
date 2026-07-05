"""E2E provision ElevenLabs + voice connect — BE-09."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from application.use_cases.elevenlabs.deploy_agent import DeployAgentUseCase
from application.use_cases.elevenlabs.load_manifest import LoadManifestUseCase
from application.use_cases.elevenlabs.provision_agent import ProvisionAgentUseCase
from domain.services.manifest_validator import ManifestValidator
from infrastructure.config import Settings
from infrastructure.external.elevenlabs.in_memory_provisioner import InMemoryElevenLabsProvisioner
from infrastructure.external.elevenlabs.manifest_loader import YamlManifestLoader
from infrastructure.external.elevenlabs.state_store import JsonStateStore
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.persistence.in_memory.clock import InMemoryClock
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"
WEBHOOK_SECRET = "test-webhook-secret"
REPO_ROOT = Path(__file__).resolve().parents[3]


def _sign_payload(payload: str, *, secret: str = WEBHOOK_SECRET) -> dict[str, str]:
    import hashlib
    import hmac

    ts = str(int(InMemoryClock.shared().now().timestamp()))
    sig = hmac.new(secret.encode(), f"{ts}.{payload}".encode(), hashlib.sha256).hexdigest()
    return {
        "Content-Type": "application/json",
        "X-ElevenLabs-Signature": f"t={ts},v1={sig}",
    }


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    state_file = tmp_path / "state.json"
    return Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        CLOCK_MODE="memory",
        ELEVENLABS_WEBHOOK_SECRET=WEBHOOK_SECRET,
        ELEVENLABS_PROVISIONER="memory",
        ELEVENLABS_STATE_FILE=str(state_file),
        ELEVENLABS_AGENT_MANIFEST=str(REPO_ROOT / "elevenlabs" / "agent.yaml"),
        API_BASE_URL="http://test",
    )


@pytest.fixture
def app(settings: Settings, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-test")
    monkeypatch.setenv("API_BASE_URL", "http://test")
    monkeypatch.setenv("DEPLOY_ENV", "dev")
    return create_app(settings)


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _provision_agent(settings: Settings) -> str:
    manifest = LoadManifestUseCase(
        loader=YamlManifestLoader(),
        validator=ManifestValidator(),
    ).execute(
        manifest_path=Path(settings.ELEVENLABS_AGENT_MANIFEST),
        api_base_url=settings.API_BASE_URL,
    )
    clock = InMemoryClock(datetime(2026, 7, 4, 20, 0, tzinfo=UTC))
    provisioner = InMemoryElevenLabsProvisioner(clock=clock)
    state_store = JsonStateStore(Path(settings.ELEVENLABS_STATE_FILE))
    await ProvisionAgentUseCase(
        provisioner=provisioner,
        state_store=state_store,
        api_base_url=settings.API_BASE_URL,
    ).execute(manifest=manifest, dry_run=False)
    deployed = await DeployAgentUseCase(
        provisioner=provisioner,
        state_store=state_store,
    ).execute(branch="main", traffic_percentage=1.0)
    return deployed.agent_id


async def test_elevenlabs_provision_e2e(
    client: AsyncClient,
    settings: Settings,
) -> None:
    """provision → voice/connect → webhook conversation.started → eventos de sesión."""
    agent_id = await _provision_agent(settings)
    assert agent_id.startswith("agent_mock_")

    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    start = await client.post("/v1/work-orders/wo-001/start", headers=headers)
    assert start.status_code == 201
    session_id = start.json()["session_id"]

    connect = await client.post(
        f"/v1/sessions/{session_id}/voice/connect",
        headers=headers,
    )
    assert connect.status_code == 200
    body = connect.json()
    assert body["agent_id"] == agent_id
    assert body["connect_mode"] == "signed_url"
    assert body["signed_url"].startswith("wss://mock.elevenlabs.test/")

    started_payload = json.dumps({"event": "conversation.started", "session_id": session_id})
    started_resp = await client.post(
        "/v1/elevenlabs/webhooks/conversation",
        headers=_sign_payload(started_payload),
        content=started_payload,
    )
    assert started_resp.status_code == 200
    assert started_resp.json()["accepted"] is True

    advance_payload = json.dumps(
        {"event": "utterance.final", "session_id": session_id, "text": "siguiente"}
    )
    advance_resp = await client.post(
        "/v1/elevenlabs/webhooks/conversation",
        headers=_sign_payload(advance_payload),
        content=advance_payload,
    )
    assert advance_resp.status_code == 200

    events = (
        await client.get(
            f"/v1/sessions/{session_id}/events",
            headers=headers,
            params={"since_seq": 0},
        )
    ).json()["items"]
    types = [event["type"] for event in events]
    assert "tool.called" in types
    assert "step.completed" in types
