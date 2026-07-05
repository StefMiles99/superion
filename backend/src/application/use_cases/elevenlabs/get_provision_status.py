"""Use case GetProvisionStatus — BE-09."""

from __future__ import annotations

from application.dto.elevenlabs import AgentStatusOutput
from domain.exceptions import ValidationError
from infrastructure.config import Settings
from infrastructure.external.elevenlabs.paths import resolve_repo_relative_path
from infrastructure.external.elevenlabs.state_store import JsonStateStore


class GetProvisionStatusUseCase:
    """Devuelve estado local del agente provisionado."""

    def __init__(self, *, settings: Settings) -> None:
        self._settings = settings
        self._state_store = JsonStateStore(
            resolve_repo_relative_path(settings.ELEVENLABS_STATE_FILE),
        )

    async def execute(self) -> AgentStatusOutput:
        state = self._state_store.load()
        if state is None:
            raise ValidationError(
                code="AGENT_NOT_PROVISIONED",
                message="El agente ElevenLabs no está provisionado.",
            )
        return AgentStatusOutput(
            provisioner=self._settings.ELEVENLABS_PROVISIONER,
            agent_id=state.agent_id,
            branch_id=state.branch_id,
            deployed_at=state.deployed_at.isoformat().replace("+00:00", "Z")
            if state.deployed_at
            else None,
            environment=state.environment,
            tools_synced=len(state.tool_ids),
            status=state.status.value,
        )
