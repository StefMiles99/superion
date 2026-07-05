"""Tests DeployAgentUseCase — BE-09."""

from datetime import UTC, datetime
from pathlib import Path

import pytest

from application.use_cases.elevenlabs.deploy_agent import DeployAgentUseCase
from application.use_cases.elevenlabs.provision_agent import ProvisionAgentUseCase
from domain.entities.agent_manifest import AgentConfig, AgentManifest, DeploymentConfig, PlatformConfig
from domain.entities.agent_tool_spec import AgentToolSpec, WebhookConfig
from domain.exceptions import ValidationError
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
def clock() -> InMemoryClock:
    return InMemoryClock(datetime(2026, 7, 4, 20, 0, tzinfo=UTC))


@pytest.fixture
def provisioner(clock: InMemoryClock) -> InMemoryElevenLabsProvisioner:
    return InMemoryElevenLabsProvisioner(clock=clock)


@pytest.fixture
async def provisioned_state(
    state_path: Path,
    provisioner: InMemoryElevenLabsProvisioner,
) -> None:
    use_case = ProvisionAgentUseCase(
        provisioner=provisioner,
        state_store=JsonStateStore(state_path),
        api_base_url="http://localhost:8000",
    )
    await use_case.execute(manifest=_manifest(), dry_run=False)


@pytest.fixture
def use_case(
    state_path: Path,
    provisioner: InMemoryElevenLabsProvisioner,
) -> DeployAgentUseCase:
    return DeployAgentUseCase(
        provisioner=provisioner,
        state_store=JsonStateStore(state_path),
    )


async def test_deploy_sets_deployed_status(
    use_case: DeployAgentUseCase,
    provisioned_state: None,
) -> None:
    result = await use_case.execute(branch="main", traffic_percentage=1.0)
    assert result.status == ProvisionStatus.DEPLOYED
    assert result.deployed_at is not None


async def test_deploy_fails_without_provision(use_case: DeployAgentUseCase) -> None:
    with pytest.raises(ValidationError) as exc_info:
        await use_case.execute(branch="main", traffic_percentage=1.0)
    assert exc_info.value.code == "AGENT_NOT_PROVISIONED"
