"""Provisioner real ElevenLabs vía SDK — BE-09."""

from __future__ import annotations

from datetime import UTC, datetime

from domain.entities.agent_manifest import AgentManifest
from domain.entities.agent_tool_spec import AgentToolSpec
from domain.entities.provision_state import ProvisionState
from infrastructure.external.elevenlabs.config_builder import (
    build_conversation_config,
    build_platform_settings,
)
from infrastructure.external.elevenlabs.tool_builder import build_webhook_tool_payload


class ElevenLabsSdkProvisioner:
    """Adapter real; requiere paquete `elevenlabs` y API key."""

    def __init__(self, *, api_key: str) -> None:
        self._api_key = api_key

    def _client(self):
        try:
            from elevenlabs import AsyncElevenLabs
        except ImportError as exc:
            raise ValueError(
                "Instala extra elevenlabs: pip install -e '.[elevenlabs]'"
            ) from exc
        return AsyncElevenLabs(api_key=self._api_key)

    async def ensure_tools(
        self,
        tools: list[AgentToolSpec],
        *,
        api_base_url: str,
        existing_tool_ids: dict[str, str],
    ) -> dict[str, str]:
        del api_base_url
        client = self._client()
        result = dict(existing_tool_ids)
        remote_tools = await client.conversational_ai.tools.list()
        by_name = {item.name: item.tool_id for item in remote_tools.tools}

        for spec in tools:
            payload = build_webhook_tool_payload(spec)
            if spec.name in by_name:
                tool_id = by_name[spec.name]
                await client.conversational_ai.tools.update(tool_id=tool_id, **payload)
                result[spec.name] = tool_id
                continue
            if spec.name in result:
                await client.conversational_ai.tools.update(
                    tool_id=result[spec.name],
                    **payload,
                )
                continue
            created = await client.conversational_ai.tools.create(**payload)
            result[spec.name] = created.tool_id
        return result

    async def ensure_agent(
        self,
        manifest: AgentManifest,
        *,
        tool_ids: dict[str, str],
        agent_id: str | None,
    ) -> str:
        client = self._client()
        conversation_config = build_conversation_config(manifest, tool_ids=tool_ids)
        platform_settings = build_platform_settings(manifest)
        if agent_id:
            await client.conversational_ai.agents.update(
                agent_id=agent_id,
                name=manifest.agent.name,
                conversation_config=conversation_config,
                platform_settings=platform_settings,
                tags=manifest.agent.tags,
            )
            return agent_id

        created = await client.conversational_ai.agents.create(
            name=manifest.agent.name,
            conversation_config=conversation_config,
            platform_settings=platform_settings,
            tags=manifest.agent.tags,
        )
        return created.agent_id

    async def deploy(
        self,
        agent_id: str,
        *,
        branch: str,
        traffic_percentage: float,
        environment: str,
        branch_id: str | None,
    ) -> ProvisionState:
        del branch
        client = self._client()
        from elevenlabs import (
            AgentDeploymentPercentageStrategy,
            AgentDeploymentRequest,
            AgentDeploymentRequestItem,
        )

        resolved_branch = branch_id or "main"
        await client.conversational_ai.agents.deployments.create(
            agent_id=agent_id,
            deployment_request=AgentDeploymentRequest(
                requests=[
                    AgentDeploymentRequestItem(
                        branch_id=resolved_branch,
                        deployment_strategy=AgentDeploymentPercentageStrategy(
                            type="percentage",
                            traffic_percentage=traffic_percentage,
                        ),
                    )
                ],
            ),
        )
        agent = await client.conversational_ai.agents.get(agent_id=agent_id)
        tool_ids = {
            tool.name: tool.tool_id
            for tool in getattr(agent, "tools", []) or []
        }
        from domain.value_objects.provision_status import ProvisionStatus

        return ProvisionState(
            agent_id=agent_id,
            branch_id=resolved_branch,
            tool_ids=tool_ids,
            environment=environment,
            status=ProvisionStatus.DEPLOYED,
            deployed_at=datetime.now(tz=UTC),
        )
