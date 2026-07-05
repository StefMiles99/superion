"""Use case DeployAgent — BE-09."""

from __future__ import annotations

from domain.entities.provision_state import ProvisionState
from domain.ports.elevenlabs import IElevenLabsProvisioner
from infrastructure.external.elevenlabs.state_store import JsonStateStore


class DeployAgentUseCase:
    """Publica agente provisionado."""

    def __init__(
        self,
        *,
        provisioner: IElevenLabsProvisioner,
        state_store: JsonStateStore,
    ) -> None:
        self._provisioner = provisioner
        self._state_store = state_store

    async def execute(
        self,
        *,
        branch: str,
        traffic_percentage: float,
    ) -> ProvisionState:
        current = self._state_store.require()
        deployed = await self._provisioner.deploy(
            current.agent_id,
            branch=branch,
            traffic_percentage=traffic_percentage,
            environment=current.environment,
            branch_id=current.branch_id or None,
        )
        merged = ProvisionState(
            agent_id=deployed.agent_id,
            branch_id=deployed.branch_id,
            tool_ids=deployed.tool_ids or current.tool_ids,
            environment=deployed.environment,
            status=deployed.status,
            deployed_at=deployed.deployed_at,
        )
        self._state_store.save(merged)
        return merged
