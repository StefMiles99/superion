"""Tests integration InMemoryProvisioner — BE-09."""

from datetime import UTC, datetime
from pathlib import Path

import pytest

from application.use_cases.elevenlabs.deploy_agent import DeployAgentUseCase
from application.use_cases.elevenlabs.provision_agent import ProvisionAgentUseCase
from domain.value_objects.provision_status import ProvisionStatus
from infrastructure.external.elevenlabs.in_memory_provisioner import InMemoryElevenLabsProvisioner
from infrastructure.external.elevenlabs.state_store import JsonStateStore
from infrastructure.persistence.in_memory.clock import InMemoryClock


@pytest.fixture
def manifest_path() -> Path:
    repo_root = Path(__file__).resolve().parents[3]
    return repo_root / "elevenlabs" / "agent.yaml"


async def test_in_memory_provisioner_full_cycle(
    manifest_path: Path,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from application.use_cases.elevenlabs.load_manifest import LoadManifestUseCase
    from domain.services.manifest_validator import ManifestValidator
    from infrastructure.external.elevenlabs.manifest_loader import YamlManifestLoader

    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-test")
    monkeypatch.setenv("API_BASE_URL", "http://localhost:8000")
    monkeypatch.setenv("DEPLOY_ENV", "dev")

    manifest = LoadManifestUseCase(
        loader=YamlManifestLoader(),
        validator=ManifestValidator(),
    ).execute(manifest_path=manifest_path, api_base_url="http://localhost:8000")

    clock = InMemoryClock(datetime(2026, 7, 4, 20, 0, tzinfo=UTC))
    provisioner = InMemoryElevenLabsProvisioner(clock=clock)
    state_store = JsonStateStore(tmp_path / "state.json")

    synced = await ProvisionAgentUseCase(
        provisioner=provisioner,
        state_store=state_store,
        api_base_url="http://localhost:8000",
    ).execute(manifest=manifest, dry_run=False)
    assert synced.status == ProvisionStatus.SYNCED

    deployed = await DeployAgentUseCase(
        provisioner=provisioner,
        state_store=state_store,
    ).execute(branch="main", traffic_percentage=1.0)
    assert deployed.status == ProvisionStatus.DEPLOYED
    assert len(deployed.tool_ids) >= 1
