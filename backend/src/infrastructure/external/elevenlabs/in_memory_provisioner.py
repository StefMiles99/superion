"""Provisioner in-memory — BE-09."""

from __future__ import annotations

from domain.entities.agent_manifest import AgentManifest
from domain.entities.agent_tool_spec import AgentToolSpec
from domain.entities.provision_state import ProvisionState
from domain.ports.services import IClock
from domain.value_objects.provision_status import ProvisionStatus
from infrastructure.external.elevenlabs.config_builder import (
    build_conversation_config,
    build_platform_settings,
)


class InMemoryElevenLabsProvisioner:
    """Simula API ElevenLabs para tests y CI sin red."""

    _instance: InMemoryElevenLabsProvisioner | None = None

    def __init__(self, *, clock: IClock) -> None:
        self._clock = clock
        self._agents: dict[str, dict[str, object]] = {}
        self._tools: dict[str, dict[str, object]] = {}
        self._agent_counter = 0
        self._tool_counter = 0
        self._branch_counter = 0

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls, *, clock: IClock) -> InMemoryElevenLabsProvisioner:
        if cls._instance is None:
            cls._instance = cls(clock=clock)
        return cls._instance

    async def reset(self) -> None:
        self._agents.clear()
        self._tools.clear()
        self._agent_counter = 0
        self._tool_counter = 0
        self._branch_counter = 0

    async def ensure_tools(
        self,
        tools: list[AgentToolSpec],
        *,
        api_base_url: str,
        existing_tool_ids: dict[str, str],
    ) -> dict[str, str]:
        del api_base_url
        result = dict(existing_tool_ids)
        for spec in tools:
            if spec.name in result:
                self._tools[result[spec.name]] = {"name": spec.name, "spec": spec}
                continue
            self._tool_counter += 1
            tool_id = f"tool_mock_{self._tool_counter}"
            self._tools[tool_id] = {"name": spec.name, "spec": spec}
            result[spec.name] = tool_id
        return result

    async def ensure_agent(
        self,
        manifest: AgentManifest,
        *,
        tool_ids: dict[str, str],
        agent_id: str | None,
    ) -> str:
        conversation_config = build_conversation_config(manifest, tool_ids=tool_ids)
        platform_settings = build_platform_settings(manifest)
        if agent_id and agent_id in self._agents:
            self._agents[agent_id] = {
                "manifest": manifest,
                "conversation_config": conversation_config,
                "platform_settings": platform_settings,
            }
            return agent_id

        self._agent_counter += 1
        new_id = agent_id or f"agent_mock_{self._agent_counter}"
        self._agents[new_id] = {
            "manifest": manifest,
            "conversation_config": conversation_config,
            "platform_settings": platform_settings,
        }
        return new_id

    async def deploy(
        self,
        agent_id: str,
        *,
        branch: str,
        traffic_percentage: float,
        environment: str,
        branch_id: str | None,
    ) -> ProvisionState:
        del branch, traffic_percentage
        if agent_id not in self._agents:
            raise ValueError(f"agente no encontrado: {agent_id}")

        self._branch_counter += 1
        resolved_branch = branch_id or f"branch_mock_{self._branch_counter}"
        tool_ids = {
            meta["name"]: tool_id
            for tool_id, meta in self._tools.items()
            if isinstance(meta.get("name"), str)
        }
        return ProvisionState(
            agent_id=agent_id,
            branch_id=resolved_branch,
            tool_ids=tool_ids,
            environment=environment,
            status=ProvisionStatus.DEPLOYED,
            deployed_at=self._clock.now(),
        )
