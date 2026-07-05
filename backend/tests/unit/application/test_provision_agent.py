"""Tests ProvisionAgentUseCase — BE-09."""

from datetime import UTC, datetime
from pathlib import Path

import pytest

from application.use_cases.elevenlabs.provision_agent import ProvisionAgentUseCase
from domain.entities.agent_manifest import AgentConfig, AgentManifest, DeploymentConfig, PlatformConfig
from domain.entities.agent_tool_spec import AgentToolSpec, WebhookConfig
from domain.value_objects.provision_status import ProvisionStatus
from infrastructure.external.elevenlabs.in_memory_provisioner import InMemoryElevenLabsProvisioner
from infrastructure.external.elevenlabs.state_store import JsonStateStore
from infrastructure.persistence.in_memory.clock import InMemoryClock


def _manifest() -> AgentManifest:
    tool = AgentToolSpec(
        name="query_manual",
        description="Consulta manual",
        parameters={"type": "object", "properties": {}},
        webhook=WebhookConfig(
            method="POST",
            url_template="http://localhost:8000/v1/elevenlabs/tools/query_manual",
            headers={},
            response_timeout_secs=20,
        ),
    )
    return AgentManifest(
        agent=AgentConfig(
            name="superion-technician",
            tags=[],
            voice_id="v1",
            tts_model="eleven_multilingual_v2",
            language="es",
            first_message="Hola",
            llm="gemini-2.0-flash",
            system_prompt="prompt",
            tools=[tool],
            variables={},
        ),
        platform=PlatformConfig(
            webhook_url="http://localhost:8000/v1/elevenlabs/webhooks/conversation",
            webhook_events=["conversation.started"],
            enable_auth=True,
        ),
        deployment=DeploymentConfig(branch="main", traffic_percentage=1.0, environment="dev"),
    )


@pytest.fixture
def state_path(tmp_path: Path) -> Path:
    return tmp_path / "state.json"


@pytest.fixture
def use_case(state_path: Path) -> ProvisionAgentUseCase:
    clock = InMemoryClock(datetime(2026, 7, 4, 20, 0, tzinfo=UTC))
    provisioner = InMemoryElevenLabsProvisioner(clock=clock)
    return ProvisionAgentUseCase(
        provisioner=provisioner,
        state_store=JsonStateStore(state_path),
        api_base_url="http://localhost:8000",
    )


async def test_provision_is_idempotent(use_case: ProvisionAgentUseCase, state_path: Path) -> None:
    manifest = _manifest()
    first = await use_case.execute(manifest=manifest, dry_run=False)
    second = await use_case.execute(manifest=manifest, dry_run=False)

    assert first.agent_id == second.agent_id
    assert first.status == ProvisionStatus.SYNCED
    assert state_path.exists()
