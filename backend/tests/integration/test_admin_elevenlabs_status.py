"""Tests integration admin ElevenLabs status — BE-09."""

from datetime import UTC, datetime
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from application.use_cases.elevenlabs.deploy_agent import DeployAgentUseCase
from application.use_cases.elevenlabs.load_manifest import LoadManifestUseCase
from application.use_cases.elevenlabs.provision_agent import ProvisionAgentUseCase
from domain.services.manifest_validator import ManifestValidator
from domain.value_objects.provision_status import ProvisionStatus
from infrastructure.config import Settings
from infrastructure.external.elevenlabs.in_memory_provisioner import InMemoryElevenLabsProvisioner
from infrastructure.external.elevenlabs.manifest_loader import YamlManifestLoader
from infrastructure.external.elevenlabs.state_store import JsonStateStore
from infrastructure.persistence.in_memory.clock import InMemoryClock
from interface.main import create_app

TEST_SECRET = "test-secret-key-at-least-32-bytes-long"
FIXTURE_PASSWORD = "test1234"
REPO_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        ELEVENLABS_PROVISIONER="memory",
        ELEVENLABS_STATE_FILE=str(tmp_path / "state.json"),
        ELEVENLABS_AGENT_MANIFEST=str(REPO_ROOT / "elevenlabs" / "agent.yaml"),
        API_BASE_URL="http://localhost:8000",
    )


@pytest.fixture
def app(settings: Settings, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-test")
    monkeypatch.setenv("API_BASE_URL", "http://localhost:8000")
    monkeypatch.setenv("DEPLOY_ENV", "dev")
    return create_app(settings)


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _login(client: AsyncClient, email: str) -> str:
    response = await client.post(
        "/v1/auth/login",
        json={"email": email, "password": FIXTURE_PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


async def _provision_and_deploy(settings: Settings) -> None:
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
    await DeployAgentUseCase(
        provisioner=provisioner,
        state_store=state_store,
    ).execute(branch="main", traffic_percentage=1.0)


async def test_admin_agent_status_requires_admin_role(client: AsyncClient) -> None:
    tech_token = await _login(client, "juan@planta.com")
    response = await client.get(
        "/v1/admin/elevenlabs/agent/status",
        headers={"Authorization": f"Bearer {tech_token}"},
    )
    assert response.status_code == 403


async def test_admin_agent_status_not_provisioned(client: AsyncClient) -> None:
    admin_token = await _login(client, "admin@planta.com")
    response = await client.get(
        "/v1/admin/elevenlabs/agent/status",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "AGENT_NOT_PROVISIONED"


async def test_admin_agent_status_returns_deployed(
    client: AsyncClient,
    settings: Settings,
) -> None:
    await _provision_and_deploy(settings)
    admin_token = await _login(client, "admin@planta.com")
    response = await client.get(
        "/v1/admin/elevenlabs/agent/status",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["provisioner"] == "memory"
    assert body["status"] == ProvisionStatus.DEPLOYED.value
    assert body["agent_id"].startswith("agent_mock_")
    assert body["tools_synced"] >= 1
    assert body["environment"] == "dev"
