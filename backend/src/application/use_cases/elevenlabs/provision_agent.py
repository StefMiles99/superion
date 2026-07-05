"""Use case ProvisionAgent — BE-09."""

from __future__ import annotations

from domain.entities.agent_manifest import AgentManifest
from domain.entities.provision_state import ProvisionState
from domain.ports.elevenlabs import IElevenLabsProvisioner
from domain.value_objects.provision_status import ProvisionStatus
from infrastructure.external.elevenlabs.state_store import JsonStateStore


class ProvisionAgentUseCase:
    """Sincroniza tools y agente de forma idempotente."""

    def __init__(
        self,
        *,
        provisioner: IElevenLabsProvisioner,
        state_store: JsonStateStore,
        api_base_url: str,
    ) -> None:
        self._provisioner = provisioner
        self._state_store = state_store
        self._api_base_url = api_base_url

    async def execute(
        self,
        *,
        manifest: AgentManifest,
        dry_run: bool = False,
    ) -> ProvisionState:
        existing = self._state_store.load()
        existing_tool_ids = existing.tool_ids if existing else {}
        existing_agent_id = existing.agent_id if existing else None

        if dry_run:
            return ProvisionState(
                agent_id=existing_agent_id or "dry-run-agent",
                branch_id=existing.branch_id if existing else "dry-run-branch",
                tool_ids=existing_tool_ids,
                environment=manifest.deployment.environment,
                status=ProvisionStatus.DRAFT,
            )

        tool_ids = await self._provisioner.ensure_tools(
            manifest.agent.tools,
            api_base_url=self._api_base_url,
            existing_tool_ids=existing_tool_ids,
        )
        agent_id = await self._provisioner.ensure_agent(
            manifest,
            tool_ids=tool_ids,
            agent_id=existing_agent_id,
        )
        branch_id = existing.branch_id if existing and existing.branch_id else ""
        if not branch_id:
            resolve_branch = getattr(self._provisioner, "resolve_main_branch_id", None)
            if resolve_branch is not None:
                branch_id = await resolve_branch(agent_id)
        state = ProvisionState(
            agent_id=agent_id,
            branch_id=branch_id,
            tool_ids=tool_ids,
            environment=manifest.deployment.environment,
            status=ProvisionStatus.SYNCED,
            deployed_at=existing.deployed_at if existing else None,
        )
        self._state_store.save(state)
        return state
